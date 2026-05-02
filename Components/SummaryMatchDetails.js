import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SummaryMatchDetails = ({ summary }) => {
  if (!summary) return null;

  return (
    <View>
      {/* Events */}
      <View style={styles.summaryBox}>
        {summary.events.map((event, idx) => {
          if (event.type === 'sub') {
            return (
              <Text key={idx} style={styles.eventText}>
                <Text style={styles.in}>In : {event.in}</Text>{' '}
                <Text style={styles.out}>Out : {event.out}</Text>{' '}
                <Text style={styles.minute}>{event.minute}'</Text>
              </Text>
            );
          }
          if (event.type === 'goal') {
            return (
              <Text key={idx} style={styles.eventText}>
                {event.player} <Text style={styles.goal}>⚽</Text> {event.minute}'{event.assist ? `  Asst : ${event.assist}` : ''}
              </Text>
            );
          }
          if (event.type === 'yellow') {
            return (
              <Text key={idx} style={styles.eventText}>
                <Text style={styles.yellow}>🟨</Text> {event.player} {event.minute}'
              </Text>
            );
          }
          return null;
        })}
      </View>

      {/* Halftime */}
      <View style={styles.halfTimeBox}>
        <Text style={styles.halfTimeText}>Half Time</Text>
        <Text style={styles.halfTimeScore}>{summary.halftime.score}</Text>
      </View>

      {/* Kickoff */}
      <View style={styles.kickOffBox}>
        <Text style={styles.kickOffTitle}>Kick Off</Text>
        <Text style={styles.kickOffTime}>{summary.kickoff.time}</Text>
      </View>

      {/* Stadium & Referee */}
      <View style={styles.stadiumBox}>
        <Text style={styles.stadiumTitle}>Stadium: {summary.stadium}</Text>
        <Text style={styles.stadiumTitle}>Referee: {summary.referee}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryBox: {
    backgroundColor: '#222',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    marginBottom: 12,
  },
  eventText: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 4,
  },
  in: { color: '#22C55E', fontWeight: 'bold' },
  out: { color: '#ff4444', fontWeight: 'bold' },
  minute: { color: '#cccccc', fontWeight: 'bold' },
  goal: { color: '#fff', fontWeight: 'bold' },
  yellow: { color: '#FFD700', fontWeight: 'bold' },
  halfTimeBox: {
    backgroundColor: '#222',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  halfTimeText: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  halfTimeScore: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  kickOffBox: {
    backgroundColor: '#222',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  kickOffTitle: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  kickOffTime: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  stadiumBox: {
    backgroundColor: '#222',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  stadiumTitle: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default SummaryMatchDetails;