// The second part of GolazoLiveScreen
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SectionList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { wp, hp, rs } from '../Utils/responsive';
import { LEAGUES, DEFAULT_TIMEZONE } from '../Config/leagues';
import { fetchFixturesBulk, mapFixtureToCard, dedupeFixtures } from '../Utils/apiFootball';
import RemoteLogo from './RemoteLogo';

const isFinished = s => s === 'FT' || s === 'AET' || s === 'PEN' || s === 'AWD' || s === 'WO';
// Keep live scores too so the tab is not empty on current day
const isFinishedOrLive = s => ['FT','AET','PEN','AWD','WO','1H','HT','2H','ET','LIVE'].includes(s);

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
  return (
    <TouchableOpacity style={styles.matchCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.teamsColumn}>
        <View style={styles.teamRow}>
          <RemoteLogo kind="team" teamId={match.home.id} teamName={match.home.name} logoUrl={match.home.logo} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.teamName} numberOfLines={1}>{match.home.name}</Text>
          <Text style={styles.score}>{match.score.home ?? 0}</Text>
        </View>
        <View style={styles.teamRow}>
          <RemoteLogo kind="team" teamId={match.away.id} teamName={match.away.name} logoUrl={match.away.logo} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.teamName} numberOfLines={1}>{match.away.name}</Text>
          <Text style={styles.score}>{match.score.away ?? 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const Score = ({ selectedDate, leagueKey = 'all', maxPerLeague = 0, ListHeaderComponent = null, onDidRefresh }) => {
  const navigation = useNavigation();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const date = useMemo(() => selectedDate || new Date().toISOString().slice(0, 10), [selectedDate]);

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
      const cards = deduped.map(mapFixtureToCard).filter(c => isFinishedOrLive(c.statusShort));
      let grouped = groupByLeague(cards);
      if (maxPerLeague && maxPerLeague > 0) grouped = grouped.map(s => ({ ...s, data: s.data.slice(0, maxPerLeague) }));
      setSections(grouped);
    } catch (e) {
      setErr('Failed to load scores.');
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

  // ALWAYS render SectionList so header (Calendar + LiveNow) & pull-to-refresh never disappear.
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
          {loading ? (
            <>
              <ActivityIndicator color="#22C55E" size="large" />
              <Text style={styles.loadingText}>Loading scores…</Text>
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
              <Text style={styles.emptyTitle}>No finished matches</Text>
              <Text style={styles.emptyHint}>Pull to refresh or pick another date</Text>
              <TouchableOpacity onPress={onRefresh} style={{ marginTop: hp(1) }}>
                <Text style={styles.reloadLink}>Reload</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      }
      ListFooterComponent={
        err && sections.length > 0 ? (
          <View style={{ paddingVertical: hp(1.2), alignItems: 'center' }}>
            <Text style={styles.errorText}>{err}</Text>
            <TouchableOpacity onPress={onRefresh}><Text style={styles.reloadLink}>Reload</Text></TouchableOpacity>
          </View>
        ) : null
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: wp(5.3), paddingBottom: hp(2.5) },

  leagueHeader: { flexDirection: 'row', alignItems: 'center', marginTop: hp(1.2), marginBottom: hp(0.8) },
  leagueName: { color: '#ffffff', fontSize: rs(15), fontWeight: 'bold' },

  matchCard: { backgroundColor: '#21a249', borderRadius: rs(15), paddingVertical: hp(1.2), paddingHorizontal: wp(4.3), marginBottom: hp(1.2) },
  teamsColumn: { flex: 1, justifyContent: 'center' },
  teamRow: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.6), justifyContent: 'space-between' },
  teamName: { color: '#ffffff', fontSize: rs(13), fontWeight: 'bold', flex: 1, marginRight: wp(2.6) },
  score: { color: '#ffffff', fontSize: rs(15), fontWeight: 'bold', width: wp(6), textAlign: 'right' },

  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: hp(3) },
  loadingText: { color: '#ffffff', marginTop: hp(0.8), fontSize: rs(14) },

  errorText: { color: 'tomato', textAlign: 'center', paddingHorizontal: wp(4), marginTop: hp(1) },

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

export default Score;
