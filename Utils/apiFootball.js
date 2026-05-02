import axios from 'axios';
import { showToast } from './toast';

// IMPORTANT: Provide this key via environment variables at build time.
// Do NOT commit API keys to source. Use EXPO_PUBLIC_FOOTBALL_API_KEY for client-safe keys,
// or proxy requests through your server for sensitive operations.
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY;
if (!API_KEY) console.warn('[apiFootball] Missing EXPO_PUBLIC_FOOTBALL_API_KEY – requests will fail.');
const API_HOST = 'v3.football.api-sports.io';

const client = axios.create({
  baseURL: `https://${API_HOST}`,
  headers: {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': API_HOST,
  },
  timeout: __DEV__ ? 10000 : 20000, // Faster timeout in development (10s vs 20s)
});

// Very small in-memory cache with TTL (ms)
const cache = new Map();
const CACHE_TTL = 120 * 1000; // Increased to 2 minutes for better performance
const LOGO_TTL = 48 * 60 * 60 * 1000; // Increased to 48h for static assets
const STANDINGS_TTL = 300 * 1000; // 5 minutes for standings (update less frequently)
const TEAM_TTL = 600 * 1000; // 10 minutes for team data
const PLAYER_TTL = 300 * 1000; // 5 minutes for player data

// Cache size management
const MAX_CACHE_SIZE = 1000;
let cacheHits = 0;
let cacheMisses = 0;

function pruneCache() {
  if (cache.size < MAX_CACHE_SIZE) return;
  const now = Date.now();
  const entries = Array.from(cache.entries());
  
  // Remove expired entries first
  for (const [key, entry] of entries) {
    if (now - entry.time > (entry.ttl || CACHE_TTL)) {
      cache.delete(key);
    }
  }
  
  // If still too large, remove oldest entries
  if (cache.size >= MAX_CACHE_SIZE) {
    const sortedEntries = entries.sort((a, b) => a[1].time - b[1].time);
    const toRemove = sortedEntries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.3));
    toRemove.forEach(([key]) => cache.delete(key));
  }
}

function cacheKey(url, params) {
  return `${url}?${Object.entries(params || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')}`;
}

function sanitizeHeaders(headers = {}) {
  const safeHeaders = { ...headers };
  if (safeHeaders['x-rapidapi-key']) safeHeaders['x-rapidapi-key'] = '[redacted]';
  if (safeHeaders.Authorization) safeHeaders.Authorization = '[redacted]';
  if (safeHeaders.authorization) safeHeaders.authorization = '[redacted]';
  return safeHeaders;
}

function logApiError(error, url, params) {
  const status = error?.response?.status;
  const responseData = error?.response?.data;
  const responseHeaders = error?.response?.headers || {};
  const requestHeaders = sanitizeHeaders(error?.config?.headers || {});

  if (status === 403) {
    console.warn('[apiFootball] 403 Forbidden response', {
      endpoint: url,
      params,
      message: error?.message,
      responseData,
      responseHeaders: {
        'x-ratelimit-requests-limit': responseHeaders['x-ratelimit-requests-limit'],
        'x-ratelimit-requests-remaining': responseHeaders['x-ratelimit-requests-remaining'],
        'x-ratelimit-requests-reset': responseHeaders['x-ratelimit-requests-reset'],
        'retry-after': responseHeaders['retry-after'],
      },
      requestHeaders,
    });
    return;
  }

  if (status) {
    console.warn('[apiFootball] API request failed', {
      status,
      endpoint: url,
      params,
      message: error?.message,
      responseData,
    });
  }
}

function getApiErrors(data) {
  const errors = data?.errors;
  if (!errors || (Array.isArray(errors) && errors.length === 0)) return null;
  if (typeof errors === 'object' && Object.keys(errors).length === 0) return null;
  return errors;
}

async function getWithCache(url, params, { ttl = CACHE_TTL, signal } = {}) {
  const key = cacheKey(url, params);
  const now = Date.now();
  const hit = cache.get(key);
  
  if (hit && now - hit.time < (hit.ttl ?? ttl)) {
    cacheHits++;
    return hit.data;
  }
  
  cacheMisses++;
  
  let res;
  try {
    res = await client.get(url, { params, signal });
  } catch (e) {
    const status = e?.response?.status;
    logApiError(e, url, params);
    if (status === 429) {
      if (showToast) showToast('Football API rate limit reached');
    }
    throw e;
  }
  
  const apiErrors = getApiErrors(res.data);
  if (apiErrors) {
    const errorText = typeof apiErrors === 'string' ? apiErrors : JSON.stringify(apiErrors);
    const error = new Error(`API_FOOTBALL_ERROR: ${errorText}`);
    error.apiErrors = apiErrors;
    error.responseData = res.data;
    console.warn('[apiFootball] API returned errors', {
      endpoint: url,
      params,
      errors: apiErrors,
    });

    const limitMessage = String(errorText).toLowerCase();
    if (limitMessage.includes('rate') || limitMessage.includes('request limit') || limitMessage.includes('too many')) {
      if (showToast) showToast('Football API request limit reached');
    }

    throw error;
  }

  const data = res.data?.response || [];
  cache.set(key, { time: now, data, ttl });
  
  // Prune cache periodically
  if (cache.size % 50 === 0) {
    pruneCache();
  }
  
  return data;
}

// Export cache statistics for monitoring
export function getCacheStats() {
  return {
    size: cache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2) + '%' : '0%',
    rateLimited: false,
    rateLimitExpiry: null
  };
}

// Clear cache (useful for testing or memory management)
export function clearCache() {
  cache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

async function getWithCacheTTL(url, params, ttl = CACHE_TTL, { signal } = {}) {
  return getWithCache(url, params, { ttl, signal });
}

// ---------- Core fetchers ----------
export async function fetchFixtures({ leagueId, teamId, season, date, live, last, next, timezone = 'UTC', signal } = {}) {
  const params = { timezone };
  if (leagueId) params.league = leagueId;
  if (season) params.season = season;
  if (teamId) params.team = teamId;
  if (date) params.date = date;
  if (live) params.live = live;
  if (last) params.last = last;
  if (next) params.next = next;
  return getWithCache('/fixtures', params, { signal });
}

function filterFixturesByLeagueIds(rows = [], leagueIds = []) {
  if (!leagueIds?.length) return rows;
  const allowed = new Set(leagueIds);
  return rows.filter(row => allowed.has(row?.league?.id));
}

// Bulk fixtures for date feeds. When a date is present, prefer one API request
// and filter locally; league x season requests hit rate limits very quickly.
export async function fetchFixturesBulk({ leagueIds = [], seasons = [], date, live, timezone = 'UTC', signal } = {}) {
  if (date && leagueIds?.length) {
    const rows = await fetchFixtures({ date, live, timezone, signal });
    return filterFixturesByLeagueIds(rows, leagueIds);
  }

  const tasks = [];
  const BATCH_SIZE = 2; // Keep non-date bulk calls gentle for the API
  
  for (const season of seasons) {
    for (let i = 0; i < leagueIds.length; i += BATCH_SIZE) {
      const batch = leagueIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(id => fetchFixtures({ leagueId: id, season, date, live, timezone, signal }))
      );
      tasks.push(...batchResults);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  
  return tasks.flat();
}

// Multiple dates window (parallel)
export async function fetchFixturesForDates({ leagueIds = [], leagueId, seasons = [], dates = [], timezone = 'UTC', signal } = {}) {
  const results = [];
  for (const d of dates) {
    if (leagueIds?.length) {
      results.push(await fetchFixturesBulk({ leagueIds, seasons, date: d, timezone, signal }));
    } else if (leagueId) {
      for (const season of seasons) {
        results.push(await fetchFixtures({ leagueId, season, date: d, timezone, signal }));
      }
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return results.flat();
}

export async function fetchFixtureById(fixtureId, timezone = 'UTC', signal) {
  const rows = await getWithCache('/fixtures', { id: fixtureId, timezone }, { signal });
  return rows?.[0] || null;
}

export async function fetchStandings(leagueId, season, signal) {
  try {
    const rows = await getWithCache('/standings', { league: leagueId, season }, { ttl: STANDINGS_TTL, signal });
    const table = rows?.[0]?.league?.standings?.[0] || [];
    console.log(`[DEBUG] fetchStandings(${leagueId}, ${season}): ${table?.length || 0} standings found`);
    
    // For tournaments, sometimes standings are in different format or don't exist until later stages
    if (!table.length && rows?.[0]?.league?.standings?.length > 1) {
      // Try to get first available standings group (tournaments may have multiple groups)
      const firstGroup = rows[0].league.standings.find(group => group && group.length > 0);
      if (firstGroup) {
        console.log(`[DEBUG] Using alternative standings group with ${firstGroup.length} teams`);
        return firstGroup;
      }
    }
    
    return table;
  } catch (e) {
    console.error(`[DEBUG] fetchStandings error for ${leagueId}:`, e.message);
    throw e;
  }
}

// Try a list of seasons until standings found (first non-empty)
export async function fetchStandingsWithFallback(leagueId, seasons = [], signal) {
  for (const s of seasons) {
    const table = await fetchStandings(leagueId, s, signal);
    if (Array.isArray(table) && table.length) return { season: s, table };
  }
  return { season: seasons[0], table: [] };
}

// League coverage (lineups availability etc.)
export async function fetchLeagueCoverage(leagueId, season, signal) {
  if (!leagueId) return { lineups: false };
  try {
    const rows = await getWithCacheTTL('/leagues', { id: leagueId, season }, LOGO_TTL, { signal });
    const league = rows?.[0];
    const coverage = league?.seasons?.find(s => s.year === season)?.coverage?.fixtures;
    return { lineups: !!coverage?.lineups };
  } catch (e) {
    return { lineups: false };
  }
}

// ---------- Match specific (lineups, stats, h2h) ----------
export async function fetchLineUp(fixtureId, signal) {
  if (!fixtureId) return null;
  try {
    const rows = await getWithCache('/fixtures/lineups', { fixture: fixtureId }, { signal });
    // API returns array with up to two entries (home, away)
    return rows.map(r => ({
      team: {
        id: r.team?.id,
        name: r.team?.name,
        logo: r.team?.logo,
        formation: r.formation,
        coach: r.coach?.name,
      },
      startXI: (r.startXI || []).map(p => ({
        id: p.player?.id,
        name: p.player?.name,
        number: p.player?.number,
        pos: p.player?.pos,
        grid: p.player?.grid, // e.g., "4:2" row:col
  captain: p.player?.captain || false,
      })),
      substitutes: (r.substitutes || []).map(p => ({
        id: p.player?.id,
        name: p.player?.name,
        number: p.player?.number,
        pos: p.player?.pos,
  captain: p.player?.captain || false,
      })),
    }));
  } catch (e) {
    return null; // fallback to static if needed
  }
}

export async function fetchStats(fixtureId, signal) {
  if (!fixtureId) return null;
  try {
    const rows = await getWithCache('/fixtures/statistics', { fixture: fixtureId }, { signal });
    // rows: [{ team: {id,name,logo}, statistics: [{type,value}, ...] }, ...]
    return rows.map(r => ({
      team: { id: r.team?.id, name: r.team?.name, logo: r.team?.logo },
      stats: (r.statistics || []).reduce((acc, s) => { acc[s.type] = s.value; return acc; }, {})
    }));
  } catch (e) { return null; }
}

export async function fetchH2H(fixtureId, signal) {
  if (!fixtureId) return null;
  // Need fixture to know teams
  const fx = await fetchFixtureById(fixtureId).catch(()=>null);
  const homeId = fx?.teams?.home?.id; const awayId = fx?.teams?.away?.id;
  if (!homeId || !awayId) return null;
  try {
    const rows = await getWithCache('/fixtures/headtohead', { h2h: `${homeId}-${awayId}`, last: 10 }, { signal });
    // Build aggregate
    let homeWins = 0, awayWins = 0, draws = 0;
    const lastMatches = rows.slice(0, 5).map(r => {
      const hs = r.goals?.home ?? 0; const as = r.goals?.away ?? 0;
      if (hs > as) homeWins++; else if (as > hs) awayWins++; else draws++;
      return {
        date: (r.fixture?.date || '').slice(0, 10),
        homeTeam: r.teams?.home?.name,
        awayTeam: r.teams?.away?.name,
        homeScore: hs,
        awayScore: as,
        homeLogo: r.teams?.home?.logo,
        awayLogo: r.teams?.away?.logo,
      };
    });
    // Count total across all rows
    rows.forEach(r => { const hs = r.goals?.home ?? 0; const as = r.goals?.away ?? 0; if (hs > as) homeWins++; else if (as > hs) awayWins++; else draws++; });
    return {
      totalMatches: rows.length,
      homeWins, awayWins, draws,
      lastMatches,
      homeTeamLogo: fx?.teams?.home?.logo,
      awayTeamLogo: fx?.teams?.away?.logo,
      homeTeam: fx?.teams?.home?.name,
      awayTeam: fx?.teams?.away?.name,
    };
  } catch (e) { return null; }
}

// ---------- Player stats (Top Scorers / Assists) ----------
export async function fetchTopScorers(leagueId, season, signal) {
  if (!leagueId || !season) return [];
  try {
    const rows = await getWithCache('/players/topscorers', { league: leagueId, season }, { signal });
    return rows.map((r, idx) => {
      const stat = r.statistics?.[0] || {};
      return {
        rank: idx + 1,
        playerId: r.player?.id,
        name: r.player?.name,
        age: r.player?.age,
        nationality: r.player?.nationality,
        photo: r.player?.photo,
        teamId: stat.team?.id,
        teamName: stat.team?.name,
        teamLogo: stat.team?.logo,
        goals: stat.goals?.total || 0,
      };
    });
  } catch (e) {
    return [];
  }
}

export async function fetchTopAssists(leagueId, season, signal) {
  if (!leagueId || !season) return [];
  try {
    const rows = await getWithCache('/players/topassists', { league: leagueId, season }, { signal });
    return rows.map((r, idx) => {
      const stat = r.statistics?.[0] || {};
      return {
        rank: idx + 1,
        playerId: r.player?.id,
        name: r.player?.name,
        age: r.player?.age,
        nationality: r.player?.nationality,
        photo: r.player?.photo,
        teamId: stat.team?.id,
        teamName: stat.team?.name,
        teamLogo: stat.team?.logo,
        assists: stat.goals?.assists || 0,
      };
    });
  } catch (e) {
    return [];
  }
}

export async function fetchTeamsByLeague(leagueId, season = 2025, signal) {
  try {
    const rows = await getWithCache('/teams', { league: leagueId, season }, { ttl: TEAM_TTL, signal });
    console.log(`[DEBUG] fetchTeamsByLeague(${leagueId}, ${season}): ${rows?.length || 0} teams found`);
    
    if (!rows || !rows.length) {
      console.warn(`[DEBUG] No teams found for league ${leagueId} season ${season}, trying without season...`);
      // For tournaments, sometimes teams are available without season filter
      const rowsNoSeason = await getWithCache('/teams', { league: leagueId }, { ttl: TEAM_TTL, signal });
      console.log(`[DEBUG] Without season filter: ${rowsNoSeason?.length || 0} teams found`);
      
      if (rowsNoSeason?.length) {
        return rowsNoSeason.map(row => ({
          id: row.team.id,
          name: row.team.name,
          code: row.team.code,
          country: row.team.country,
          founded: row.team.founded,
          logo: row.team.logo,
          leagueId,
          season,
        }));
      }
      return [];
    }
    
    return rows.map(row => ({
      id: row.team.id,
      name: row.team.name,
      code: row.team.code,
      country: row.team.country,
      founded: row.team.founded,
      logo: row.team.logo,
      leagueId,
      season,
    }));
  } catch (e) {
    console.error(`[DEBUG] fetchTeamsByLeague error for ${leagueId}:`, e.message);
    throw e;
  }
}

// Teams fetch with fallback (try without season for tournaments)
export async function fetchTeamsByLeagueWithFallback(leagueId, seasons = [], signal) {
  console.log(`[DEBUG] fetchTeamsByLeagueWithFallback(${leagueId}) trying seasons: ${seasons.join(', ')}`);
  
  for (const s of seasons) {
    const list = await fetchTeamsByLeague(leagueId, s, signal);
    if (list.length) {
      console.log(`[DEBUG] Found ${list.length} teams for league ${leagueId} in season ${s}`);
      return { season: s, teams: list };
    }
  }
  
  // Final fallback: try without any season (for tournaments)
  try {
    console.log(`[DEBUG] Final fallback: trying league ${leagueId} without season`);
    const rows = await getWithCache('/teams', { league: leagueId }, { signal });
    if (rows?.length) {
      console.log(`[DEBUG] Found ${rows.length} teams without season filter`);
      const teams = rows.map(row => ({
        id: row.team.id,
        name: row.team.name,
        code: row.team.code,
        country: row.team.country,
        founded: row.team.founded,
        logo: row.team.logo,
        leagueId,
        season: seasons[0], // assign first season as default
      }));
      return { season: seasons[0], teams };
    }
  } catch (e) {
    console.error(`[DEBUG] Final fallback failed:`, e.message);
  }
  
  console.warn(`[DEBUG] No teams found for league ${leagueId} in any approach`);
  return { season: seasons[0], teams: [] };
}

export async function fetchPlayersByTeam(teamId, season = 2025, signal) {
  if (!teamId) return [];

  console.log(`[DEBUG] fetchPlayersByTeam(${teamId}, ${season})`);

  // 1) Try rich stats endpoint first
  let rows;
  try {
    rows = await getWithCache('/players', { team: teamId, season }, { ttl: PLAYER_TTL, signal });
    console.log(`[DEBUG] Players with stats: ${rows?.length || 0}`);
  } catch (e) {
    console.warn(`[DEBUG] Players stats endpoint failed:`, e.message);
    rows = null;
  }

  if (Array.isArray(rows) && rows.length && rows[0]?.player) {
    return rows.map(r => {
      const stat = r.statistics?.[0] || {};
      const games = stat.games || {};
      return {
        id: r.player.id,
        name: r.player.name,
        age: r.player.age,
        nationality: r.player.nationality,
        height: r.player.height,
        weight: r.player.weight,
        photo: r.player.photo,
        position: games.position || stat.position || 'Unknown',
        number: games.number || null,
        teamId,
        season,
        statistics: stat,
      };
    });
  }

  // 2) Fallback to squads endpoint (lighter data)
  let squadRows;
  try {
    squadRows = await getWithCache('/players/squads', { team: teamId }, { signal });
    console.log(`[DEBUG] Squad endpoint: ${squadRows?.length || 0} squads`);
  } catch (e) {
    console.warn(`[DEBUG] Squad endpoint failed:`, e.message);
    squadRows = null;
  }

  const squad = Array.isArray(squadRows) ? squadRows[0] : null;
  if (squad?.players) {
    console.log(`[DEBUG] Using squad data: ${squad.players.length} players`);
    return squad.players.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      nationality: p.nationality,
      height: p.height || null,
      weight: p.weight || null,
      photo: p.photo,
      position: p.position || 'Unknown',
      number: p.number || null,
      teamId,
      season,
      statistics: null, // not available from squads
    }));
  }

  console.warn(`[DEBUG] No players found for team ${teamId}`);
  return [];
}

// Player fetch with fallback seasons
export async function fetchPlayersByTeamWithFallback(teamId, seasons = [], signal) {
  console.log(`[DEBUG] fetchPlayersByTeamWithFallback(${teamId}) trying seasons: ${seasons.join(', ')}`);
  for (const s of seasons) {
    const list = await fetchPlayersByTeam(teamId, s, signal);
    if (list.length) {
      console.log(`[DEBUG] Found ${list.length} players for team ${teamId} in season ${s}`);
      return { season: s, players: list };
    }
  }
  console.warn(`[DEBUG] No players found for team ${teamId} in any season`);
  return { season: seasons[0], players: [] };
}

// ---------- Mapping ----------
export function mapFixtureToCard(fx) {
  const { league, fixture, teams, goals } = fx;
  const statusShort = fixture?.status?.short;
  const elapsed = fixture?.status?.elapsed;
  const minute =
    statusShort === '1H' || statusShort === '2H' || statusShort === 'ET' || statusShort === 'LIVE'
      ? `${elapsed || 0}'`
      : statusShort === 'HT'
      ? 'HT'
      : statusShort === 'FT'
      ? 'FT'
      : statusShort;

  return {
    id: fixture.id,
    date: fixture.date,
    leagueId: league.id,
    leagueName: league.name,
    leagueRound: league.round,
    // add league logo so UI can use it directly
    leagueLogo: league.logo,             // <-- add
    home: { id: teams.home.id, name: teams.home.name, logo: teams.home.logo, winner: teams.home.winner },
    away: { id: teams.away.id, name: teams.away.name, logo: teams.away.logo, winner: teams.away.winner },
    score: { home: goals.home, away: goals.away },
    statusShort,
    minute,
    venue: fixture.venue?.name,
    referee: fixture.referee,
  };
}

export function dedupeFixtures(list) {
  const seen = new Set();
  return list.filter(f => {
    const id = f?.fixture?.id ?? f?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// ---------- Logos & Photos (24h cache) ----------
function pickByName(rows, nameKey, wanted) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const wantedLc = (wanted || '').trim().toLowerCase();
  let exact = rows.find(r => (r?.[nameKey] || r?.team?.name || r?.league?.name || '').trim().toLowerCase() === wantedLc);
  if (exact) return exact;
  return rows[0];
}

export async function fetchTeamLogo({ teamId, name, signal }) {
  if (teamId) {
    const rows = await getWithCacheTTL('/teams', { id: teamId }, LOGO_TTL, { signal });
    const row = rows?.[0]?.team;
    return row?.logo || null;
  }
  if (name) {
    const rows = await getWithCacheTTL('/teams', { search: name }, LOGO_TTL, { signal });
    const row = pickByName(rows?.map(r => r.team), 'name', name);
    return row?.logo || null;
  }
  return null;
}

export async function fetchLeagueLogo({ leagueId, name, signal }) {
  if (leagueId) {
    const rows = await getWithCacheTTL('/leagues', { id: leagueId }, LOGO_TTL, { signal });
    const row = rows?.[0]?.league;
    return row?.logo || null;
  }
  if (name) {
    const rows = await getWithCacheTTL('/leagues', { name }, LOGO_TTL, { signal });
    const row = pickByName(rows?.map(r => r.league), 'name', name);
    return row?.logo || null;
  }
  return null;
}

export async function fetchPlayerPhoto({ playerId, name, teamId, season = 2025, signal }) {
  if (playerId) {
    const rows = await getWithCacheTTL('/players', { id: playerId, season }, LOGO_TTL, { signal });
    const row = rows?.[0]?.player;
    return row?.photo || null;
  }
  if (name) {
    const params = { search: name, season };
    if (teamId) params.team = teamId;
    const rows = await getWithCacheTTL('/players', params, LOGO_TTL, { signal });
    const row = pickByName(rows?.map(r => r.player), 'name', name);
    return row?.photo || null;
  }
  return null;
}

// ---------- Coach ----------
export async function fetchCoach(teamId, signal) {
  if (!teamId) return null;
  try {
    const rows = await getWithCache('/coachs', { team: teamId }, { signal });
    const row = rows?.[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      age: row.age,
      nationality: row.nationality,
      photo: row.photo,
      role: 'Coach',
    };
  } catch (e) {
    return null;
  }
}

// ---------- News (external API) ----------
// Simple fetcher for newsapi.ai getArticles endpoint.
// Keep here for convenience; consider moving to its own module if it grows.
// (fetchNews moved to dedicated news utility)
