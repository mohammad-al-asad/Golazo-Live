import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RemoteLogo from './RemoteLogo';

const H2HMatchDetails = ({ h2h, homeLogo, awayLogo, homeName, awayName }) => {
  if (!h2h) return null;

  const safeHomeLogo = homeLogo || h2h.homeTeamLogo;
  const safeAwayLogo = awayLogo || h2h.awayTeamLogo;
  const safeHomeName = homeName || h2h.homeTeam || '';
  const safeAwayName = awayName || h2h.awayTeam || '';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{h2h.totalMatches} Matches</Text>

      <View style={styles.winsRow}>
        <View style={styles.winBox}>
          <RemoteLogo kind="team" teamName={safeHomeName} logoUrl={safeHomeLogo} size={28} style={{ marginBottom: 2 }} />
          <View style={styles.barBox}>
            <View style={[styles.bar, { width: `${(h2h.homeWins / h2h.totalMatches) * 100}%`, backgroundColor: '#cccccc' }]} />
          </View>
          <Text style={styles.winCount}>{h2h.homeWins}</Text>
        </View>
        <View style={styles.winBox}>
          <RemoteLogo kind="team" teamName={safeAwayName} logoUrl={safeAwayLogo} size={28} style={{ marginBottom: 2 }} />
          <View style={styles.barBox}>
            <View style={[styles.bar, { width: `${(h2h.awayWins / h2h.totalMatches) * 100}%`, backgroundColor: '#cccccc' }]} />
          </View>
          <Text style={styles.winCount}>{h2h.awayWins}</Text>
        </View>
      </View>

      <Text style={styles.drawsText}>{h2h.draws} Draws</Text>
      <Text style={styles.lastTitle}>LAST 5 MATCHES</Text>

      {Array.isArray(h2h.lastMatches) && h2h.lastMatches.map((m, idx) => (
        <View key={idx} style={styles.matchRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateText}>{m.date}</Text>
          </View>
          <View style={styles.teamCol}>
            <View style={styles.teamRow}>
              <RemoteLogo kind="team" teamName={m.homeTeam || safeHomeName} logoUrl={m.homeLogo || safeHomeLogo} size={20} style={{ marginRight: 4 }} />
              <Text style={styles.teamName}>{m.homeTeam || safeHomeName}</Text>
              <Text style={styles.score}>{m.homeScore}</Text>
            </View>
            <View style={styles.teamRow}>
              <RemoteLogo kind="team" teamName={m.awayTeam || safeAwayName} logoUrl={m.awayLogo || safeAwayLogo} size={20} style={{ marginRight: 4 }} />
              <Text style={styles.teamName}>{m.awayTeam || safeAwayName}</Text>
              <Text style={styles.score}>{m.awayScore}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#181A20',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  winsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  winBox: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    fontSize: 22,
    marginBottom: 2,
  },
  barBox: {
    width: '80%',
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    marginVertical: 2,
    overflow: 'hidden',
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  winCount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  drawsText: {
    color: '#cccccc',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 2,
  },
  lastTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateCol: {
    width: 60,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  dateText: {
    color: '#cccccc',
    fontSize: 12,
  },
  teamCol: {
    flex: 1,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  teamName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
    flex: 1,
  },
  score: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default H2HMatchDetails;