import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LEAGUES, SEASONS } from '../Config/leagues';
import { fetchTeamsByLeague, fetchTeamsByLeagueWithFallback } from '../Utils/apiFootball';
import { getFavoriteCompetitions, getFavoriteTeams, toggleTeamFavorite } from '../Utils/favoriteStorage';
import RemoteLogo from './RemoteLogo';


// Removed large static sample dataset
const initialTeams = [];

const Teams = () => {
  const navigation = useNavigation();
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [favoriteLeagues, setFavoriteLeagues] = useState([]);

  const [favoriteTeamIds, setFavoriteTeamIds] = useState([]);

  // Load teams when component comes into focus or favorites change
  useFocusEffect(
    React.useCallback(() => {
      loadTeamsFromFavorites();
    }, [])
  );

  const loadTeamsFromFavorites = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      
      // Get favorite competition IDs and team IDs
      const [favoriteIds, favoriteTeamIds] = await Promise.all([
        getFavoriteCompetitions(),
        getFavoriteTeams()
      ]);
      
      setFavoriteTeamIds(favoriteTeamIds);
      
      if (favoriteIds.length === 0) {
        setTeams({});
        setFavoriteLeagues([]);
        setLoading(false);
        return;
      }

      // Find favorite leagues from config
      const favLeagues = LEAGUES.filter(league => favoriteIds.includes(league.id));
      setFavoriteLeagues(favLeagues);

      // Fetch teams from all favorite leagues for current season
      const allTeams = [];
      // Use league-specific season if defined, else global most recent
      const globalSeason = SEASONS[0]; // Default to 2025
      
      for (const league of favLeagues) {
        try {
          const targetSeason = league.season || globalSeason;
          // Use fallback approach for international tournaments
          const { season: actualSeason, teams: leagueTeams } = await fetchTeamsByLeagueWithFallback(
            league.id, 
            [targetSeason, ...SEASONS.filter(s => s !== targetSeason)]
          );
          // Add league info to each team
          const teamsWithLeague = leagueTeams.map(team => ({
            ...team,
            leagueName: league.name,
            leagueKey: league.key,
            favorite: favoriteTeamIds.includes(team.id),
            season: actualSeason, // Use the season that actually worked
          }));
          allTeams.push(...teamsWithLeague);
        } catch (err) {
          console.warn(`Failed to fetch teams for ${league.name}:`, err);
        }
      }

      // Sort teams alphabetically within each league, then group by league
      const groupedTeams = {};
      allTeams
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(team => {
          if (!groupedTeams[team.leagueName]) {
            groupedTeams[team.leagueName] = [];
          }
          groupedTeams[team.leagueName].push(team);
        });

      setTeams(groupedTeams);
    } catch (err) {
      setError('Failed to load teams. Please try again.');
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeamsFromFavorites();
  };

  const handleTeamPress = (team) => {
    // Navigate to team details - for now use basic team data
    navigation.navigate('TeamDetailsScreen', {
      teamData: {
        id: team.id,
        name: team.name,
        country: team.country,
        league: team.leagueName,
        founded: team.founded,
        logo: team.logo,
        leagueId: team.leagueId || team.league_id || team.leagueId,
        season: team.season, // Pass the season to TeamDetailsScreen
      },
      leagueId: team.leagueId,
    });
  };

  const handleToggleTeamFavorite = async (teamId) => {
    const newFavoriteTeamIds = await toggleTeamFavorite(teamId);
    setFavoriteTeamIds(newFavoriteTeamIds);
    
    setTeams(prev => {
      const updated = {};
      Object.keys(prev).forEach(leagueName => {
        updated[leagueName] = prev[leagueName].map(team =>
          team.id === teamId ? { ...team, favorite: newFavoriteTeamIds.includes(teamId) } : team
        );
      });
      return updated;
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTeamsFromFavorites}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (Object.keys(teams).length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>No Teams Found</Text>
          <Text style={styles.emptyMessage}>
            To see teams here, please add leagues to your favorites in the Competitions tab.
          </Text>
          <Text style={styles.emptyNote}>
            💡 Tip: Use the Follow button on competitions to add them to your favorites.
          </Text>
          
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
      >
        {/* Show which leagues teams are from */}
        {favoriteLeagues.length > 0 && (
          <View style={styles.leaguesInfo}>
            <Text style={styles.leaguesTitle}>
              Teams from {favoriteLeagues.length} favorite league{favoriteLeagues.length !== 1 ? 's' : ''}:
            </Text>
            <Text style={styles.leaguesList}>
              {favoriteLeagues.map(l => l.name).join(', ')}
            </Text>
          </View>
        )}

        {/* Render teams grouped by league */}
        {Object.keys(teams).map(leagueName => (
          <View key={leagueName} style={styles.leagueSection}>
            {/* League Divider */}
            <View style={styles.leagueDivider}>
              <View style={styles.leagueDividerLine} />
              <View style={styles.leagueDividerContent}>
                <RemoteLogo 
                  kind="league" 
                  leagueId={favoriteLeagues.find(l => l.name === leagueName)?.id} 
                  leagueName={leagueName} 
                  size={24} 
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.leagueDividerText}>{leagueName}</Text>
                <Text style={styles.teamCount}>({teams[leagueName].length})</Text>
              </View>
              <View style={styles.leagueDividerLine} />
            </View>

            {/* Teams Grid for this league */}
            <View style={styles.teamsGrid}>
              {teams[leagueName].map(team => (
                <View key={`${team.id}-${team.leagueId}`} style={styles.cardContainer}>
                  <TouchableOpacity 
                    style={[styles.card, team.favorite && styles.cardFavorite]}
                    onPress={() => handleTeamPress(team)}
                    activeOpacity={0.8}
                  >
                    <RemoteLogo 
                      kind="team" 
                      teamId={team.id} 
                      teamName={team.name} 
                      logoUrl={team.logo} 
                      size={48} 
                      style={{ marginBottom: 8 }}
                    />
                    <Text style={styles.name} numberOfLines={2}>{team.name}</Text>
                    <Text style={styles.details}>
                      {team.country}
                    </Text>
                    {team.founded && (
                      <Text style={styles.founded}>Est. {team.founded}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.followButton, team.favorite && styles.followingButton]}
                    onPress={() => handleToggleTeamFavorite(team.id)}
                  >
                    <Text style={[styles.followButtonText, team.favorite && styles.followingButtonText]}>
                      {team.favorite ? '★ Following' : '+ Follow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.hintContainer}>
          <Text style={styles.hint}>Tap a card to open, or Follow to add to favorites.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 16,
    backgroundColor: '#0F0F0F',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  emptyNote: {
    color: '#22C55E',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  goToCompetitionsButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goToCompetitionsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaguesInfo: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 6,
  },
  leaguesTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  leaguesList: {
    color: '#ccc',
    fontSize: 12,
  },
  leagueSection: {
    marginBottom: 24,
  },
  leagueDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  leagueDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  leagueDividerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#0F0F0F',
  },
  leagueDividerText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  teamCount: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
  },
  cardContainer: {
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardFavorite: {
    borderWidth: 1,
    borderColor: '#22C55E',
    backgroundColor: '#1A1E1A',
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    minHeight: 34,
    lineHeight: 17,
  },
  details: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  founded: {
    color: '#666',
    fontSize: 9,
    textAlign: 'center',
  },
  followButton: {
    marginTop: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#22C55E',
  },
  followButtonText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },
  followingButtonText: {
    color: '#fff',
  },
  hintContainer: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default Teams;