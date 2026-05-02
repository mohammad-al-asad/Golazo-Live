import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchStandings } from '../Utils/apiFootball';
import { SEASONS } from '../Config/leagues';

// Accept either leagueId (+ season) to fetch or a pre-fetched standings array.
const Standings = ({ leagueId, season = 2025, standings }) => {
  const navigation = useNavigation();
  const [rows, setRows] = useState(Array.isArray(standings) ? standings : []);
  const [loading, setLoading] = useState(!Array.isArray(standings));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (Array.isArray(standings)) return; // external data supplied, no fetch
    if (!leagueId) { setErr('No league provided'); setLoading(false); return; }
    let mounted = true;
    (async () => {
      try {
        setLoading(true); setErr('');
        const trySeasons = [season, ...SEASONS.filter(s => s !== season)];
        let table = [];
        for (const s of trySeasons) {
          const res = await fetchStandings(leagueId, s).catch(()=>[]);
            if (res && res.length) { table = res; break; }
        }
        if (mounted) setRows(table);
        if (mounted && !table.length) setErr('Standings unavailable.');
      } catch (e) {
        if (mounted) setErr('Failed to load standings.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [leagueId, season, standings]);

  if (loading) return <ActivityIndicator style={{ margin: 16 }} color="#22C55E" />;
  if (err) return <Text style={{ color: '#fff', margin: 16 }}>{err}</Text>;
  if (!rows.length) return <Text style={{ color: '#fff', margin: 16 }}>Standings unavailable.</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { width: 28 }]}>#</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Club</Text>
        <Text style={styles.headerCell}>P</Text>
        <Text style={styles.headerCell}>Pts</Text>
      </View>
      <ScrollView style={{ maxHeight: 280 }}>
        {rows.map((r, index) => {
          const isRelegationZone = index >= rows.length - 3; // Last 3 teams
          const isLastTwo = index >= rows.length - 2; // Last 2 teams
          
          return (
            <TouchableOpacity 
              key={r.team?.id} 
              style={[
                styles.row,
                isRelegationZone && styles.relegationRow,
                isLastTwo && styles.lastTwoRow
              ]}
              onPress={() => navigation.navigate('TeamDetailsScreen', {
                teamData: {
                  id: r.team?.id,
                  name: r.team?.name,
                  logo: r.team?.logo,
                  leagueId: leagueId,
                  season: season
                }
              })}
              activeOpacity={0.7}
            >
              <Text style={[styles.cell, { width: 28, textAlign: 'center' }]}>{r.rank}</Text>
              <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{r.team?.name}</Text>
              <Text style={styles.cell}>{r.all?.played}</Text>
              <Text style={[styles.cell, { fontWeight: 'bold' }]}>{r.points}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#181A20', borderRadius: 12, margin: 16, padding: 12 },
  headerRow: { flexDirection: 'row', borderBottomColor: '#333', borderBottomWidth: 1, paddingBottom: 6, marginBottom: 6 },
  headerCell: { color: '#aaa', fontWeight: 'bold', fontSize: 12 },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomColor: '#222', borderBottomWidth: StyleSheet.hairlineWidth },
  relegationRow: { borderLeftColor: '#ff9800', borderLeftWidth: 3 }, // Orange for relegation zone
  lastTwoRow: { borderLeftColor: '#f44336', borderLeftWidth: 3 }, // Red for last 2 teams
  cell: { color: '#fff', fontSize: 12 },
});

export default Standings;