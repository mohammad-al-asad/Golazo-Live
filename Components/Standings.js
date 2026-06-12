import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchStandings } from '../Utils/apiFootball';
import { SEASONS } from '../Config/leagues';

// Accept either leagueId (+ season) to fetch or a pre-fetched standings array.
const Standings = ({ leagueId, season = 2025, standings, teamId }) => {
  const navigation = useNavigation();
  const [rows, setRows] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;

    const processStandings = (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        if (mounted) {
          setRows([]);
          setGroupName('');
          setErr('Standings unavailable.');
        }
        return;
      }

      let targetGroup = data;
      // If data is a 2D array (multi-group), find the group containing teamId
      if (Array.isArray(data[0])) {
        const found = data.find(group => 
          Array.isArray(group) && group.some(row => row?.team?.id === teamId)
        );
        targetGroup = found || data[0] || [];
      }

      if (mounted) {
        setRows(targetGroup);
        setGroupName(targetGroup[0]?.group || '');
        setErr('');
      }
    };

    if (Array.isArray(standings)) {
      processStandings(standings);
      setLoading(false);
      return;
    }

    if (!leagueId) { 
      setErr('No league provided'); 
      setLoading(false); 
      return; 
    }

    (async () => {
      try {
        setLoading(true); setErr('');
        const trySeasons = [season, ...SEASONS.filter(s => s !== season)];
        let table = [];
        for (const s of trySeasons) {
          const res = await fetchStandings(leagueId, s).catch(()=>[]);
          if (res && res.length) { table = res; break; }
        }
        if (mounted) {
          processStandings(table);
        }
      } catch (e) {
        if (mounted) setErr('Failed to load standings.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [leagueId, season, standings, teamId]);

  if (loading) return <ActivityIndicator style={{ margin: 16 }} color="#22C55E" />;
  if (err) return <Text style={{ color: '#fff', margin: 16 }}>{err}</Text>;
  if (!rows.length) return <Text style={{ color: '#fff', margin: 16 }}>Standings unavailable.</Text>;

  return (
    <View style={styles.container}>
      {groupName ? (
        <Text style={styles.groupTitle}>{groupName}</Text>
      ) : null}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { width: 28, textAlign: 'center' }]}>#</Text>
        <Text style={[styles.headerCell, { flex: 1, paddingLeft: 8 }]}>Club</Text>
        <Text style={[styles.headerCell, { width: 35, textAlign: 'center' }]}>P</Text>
        <Text style={[styles.headerCell, { width: 45, textAlign: 'center' }]}>Pts</Text>
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
              <Text style={[styles.cell, { flex: 1, paddingLeft: 8 }]} numberOfLines={1}>{r.team?.name}</Text>
              <Text style={[styles.cell, { width: 35, textAlign: 'center' }]}>{r.all?.played}</Text>
              <Text style={[styles.cell, { width: 45, textAlign: 'center', fontWeight: 'bold' }]}>{r.points}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  groupTitle: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  container: { backgroundColor: '#181A20', borderRadius: 12, margin: 16, padding: 12 },
  headerRow: { flexDirection: 'row', borderBottomColor: '#333', borderBottomWidth: 1, paddingBottom: 6, marginBottom: 6 },
  headerCell: { color: '#aaa', fontWeight: 'bold', fontSize: 12 },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomColor: '#222', borderBottomWidth: StyleSheet.hairlineWidth },
  relegationRow: { borderLeftColor: '#ff9800', borderLeftWidth: 3 }, // Orange for relegation zone
  lastTwoRow: { borderLeftColor: '#f44336', borderLeftWidth: 3 }, // Red for last 2 teams
  cell: { color: '#fff', fontSize: 12 },
});

export default Standings;