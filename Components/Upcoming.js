import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SectionList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LEAGUES, DEFAULT_TIMEZONE } from '../Config/leagues';
import { fetchFixturesBulk, mapFixtureToCard, dedupeFixtures } from '../Utils/apiFootball';
import RemoteLogo from './RemoteLogo';
import { wp, hp, rs } from '../Utils/responsive';
import { getLocalDateString } from '../Utils/dateHelpers';

const isUpcomingCard = (c) => {
  const s = c.statusShort;
  const kickoffFuture = new Date(c.date).getTime() > Date.now();
  return s === 'NS' || s === 'TBD' || s === 'PST' || s === 'SUSP' || s === 'INT' || kickoffFuture;
};

const groupByLeague = (cards) => {
  const map = new Map();
  for (const c of cards) {
    if (!map.has(c.leagueId)) {
      map.set(c.leagueId, { leagueName: c.leagueName, leagueLogo: c.leagueLogo, data: [] });
    }
    const bucket = map.get(c.leagueId);
    if (!bucket.leagueLogo && c.leagueLogo) bucket.leagueLogo = c.leagueLogo;
    bucket.data.push(c);
  }
  for (const [, bucket] of map) bucket.data.sort((a, b) => new Date(a.date) - new Date(b.date));
  return Array.from(map, ([leagueId, bucket]) => ({
    leagueId,
    leagueName: bucket.leagueName,
    leagueLogo: bucket.leagueLogo,
    data: bucket.data,
  }));
};

const Row = React.memo(function Row({ match, onPress }) {
  const localTime = new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <TouchableOpacity style={styles.matchCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.teamsColumn}>
        <View style={styles.teamRow}>
          <RemoteLogo kind="team" teamId={match.home.id} teamName={match.home.name} logoUrl={match.home.logo} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.teamName} numberOfLines={1}>{match.home.name}</Text>
        </View>
        <View style={styles.teamRow}>
          <RemoteLogo kind="team" teamId={match.away.id} teamName={match.away.name} logoUrl={match.away.logo} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.teamName} numberOfLines={1}>{match.away.name}</Text>
        </View>
      </View>
      <View style={styles.timeBox}><Text style={styles.matchTime}>{localTime}</Text></View>
    </TouchableOpacity>
  );
});

const Upcoming = ({ selectedDate, leagueKey = 'all', maxPerLeague = 0, windowDays = 2, ListHeaderComponent = null, onDidRefresh }) => {
  const navigation = useNavigation();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const date = useMemo(() => selectedDate || getLocalDateString(), [selectedDate]);

  const load = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      setErr('');
      let rows = [];
      if (leagueKey === 'all') {
        rows = await fetchFixturesBulk({
          leagueIds: LEAGUES.map(l => l.id),
          seasons: SEASONS,
          date,
          timezone: DEFAULT_TIMEZONE,
        });
      } else {
        const league = LEAGUES.find(l => l.key === leagueKey);
        if (league) {
          rows = await fetchFixturesBulk({ leagueIds: [league.id], date, timezone: DEFAULT_TIMEZONE });
        }
      }
      const deduped = dedupeFixtures(rows);
      const cards = deduped.map(mapFixtureToCard).filter(isUpcomingCard);
      let grouped = groupByLeague(cards);
      if (maxPerLeague && maxPerLeague > 0) grouped = grouped.map(s => ({ ...s, data: s.data.slice(0, maxPerLeague) }));
      setSections(grouped);
    } catch (e) {
      setErr('Failed to load upcoming.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      onDidRefresh && onDidRefresh();
    }
  }, [date, leagueKey, maxPerLeague, refreshing, onDidRefresh]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.leagueHeader}>
      <RemoteLogo
        kind="league"
        leagueId={section.leagueId}
        leagueName={section.leagueName}
        logoUrl={section.leagueLogo}
        size={22}
        borderRadius={6}
        style={{ marginRight: 8 }}
      />
      <Text style={styles.leagueName}>{section.leagueName}</Text>
    </View>
  ), []);

  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderItem = useCallback(({ item }) => (
    <Row match={item} onPress={() => navigation.navigate('MatchDetailsScreen', { fixtureId: item.id, leagueId: item.leagueId })} />
  ), [navigation]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      contentContainerStyle={styles.container}
      stickySectionHeadersEnabled={false}
      initialNumToRender={20}
      maxToRenderPerBatch={24}
      windowSize={10}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          {loading && !refreshing ? (
            <>
              <ActivityIndicator color="#22C55E" size="large" />
              <Text style={styles.loadingText}>Loading upcoming…</Text>
            </>
          ) : err ? (
            <>
              <Text style={styles.errorText}>{err}</Text>
              <TouchableOpacity onPress={onRefresh}>
                <Text style={styles.reloadLink}>Reload</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.emptyEmoji}>😴</Text>
              <Text style={styles.emptyTitle}>No upcoming matches</Text>
              <Text style={styles.emptyHint}>Pull to refresh or pick another date</Text>
              <TouchableOpacity onPress={onRefresh} style={{ marginTop: hp(1) }}>
                <Text style={styles.reloadLink}>Reload</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      }
      ListFooterComponent={
        err
          ? (
            <View style={{ paddingVertical: hp(1.2), alignItems: 'center' }}>
              <Text style={styles.errorText}>{err}</Text>
              <TouchableOpacity onPress={onRefresh}>
                <Text style={styles.reloadLink}>Reload</Text>
              </TouchableOpacity>
            </View>
          ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#22C55E"
          colors={['#22C55E']}
          progressBackgroundColor="#1a1a1a"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: wp(5.3), paddingBottom: hp(2.5) },

  leagueHeader: { flexDirection: 'row', alignItems: 'center', marginTop: hp(1.2), marginBottom: hp(0.8) },
  leagueName: { color: '#fff', fontWeight: 'bold', fontSize: rs(14) },

  matchCard: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(3.2),
    borderRadius: 14,
    marginBottom: hp(1),
  },
  teamsColumn: { flex: 1 },
  teamRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  teamName: { color: '#fff', fontSize: rs(13), fontWeight: 'bold', flexShrink: 1 },
  timeBox: { paddingLeft: wp(3), justifyContent: 'center', alignItems: 'flex-end' },
  matchTime: { color: '#22C55E', fontWeight: 'bold', fontSize: rs(13) },

  loading: { alignItems: 'center', justifyContent: 'center', paddingTop: hp(2) },
  loadingText: { color: '#fff', marginTop: hp(0.8), fontSize: rs(14) },
  errorText: { color: 'tomato', textAlign: 'center', paddingTop: hp(1) },

  // Added (mirrors Score.js)
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp(4),
    paddingBottom: hp(6),
  },
  emptyEmoji: { fontSize: rs(42), marginBottom: hp(1) },
  emptyTitle: { color: '#ffffff', fontSize: rs(16), fontWeight: 'bold', marginBottom: hp(0.6) },
  emptyHint: { color: '#cccccc', fontSize: rs(12), textAlign: 'center', paddingHorizontal: wp(8) },
  reloadLink: { color: '#22C55E', fontWeight: 'bold', marginTop: hp(0.8), fontSize: rs(14) },
});

export default Upcoming;
