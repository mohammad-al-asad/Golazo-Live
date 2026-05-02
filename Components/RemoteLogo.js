import React, { useState, useEffect, useMemo } from 'react';
import { View, Image, TouchableOpacity, Text, Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { fetchTeamLogo, fetchLeagueLogo, fetchPlayerPhoto } from '../Utils/apiFootball';

// ---------------- Configuration ----------------
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (logical freshness)
const STORAGE_PREFIX_V2 = 'logo_cache_v2:'; // hashed keys
const LEGACY_PREFIX_V1 = 'logo_cache_v1:';  // backward compat
let MAX_CONCURRENT = 8; // Increased for better performance
const MIN_CONCURRENT = 3;
const MAX_CONCURRENT_CAP = 12; // Increased cap
const PLACEHOLDER = '__REMOTE_LOGO_PLACEHOLDER__';
const COOL_DOWN_MS = 4 * 60 * 60 * 1000; // Reduced to 4h for broken URLs
const PRUNE_THRESHOLD = TTL_MS * 2; // remove items older than 2x TTL
const SIZE_CAP = 1000; // Increased capacity

// ---------------- In-memory state ----------------
const urlMemo = new Map();                 // identityKey -> url
const metaMemo = new Map();                // identityKey -> {ts, hits}
const pendingFetches = new Map();          // identityKey -> promise
const brokenCooldown = new Map();          // identityKey -> timestamp last failure
let cacheHits = 0; let cacheMisses = 0; let fetches = 0;

// Queue primitives
const queue = [];
let active = 0;
let totalWaitMs = 0;
let measuredTasks = 0;
let isOnline = true;

NetInfo.addEventListener(state => { isOnline = !!state.isConnected; });

function enqueue(task, identityKey) {
  const enqueuedAt = Date.now();
  return new Promise((resolve, reject) => { queue.push({ task, resolve, reject, enqueuedAt, identityKey }); pump(); });
}
function pump() {
  if (active >= MAX_CONCURRENT) return;
  const next = queue.shift();
  if (!next) return;
  active++;
  Promise.resolve()
    .then(next.task)
    .then(r => {
      active--;
      // metrics
      const waited = Date.now() - next.enqueuedAt;
      totalWaitMs += waited;
      measuredTasks++;
      if (measuredTasks >= 15) adaptConcurrency();
      next.resolve(r); pump();
    })
    .catch(e => { active--; next.reject(e); pump(); });
}
function adaptConcurrency() {
  const avgWait = totalWaitMs / measuredTasks;
  if (avgWait > 250 && MAX_CONCURRENT > MIN_CONCURRENT) {
    MAX_CONCURRENT = Math.max(MIN_CONCURRENT, MAX_CONCURRENT - 1);
  } else if (avgWait < 60 && MAX_CONCURRENT < MAX_CONCURRENT_CAP) {
    MAX_CONCURRENT = Math.min(MAX_CONCURRENT_CAP, MAX_CONCURRENT + 1);
  }
  totalWaitMs = 0; measuredTasks = 0;
}

// ---------------- Utility functions ----------------
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h >>> 0) * 0x01000193;
  }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
}

function identityObject({ kind, teamId, teamName, leagueId, leagueName, playerId, playerName, playerTeamId, provided }) {
  return { kind, teamId: teamId || null, teamName: teamName || null, leagueId: leagueId || null, leagueName: leagueName || null, playerId: playerId || null, playerName: playerName || null, playerTeamId: playerTeamId || null, provided: !!provided };
}
function makeIdentityKey(obj) { return JSON.stringify(obj); }
function storageKey(identityKey) { return STORAGE_PREFIX_V2 + fnv1a(identityKey); }

async function persist(identityKey, url) {
  const key = storageKey(identityKey);
  const payload = JSON.stringify({ url, ts: Date.now(), identityKey });
  try { await AsyncStorage.setItem(key, payload); } catch {}
  metaMemo.set(identityKey, { ts: Date.now(), hits: (metaMemo.get(identityKey)?.hits || 0) + 1 });
}

async function readPersist(identityKey) {
  // v2
  try {
    const v2 = await AsyncStorage.getItem(storageKey(identityKey));
    if (v2) return JSON.parse(v2);
  } catch {}
  // legacy fallback
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_PREFIX_V1 + identityKey);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      // migrate silently
      persist(identityKey, parsed.url);
      return parsed;
    }
  } catch {}
  return null;
}

async function pruneCacheIfNeeded() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(k => k.startsWith(STORAGE_PREFIX_V2));
    if (!ours.length) return;
    const now = Date.now();
    const entries = [];
    for (const k of ours) {
      const raw = await AsyncStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const age = now - (parsed.ts || 0);
        if (age > PRUNE_THRESHOLD) { await AsyncStorage.removeItem(k); continue; }
        entries.push({ k, ts: parsed.ts || 0 });
      } catch {}
    }
    if (entries.length > SIZE_CAP) {
      entries.sort((a,b)=>a.ts-b.ts); // oldest first
      const remove = entries.slice(0, entries.length - SIZE_CAP + Math.ceil(SIZE_CAP*0.1));
      for (const r of remove) await AsyncStorage.removeItem(r.k);
    }
  } catch {}
}

async function clearLogoCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(k => k.startsWith(STORAGE_PREFIX_V2) || k.startsWith(LEGACY_PREFIX_V1));
    await AsyncStorage.multiRemove(ours);
    urlMemo.clear(); metaMemo.clear(); pendingFetches.clear(); brokenCooldown.clear();
  } catch {}
}

function getLogoCacheStats() {
  return {
    inMemory: urlMemo.size,
    pending: pendingFetches.size,
    queue: queue.length,
    maxConcurrent: MAX_CONCURRENT,
    online: isOnline,
    hits: cacheHits,
    misses: cacheMisses,
    fetches,
  };
}

export async function preWarmLogos(entries = []) {
  for (const e of entries) {
    if (!e.logoUrl) continue;
    const idObj = identityObject({ kind: e.kind, teamId: e.teamId, teamName: e.teamName, leagueId: e.leagueId, leagueName: e.leagueName, playerId: e.playerId, playerName: e.playerName, playerTeamId: e.playerTeamId, provided: true });
    const identityKey = makeIdentityKey(idObj);
    urlMemo.set(identityKey, e.logoUrl);
    await persist(identityKey, e.logoUrl);
  }
}

// Debug helpers removed to avoid exposing internals in production

// ---------------- Component ----------------
function RemoteLogoBase({
  kind = 'team',
  size = 20,
  teamId,
  teamName,
  leagueId,
  leagueName,
  playerId,
  playerName,
  playerTeamId,
  style,
  borderRadius,
  logoUrl,
  disableShimmer = false,
}) {
  const [url, setUrl] = useState(logoUrl || null);
  const [retryKey, setRetryKey] = useState(0);
  const [anim] = useState(() => new Animated.Value(0));

  // Start shimmer animation (skippable)
  useEffect(() => {
    if (disableShimmer) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, disableShimmer]);

  const idObj = useMemo(() => identityObject({ kind, teamId, teamName, leagueId, leagueName, playerId, playerName, playerTeamId, provided: !!logoUrl }), [kind, teamId, teamName, leagueId, leagueName, playerId, playerName, playerTeamId, logoUrl]);
  const identityKey = useMemo(() => makeIdentityKey(idObj), [idObj]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function resolveLogo() {
      if (logoUrl) { // direct
        urlMemo.set(identityKey, logoUrl); await persist(identityKey, logoUrl); cacheHits++; if (mounted) setUrl(logoUrl); return;
      }
      const memoHit = urlMemo.get(identityKey);
      if (memoHit && memoHit !== PLACEHOLDER) { cacheHits++; metaMemo.set(identityKey, { ts: Date.now(), hits: (metaMemo.get(identityKey)?.hits||0)+1 }); if (mounted) setUrl(memoHit); return; }

      // cooldown for broken
      const lastFail = brokenCooldown.get(identityKey);
      if (lastFail && Date.now() - lastFail < COOL_DOWN_MS) { if (mounted) setUrl(PLACEHOLDER); return; }

      // persistent
  const stored = await readPersist(identityKey);
      if (stored?.url) {
        const stale = Date.now() - (stored.ts || 0) > TTL_MS;
        urlMemo.set(identityKey, stored.url);
        if (mounted) setUrl(stored.url);
        if (!stale) return; // good enough
      }

      if (!isOnline) { if (mounted && !stored?.url) setUrl(PLACEHOLDER); return; }

      // coalesce
      if (pendingFetches.has(identityKey)) {
        try {
          const shared = await pendingFetches.get(identityKey);
          if (mounted) setUrl(shared || PLACEHOLDER);
        } catch { if (mounted) setUrl(PLACEHOLDER); }
        return;
      }

      const fetchPromise = enqueue(async () => {
        fetches++;
        if (kind === 'team') return fetchTeamLogo({ teamId, name: teamName, signal: controller.signal });
        if (kind === 'league') return fetchLeagueLogo({ leagueId, name: leagueName, signal: controller.signal });
        if (kind === 'player') return fetchPlayerPhoto({ playerId, name: playerName, teamId: playerTeamId, signal: controller.signal });
        return null;
      }, identityKey);
      pendingFetches.set(identityKey, fetchPromise);
      let fetched = null;
      try { fetched = await fetchPromise; } catch (e) { if (e?.name === 'AbortError') return; fetched = null; }
      finally { pendingFetches.delete(identityKey); }

      // Validate via HEAD (best effort)
      let finalUrl = fetched || null;
      if (fetched) {
        if (!disableShimmer) {
          try {
            const head = await fetch(fetched, { method: 'HEAD' });
            if (!head.ok) finalUrl = null;
          } catch { finalUrl = null; }
        } else {
          finalUrl = fetched; // assume fetched is OK when shimmer disabled to reduce work
        }
      }

      if (!finalUrl) {
        brokenCooldown.set(identityKey, Date.now());
        cacheMisses++;
        if (mounted) setUrl(PLACEHOLDER);
        return;
      }

  urlMemo.set(identityKey, finalUrl);
      await persist(identityKey, finalUrl);
      await pruneCacheIfNeeded();
      if (mounted) setUrl(finalUrl);
    }

    resolveLogo();
    return () => { mounted = false; controller.abort(); };
  }, [identityKey, retryKey, logoUrl, kind, teamId, teamName, leagueId, leagueName, playerId, playerName, playerTeamId]);

  useFocusEffect(React.useCallback(() => {
    if ((!url || url === PLACEHOLDER) && isOnline) setRetryKey(v => v + 1);
  }, [url]));

  const isPlaceholder = !url || url === PLACEHOLDER;
  const shimmerOpacity = anim.interpolate({ inputRange: [0,1], outputRange: [0.35, 0.9] });

  return (
    <TouchableOpacity
      style={[{ width: size, height: size, borderRadius: borderRadius ?? size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}
      activeOpacity={isPlaceholder ? 0.6 : 1}
      onPress={isPlaceholder ? () => setRetryKey(v => v + 1) : undefined}
    >
      {isPlaceholder ? (
        <Animated.View style={{ width: size, height: size, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius ?? size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', opacity: shimmerOpacity }}>
          <Text style={{ fontSize: size * 0.55, color: '#22C55E' }}>⚽️</Text>
        </Animated.View>
      ) : (
        <Image source={{ uri: url }} style={{ width: size, height: size, backgroundColor: 'transparent' }} resizeMode="contain" onError={() => setUrl(PLACEHOLDER)} />
      )}
    </TouchableOpacity>
  );
}

// Memoize the component to avoid re-rendering when parent updates
export default React.memo(function RemoteLogo(props) { return <RemoteLogoBase {...props} />; });
