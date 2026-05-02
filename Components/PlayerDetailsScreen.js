import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import RemoteLogo from './RemoteLogo';
import { SEASONS } from '../Config/leagues';

const { width: screenWidth } = Dimensions.get('window');

const PlayerDetailsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  
  // Get player data from route params (backend-ready)
  const raw = route?.params?.playerData || {};

  // Derive normalized player object from API-rich statistics if present
  const playerData = useMemo(() => {
    const stat = raw.statistics || raw.stats || raw.currentSeason || {};
    const games = stat.games || {};
    const goals = stat.goals || {};
    const cards = stat.cards || {};
    const tackles = stat.tackles || {};
    const passes = stat.passes || {};
    const shots = stat.shots || {};
    const duels = stat.duels || {};
    const phys = stat.dribbles || {};

    const appearances = games.appearences || games.appearances || games.played || raw.appearances || 0;
    const assists = goals.assists != null ? goals.assists : raw.assists || 0;
    const totalGoals = goals.total != null ? goals.total : raw.goals || 0;
    const cleanSheets = stat.goals?.conceded === 0 ? appearances : stat.clean_sheets || raw.cleanSheets || 0; // rough
    const saves = stat.goals?.saves || raw.saves || 0;
    const savePct = stat.goalkeeper && stat.goalkeeper.saves && shots.on ? ((stat.goalkeeper.saves / shots.on) * 100) : raw.savePercentage;

    // Performance bars – map available metrics; fallback simple scaling
    const performance = {
      defending: Math.min(100, Math.round(((tackles.total || 0) + (duels.won || 0)) * 2)),
      heading: Math.min(100, Math.round((duels.won || 0) * 1.5)),
      dribbling: Math.min(100, Math.round((phys.success || 0) * 2)),
      passing: Math.min(100, Math.round(((passes.accuracy || 0) / (passes.total || 1)) * 100) || 0),
      shooting: Math.min(100, Math.round((shots.total || 0) * 3)),
      physical: Math.min(100, Math.round(((duels.total || 0) + (phys.attempts || 0)) )),
    };

    const statsGrid = [
      { label: 'Appearances', value: String(appearances) },
      { label: 'Goals', value: String(totalGoals) },
      { label: 'Assists', value: String(assists) },
    ];
    if (raw.position && raw.position.toLowerCase().includes('keeper')) {
      statsGrid.push({ label: 'Clean Sheets', value: String(cleanSheets) });
      statsGrid.push({ label: 'Saves', value: String(saves) });
      if (savePct) statsGrid.push({ label: 'Save %', value: `${Number(savePct).toFixed(1)}%` });
    } else {
      statsGrid.push({ label: 'Yellow Cards', value: String(cards.yellow || 0) });
      statsGrid.push({ label: 'Red Cards', value: String(cards.red || 0) });
    }

    return {
      id: raw.id,
      name: raw.name,
      position: raw.position || games.position || 'Unknown',
      number: raw.number || games.number || '-'.toString(),
      team: raw.teamName,
      teamLogo: raw.teamLogo,
      nationality: raw.nationality || raw.country,
      age: raw.age,
      height: raw.height,
      weight: raw.weight,
      foot: raw.foot || 'Right',
      marketValue: raw.marketValue || 'N/A',
      contractUntil: raw.contractUntil || '',
      performance,
      stats: statsGrid,
      photo: raw.photo,
      teamId: raw.teamId,
    };
  }, [raw]);

  const handleBack = () => {
    navigation.goBack();
  };

  const renderPerformanceRadar = () => {
    const stats = playerData.performance;
    const maxValue = 100;
    
    return (
      <View style={styles.radarContainer}>
        <View style={styles.radarChart}>
          <Text style={styles.radarLabel}>{t('performance_overview')}</Text>
          <View style={styles.radarStats}>
            {Object.entries(stats).map(([key, value]) => (
              <View key={key} style={styles.radarStatRow}>
                <Text style={styles.radarStatLabel}>{t(key.toLowerCase())}</Text>
                <View style={styles.radarStatBar}>
                  <View 
                    style={[
                      styles.radarStatFill, 
                      { width: `${(value / maxValue) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.radarStatValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderStatsGrid = () => {
    return (
      <View style={styles.statsGrid}>
        {playerData.stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{t(stat.label.toLowerCase().replace(' ', '_').replace('%', '_percent'))}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header - Standardized to match CompetitionScreen */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={{}}>
            <Text style={styles.backArrow}>‹</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('player_details')}</Text>
        </View>
        <View style={styles.headerIcons}>
          
          
        </View>
      </View>

      {/* Player Info */}
      <View style={styles.playerInfo}>
        <View style={styles.playerHeader}>
            <View style={styles.playerIconContainer}>
              <RemoteLogo
                kind="player"
                playerId={playerData.id}
                playerName={playerData.name}
                playerTeamId={playerData.teamId}
                logoUrl={playerData.photo}
                size={76}
                style={{}}
              />
            </View>
          <View style={styles.playerDetails}>
            <Text style={styles.playerTeam}>{playerData.team}</Text>
            <Text style={styles.playerName}>{playerData.name}</Text>
            <Text style={styles.playerPosition}>{t(playerData.position?.toLowerCase?.() || 'unknown')} | #{playerData.number}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('nationality')}</Text>
              <Text style={styles.infoValue}>{playerData.nationality}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('age')}</Text>
              <Text style={styles.infoValue}>{playerData.age} {t('yrs')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('height')}</Text>
              <Text style={styles.infoValue}>{playerData.height || '-'}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('preferred_foot')}</Text>
              <Text style={styles.infoValue}>{t(playerData.foot.toLowerCase())}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('position')}</Text>
              <Text style={styles.infoValue}>{t(playerData.position?.toLowerCase?.() || 'unknown')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('shirt_number')}</Text>
              <Text style={styles.infoValue}>{playerData.number}</Text>
            </View>
          </View>

          <View style={styles.marketValueRow}>
            <Text style={styles.marketValueLabel}>{t('market_value')}</Text>
            <Text style={styles.marketValueText}>{playerData.marketValue}</Text>
          </View>
        </View>

        {/* Current Season Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('season_2024')}</Text>
          {renderStatsGrid()}
        </View>

        {/* Performance Radar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('performance')}</Text>
          {renderPerformanceRadar()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  // Standardized header styles - matching CompetitionScreen exactly
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#181A20',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 15,
    paddingBottom: 4,
  },
  backArrow: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: '',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  icon: {
    fontSize: 18,
    color: '#fff',
  },
  // Player info section
  playerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerHeader: {
    alignItems: 'center',
  },
  playerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  playerIcon: {
    fontSize: 40,
  },
  playerDetails: {
    alignItems: 'center',
  },
  playerTeam: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  playerPosition: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  infoSection: {
    backgroundColor: '#222',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  marketValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  marketValueLabel: {
    color: '#cccccc',
    fontSize: 14,
  },
  marketValueText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    width: (screenWidth - 60) / 3,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    color: '#22C55E',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
  },
  radarContainer: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  radarChart: {
    alignItems: 'center',
  },
  radarLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  radarStats: {
    width: '100%',
  },
  radarStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radarStatLabel: {
    color: '#cccccc',
    fontSize: 14,
    width: 80,
  },
  radarStatBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  radarStatFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  radarStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'right',
  },
});

export default PlayerDetailsScreen;