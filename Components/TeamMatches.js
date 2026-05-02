import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { wp, hp, rs } from '../Utils/responsive';
import RemoteLogo from './RemoteLogo';

const TeamMatches = ({ teamData, type = 'recent' }) => {
  const getTitle = () => {
    switch(type) {
      case 'fixtures': return 'Upcoming Fixtures';
      case 'results': return 'Recent Results';
      default: return 'Recent Matches';
    }
  };

  const getMatches = () => {
    switch(type) {
      case 'fixtures': return teamData.upcomingMatches || [];
      case 'results': return teamData.recentMatches || [];
      default: return teamData.recentMatches || [];
    }
  };

  const matches = getMatches();
  
  console.log(`[DEBUG] TeamMatches - Type: ${type}`, {
    teamDataKeys: Object.keys(teamData || {}),
    matchesLength: matches.length,
    upcomingMatches: teamData?.upcomingMatches?.length || 0,
    recentMatches: teamData?.recentMatches?.length || 0,
    teamName: teamData?.name || 'Unknown'
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{getTitle()}</Text>
  {matches.map((m,idx) => {
        const dt = new Date(m.date || m.fixtureDate || Date.now());
  // Date/time removed per request
        const rawScore = (m.score && typeof m.score === 'string') ? m.score : (m.score?.home != null ? `${m.score.home}-${m.score.away}` : '-');
        const opponentName = m.opponent || m.awayName || m.away?.name || m.opponentName || '';
        const opponentId = m.opponentId || m.awayId || m.away?.id || null;
        const opponentLogo = m.opponentLogo || m.away?.logo || m.awayLogo || null;

        const key = m.fixtureId || m.id || `${m.date || m.fixtureDate}-${opponentName}-${idx}`;
        return (
          <View key={key} style={styles.matchCard}>
            <View style={styles.matchRow}>
              <View style={styles.teamCompact}>
                <RemoteLogo kind="team" teamId={teamData.id} teamName={teamData.name} logoUrl={teamData.logo} size={20} style={{ marginRight: 8 }} />
                <Text style={styles.teamName} numberOfLines={1}>{teamData.name}</Text>
              </View>

              <View style={styles.scoreCompact}>
                <Text style={styles.scoreText}>{rawScore}</Text>
                {type === 'fixtures' ? (
                  <Text style={styles.timeText}>
                    {dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: false})}
                  </Text>
                ) : (
                  <Text style={styles.vsText}>{m.status || m.statusShort || ''}</Text>
                )}
              </View>

              <View style={[styles.teamCompact, { alignItems: 'flex-end' }]}>
                <Text style={styles.teamName} numberOfLines={1}>{opponentName}</Text>
                <RemoteLogo kind="team" teamId={opponentId} teamName={opponentName} logoUrl={opponentLogo} size={20} style={{ marginLeft: 8 }} />
              </View>
            </View>
            {(type === 'fixtures' || type === 'results') && (
              <View style={styles.bottomCenterRow}>
                <Text style={styles.dateText}>
                  {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
        );
      })}
      {!matches.length && <Text style={{color:'#777',textAlign:'center',marginTop:32}}>No {type === 'fixtures' ? 'upcoming fixtures' : 'recent matches'}.</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(5.3),
  },
  sectionTitle: {
    color: '#fff',
    fontSize: rs(18),
    fontWeight: 'bold',
    marginBottom: hp(1.6),
    paddingVertical: hp(1),
  },
  matchCard: {
    backgroundColor: '#222',
    borderRadius: rs(10),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.5),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: '#333',
    minHeight: hp(6.4),
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
    width: wp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    color: '#fff',
    fontSize: rs(14),
    fontWeight: '500',
    flex: 1,
  },
  vsText: {
    color: '#22C55E',
    fontSize: rs(12),
    fontWeight: 'bold',
    marginTop: 4,
  },
  dateText: {
    color: '#cccccc',
    fontSize: rs(11),
    fontWeight: '500',
  },
  timeText: {
    color: '#22C55E',
    fontSize: rs(13),
    fontWeight: 'bold',
    marginTop: 2,
  },
  bottomCenterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.8),
  },
  scoreText: {
    color: '#fff',
    fontSize: rs(14),
    fontWeight: 'bold',
  }
});

export default TeamMatches;