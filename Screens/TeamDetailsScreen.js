import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import TeamOverview from '../Components/TeamOverview';
import TeamMatches from '../Components/TeamMatches';
import TeamTable from '../Components/TeamTable';
import TeamSquads from '../Components/TeamSquads';
import RemoteLogo from '../Components/RemoteLogo';
import { fetchFixtures, fetchStandings, fetchPlayersByTeam, fetchPlayersByTeamWithFallback, fetchCoach, mapFixtureToCard } from '../Utils/apiFootball';
import { getFavoriteTeams, toggleTeamFavorite } from '../Utils/favoriteStorage';
import { SEASONS, LEAGUES } from '../Config/leagues';

const TABS = [
  { key: 'Fixtures', label: 'Fixtures' },
  { key: 'Results', label: 'Results' },
  { key: 'Stats', label: 'Stats' },
  { key: 'Standings', label: 'Standings' },
];

const TeamDetailsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('Fixtures');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const rawTeam = route?.params?.teamData || {};
  const [teamData, setTeamData] = useState(rawTeam);

  // Prefer route season, then league-config season if available, else default
  const leagueConfig = LEAGUES.find(l => l.id === (rawTeam.leagueId || route?.params?.leagueId));
  const season = rawTeam.season || leagueConfig?.season || SEASONS[0];
  const teamId = rawTeam.id;
  const leagueName = rawTeam.league;
  const leagueId = rawTeam.leagueId || route?.params?.leagueId; // allow passing leagueId
  // derive club/full name from common fields
  const clubName = (teamData && (teamData.club || teamData.fullName || teamData.full_name || teamData.shortName || teamData.alternateName)) || '';

  const buildOverview = async () => {
    if (!teamId) {
      console.log('[DEBUG] TeamDetailsScreen - No teamId provided');
      return;
    }
    console.log(`[DEBUG] TeamDetailsScreen - Starting buildOverview for team ${teamId}, season ${season}`);
    setLoading(true);
    try {
      const controller = new AbortController();
      
      // Optimized approach: If we have leagueId, fetch league fixtures and filter for team
      // This is more efficient than separate team fixture calls
      let recentFx = [];
      let upcomingFx = [];
      let standings = [];
      let players = [];
      let coachData = null;
      
      if (leagueId) {
        console.log(`[DEBUG] TeamDetailsScreen - Using optimized league fixtures approach for league ${leagueId}`);
        
        // Fetch all league fixtures and filter for this team
        const [allLeagueFixtures, leagueStandings, playersPrimary, teamCoachData] = await Promise.all([
          fetchFixtures({ leagueId, season }), // Get all league fixtures
          fetchStandings(leagueId, season),
          fetchPlayersByTeam(teamId, season),
          fetchCoach(teamId)
        ]);
        
        standings = leagueStandings;
        coachData = teamCoachData;
        
        console.log(`[DEBUG] TeamDetailsScreen - Fetched ${allLeagueFixtures.length} league fixtures, filtering for team ${teamId}`);
        
        // Filter fixtures for this specific team
        const teamFixtures = allLeagueFixtures.filter(fixture => 
          fixture.teams?.home?.id === teamId || fixture.teams?.away?.id === teamId
        );
        
        // Sort by date and separate recent vs upcoming
        const now = new Date();
        const sortedFixtures = teamFixtures.sort((a, b) => new Date(a.fixture?.date) - new Date(b.fixture?.date));
        
        recentFx = sortedFixtures
          .filter(f => new Date(f.fixture?.date) < now && f.fixture?.status?.short === 'FT')
          .slice(-10); // Last 10 completed matches
          
        upcomingFx = sortedFixtures
          .filter(f => new Date(f.fixture?.date) >= now || ['NS', 'TBD', 'PST'].includes(f.fixture?.status?.short))
          .slice(0, 10); // Next 10 upcoming matches
          
        console.log(`[DEBUG] TeamDetailsScreen - Filtered results: ${recentFx.length} recent, ${upcomingFx.length} upcoming`);
        
        // Continue with existing player logic
        players = playersPrimary;
        if (!players.length) {
          const fb = await fetchPlayersByTeamWithFallback(teamId, [season, ...SEASONS.filter(s=>s!==season)]);
          players = fb.players;
        }
        
        // If no fixtures found, try fallback to direct team API calls
        if (!recentFx.length && !upcomingFx.length) {
          console.log(`[DEBUG] TeamDetailsScreen - No team fixtures found in league data, falling back to direct team API`);
          const [fallbackRecent, fallbackUpcoming] = await Promise.all([
            fetchFixtures({ teamId, season, last: 10 }),
            fetchFixtures({ teamId, season, next: 10 })
          ]);
          recentFx = fallbackRecent;
          upcomingFx = fallbackUpcoming;
        }
        
      } else {
        console.log(`[DEBUG] TeamDetailsScreen - No leagueId, using direct team fixture calls`);
        // Fallback to original approach when no leagueId
        const [directRecentFx, directUpcomingFx, playersPrimary, teamCoachData] = await Promise.all([
          fetchFixtures({ teamId, season, last: 10 }),
          fetchFixtures({ teamId, season, next: 10 }),
          fetchPlayersByTeam(teamId, season),
          fetchCoach(teamId)
        ]);
        
        recentFx = directRecentFx;
        upcomingFx = directUpcomingFx;
        coachData = teamCoachData;
        
        players = playersPrimary;
        if (!players.length) {
          const fb = await fetchPlayersByTeamWithFallback(teamId, [season, ...SEASONS.filter(s=>s!==season)]);
          players = fb.players;
        }
        
        // Get standings separately for non-optimized path
        standings = [];
      }

      // If still no fixtures found for current season, try other seasons
      let finalRecentFx = recentFx;
      let finalUpcomingFx = upcomingFx;
      
      if (!recentFx.length) {
        console.log(`[DEBUG] No recent fixtures found for team ${teamId} in season ${season}, trying other seasons...`);
        for (const fallbackSeason of SEASONS.filter(s => s !== season)) {
          const fallbackRecent = await fetchFixtures({ teamId, season: fallbackSeason, last: 10 });
          if (fallbackRecent.length) {
            console.log(`[DEBUG] Found ${fallbackRecent.length} recent fixtures in season ${fallbackSeason}`);
            finalRecentFx = fallbackRecent;
            break;
          }
        }
      }
      
      if (!upcomingFx.length) {
        console.log(`[DEBUG] No upcoming fixtures found for team ${teamId} in season ${season}, trying other seasons...`);
        for (const fallbackSeason of SEASONS.filter(s => s !== season)) {
          const fallbackUpcoming = await fetchFixtures({ teamId, season: fallbackSeason, next: 10 });
          if (fallbackUpcoming.length) {
            console.log(`[DEBUG] Found ${fallbackUpcoming.length} upcoming fixtures in season ${fallbackSeason}`);
            finalUpcomingFx = fallbackUpcoming;
            break;
          }
        }
      }

      const recentMapped = finalRecentFx.map(mapFixtureToCard).sort((a,b)=> new Date(b.date)-new Date(a.date));
      const nextMapped = finalUpcomingFx.map(mapFixtureToCard).sort((a,b)=> new Date(a.date)-new Date(b.date));
      const nextMatch = nextMapped[0];
      
      console.log(`[DEBUG] TeamDetailsScreen - Team ${teamId} (${teamData.name}):`, {
        recentFixtures: finalRecentFx.length,
        upcomingFixtures: finalUpcomingFx.length,
        recentMapped: recentMapped.length,
        nextMapped: nextMapped.length,
        season
      });

      // Form W/D/L from last 5
      const last5 = recentMapped.slice(0,5).map(f => {
        const mySide = f.home.id === teamId ? 'home' : 'away';
        const opp = mySide === 'home' ? f.away : f.home;
        const res = f.score.home == null || f.score.away == null ? 'D' : (
          f.score.home === f.score.away ? 'D' : (
            (f.score.home > f.score.away && mySide==='home') || (f.score.away > f.score.home && mySide==='away') ? 'W' : 'L'
          )
        );
        return {
          result: res,
          opponent: opp.name,
          opponentId: opp.id,
          opponentLogo: opp.logo,
          score: `${f.score.home ?? '-'}-${f.score.away ?? '-'}`,
          fixtureId: f.id,
          date: f.date,
          venue: f.venue,
          status: f.status,
          statusShort: f.statusShort,
        };
      });

      // League table mapping for TeamTable component
      const tableMapped = standings.map((r, idx) => ({
        pos: r.rank || idx+1,
        club: r.team?.name,
  teamId: r.team?.id,
  teamLogo: r.team?.logo,
        pl: r.all?.played,
        w: r.all?.win,
        d: r.all?.draw,
        l: r.all?.lose,
        gd: (r.goalsDiff != null ? r.goalsDiff : (r.all?.goals?.for - r.all?.goals?.against)),
        pts: r.points,
      }));

      // Group players by position for squad
      const byPos = { goalkeepers: [], defenders: [], midfielders: [], forwards: [] };
      players.forEach(p => {
        const pos = (p.position || '').toLowerCase();
        if (pos.includes('keeper') || pos === 'gk') byPos.goalkeepers.push(p);
        else if (pos.startsWith('d')) byPos.defenders.push(p);
        else if (pos.startsWith('m')) byPos.midfielders.push(p);
        else byPos.forwards.push(p);
      });

      // Basic top scorers (if statistics have goals) - limit to top 5
      const topScorers = [...players]
        .map(p => ({ name: p.name, goals: p.statistics?.goals?.total || 0, matches: p.statistics?.games?.appearences || p.statistics?.games?.appearances || 0 }))
        .filter(p => p.goals > 0)
        .sort((a,b)=> b.goals - a.goals)
        .slice(0,5);

      // Basic top assists - limit to top 5
      const topAssists = [...players]
        .map(p => ({ name: p.name, assists: p.statistics?.goals?.assists || 0, matches: p.statistics?.games?.appearences || p.statistics?.games?.appearances || 0 }))
        .filter(p => p.assists > 0)
        .sort((a,b)=> b.assists - a.assists)
        .slice(0,5);

      setTeamData(prev => ({
        ...prev,
        season,
        nextMatch: nextMatch ? {
          date: new Date(nextMatch.date).toDateString(),
          time: new Date(nextMatch.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          opponent: nextMatch.home.id === teamId ? nextMatch.away.name : nextMatch.home.name,
          opponentId: nextMatch.home.id === teamId ? nextMatch.away.id : nextMatch.home.id,
          venue: nextMatch.venue,
        } : null,
        lastMatches: last5.map(m => ({ result: m.result })),
        recentMatches: last5,
        upcomingMatches: nextMapped.map(match => ({
          fixtureId: match.id,
          date: match.date,
          opponent: match.home.id === teamId ? match.away.name : match.home.name,
          opponentId: match.home.id === teamId ? match.away.id : match.home.id,
          opponentLogo: match.home.id === teamId ? match.away.logo : match.home.logo,
          venue: match.venue,
          status: match.status,
          statusShort: match.statusShort,
          score: `${match.score.home ?? '-'}-${match.score.away ?? '-'}`,
        })),
        standings: tableMapped,
        squad: {
          coach: coachData ? { name: coachData.name, role: coachData.role, image: '👔' } : null,
          goalkeepers: byPos.goalkeepers,
          defenders: byPos.defenders,
            midfielders: byPos.midfielders,
          forwards: byPos.forwards,
        },
        topScorers,
        topAssists,
      }));
    } catch (e) {
      console.warn('Failed to load team details', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(()=>{ buildOverview(); }, [teamId, leagueId]);
  
  // Load favorite status
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (teamId) {
        const favorites = await getFavoriteTeams();
        setIsFavorite(favorites.includes(teamId));
      }
    };
    loadFavoriteStatus();
  }, [teamId]);

  const onRefresh = () => { setRefreshing(true); buildOverview(); };

  const handleToggleFavorite = async () => {
    if (teamId) {
      await toggleTeamFavorite(teamId);
      setIsFavorite(!isFavorite);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header - Standardized to match CompetitionScreen */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={{}}>
            <Text style={styles.backArrow}>‹</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('Team Details')}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconButton} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{isFavorite ? '★' : '☆'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Team Info - compact, logo left, texts right (like Competition) */}
      <View style={styles.teamInfo}> 
        <View style={styles.teamHeaderRow}>
          <View style={styles.teamLogoBox}>
            <RemoteLogo kind="team" teamId={teamId} teamName={teamData.name} size={48} />
          </View>
          <View style={styles.teamDetailsCol}>
            {teamData.country ? <Text style={styles.teamCountry}>{teamData.country}</Text> : null}
            <Text style={styles.teamName}>{teamData.name}</Text>
            {clubName && clubName !== teamData.name ? (
              <Text style={styles.teamClub}>{clubName}</Text>
            ) : (
              teamData.league ? <Text style={styles.teamLeague}>{teamData.league}</Text> : null
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}>
                {t(tab.label)}
              </Text>
              {activeTab === tab.key && <View style={styles.activeTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      {loading ? (
        <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color="#22C55E" size="large" /></View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}>          
          {activeTab === 'Standings' && <TeamTable teamData={teamData} />}
          {activeTab === 'Fixtures' && <TeamMatches teamData={teamData} type="fixtures" />}
          {activeTab === 'Results' && <TeamMatches teamData={teamData} type="results" />}
          {activeTab === 'Stats' && (
            <View style={styles.statsContainer}>
              {/* Top Scorers */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Top Scorers</Text>
                {teamData.topScorers?.length ? teamData.topScorers.map((player, idx) => (
                  <View key={idx} style={styles.statRow}>
                    <Text style={styles.position}>{idx + 1}</Text>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerMatches}>{player.matches} matches</Text>
                    </View>
                    <Text style={styles.statValue}>{player.goals}</Text>
                  </View>
                )) : <Text style={styles.noDataText}>No scorer data available</Text>}
              </View>
              
              {/* Top Assists */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Top Assists</Text>
                {teamData.topAssists?.length ? teamData.topAssists.map((player, idx) => (
                  <View key={idx} style={styles.statRow}>
                    <Text style={styles.position}>{idx + 1}</Text>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerMatches}>{player.matches} matches</Text>
                    </View>
                    <Text style={styles.statValue}>{player.assists}</Text>
                  </View>
                )) : <Text style={styles.noDataText}>No assist data available</Text>}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  // Standardized header styles - matching CompetitionScreen exactly
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#181A20',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 15,
    paddingBottom: 4,
  },
  backArrow: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: '',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  icon: {
    fontSize: 18,
    color: '#fff',
  },
  // Team info section
  teamInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogoBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.18)'
  },
  teamDetailsCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  teamCountry: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  teamName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  teamLeague: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    backgroundColor: '#181A20',
    paddingTop: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#22C55E',
    fontWeight: 'bold',
  },
  activeTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statsSection: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  position: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerMatches: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  statValue: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noDataText: {
    color: '#777',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TeamDetailsScreen;