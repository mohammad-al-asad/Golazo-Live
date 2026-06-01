import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, StatusBar, ActivityIndicator, RefreshControl, Animated, Dimensions, SectionList } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LEAGUES, SEASONS, DEFAULT_TIMEZONE } from '../Config/leagues';
import { fetchFixturesBulk, mapFixtureToCard } from '../Utils/apiFootball';
import { smartDataManager } from '../Utils/smartDataManager';
import RemoteLogo from '../Components/RemoteLogo';
import MatchDetailsScreen from './MatchDetailsScreen';
import NotificationsScreen from './NotificationsScreen';
import GolazoLiveScreen from './GolazoLiveScreen';
import CompetitionScreen from './CompetitionScreen';
import TeamDetailsScreen from './TeamDetailsScreen';
import { wp, hp, rs } from '../Utils/responsive';

const Stack = createStackNavigator();

// Date range constants
const PAST_DAYS = 3;
const FUTURE_DAYS = 10;

const SCORE_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_IOS_SCORE_BANNER_AD_UNIT_ID || TestIds.BANNER,
      android: process.env.EXPO_PUBLIC_ANDROID_SCORE_BANNER_AD_UNIT_ID || TestIds.BANNER,
      default: TestIds.BANNER,
    });

function buildDates() {
  const arr = [];
  for (let i = -PAST_DAYS; i <= FUTURE_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    arr.push({
      key: d.toISOString().slice(0, 10),
      offset: i,
      label: d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
    });
  }
  return arr;
}

function LiveTab() {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const topInset = insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0);

  // Header functions
  const handleNotifications = () => {
    navigation.navigate('NotificationsScreen');
  };

  const handleLanguageChange = () => {
    // Toggle language for demo; backend-ready for user preference
    const nextLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const DATES = useMemo(buildDates, []);
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  const debounceRef = useRef();
  // Dynamic window calendar setup: keep only prev/center/next to minimize renders
  const WINDOW_RADIUS = 1; // days each side of center (renders only 3 chips)
  // Animation for See All button
  const seeAllScale = useRef(new Animated.Value(1)).current;

  // (No scrolling needed with window approach)

  // ... no swipe helper; calendar will be changed via taps only

  // Fetch matches for selected date using smartDataManager
  const fetchMatches = useCallback(async (date, isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError('');

      // Get data from smart data manager (uses AsyncStorage caching)
      const result = smartDataManager.getData(date, 'all');
      
      if (result.fromCache) {
        // Show cached data immediately
        setMatches(result.data);
        setLoading(false);
        console.log(`[LiveScreen] ✅ Loaded ${result.data.length} cached matches for ${date}`);
        return result.data;
      }

      // If no cache or refresh requested, show loading and wait for fresh data
      if (!result.fromCache || isRefresh) {
        setLoading(true);
        // Subscribe to updates for this date
        const unsubscribe = smartDataManager.subscribe((dateKey, data) => {
          if (dateKey === date) {
            setMatches(data);
            setLoading(false);
            unsubscribe(); // Unsubscribe after getting the data
          }
        });

        // Force refresh if requested
        if (isRefresh) {
          await smartDataManager.refreshDate(date, 'all');
        }
      }

      return result.data;
    } catch (e) {
      setError('Failed to load matches for this date');
      console.warn('[LiveScreen] Fetch error:', e);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  // Load matches when date changes with a small debounce to avoid rapid network calls
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMatches(selectedDate), 140);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selectedDate, fetchMatches]);

  const shiftDay = useCallback((delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0,10));
  }, [selectedDate]);

  const onSelectDate = useCallback((key) => setSelectedDate(key), []);

  const dateWindow = useMemo(() => {
    const baseDate = new Date(selectedDate);
    const baseTime = baseDate.getTime();
    const arr = [];
    
    for (let i = -WINDOW_RADIUS; i <= WINDOW_RADIUS; i++) {
      const dayTime = baseTime + (i * 24 * 60 * 60 * 1000);
      const d = new Date(dayTime);
      const key = d.toISOString().slice(0, 10);
  // compact label to reduce layout computation for small window
  const label = key === todayKey ? 'Today' : `${d.toLocaleDateString([], { weekday: 'short' })} ${d.getDate()}`;
  arr.push({ key, offset: i, label });
    }
    return arr;
  }, [selectedDate, todayKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMatches(selectedDate, true);
  }, [selectedDate, fetchMatches]);

  // Group matches by league
  const groupedMatches = useMemo(() => {
    if (!matches.length) return [];
    
    const groups = {};
    matches.forEach(match => {
      const leagueId = match.leagueId;
      if (!groups[leagueId]) {
        const league = LEAGUES.find(l => l.id === leagueId);
        groups[leagueId] = {
          leagueId,
          leagueName: match.leagueName,
          leagueLogo: match.leagueLogo,
          flag: league?.flag || '🏳️',
          matches: []
        };
      }
      groups[leagueId].matches.push(match);
    });

    // Sort matches within each league by time
    Object.values(groups).forEach(group => {
      group.matches.sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    return Object.values(groups);
  }, [matches]);

  // Calendar row element memoized to avoid re-renders when unrelated state changes
  const CalendarRowElement = useMemo(() => (
    <View style={styles.windowCalendarContainer}>
      <TouchableOpacity onPress={() => shiftDay(-1)} style={styles.arrowBtn} hitSlop={{top:10,bottom:10,left:10,right:10}}>
        <Text style={styles.arrowText}>{'<'}</Text>
      </TouchableOpacity>
      <View style={styles.windowDatesRow}>
        {dateWindow.map(d => {
          const center = d.offset===0;
          const isToday = d.key===todayKey;
          return (
            <TouchableOpacity
              key={d.key}
              onPress={() => {
                // Restrict movement to one day at a time. Tapping any non-center tile moves only one step towards it.
                if (d.offset === 0) return; // already selected
                if (d.offset === -1) return shiftDay(-1);
                if (d.offset === 1) return shiftDay(1);
                // For offsets beyond 1, move a single step in that direction
                return d.offset < 0 ? shiftDay(-1) : shiftDay(1);
              }}
              activeOpacity={0.85}
              style={styles.windowDateWrap}
            >
              <View style={[styles.windowChip, center && styles.windowChipCenter, isToday && !center && styles.todayOutline]}>
                <Text style={[styles.windowChipText, center && styles.windowChipTextCenter, isToday && !center && styles.todayText]}>{d.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View pointerEvents="none" style={styles.fixedCenterHighlight} />
      </View>
      <TouchableOpacity onPress={() => shiftDay(1)} style={styles.arrowBtn} hitSlop={{top:10,bottom:10,left:10,right:10}}>
        <Text style={styles.arrowText}>{'>'}</Text>
      </TouchableOpacity>
    </View>
  ), [dateWindow, todayKey, shiftDay]);

  const MatchCard = memo(({ match }) => {
    const homeScore = match.score.home ?? 0;
    const awayScore = match.score.away ?? 0;
    
    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => navigation.navigate('MatchDetailsScreen', { 
          fixtureId: match.id, 
          leagueId: match.leagueId 
        })}
        activeOpacity={0.9}
      >
        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            <RemoteLogo 
              kind="team" 
              teamId={match.home.id} 
              teamName={match.home.name} 
              size={rs(22)} 
              style={{ marginRight: wp(2) }} 
              disableShimmer={true}
            />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.home.name}
            </Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.score}>{homeScore} - {awayScore}</Text>
          </View>
          <View style={styles.teamCol}>
            <RemoteLogo 
              kind="team" 
              teamId={match.away.id} 
              teamName={match.away.name} 
              size={rs(22)} 
              style={{ marginRight: wp(2) }} 
              disableShimmer={true}
            />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.away.name}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.minuteMeta}>
            {match.minute || match.statusShort}
          </Text>
          <Text style={styles.timeMeta}>
            {new Date(match.date).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, (prev, next) => {
    const a = prev.match; const b = next.match;
    if (a.id !== b.id) return false;
    const aScoreH = a.score?.home ?? null; const bScoreH = b.score?.home ?? null;
    const aScoreA = a.score?.away ?? null; const bScoreA = b.score?.away ?? null;
    const aState = (a.minute || a.statusShort || '') + '|' + (a.date || '');
    const bState = (b.minute || b.statusShort || '') + '|' + (b.date || '');
    return aScoreH === bScoreH && aScoreA === bScoreA && aState === bState;
  });

  // Prepare sections for SectionList to enable virtualization
  const sections = useMemo(() => {
    const list = groupedMatches.map(g => ({
      leagueId: g.leagueId,
      leagueName: g.leagueName,
      leagueLogo: g.leagueLogo,
      flag: g.flag,
      isAd: false,
      data: g.matches,
    }));

    if (list.length >= 2) {
      list.splice(2, 0, {
        leagueId: 'ad-section',
        isAd: true,
        data: [{ id: 'ad-item' }],
      });
    } else if (list.length > 0) {
      list.push({
        leagueId: 'ad-section',
        isAd: true,
        data: [{ id: 'ad-item' }],
      });
    }

    return list;
  }, [groupedMatches]);

  const renderMatchItem = useCallback(({ item, section }) => {
    if (section.isAd) {
      return (
        <View style={styles.adCard}>
          <BannerAd
            unitId={SCORE_AD_UNIT_ID}
            size={BannerAdSize.MEDIUM_RECTANGLE}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        </View>
      );
    }
    return <MatchCard match={item} />;
  }, []);

  const renderSectionHeader = useCallback(({ section }) => {
    if (section.isAd) return null;
    return (
      <View style={styles.leagueSection}>
        <TouchableOpacity
          style={styles.leagueHeader}
          onPress={() => navigation.navigate('CompetitionScreen', {
            leagueId: section.leagueId,
            leagueName: section.leagueName,
            flag: section.flag,
          })}
          activeOpacity={0.7}
        >
          <View style={styles.leagueInfo}>
            <Text style={styles.leagueFlag}>{section.flag}</Text>
            <RemoteLogo
              kind="league"
              leagueId={section.leagueId}
              leagueName={section.leagueName}
              logoUrl={section.leagueLogo}
              size={rs(20)}
              style={{ marginRight: wp(2) }}
            />
            <Text style={styles.leagueName} numberOfLines={1}>
              {section.leagueName}
            </Text>
          </View>
          <Text style={styles.matchCount}>
            {section.data.length} match{section.data.length !== 1 ? 'es' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent={false} backgroundColor="#0F0F0F" barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 4 }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>{t('golazo')}</Text>
          <Text style={styles.logoDot}>●</Text>
          <Text style={styles.logoLive}>{t('live')}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={handleNotifications}>
            <View style={styles.iconWrapper}>
              <Text style={styles.bellIcon}>🔔</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.languageButton} onPress={handleLanguageChange}>
            <View style={styles.flagContainer}>
              <Text style={styles.flag}>{i18n.language === 'en' ? '🇬🇧' : '🇪🇸'}</Text>
              <Text style={styles.languageText}>{(i18n.language || 'en').toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

  {/* Calendar */}
  {CalendarRowElement}

      

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#22C55E" size="large" />
          <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => fetchMatches(selectedDate)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id?.toString() || item.fixtureId?.toString() || `fallback-${index}`}
          renderItem={renderMatchItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: hp(2) }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#22C55E" 
              colors={['#22C55E']} 
              progressBackgroundColor="#1a1a1a" 
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t('no_matches_for_date') || 'No matches found for this date'}
              </Text>
            </View>
          )}
          ListFooterComponent={() => (
            <View style={styles.seeAllContainer}>
              <Animated.View style={{ transform: [{ scale: seeAllScale }] }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.seeAllButton}
                  onPressIn={() => Animated.spring(seeAllScale, { toValue: 0.96, useNativeDriver: true }).start()}
                  onPressOut={() => Animated.spring(seeAllScale, { toValue: 1, useNativeDriver: true }).start()}
                  onPress={() => navigation.navigate('GolazoLive')}
                >
                  <View style={styles.seeAllGradient}>
                    <Text style={styles.seeAllText}>{t('see_all') || 'See All'} <Text style={styles.seeAllArrow}>→</Text></Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={true}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

export default function LiveScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LiveTab" component={LiveTab} />
      <Stack.Screen name="MatchDetailsScreen" component={MatchDetailsScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="GolazoLive" component={GolazoLiveScreen} />
      <Stack.Screen name="CompetitionScreen" component={CompetitionScreen} />
      <Stack.Screen name="TeamDetailsScreen" component={TeamDetailsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5), 
    paddingBottom: hp(1)
  },
  
  // Logo styles from HomeScreen
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    color: '#ffffff',
    fontSize: rs(24),
    fontWeight: 'bold',
  },
  logoDot: {
    color: '#22C55E',
    fontSize: rs(24),
    fontWeight: 'bold',
    marginHorizontal: wp(1),
  },
  logoLive: {
    color: '#ffffff',
    fontSize: rs(24),
    fontWeight: 'bold',
  },
  
  // Header icons styles from HomeScreen
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  iconButton: {
    padding: wp(1),
  },
  iconWrapper: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: rs(16),
  },
  languageButton: {
    padding: wp(1),
  },
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderRadius: rs(12),
    gap: wp(1),
  },
  flag: {
    fontSize: rs(16),
  },
  languageText: {
    color: '#ffffff',
    fontSize: rs(12),
    fontWeight: '600',
  },
  
  // Component container style
  componentContainer: {
    marginVertical: hp(1),
  },
  
  // Dynamic window calendar styles
  windowCalendarContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: hp(1), paddingHorizontal: wp(3), justifyContent: 'space-between' },
  arrowBtn: { paddingHorizontal: wp(2), paddingVertical: hp(0.5) },
  arrowText: { color: '#fff', fontSize: rs(18), fontWeight: '600' },
  windowDatesRow: { flexDirection: 'row', flex: 1, justifyContent: 'space-around', position: 'relative', marginHorizontal: wp(2) },
  windowDateWrap: { alignItems: 'center' },
  windowChip: { backgroundColor: '#1E1E1E', width: wp(12), height: wp(8), borderRadius: wp(2), alignItems: 'center', justifyContent: 'center' },
  windowChipCenter: { backgroundColor: '#22C55E' },
  windowChipText: { color: '#aaa', fontSize: rs(13), fontWeight: '600', textAlign: 'center' },
  windowChipTextCenter: { color: '#fff', fontWeight: '700' },
  todayOutline: { borderWidth: 1, borderColor: '#2563EB' },
  todayText: { color: '#2563EB', fontWeight: '700' },
  fixedCenterHighlight: { position: 'absolute', width: wp(12), height: wp(8), borderRadius: wp(2), left: '50%', marginLeft: -wp(6), top: 0 },

  // See All Button styles
  seeAllContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    alignItems: 'center',
  },
  seeAllButton: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  seeAllGradient: {
    backgroundColor: 'linear-gradient(90deg, #22C55E 0%, #16A34A 100%)', // fallback for web, will be overridden below
    paddingHorizontal: wp(10),
    paddingVertical: hp(1.6),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 120,
  },
  seeAllText: {
    color: '#fff',
    fontSize: rs(16),
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  seeAllArrow: {
    fontSize: rs(18),
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#fff',
  },

  // Content styles
  content: { flex: 1 },
  loading: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: hp(6) 
  },
  loadingText: { 
    color: '#22C55E', 
    fontSize: rs(14), 
    marginTop: hp(1) 
  },
  errorContainer: { 
    alignItems: 'center', 
    paddingVertical: hp(4) 
  },
  errorText: { 
    color: 'tomato', 
    fontSize: rs(14), 
    textAlign: 'center',
    marginBottom: hp(2) 
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: rs(8)
  },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { 
    alignItems: 'center', 
    paddingVertical: hp(6) 
  },
  emptyText: { 
    color: '#666', 
    fontSize: rs(16), 
    textAlign: 'center' 
  },

  // League section styles
  leagueSection: { 
    marginBottom: hp(2.5),
    paddingHorizontal: wp(4)
  },
  leagueHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    backgroundColor: '#1A1A1A',
    borderRadius: rs(8),
    marginBottom: hp(1)
  },
  leagueInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1
  },
  leagueFlag: { 
    fontSize: rs(16), 
    marginRight: wp(2) 
  },
  leagueName: { 
    color: '#fff', 
    fontSize: rs(16), 
    fontWeight: '600',
    flex: 1
  },
  matchCount: { 
    color: '#22C55E', 
    fontSize: rs(12), 
    fontWeight: '500' 
  },

  // Match card styles
  matchCard: {
    backgroundColor: '#181A20',
    borderRadius: rs(14),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.6),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: '#232323',
  },
  adCard: {
    backgroundColor: '#ffffff',
    borderRadius: rs(14),
    paddingVertical: hp(2),
    paddingHorizontal: wp(3.6),
    marginBottom: hp(2.5),
    marginHorizontal: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  teamsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  teamCol: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '36%' 
  },
  teamName: { 
    color: '#fff', 
    fontSize: rs(13), 
    fontWeight: 'bold', 
    flexShrink: 1 
  },
  scoreBox: { 
    backgroundColor: '#222', 
    borderRadius: rs(10), 
    paddingVertical: hp(0.4), 
    paddingHorizontal: wp(4.5), 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  score: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: rs(17) 
  },
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: hp(0.8) 
  },
  minuteMeta: { 
    color: '#22C55E', 
    fontWeight: 'bold', 
    fontSize: rs(12) 
  },
  timeMeta: { 
    color: '#9CA3AF', 
    fontSize: rs(12) 
  },
});
