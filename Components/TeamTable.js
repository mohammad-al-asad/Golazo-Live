import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import RemoteLogo from './RemoteLogo';
import { useNavigation } from '@react-navigation/native';
import { rs } from '../Utils/responsive';

const TeamTable = ({ teamData }) => {
  const navigation = useNavigation();

  const getRowStyle = (pos) => {
    if (pos <= 4) return styles.championsRow;
    if (pos === 5 || pos === 6) return styles.europaRow;
    if (pos >= 18) return styles.relegationRow;
    return {};
  };

  const getPosColor = (pos) => {
    if (pos === 1) return '#22C55E';
    if (pos === 2) return '#16A34A';
    if (pos === 3) return '#0E9F6E';
    if (pos === 4) return '#0E7490';
    if (pos === 5 || pos === 6) return '#FFD700';
    if (pos >= 18) return '#FF4444';
    return '#cccccc';
  };

  const handleTeamPress = (row) => {
    if (!row || !row.teamId) return;
    navigation.navigate('TeamDetailsScreen', {
      teamData: {
        id: row.teamId,
        name: row.club,
        league: teamData.league,
        leagueId: teamData.leagueId,
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>#</Text>
        <Text style={[styles.headerCell, { flex: 3 }]}>Club</Text>
        <Text style={styles.headerCell}>PL</Text>
        <Text style={styles.headerCell}>GD</Text>
        <Text style={styles.headerCell}>PTS</Text>
      </View>

      <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
        {teamData.standings?.map(row => (
          <TouchableOpacity
            key={row.teamId ?? row.pos}
            style={[styles.row, getRowStyle(row.pos)]}
            onPress={() => handleTeamPress(row)}
            activeOpacity={0.8}
          >
            <Text style={[styles.cell, { color: getPosColor(row.pos), fontWeight: 'bold' }]}>{row.pos}</Text>
            <View style={[styles.cell, styles.clubCell, { flex: 3 }]}> 
              <RemoteLogo kind="team" teamId={row.teamId} teamName={row.club} logoUrl={row.teamLogo} size={rs(20)} style={{ marginRight: 12 }} />
              <Text style={styles.clubName} numberOfLines={1}>{row.club}</Text>
            </View>
            <Text style={styles.cell}>{row.pl}</Text>
            <Text style={styles.cell}>{row.gd}</Text>
            <Text style={[styles.cell, { color: getPosColor(row.pos), fontWeight: 'bold' }]}>{row.pts}</Text>
          </TouchableOpacity>
        ))}
        {!teamData.standings?.length && <Text style={{color:'#777',textAlign:'center',marginTop:16}}>Standings unavailable.</Text>}
      </ScrollView>

      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
        <Text style={styles.legendText}>Champions League</Text>
        <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
        <Text style={styles.legendText}>Europa League</Text>
        <View style={[styles.legendDot, { backgroundColor: '#FF4444' }]} />
        <Text style={styles.legendText}>Relegation</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#181A20',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 6,
    marginBottom: 6,
  },
  headerCell: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    minHeight: 48,
  },
  cell: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
  clubCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    textAlign: 'left',
  },
  clubName: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  championsRow: {
    backgroundColor: 'rgba(34,197,94,0.15)'
  },
  europaRow: {
    backgroundColor: 'rgba(255,215,0,0.10)'
  },
  relegationRow: {
    backgroundColor: 'rgba(255,77,77,0.10)'
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 4,
    marginBottom: 2,
  },
  legendText: {
    color: '#cccccc',
    fontSize: 12,
    marginRight: 12,
  },
});

export default TeamTable;