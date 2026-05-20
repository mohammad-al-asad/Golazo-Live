import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import CompetitionResults from '../Components/CompetitionResults';
import CompetitionFixtures from '../Components/CompetitionFixtures';
import CompetitionStandings from '../Components/CompetitionStandings';
import CompetitionStats from '../Components/CompetitionStats';
import RemoteLogo from '../Components/RemoteLogo';
import { fetchStandings, fetchStandingsWithFallback } from '../Utils/apiFootball';
import { SEASONS, LEAGUES } from '../Config/leagues';
import { getFavoriteCompetitions, toggleCompetitionFavorite } from '../Utils/favoriteStorage';

const Stack = createStackNavigator();

const TABS = [
  { key: 'Standings', label: 'Standings' },
  { key: 'Fixtures', label: 'Fixtures' },
  { key: 'Results', label: 'Results' },
  { key: 'Stats', label: 'Stats' },
];

const CompetitionMainScreen = ({ route }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('Standings');
  const [loading, setLoading] = useState(true);
  const [competitionData, setCompetitionData] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [seasonIndex, setSeasonIndex] = useState(0); // allow future season switching (global fallback)
  const leagueId = route?.params?.leagueId;
  const leagueName = route?.params?.leagueName;
  const leagueKey = route?.params?.leagueKey;
  const routeSeason = route?.params?.season; // Get season from route params

  // Load meta via standings (gives us season table and rounds) as first quick data
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function load() {
      if (!leagueId) {
        setLoading(false);
        return;
      }
      setLoading(true);
  // Prefer route season, then league-specific explicit season if defined in config; otherwise global list
  const leagueConfig = LEAGUES.find(l => l.id === leagueId);
  const season = routeSeason || leagueConfig?.season || SEASONS[seasonIndex];
      try {
        // Attempt direct season first; if empty, fallback across all seasons list
        let table = await fetchStandings(leagueId, season, controller.signal);
        if (!table.length) {
          const fb = await fetchStandingsWithFallback(leagueId, [season, ...SEASONS.filter(s=>s!==season)], controller.signal);
          table = fb.table;
        }
        // Derive matchweek approximation from most played games among top teams (flatten table since it's a 2D array of groups)
        const flatTable = table.flat();
        const maxPlayed = flatTable.reduce((m, r) => Math.max(m, r.played || r.all?.played || 0), 0);
        if (mounted) {
          setCompetitionData(prev => ({
            id: leagueId,
            name: leagueName || prev?.name || 'Competition',
            key: leagueKey,
            logo: leagueConfig?.logo || prev?.logo,
            country: table?.[0]?.team?.country || prev?.country || '',
            flag: route?.params?.flag || prev?.flag || '🏳️',
            season,
            matchweek: maxPlayed || prev?.matchweek || 1,
          }));
        }
      } catch (e) {
        if (mounted) {
          const leagueConfig = LEAGUES.find(l => l.id === leagueId);
          const fallbackSeason = routeSeason || leagueConfig?.season || SEASONS[0];
          setCompetitionData({ 
            id: leagueId, 
            name: leagueName, 
            logo: leagueConfig?.logo,
            season: fallbackSeason, 
            matchweek: 1, 
            flag: '🏳️', 
            country: '' 
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; controller.abort(); };
  }, [leagueId, leagueName, leagueKey, routeSeason, seasonIndex, route?.params?.flag]);

  // load favorite status
  useEffect(() => {
    const loadFav = async () => {
      if (!leagueId) return;
      const favs = await getFavoriteCompetitions();
      setIsFavorite(favs.includes(leagueId));
    };
    loadFav();
  }, [leagueId]);

  const handleToggleFavorite = async () => {
    if (!leagueId) return;
    await toggleCompetitionFavorite(leagueId);
    const favs = await getFavoriteCompetitions();
    setIsFavorite(favs.includes(leagueId));
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View>
            <Text style={styles.backArrow}>‹</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('Competition')}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconButton} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{isFavorite ? '★' : '☆'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Competition Info */}
      {competitionData && (
        <View style={styles.competitionInfo}>
          <View style={styles.competitionHeader}>
            <View style={styles.flagContainer}>
              <RemoteLogo kind="league" leagueId={competitionData.id} leagueName={competitionData.name} logoUrl={competitionData.logo} size={72} style={{ backgroundColor:'transparent' }} />
              <Text style={styles.flagOverlay}>{competitionData.flag}</Text>
            </View>
            <View style={[styles.competitionDetails, { paddingLeft: 14 }] }>
              <Text style={styles.competitionCountry}>{competitionData.country}</Text>
              <Text style={styles.competitionName}>{competitionData.name}</Text>
              <Text style={styles.competitionSeason}>
                {competitionData.season} • {t('Matchweek')} {competitionData.matchweek}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}>
                {t(tab.label)}
              </Text>
              {activeTab === tab.key && <View style={styles.activeTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {loading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#22C55E" size="large" />
          </View>
        )}
        {!loading && competitionData && (
          <>
            {activeTab === 'Standings' && <CompetitionStandings competitionData={competitionData} />}
            {activeTab === 'Fixtures' && <CompetitionFixtures competitionData={competitionData} />}
            {activeTab === 'Results' && <CompetitionResults competitionData={competitionData} />}
            {activeTab === 'Stats' && <CompetitionStats competitionData={competitionData} />}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

// Stack Navigator for Competition Screen
const CompetitionScreen = ({ route }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="CompetitionMain"
        component={CompetitionMainScreen}
        initialParams={route?.params}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 15,
  paddingTop: 50,
  backgroundColor: '#181A20',
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    marginRight: 15,
    paddingBottom: 4,
  },
  backArrow: {
  color: '#fff',
  fontSize: 22,
  fontWeight: '700',
  marginHorizontal: 8,
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
  competitionInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12, // Reduced padding
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  competitionHeader: {
    flexDirection: 'row', // Changed to row for side-by-side layout
    alignItems: 'center',
  },
  flagContainer: {
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 18,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.18)',
  },
  flagOverlay: {
    position: 'absolute',
    bottom: -2, // Adjusted position
    right: -2, // Adjusted position
    fontSize: 14, // Reduced size
  },
  competitionFlag: {
    fontSize: 24, // Reduced size
  },
  competitionDetails: {
    alignItems: 'flex-start', // Align text to the left
    flex: 1,
  },
  competitionCountry: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  competitionName: {
    color: '#fff',
    fontSize: 18, // Slightly reduced font size
    fontWeight: '700',
  marginBottom: 6,
    textAlign: 'left',
  },
  competitionSeason: {
    color: '#cccccc',
    fontSize: 12, // Slightly reduced font size
    fontWeight: '500',
  },
  tabsContainer: {
    backgroundColor: '#181A20',
    paddingTop: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#22C55E',
    fontWeight: 'bold',
  },
  activeTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingTop: 5,
    backgroundColor: '#181A20',
  },
});

export default CompetitionScreen;