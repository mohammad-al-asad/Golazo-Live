import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LEAGUES, SEASONS } from '../Config/leagues';
import { fetchTeamsByLeague, fetchPlayersByTeam, fetchTeamsByLeagueWithFallback, fetchPlayersByTeamWithFallback } from '../Utils/apiFootball';
import { getFavoriteCompetitions, getFavoriteTeams } from '../Utils/favoriteStorage';
import RemoteLogo from './RemoteLogo';

// Backend-ready player data structure
export const playerData = {
  id: 1,
  name: 'Andre Ter Stegen',
  position: 'Goalkeeper',
  number: '1',
  icon: '🧤',
  team: 'FC Barcelona',
  teamLogo: '🔴',
  nationality: '🇩🇪',
  age: 31,
  height: '187 cm',
  weight: '85 kg',
  foot: 'Right',
  marketValue: '12.5M €',
  contractUntil: '30 Jun 2025',
  currentSeason: {
    appearances: 28,
    goals: 0,
    assists: 1,
    yellowCards: 2,
    redCards: 0,
    cleanSheets: 15,
    saves: 89,
    savePercentage: 78.5
  },
  performance: {
    defending: 85,
    heading: 72,
    dribbling: 45,
    passing: 88,
    shooting: 25,
    physical: 82
  },
  stats: [
    { label: 'Appearances', value: '28' },
    { label: 'Goals', value: '0' },
    { label: 'Assists', value: '1' },
    { label: 'Clean Sheets', value: '15' },
    { label: 'Saves', value: '89' },
    { label: 'Save %', value: '78.5%' }
  ]
};

const Player = () => {
  const navigation = useNavigation();
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [favoriteTeams, setFavoriteTeams] = useState([]);
  const [favoritePlayerIds, setFavoritePlayerIds] = useState([]);

  // Load players when component comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPlayersFromFavoriteTeams();
    }, [])
  );

  const loadPlayersFromFavoriteTeams = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      
      // Get favorite team IDs
      const favoriteTeamIds = await getFavoriteTeams();
      console.log('[DEBUG] Player.js - Favorite team IDs:', favoriteTeamIds);
      
      if (favoriteTeamIds.length === 0) {
        console.log('[DEBUG] Player.js - No favorite teams found');
        setPlayers({});
        setFavoriteTeams([]);
        setLoading(false);
        return;
      }

      // Get favorite competitions to find league names (original working logic)
      const favoriteCompetitionIds = await getFavoriteCompetitions();
      const favLeagues = LEAGUES.filter(league => favoriteCompetitionIds.includes(league.id));
      console.log('[DEBUG] Player.js - Favorite leagues:', favLeagues.map(l => l.name));
      
      // Get all teams from favorite leagues to match team IDs with names
      const allTeams = [];
      
      for (const league of favLeagues) {
        try {
          const targetSeason = league.season || SEASONS[0]; // Use league-specific season
          console.log(`[DEBUG] Player.js - Fetching teams for ${league.name} (season ${targetSeason})`);
          
          // Use fallback approach for international tournaments
          const { season: actualSeason, teams: leagueTeams } = await fetchTeamsByLeagueWithFallback(
            league.id, 
            [targetSeason, ...SEASONS.filter(s => s !== targetSeason)]
          );
          
          console.log(`[DEBUG] Player.js - Found ${leagueTeams.length} teams in ${league.name}`);
          
          const teamsWithLeague = leagueTeams.map(team => ({
            ...team,
            leagueName: league.name,
            season: actualSeason, // Store the season that worked
          }));
          allTeams.push(...teamsWithLeague);
        } catch (err) {
          console.warn(`[DEBUG] Player.js - Failed to fetch teams for ${league.name}:`, err.message);
        }
      }

      // Filter to only favorite teams
      const favoriteTeamsData = allTeams.filter(team => favoriteTeamIds.includes(team.id));
      console.log('[DEBUG] Player.js - Favorite teams data:', favoriteTeamsData.map(t => `${t.name} (${t.leagueName})`));
      setFavoriteTeams(favoriteTeamsData);

      // Fetch players from all favorite teams
      const groupedPlayers = {};
      
      for (const team of favoriteTeamsData) {
        try {
          console.log(`[DEBUG] Player.js - Fetching players for ${team.name} (season ${team.season})`);
          
          // Use the simple fetchPlayersByTeam function (original working method)
          const teamPlayers = await fetchPlayersByTeam(team.id, team.season);
          console.log(`[DEBUG] Player.js - Found ${teamPlayers.length} players for ${team.name}`);
          
          const playersWithTeam = teamPlayers.map(player => ({
            ...player,
            teamName: team.name,
            teamLogo: team.logo,
            leagueName: team.leagueName,
            teamId: team.id,
            season: team.season,
            favorite: false,
          }));
          
          if (playersWithTeam.length > 0) {
            groupedPlayers[team.name] = playersWithTeam.sort((a, b) => a.name.localeCompare(b.name));
          }
        } catch (err) {
          console.warn(`[DEBUG] Player.js - Failed to fetch players for ${team.name}:`, err.message);
        }
      }

      console.log('[DEBUG] Player.js - Final grouped players:', Object.keys(groupedPlayers));
      setPlayers(groupedPlayers);
    } catch (err) {
      console.error('[DEBUG] Player.js - Error in loadPlayersFromFavoriteTeams:', err.message);
      setError('Failed to load players. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlayersFromFavoriteTeams();
  };

  const handlePlayerPress = (player) => {
    // Navigate to player details
    navigation.navigate('PlayerDetailsScreen', {
      playerData: {
        id: player.id,
        name: player.name,
        position: player.position,
        number: player.number,
        age: player.age,
        nationality: player.nationality,
        height: player.height,
        weight: player.weight,
        photo: player.photo,
        teamName: player.teamName,
        teamLogo: player.teamLogo,
        leagueName: player.leagueName,
        teamId: player.teamId,
        season: player.season, // Pass the season to PlayerDetailsScreen
        statistics: player.statistics,
      }
    });
  };

  const togglePlayerFavorite = (playerId) => {
    setPlayers(prev => {
      const updated = {};
      Object.keys(prev).forEach(teamName => {
        updated[teamName] = prev[teamName].map(player =>
          player.id === playerId ? { ...player, favorite: !player.favorite } : player
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
          <Text style={styles.loadingText}>Loading players...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPlayersFromFavoriteTeams}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (Object.keys(players).length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>No Players Found</Text>
          <Text style={styles.emptyMessage}>
            To see players here, please add teams to your favorites in the Teams tab.
          </Text>
          <Text style={styles.emptyNote}>
            💡 Tip: First add leagues to favorites in Competitions, then add teams to favorites in Teams
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
        {/* Show which teams players are from */}
        {favoriteTeams.length > 0 && (
          <View style={styles.teamsInfo}>
            <Text style={styles.teamsTitle}>
              Players from {favoriteTeams.length} favorite team{favoriteTeams.length !== 1 ? 's' : ''}:
            </Text>
            <Text style={styles.teamsList}>
              {favoriteTeams.map(t => t.name).join(', ')}
            </Text>
          </View>
        )}

        {/* Render players grouped by team */}
        {Object.keys(players).map(teamName => (
          <View key={teamName} style={styles.teamSection}>
            {/* Team Divider */}
            <View style={styles.teamDivider}>
              <View style={styles.teamDividerLine} />
              <View style={styles.teamDividerContent}>
                <RemoteLogo 
                  kind="team" 
                  teamId={favoriteTeams.find(t => t.name === teamName)?.id} 
                  teamName={teamName} 
                  size={24} 
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.teamDividerText}>{teamName}</Text>
                <Text style={styles.playerCount}>({players[teamName].length})</Text>
              </View>
              <View style={styles.teamDividerLine} />
            </View>

            {/* Players Grid for this team */}
            <View style={styles.playersGrid}>
              {players[teamName].map(player => (
                <TouchableOpacity
                  key={`${player.id}-${player.teamId}`}
                  style={styles.playerCard}
                  onPress={() => handlePlayerPress(player)}
                  activeOpacity={0.85}
                >
                  <RemoteLogo
                    kind="player"
                    playerId={player.id}
                    playerName={player.name}
                    playerTeamId={player.teamId}
                    logoUrl={player.photo}
                    size={44}
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={styles.playerNameText} numberOfLines={2}>{player.name}</Text>
                  <Text style={styles.playerMeta} numberOfLines={1}>{player.position}{player.number ? `  #${player.number}` : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.hintContainer}>
          <Text style={styles.hint}>Tap a player to view details</Text>
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
  goToTeamsButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goToTeamsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamsInfo: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  teamsTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teamsList: {
    color: '#ccc',
    fontSize: 12,
  },
  teamSection: {
    marginBottom: 24,
  },
  teamDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  teamDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  teamDividerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#0F0F0F',
  },
  teamDividerText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  playerCount: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
  },
  playerCard: {
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 18,
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    minHeight: 140,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  playerNameText: { color:'#fff', fontSize:12, fontWeight:'600', textAlign:'center', minHeight:30, paddingHorizontal:2 },
  playerMeta: { color:'#22C55E', fontSize:10, fontWeight:'600', marginTop:4 },
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

export default Player;