import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import RemoteLogo from './RemoteLogo';
import { wp, hp, rs } from '../Utils/responsive';

const TeamOverview = ({ teamData }) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Next Match */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Match</Text>
        <View style={styles.nextMatchCard}>
          <View style={styles.matchHeader}>
            <Text style={styles.matchDate}>{teamData.nextMatch?.date}</Text>
            <Text style={styles.matchTime}>{teamData.nextMatch?.time}</Text>
          </View>
          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              <View style={styles.teamBadge}>
                <RemoteLogo 
                  kind="team" 
                  teamId={teamData?.id} 
                  teamName={teamData?.name} 
                  size={32} 
                />
              </View>
              <Text style={styles.teamName}>{teamData.name}</Text>
            </View>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.teamCol}>
              <View style={styles.teamBadge}>
                <RemoteLogo 
                  kind="team" 
                  teamId={teamData?.nextMatch?.opponentId} 
                  teamName={teamData?.nextMatch?.opponent} 
                  size={32} 
                />
              </View>
              <Text style={styles.teamName}>{teamData.nextMatch?.opponent}</Text>
            </View>
          </View>
          <Text style={styles.venueText}>{teamData.nextMatch?.venue}</Text>
        </View>
      </View>

      {/* Last 5 Matches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 5 Matches</Text>
        <View style={styles.formContainer}>
          {teamData.lastMatches?.map((match, index) => (
            <View key={index} style={[styles.formBadge, getFormBadgeStyle(match.result)]}>
              <Text style={styles.formText}>{match.result}</Text>
            </View>
          ))}
        </View>
        <View style={styles.matchesList}>
          {teamData.recentMatches?.map((match, idx) => (
            <View key={idx} style={styles.matchRow}>
              <View style={styles.matchLeft}>
                <RemoteLogo kind="team" teamId={match.opponentId} teamName={match.opponent} size={20} style={{ marginRight: 8 }} />
                <View style={styles.matchDetails}>
                  <Text style={styles.scoreText}>{match.score}</Text>
                  <Text style={styles.opponentText}>vs {match.opponent}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Top Scorer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Scorer</Text>
        {teamData.topScorers?.slice(0, 3).map((player, index) => (
          <View key={index} style={styles.playerRow}>
            <View style={styles.positionContainer}>
              <Text style={styles.positionText}>{index + 1}</Text>
            </View>
            <RemoteLogo kind="player" playerName={player.name} playerTeamId={teamData?.id} size={28} style={{ marginRight: 10 }} />
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerStats}>{player.matches} matches • {player.goals} goals</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const getFormBadgeStyle = (result) => {
  switch (result) {
    case 'W': return { backgroundColor: '#22C55E' };
    case 'L': return { backgroundColor: '#EF4444' };
    case 'D': return { backgroundColor: '#F59E0B' };
    default: return { backgroundColor: '#6B7280' };
  }
};

const getResultTextStyle = (result) => {
  switch (result) {
    case 'W': return { color: '#22C55E' };
    case 'L': return { color: '#EF4444' };
    case 'D': return { color: '#F59E0B' };
    default: return { color: '#6B7280' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(5.3),
  },
  section: {
    marginBottom: hp(2.4),
    marginTop: hp(1),
  },
  sectionTitle: {
    color: '#fff',
    fontSize: rs(18),
    fontWeight: 'bold',
    marginBottom: hp(1.2),
  },
  nextMatchCard: {
    backgroundColor: '#222',
    borderRadius: rs(12),
    padding: hp(1.6),
    borderWidth: 1,
    borderColor: '#333',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.6),
  },
  matchDate: {
    color: '#cccccc',
    fontSize: rs(14),
    fontWeight: '600',
  },
  matchTime: {
    color: '#22C55E',
    fontSize: rs(16),
    fontWeight: 'bold',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCol: {
    alignItems: 'center',
    flex: 1,
  },
  teamBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  teamName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  vsText: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  venueText: {
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
  },
  formContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  formText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchesList: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  matchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchDetails: {
    flex: 1,
    marginLeft: 16,
  },
  scoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  opponentText: {
    color: '#cccccc',
    fontSize: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#222',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  positionContainer: {
    width: 24,
    alignItems: 'center',
  },
  positionText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerLogo: {
    fontSize: 20,
    marginHorizontal: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerStats: {
    color: '#cccccc',
    fontSize: 12,
  },
  goalsText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TeamOverview;