import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RemoteLogo from './RemoteLogo';

const resultColors = {
  W: '#22C55E',
  D: '#cccccc',
  L: '#ff4444',
};

const FormMatchDetails = ({ form, homeTeamLogo, awayTeamLogo, homeTeamName, awayTeamName }) => {
  if (!form || !Array.isArray(form.home) || !Array.isArray(form.away)) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <RemoteLogo kind="team" teamName={homeTeamName} logoUrl={homeTeamLogo} size={32} style={{ marginHorizontal: 8 }} />
        <Text style={styles.formTitle}>FORM</Text>
        <RemoteLogo kind="team" teamName={awayTeamName} logoUrl={awayTeamLogo} size={32} style={{ marginHorizontal: 8 }} />
      </View>
      <View style={styles.teamsRow}>
        <Text style={styles.teamName}>{homeTeamName}</Text>
        <Text style={styles.teamName}>{awayTeamName}</Text>
      </View>
      {form.home.map((homeMatch, idx) => {
        const awayMatch = form.away[idx];
        return (
          <View key={idx} style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.competition}>{homeMatch.competition} • {homeMatch.venue}</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.score}>{homeMatch.score}</Text>
                <Text style={styles.resultCircle(resultColors[homeMatch.result])}>{homeMatch.result}</Text>
              </View>
              <Text style={styles.opponent}>{homeMatch.opponent}</Text>
              <RemoteLogo 
                kind="team" 
                teamId={homeMatch.opponentId} 
                teamName={homeMatch.opponent} 
                size={28} 
                style={{ marginTop: 6 }} 
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.competition}>{awayMatch.competition} • {awayMatch.venue}</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.score}>{awayMatch.score}</Text>
                <Text style={styles.resultCircle(resultColors[awayMatch.result])}>{awayMatch.result}</Text>
              </View>
              <Text style={styles.opponent}>{awayMatch.opponent}</Text>
              <RemoteLogo 
                kind="team" 
                teamId={awayMatch.opponentId} 
                teamName={awayMatch.opponent} 
                size={28} 
                style={{ marginTop: 6 }} 
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#181A20',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  formTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  teamLogo: {
    fontSize: 28,
    marginHorizontal: 8,
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  teamName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 10,
    marginHorizontal: 4,
    padding: 8,
  },
  competition: {
    color: '#cccccc',
    fontSize: 11,
    marginBottom: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  score: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 6,
  },
  resultCircle: color => ({
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: color,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 2,
    overflow: 'hidden',
  }),
  opponent: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 2,
  },
});

export default FormMatchDetails;