//this is the Details button Screen
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, StatusBar, RefreshControl } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp, hp, rs } from '../Utils/responsive'; // ADD

import RemoteLogo from '../Components/RemoteLogo';

// Use the actual files in Components
import Summary from '../Components/SummaryMatchDetails';
import LineUp from '../Components/LineUpMatchDetails';
import { useLineup } from '../Components/useLineup';
import Stats from '../Components/StatsMatchDetails';
import H2H from '../Components/H2HMatchDetails';
import Standings from '../Components/Standings';
import Form from '../Components/FormMatchDetails';

import { fetchFixtureById, fetchLineUp, fetchStats, fetchH2H, fetchStandings, fetchFixtures, mapFixtureToCard } from '../Utils/apiFootball';
import { LEAGUES, SEASONS } from '../Config/leagues';

const TABS = [
  { key: 'Summary', label: 'Summary' },
  { key: 'LineUp', label: 'Line Up' },
  { key: 'Stats', label: 'Stats' },
  { key: 'H2H', label: 'H2H' },
  { key: 'Form', label: 'Form' },
  { key: 'Standings', label: 'Standings' },
];

export default function MatchDetailsScreen() {
  const route = useRoute();
  const { t } = useTranslation();
  const { fixtureId, leagueId } = route.params || {};
  const [activeTab, setActiveTab] = useState('Summary');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const insets = useSafeAreaInsets(); // add

  // Data states
  const [match, setMatch] = useState(null);
  const [summary, setSummary] = useState(null);
  const [lineupLegacy, setLineupLegacy] = useState(null); // kept for initial fetch before hook migration
  const [stats, setStats] = useState(null);
  const [h2h, setH2H] = useState(null);
  const [standings, setStandings] = useState(null);
  const [form, setForm] = useState(null);

  const LIVE_CODES = useRef(new Set(['1H','HT','2H','ET','P','LIVE'])).current;
  const autoIntervalRef = useRef(null);
  const initialLoadedRef = useRef(false);

  const buildSummary = useCallback((fx, mapped) => {
    const homeScore = mapped?.score?.home ?? 0;
    const awayScore = mapped?.score?.away ?? 0;
    const when = mapped?.date || fx?.date;
    const venue = mapped?.venue || fx?.venue;
    const referee = fx?.referee || '-';
    const mappedEvents = Array.isArray(fx?.events) ? fx.events.map(ev => {
      const minute = ev.time?.elapsed;
      const player = ev.player?.name;
      const assist = ev.assist?.name;
      const typeRaw = (ev.type || '').toLowerCase();
      const detailRaw = (ev.detail || '').toLowerCase();
      if (typeRaw === 'subst') return { type: 'sub', in: ev.assist?.name || 'In', out: ev.player?.name || 'Out', minute };
      if (typeRaw === 'goal') return { type: 'goal', player, minute, assist };
      if (typeRaw === 'card' && detailRaw.includes('yellow')) return { type: 'yellow', player, minute };
      return null;
    }).filter(Boolean) : [];
    return {
      halftime: { score: `${homeScore} - ${awayScore}` },
      kickoff: { time: when ? new Date(when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' },
      stadium: venue || '-',
      referee,
      events: mappedEvents,
    };
  }, []);

  const loadData = useCallback(async ({ full = false } = {}) => {
    try {
      if (full) setLoading(true); else setRefreshing(true);
      // Always refresh base fixture + dynamic sections
      const fxRaw = await fetchFixtureById(fixtureId);
      const fx = fxRaw || {};
      const mapped = mapFixtureToCard ? mapFixtureToCard(fx) : fxRaw;
      if (mapped) {
        setMatch(prev => prev ? { ...prev, ...mapped } : mapped);
        setSummary(buildSummary(fx, mapped));
      }

      // Always fetch dynamic (lineup, stats)
  const lineupPromise = fetchLineUp(fixtureId).catch(()=>null);
      const statsPromise = fetchStats(fixtureId).catch(()=>null);

      // Fetch static (h2h, standings, form) only first time or on full reload
      let h2hData = h2h; let standingsData = standings; let formData = form;
      if (full || !initialLoadedRef.current) {
        // Determine season from fixture or fallback list
        const seasonPrimary = fx?.league?.season || SEASONS[0];
        [h2hData] = await Promise.all([
          fetchH2H(fixtureId).catch(()=>null),
        ]);
        // Try primary season first
        standingsData = await fetchStandings(leagueId, seasonPrimary).catch(()=>[]);
        // Fallback: try other seasons in SEASONS until we find non-empty
        if ((!standingsData || !standingsData.length) && Array.isArray(SEASONS)) {
          for (const alt of SEASONS) {
            if (alt === seasonPrimary) continue;
            const altRows = await fetchStandings(leagueId, alt).catch(()=>[]);
            if (altRows && altRows.length) { standingsData = altRows; break; }
          }
        }
        if (mapped?.home?.id && mapped?.away?.id) {
          try {
            const [homeRecent, awayRecent] = await Promise.all([
              fetchFixtures({ teamId: mapped.home.id, last: 6 }).catch(()=>[]),
              fetchFixtures({ teamId: mapped.away.id, last: 6 }).catch(()=>[]),
            ]);
            function build(entries, teamId) {
              const filtered = entries.filter(f => f.fixture?.id !== fixtureId).slice(0,5);
              return filtered.map(f => {
                const isHome = f.teams?.home?.id === teamId;
                const goalsFor = f.goals?.[isHome ? 'home' : 'away'] ?? 0;
                const goalsAgainst = f.goals?.[isHome ? 'away' : 'home'] ?? 0;
                const res = goalsFor === goalsAgainst ? 'D' : goalsFor > goalsAgainst ? 'W' : 'L';
                return { competition: f.league?.name, venue: isHome ? 'H' : 'A', score: `${goalsFor}-${goalsAgainst}`, result: res, opponent: isHome ? f.teams?.away?.name : f.teams?.home?.name, opponentId: isHome ? f.teams?.away?.id : f.teams?.home?.id };
              });
            }
            formData = { home: build(homeRecent, mapped.home.id), away: build(awayRecent, mapped.away.id) };
          } catch {}
        }
      }

  const [lineupData, statsData] = await Promise.all([lineupPromise, statsPromise]);
  setLineupLegacy(lineupData);
      setStats(statsData);
      if (full || !initialLoadedRef.current) { setH2H(h2hData); setStandings(standingsData); setForm(formData); }
      initialLoadedRef.current = true;
      setLastUpdated(Date.now());
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fixtureId, leagueId, buildSummary]);

  // Hook-based adaptive lineup polling (overrides legacy once active)
  const { lineup: lineupHook, status: lineupStatus } = useLineup(fixtureId, { leagueId, fixtureDate: match?.date, auto: true });
  const effectiveLineup = lineupHook || lineupLegacy;

  // Initial full load
  useEffect(() => { loadData({ full: true }); }, [loadData]);

  // Auto-refresh while live (score / minute / stats / lineup)
  useEffect(() => {
    if (!match) return;
    const isLive = LIVE_CODES.has(match.statusShort);
    if (isLive) {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = setInterval(() => {
        loadData({ full: false });
      }, 30000); // 30s
    } else if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current); };
  }, [match, loadData, LIVE_CODES]);

  const onManualRefresh = useCallback(() => {
    if (loading) return; // avoid overlapping
    loadData({ full: false });
  }, [loadData, loading]);

  if (loading || !match) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={{ color: '#fff', marginTop: 8 }}>Loading match…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}>
      <StatusBar translucent={false} backgroundColor="#0F0F0F" barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#22C55E" colors={['#22C55E']} progressBackgroundColor="#1a1a1a" />}
      >
        {/* Top Green Match Card */}
        <View style={styles.matchCard}>
          <View style={styles.leagueRow}>
            <RemoteLogo kind="league" leagueId={match.leagueId} leagueName={match.leagueName} logoUrl={match.leagueLogo} size={22} style={{ marginRight: 8 }} />
            <Text style={styles.leagueName}>{match.leagueName}</Text>
            <TouchableOpacity onPress={onManualRefresh} disabled={refreshing} style={styles.refreshPill}>
              <Text style={styles.matchMinute}>{refreshing ? t('loading') || '...' : (match.minute || match.statusShort)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.teamsRow}>
              <View style={styles.teamCol}>
                <RemoteLogo kind="team" teamId={match.home.id} teamName={match.home.name} logoUrl={match.home.logo} size={rs(28)} style={{ marginBottom: 4 }} />
                <Text style={styles.teamName}>{match.home.name}</Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.score}>{(match.score.home ?? 0)} - {(match.score.away ?? 0)}</Text>
              </View>
              <View style={styles.teamCol}>
                <RemoteLogo kind="team" teamId={match.away.id} teamName={match.away.name} logoUrl={match.away.logo} size={rs(28)} style={{ marginBottom: 4 }} />
                <Text style={styles.teamName}>{match.away.name}</Text>
              </View>
            </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{match.venue || '-'}</Text>
            <Text style={styles.metaText}>{match.date?.slice(0, 16)?.replace('T', ' ')}</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabButton}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                  {t(tab.label)}
                </Text>
                {activeTab === tab.key && <View style={styles.activeTabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'Summary' && <Summary summary={summary} />}
          {activeTab === 'LineUp' && <LineUp lineup={effectiveLineup} status={lineupStatus} events={summary?.events} />}
          {activeTab === 'Stats' && <Stats stats={stats} />}
          {activeTab === 'H2H' && (
            <H2H
              h2h={h2h}
              homeLogo={match.home.logo}
              awayLogo={match.away.logo}
              homeName={match.home.name}
              awayName={match.away.name}
            />
          )}
          {activeTab === 'Standings' && <Standings standings={standings} />}
          {activeTab === 'Form' && (
            <Form
              form={form}
              homeTeamLogo={match.home.logo}
              awayTeamLogo={match.away.logo}
              homeTeamName={match.home.name}
              awayTeamName={match.away.name}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  scrollContent: { paddingBottom: hp(2) },

  matchCard: {
    backgroundColor: '#22C55E',
    borderRadius: rs(14),
    marginHorizontal: wp(4.3),
    marginTop: hp(0.8),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4.3),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  leagueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.6), width: '100%' },
  leagueName: { color: '#fff', fontWeight: 'bold', fontSize: rs(15), flex: 1 },
  matchMinute: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: rs(12),
    backgroundColor: '#1a1a1a',
    borderRadius: rs(8),
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.2),
    minWidth: wp(10),
    textAlign: 'center',
  },
  refreshPill: { marginLeft: wp(2) },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: hp(0.4),
  },
  teamCol: { alignItems: 'center', width: width / 3.3 },
  teamName: { color: '#fff', fontWeight: 'bold', fontSize: rs(13), marginTop: hp(0.3), textAlign: 'center' },
  scoreBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: rs(10),
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(5.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { color: '#fff', fontWeight: 'bold', fontSize: rs(18), textAlign: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: hp(0.4) },
  metaText: { color: '#cccccc', fontSize: rs(11) },

  tabsContainer: { backgroundColor: '#0F0F0F', marginTop: hp(1) },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingHorizontal: wp(2),
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: hp(1) },
  tabText: { color: '#9CA3AF', fontSize: rs(14), fontWeight: 'bold' },
  activeTabText: { color: '#22C55E' },
  activeTabUnderline: { height: rs(2), backgroundColor: '#22C55E', width: '50%', marginTop: hp(0.4), borderRadius: rs(2) },

  tabContent: { paddingHorizontal: wp(4.3), paddingTop: hp(1.2) },
});