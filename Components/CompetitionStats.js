import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import RemoteLogo from './RemoteLogo';
import { fetchTopScorers, fetchTopAssists } from '../Utils/apiFootball';
import { SEASONS } from '../Config/leagues';

const CompetitionStats = ({ competitionData }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scorers, setScorers] = useState([]);
  const [assists, setAssists] = useState([]);
  const season = competitionData?.season || SEASONS[0];
  const leagueId = competitionData?.id;

  const load = async (opts={}) => {
    if(!leagueId) return;
    if(!opts.silent) setLoading(true);
    try {
      const [sc, as] = await Promise.all([
        fetchTopScorers(leagueId, season),
        fetchTopAssists(leagueId, season)
      ]);
      setScorers(sc.slice(0,5));
      setAssists(as.slice(0,5));
    } catch(e) {
      setScorers([]); setAssists([]);
    } finally { setLoading(false);} };

  const debounceRef = useRef(null);
  useEffect(()=>{
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { load(); }, 200); // Reduced debounce time
    return () => clearTimeout(debounceRef.current);
  }, [leagueId, season]);
  const onRefresh = async () => { setRefreshing(true); await load({silent:true}); setRefreshing(false); };

  if (loading) return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color="#22C55E" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}>      
      {/* Top Scorers */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Top Scorers</Text>
        {scorers.map(player => (
          <View key={player.playerId} style={styles.statRow}>
            <Text style={styles.position}>{player.rank}</Text>
            <RemoteLogo kind="player" playerId={player.playerId} playerName={player.name} playerTeamId={player.teamId} size={32} style={{marginRight:12}} borderRadius={16} />
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.teamName}>{player.teamName}</Text>
            </View>
            <Text style={styles.statValue}>{player.goals}</Text>
          </View>
        ))}
        {!scorers.length && <Text style={{color:'#777',textAlign:'center'}}>No scorer data.</Text>}
      </View>
      {/* Top Assists */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Top Assists</Text>
        {assists.map(player => (
          <View key={player.playerId} style={styles.statRow}>
            <Text style={styles.position}>{player.rank}</Text>
            <RemoteLogo kind="player" playerId={player.playerId} playerName={player.name} playerTeamId={player.teamId} size={32} style={{marginRight:12}} borderRadius={16} />
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.teamName}>{player.teamName}</Text>
            </View>
            <Text style={styles.statValue}>{player.assists}</Text>
          </View>
        ))}
        {!assists.length && <Text style={{color:'#777',textAlign:'center'}}>No assist data.</Text>}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
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
  teamLogo: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  teamName: {
    color: '#cccccc',
    fontSize: 12,
    marginTop: 2,
  },
  statValue: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'center',
  },
});

export default CompetitionStats;