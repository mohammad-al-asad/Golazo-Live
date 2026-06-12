import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SectionList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LEAGUES } from '../Config/leagues';
import { smartDataManager } from '../Utils/smartDataManager';
import RemoteLogo from './RemoteLogo';
import { wp, hp, rs } from '../Utils/responsive';
import { getLocalDateString } from '../Utils/dateHelpers';

const isFinishedCard = (c) => {
  const s = c.statusShort;
  return s === 'FT' || s === 'AET' || s === 'PEN' || s === 'PST';
};

const groupByLeague = (cards) => {
  const map = new Map();
  for (const c of cards) {
    if (!map.has(c.leagueId)) {
      const league = LEAGUES.find(l => l.id === c.leagueId);
      map.set(c.leagueId, {
        title: c.leagueName,
        leagueId: c.leagueId,
        flag: league?.flag || '🏳️',
        data: [],
      });
    }
    map.get(c.leagueId).data.push(c);
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
};

// Optimized score card component - Direct navigation for better performance
const ScoreCard = React.memo(({ match, navigation }) => {
  return (
    <TouchableOpacity 
      style={styles.matchCard} 
      onPress={() => navigation.navigate('MatchDetailsScreen', { 
        fixtureId: match.id, 
        leagueId: match.leagueId 
      })}
      activeOpacity={0.9}
    >
      <View style={styles.matchRow}>
        <View style={styles.teamContainer}>
          <RemoteLogo
            kind="team"
            teamId={match.home.id}
            teamName={match.home.name}
            logoUrl={match.home.logo}
            size={wp(8)}
            style={styles.teamLogo}
          />
          <Text style={styles.teamName}>{match.home.name}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>{match.score.home ?? '-'}</Text>
            <Text style={styles.scoreSeparator}>:</Text>
            <Text style={styles.scoreText}>{match.score.away ?? '-'}</Text>
          </View>
          <Text style={styles.statusText}>{match.statusShort}</Text>
        </View>
        
        <View style={styles.teamContainer}>
          <Text style={[styles.teamName, styles.teamNameRight]}>{match.away.name}</Text>
          <RemoteLogo
            kind="team"
            teamId={match.away.id}
            teamName={match.away.name}
            logoUrl={match.away.logo}
            size={wp(8)}
            style={styles.teamLogo}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ScoreOptimized = ({ 
  selectedDate, 
  leagueKey = 'all', 
  maxPerLeague = 0, 
  ListHeaderComponent = null, 
  onDidRefresh 
}) => {
  const navigation = useNavigation();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const date = useMemo(() => selectedDate || getLocalDateString(), [selectedDate]);
  const prevDateRef = useRef(date);

  // Subscribe to smart data manager updates
  useEffect(() => {
    const unsubscribe = smartDataManager.subscribe((dateKey, data) => {
      if (dateKey === date) {
        // Process the data for scores/results
        const finishedCards = data.filter(isFinishedCard);
        let grouped = groupByLeague(finishedCards);
        
        if (maxPerLeague && maxPerLeague > 0) {
          grouped = grouped.map(s => ({ ...s, data: s.data.slice(0, maxPerLeague) }));
        }
        
        setSections(grouped);
        setLoading(false);
        setErr('');
      }
    });

    return unsubscribe;
  }, [date, maxPerLeague]);

  // Handle date changes
  useEffect(() => {
    if (prevDateRef.current !== date) {
      prevDateRef.current = date;
      
      // Get data from smart manager
      const result = smartDataManager.getData(date, leagueKey);
      
      if (result.fromCache) {
        // Data available immediately
        const finishedCards = result.data.filter(isFinishedCard);
        let grouped = groupByLeague(finishedCards);
        
        if (maxPerLeague && maxPerLeague > 0) {
          grouped = grouped.map(s => ({ ...s, data: s.data.slice(0, maxPerLeague) }));
        }
        
        setSections(grouped);
        setLoading(false);
        setErr('');
      } else {
        // Data loading - show loading state only if we don't have cached data
        if (result.data.length === 0) {
          setLoading(true);
        }
      }

      // Start prefetching around this date
      smartDataManager.startPrefetching(date, leagueKey);
    }
  }, [date, leagueKey, maxPerLeague]);

  // Initial load - show cached data immediately
  useEffect(() => {
    const loadInitialData = async () => {
      // Wait for smartDataManager to initialize (loads from AsyncStorage)
      while (!smartDataManager.isInitialized) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const result = smartDataManager.getData(date, leagueKey);
      
      if (result.fromCache) {
        // Show cached data immediately
        const finishedCards = result.data.filter(isFinishedCard);
        let grouped = groupByLeague(finishedCards);
        
        if (maxPerLeague && maxPerLeague > 0) {
          grouped = grouped.map(s => ({ ...s, data: s.data.slice(0, maxPerLeague) }));
        }
        
        setSections(grouped);
        setLoading(false);
        console.log(`[ScoreOptimized] ✅ Loaded ${result.data.length} cached matches for ${date}`);
      } else {
        // No cached data - show loading
        setLoading(true);
      }

      // Start prefetching in background
      smartDataManager.startPrefetching(date, leagueKey);
    };

    loadInitialData();
  }, [date, leagueKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await smartDataManager.refreshDate(date, leagueKey);
      onDidRefresh?.();
    } catch (e) {
      setErr('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [date, leagueKey, onDidRefresh]);

  const handleMatchPress = useCallback((match) => {
    navigation.navigate('MatchDetailsScreen', { 
      fixtureId: match.id, 
      leagueId: match.leagueId 
    });
  }, [navigation]);

  const renderMatch = useCallback(({ item }) => (
    <ScoreCard match={item} navigation={navigation} />
  ), [navigation]);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionFlag}>{section.flag}</Text>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>({section.data.length})</Text>
    </View>
  ), []);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      {loading && !refreshing ? (
        <>
          <ActivityIndicator color="#22C55E" size="large" />
          <Text style={styles.loadingText}>Loading results...</Text>
        </>
      ) : err ? (
        <>
          <Text style={styles.errorText}>{err}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.reloadLink}>Tap to reload</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptyHint}>No matches finished on this date</Text>
        </>
      )}
    </View>
  ), [loading, refreshing, err, onRefresh]);

  return (
    <SectionList
      sections={sections}
      renderItem={renderMatch}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#22C55E"
          colors={["#22C55E"]}
        />
      }
  initialNumToRender={8}
  maxToRenderPerBatch={12}
  windowSize={6}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      stickySectionHeadersEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0F0F0F',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    marginTop: hp(1),
    borderRadius: wp(2),
    marginHorizontal: wp(2),
  },
  sectionFlag: {
    fontSize: rs(16),
    marginRight: wp(2),
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: rs(16),
    fontWeight: '600',
    flex: 1,
  },
  sectionCount: {
    color: '#22C55E',
    fontSize: rs(14),
    fontWeight: '500',
  },
  matchCard: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: wp(2),
    marginVertical: hp(0.5),
    borderRadius: wp(3),
    padding: wp(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLogo: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    marginRight: wp(2),
  },
  teamName: {
    color: '#ffffff',
    fontSize: rs(14),
    fontWeight: '500',
    flex: 1,
  },
  teamNameRight: {
    textAlign: 'right',
    marginRight: wp(2),
    marginLeft: 0,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: wp(20),
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    color: '#22C55E',
    fontSize: rs(18),
    fontWeight: 'bold',
    minWidth: wp(6),
    textAlign: 'center',
  },
  scoreSeparator: {
    color: '#ffffff',
    fontSize: rs(16),
    fontWeight: 'bold',
    marginHorizontal: wp(2),
  },
  statusText: {
    color: '#999',
    fontSize: rs(11),
    marginTop: hp(0.3),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(10),
  },
  emptyEmoji: {
    fontSize: rs(48),
    marginBottom: hp(2),
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: rs(18),
    fontWeight: '600',
    marginBottom: hp(1),
  },
  emptyHint: {
    color: '#999',
    fontSize: rs(14),
    textAlign: 'center',
    marginHorizontal: wp(8),
  },
  loadingText: {
    color: '#999',
    fontSize: rs(14),
    marginTop: hp(2),
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: rs(16),
    marginBottom: hp(2),
    textAlign: 'center',
  },
  reloadLink: {
    color: '#22C55E',
    fontSize: rs(14),
    fontWeight: '600',
  },
});

export default ScoreOptimized;
