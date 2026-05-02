import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import RemoteLogo from './RemoteLogo';

const TeamSquads = ({ teamData }) => {
  const renderPlayersList = (players, title) => (
    <View style={styles.positionSection}>
      <Text style={styles.positionTitle}>{title}</Text>
      {players?.map(player => (
        <View key={player.id} style={styles.playerRow}>
          <View style={styles.numberContainer}>
            <Text style={styles.playerNumber}>{player.number || '-'}</Text>
          </View>
          <RemoteLogo kind="player" playerId={player.id} playerName={player.name} playerTeamId={player.teamId} size={40} style={{ marginRight: 12 }} borderRadius={20} />
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerDetails}>{player.nationality} • Age {player.age || '?'} • {player.position}</Text>
          </View>
        </View>
      ))}
      {!players?.length && <Text style={styles.emptyGroup}>No data</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Coach */}
      {teamData.squad?.coach && (
        <View style={styles.coachSection}>
          <Text style={styles.sectionTitle}>Coach</Text>
          <View style={styles.coachCard}>
            <View style={styles.coachImageContainer}>
              <Text style={styles.coachImage}>👔</Text>
            </View>
            <View style={styles.coachInfo}>
              <Text style={styles.coachName}>{teamData.squad?.coach?.name}</Text>
              <Text style={styles.coachRole}>{teamData.squad?.coach?.role}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Goalkeepers */}
      {renderPlayersList(teamData.squad?.goalkeepers, 'Goal Keepers')}

      {/* Defenders */}
      {renderPlayersList(teamData.squad?.defenders, 'Defenders')}

      {/* Midfielders */}
      {renderPlayersList(teamData.squad?.midfielders, 'Midfielders')}

      {/* Forwards */}
      {renderPlayersList(teamData.squad?.forwards, 'Forwards')}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  coachSection: {
    marginBottom: 24,
  },
  coachCard: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  coachImage: {
    fontSize: 30,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  coachRole: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  positionSection: {
    marginBottom: 24,
  },
  positionTitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  playerRow: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  numberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  playerNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerDetails: {
    color: '#cccccc',
    fontSize: 12,
  },
  emptyGroup: { color:'#666', fontSize:12, fontStyle:'italic', paddingHorizontal:8 },
});

export default TeamSquads;