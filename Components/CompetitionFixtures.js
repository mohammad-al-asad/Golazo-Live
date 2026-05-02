import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import RemoteLogo from './RemoteLogo';
import { fetchFixtures, mapFixtureToCard } from '../Utils/apiFootball';
import { SEASONS } from '../Config/leagues';

const CompetitionFixtures = ({ competitionData }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fixtures, setFixtures] = useState([]);
  const season = competitionData?.season || SEASONS[0];
  const leagueId = competitionData?.id;

  const load = async (opts={}) => {
    if(!leagueId) return;
    if(!opts.silent) setLoading(true);
    try {
      const raw = await fetchFixtures({ leagueId, season, next: 20 });
      const mapped = raw.map(mapFixtureToCard).filter(f=>f.statusShort==='NS' || f.statusShort==='TBD' || f.statusShort==='PST');
      setFixtures(mapped.sort((a,b)=> new Date(a.date)-new Date(b.date)));
    } catch(e) {} finally { setLoading(false);} };

  useEffect(()=>{ load(); }, [leagueId, season]);

  const onRefresh = async () => { setRefreshing(true); await load({silent:true}); setRefreshing(false); };

  if (loading) {
    return <View style={[styles.container,{alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color="#22C55E" /></View>;
  }
  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}>      
      <Text style={styles.matchweekTitle}>Upcoming Fixtures</Text>
      {fixtures.map(match => {
  const dt = new Date(match.date);
  const timeStr = dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        return (
          <View key={match.id} style={styles.matchCard}>
            <View style={styles.matchRow}>
              <View style={styles.teamCompact}>
                <RemoteLogo kind="team" teamId={match.home.id} teamName={match.home.name} logoUrl={match.home.logo} size={20} style={{ marginRight: 8 }} />
                <Text style={styles.teamName} numberOfLines={1}>{match.home.name}</Text>
              </View>

              <View style={styles.scoreCompact}>
                <Text style={styles.timeText}>{timeStr}</Text>
                <Text style={styles.vsText}>vs</Text>
              </View>

              <View style={[styles.teamCompact, { alignItems: 'flex-end' }]}>
                <Text style={styles.teamName} numberOfLines={1}>{match.away.name}</Text>
                <RemoteLogo kind="team" teamId={match.away.id} teamName={match.away.name} logoUrl={match.away.logo} size={20} style={{ marginLeft: 8 }} />
              </View>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>
                {dt.toLocaleDateString([], { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: dt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
              </Text>
            </View>
          </View>
        );
      })}
      {!fixtures.length && <Text style={{color:'#777',textAlign:'center',marginTop:32}}>No upcoming fixtures found.</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  matchweekTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingVertical: 10,
  },
  matchCard: {
    backgroundColor: '#222',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 64,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreCompact: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  vsText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  dateTimeContainer: {
    alignItems: 'center',
    paddingTop: 6,
  },
  dateRow: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bottomCenterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});

export default CompetitionFixtures;