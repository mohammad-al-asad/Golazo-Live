import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, FlatList, Platform, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { wp, hp, rs } from '../Utils/responsive';
import { mapFixtureToCard } from '../Utils/apiFootball';
import { preWarmLogos } from './RemoteLogo';
import RemoteLogo from './RemoteLogo';
import { smartDataManager } from '../Utils/smartDataManager';

const MAX_CARDS = 20;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_GAP = wp(3.6);
const ITEM_WIDTH = Math.min(SCREEN_WIDTH * 0.86, 360);
const ITEM_HEIGHT = hp(19);
const SIDE_PADDING = wp(4);

const LIVE_CODES = new Set(['1H','HT','2H','ET','P','LIVE']);
const UPCOMING_CODES = new Set(['NS','TBD','PST','SUSP','INT']);
const FINISHED_CODES = new Set(['FT','AET','PEN','AWD','WO']);

function toCard(row) {
  const card = row?.fixture ? mapFixtureToCard(row) : row;
  return { ...card, _ts: new Date(card.date).getTime() };
}

function sortCards(a, b) {
  const da = a._ts;
  const db = b._ts;
  const aLive = LIVE_CODES.has(a.statusShort);
  const bLive = LIVE_CODES.has(b.statusShort);
  if (aLive !== bLive) return aLive ? -1 : 1;
  const aUp = UPCOMING_CODES.has(a.statusShort) || da > Date.now();
  const bUp = UPCOMING_CODES.has(b.statusShort) || db > Date.now();
  if (aUp !== bUp) return aUp ? -1 : 1;
  if (aUp && bUp) return da - db;
  const aFin = FINISHED_CODES.has(a.statusShort);
  const bFin = FINISHED_CODES.has(b.statusShort);
  if (aFin && bFin) return db - da;
  return da - db;
}

const LiveNowCard = React.memo(function LiveNowCard({ card, onPress }) {
  const koDate = new Date(card.date);
  const day = koDate.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
  const time = koDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateLabel = `${day} • ${time}`;
  // Stable item separator to avoid inline function recreation
  const ItemSeparator = React.useCallback(() => <View style={{ width: ITEM_GAP }} />, []);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.itemWrap}>
      <View style={styles.card}>
        <View style={styles.leagueRow}>
          <RemoteLogo kind="league" leagueId={card.leagueId} leagueName={card.leagueName} logoUrl={card.leagueLogo} size={22} style={{ marginRight: 8 }} />
          <Text style={styles.leagueName} numberOfLines={1}>{card.leagueName}</Text>
          <Text style={styles.liveDot}>●</Text>
        </View>
        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            <RemoteLogo kind="team" teamId={card.home.id} teamName={card.home.name} logoUrl={card.home.logo} size={42} style={{ marginBottom: 6 }} />
            <Text style={styles.teamName} numberOfLines={1}>{card.home.name}</Text>
          </View>
            <View style={styles.vsCol}>
              <Text style={styles.scoreCenter}>{(card.score.home ?? 0)} - {(card.score.away ?? 0)}</Text>
            </View>
          <View style={styles.teamCol}>
            <RemoteLogo kind="team" teamId={card.away.id} teamName={card.away.name} logoUrl={card.away.logo} size={42} style={{ marginBottom: 6 }} />
            <Text style={styles.teamName} numberOfLines={1}>{card.away.name}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.datePill}>{dateLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const LiveNow = ({ showSeeAll = true, refreshKey = 0 }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState(new Set());
  const abortRef = useRef(null);

  const snapInterval = useMemo(() => ITEM_WIDTH + ITEM_GAP, []);
  // Ordered offsets (near dates first)
  const orderedOffsets = useMemo(() => {
    const back = [0, -1, 1, 2, 3, 4, 5]; // first 3 (0,-1,1) shown fast; others lazy
    return back;
  }, []);

  const dateStr = useCallback((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }, []);

  const mergeAndPublish = useCallback((incoming) => {
    if (!incoming.length) return;
    setCards(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      for (const card of incoming) {
        if (!map.has(card.id)) map.set(card.id, card);
      }
      const arr = Array.from(map.values());
      arr.sort(sortCards);
      return arr.slice(0, MAX_CARDS);
    });
  }, []);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (!refreshing) setLoading(true);
      setErr('');
      setCards([]); // clear quickly for feedback
      
      // Wait for smartDataManager to initialize
      while (!smartDataManager.isInitialized) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Step 1: Load and show ONLY TODAY'S cached data FIRST (super fast)
      const todayKey = dateStr(0);
      const todayResult = smartDataManager.getData(todayKey, 'all');
      let hasTodayData = false;

      if (todayResult.fromCache) {
        const todayCards = todayResult.data.map(toCard);
        if (todayCards.length > 0) mergeAndPublish(todayCards);
        setLoading(false); // Today's cache loaded, even if there are no matches.
        hasTodayData = true;
        console.log(`[LiveNow] ✅ Loaded ${todayCards.length} cached matches for today`);
      } else {
        // No cached data - start immediate fetch for first-time users
        console.log('[LiveNow] 📡 No cached data, fetching today\'s matches...');
        smartDataManager.startPrefetching(todayKey, 'all');
      }
      
      // Step 2: Prepare other dates for background loading (don't show yet)
      const datesToFetch = [todayKey]; // Start with today
      const otherDates = [-1, 1]; // Keep background loading small to avoid rate limits
      
      // Add other dates to fetch list
      for (const off of otherDates) {
        datesToFetch.push(dateStr(off));
      }
      
      // If we still don't have today's data, keep loading until it arrives
      if (!hasTodayData) {
        console.log('[LiveNow] ⏳ Waiting for today\'s data...');
      }
      
      // Subscribe to updates for these dates
      const newSubs = new Set();
      for (const dateKey of datesToFetch) {
        const unsub = smartDataManager.subscribe((updatedDateKey, data) => {
          if (updatedDateKey === dateKey && !controller.signal.aborted) {
            const incoming = data.map(toCard);
            mergeAndPublish(incoming);
            
            // Hide loading ONLY when we get today's data (fresh or cached)
            if (updatedDateKey === todayKey && !hasTodayData) {
              setLoading(false);
              hasTodayData = true;
              console.log(`[LiveNow] ✅ Today's data loaded: ${incoming.length} matches`);
            } else if (updatedDateKey !== todayKey && incoming.length > 0) {
              console.log(`[LiveNow] 📦 Background loaded: ${incoming.length} matches for ${updatedDateKey}`);
            }
            
            // Warm logos for all incoming data
            const warm = incoming.slice(0,20).flatMap(c => [
              { kind:'league', leagueId: c.leagueId, leagueName: c.leagueName, logoUrl: c.leagueLogo },
              { kind:'team', teamId: c.home.id, teamName: c.home.name, logoUrl: c.home.logo },
              { kind:'team', teamId: c.away.id, teamName: c.away.name, logoUrl: c.away.logo },
            ]);
            preWarmLogos(warm);
          }
        });
        newSubs.add(unsub);
      }
      setSubscriptions(newSubs);
      
      // Start one nearby prefetch window; SmartDataManager limits the radius.
      smartDataManager.startPrefetching(todayKey, 'all');
      
      // Safety timeout: if no today's data after 10 seconds, show error
      if (!hasTodayData) {
        setTimeout(() => {
          if (!hasTodayData) {
            console.log('[LiveNow] ⏰ Timeout reached, showing error for today');
            setLoading(false);
            setErr('Unable to load today\'s matches. Please check your connection.');
          }
        }, 10000);
      }
      
      // All dates are now handled through the main subscription loop above
      // No need for separate handling of remaining dates
      
    } catch (e) {
      if (!controller.signal.aborted) {
        setErr('Failed to load matches.');
        setLoading(false);
      }
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, [orderedOffsets, dateStr, mergeAndPublish, refreshing]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => () => {
    abortRef.current?.abort();
    subscriptions.forEach(unsub => unsub());
  }, [subscriptions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const todayKey = dateStr(0); // existing helper used in this file
      await smartDataManager.refreshDate(todayKey, 'all');
      // optionally re-run any local merge/publish logic if needed
    } catch (e) {
      setErr('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [dateStr]);

  const keyExtractor = useCallback((it) => String(it.id), []);
  const renderItem = useCallback(
    ({ item }) => (
      <LiveNowCard
        card={item}
        onPress={() => navigation.navigate('MatchDetailsScreen', { fixtureId: item.id, leagueId: item.leagueId })}
      />
    ),
    [navigation]
  );
  const getItemLayout = useCallback((_, index) => ({
    length: ITEM_WIDTH + ITEM_GAP,
    offset: (ITEM_WIDTH + ITEM_GAP) * index,
    index,
  }), []);

  if (loading && !cards.length && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#22C55E" size="large" />
        <Text style={styles.loadingText}>{t('loading_matches')}</Text>
      </View>
    );
  }
  if (err && !cards.length) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{err}</Text>
        <TouchableOpacity onPress={onRefresh}><Text style={styles.seeAllText}>{t('reload') || 'Reload'}</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        
        {showSeeAll && (
          <TouchableOpacity onPress={() => navigation.navigate('GolazoLive')}>
            <Text style={styles.seeAllText}>{t('see_all')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={cards}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
  ItemSeparatorComponent={ItemSeparator}
        snapToInterval={snapInterval}
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
        snapToAlignment="start"
        bounces={false}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={5}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: SIDE_PADDING }}>
            <Text style={styles.emptyText}>{t('no_matches')}</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" colors={['#22C55E']} progressBackgroundColor="#1a1a1a" />}
      />
      {loading && !!cards.length && (
        <Text style={{ color: '#666', fontSize: 11, paddingLeft: SIDE_PADDING, paddingTop: 4 }}>
          {t('loading_more') || 'Fetching more…'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: hp(0), paddingBottom: hp(0) },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIDE_PADDING, marginBottom: hp(1) },
  sectionTitle: { color: '#fff', fontSize: rs(18), fontWeight: 'bold' },
  seeAllText: { color: '#22C55E', fontWeight: 'bold', fontSize: 15 ,alignItems: 'flex-end' },
  listContent: { paddingHorizontal: SIDE_PADDING },
  itemWrap: { width: ITEM_WIDTH, height: ITEM_HEIGHT },
  card: { flex: 1, backgroundColor: '#1E1E1E', borderRadius: 18, padding: 14 },
  leagueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  leagueName: { color: '#fff', fontWeight: 'bold', flex: 1 },
  liveDot: { color: '#22C55E', fontWeight: 'bold', marginLeft: 8 },
  teamsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamCol: { width: '36%', alignItems: 'center' },
  vsCol: { width: '28%', alignItems: 'center', justifyContent: 'center' },
  scoreCenter: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  teamName: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  metaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'center' },
  datePill: { color: '#fff', fontSize: 12, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: hp(3) },
  loadingText: { color: '#fff', marginTop: hp(0.8), fontSize: rs(14) },
  errorText: { color: 'tomato', padding: wp(4) },
  emptyText: { color: '#aaa', padding: wp(4) },
});

export default LiveNow;
