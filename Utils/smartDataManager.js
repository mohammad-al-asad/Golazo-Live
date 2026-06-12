// Smart Data Manager - Ultimate Hybrid Caching with AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchFixturesBulk } from './apiFootball';
import { LEAGUES, DEFAULT_TIMEZONE } from '../Config/leagues';
import { getLocalDateString, parseLocalDate } from './dateHelpers';

class SmartDataManager {
  constructor() {
    this.cache = new Map(); // dateKey -> { data, timestamp, status }
    this.prefetchQueue = new Set();
    this.isActivelyPrefetching = false;
    this.subscribers = new Set();
    
    // AsyncStorage configuration
    this.STORAGE_PREFIX = '@GolazoCache_';
    this.STORAGE_VERSION = 'v4';
    this.STORAGE_KEYS = {
      CACHE_DATA: `${this.STORAGE_PREFIX}data_${this.STORAGE_VERSION}`,
  CACHE_INDEX: `${this.STORAGE_PREFIX}index_${this.STORAGE_VERSION}`,
      CACHE_METADATA: `${this.STORAGE_PREFIX}metadata_${this.STORAGE_VERSION}`,
      LAST_SYNC: `${this.STORAGE_PREFIX}lastSync_${this.STORAGE_VERSION}`,
    };
    
    // Configuration
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes (increased for persistence)
  this.PREFETCH_RADIUS = 1; // Prefetch nearby dates only to avoid API rate-limit bursts
    this.MAX_CACHE_SIZE = 30; // Keep max 30 dates cached
    this.BATCH_SIZE = 1; // Process one date at a time to avoid API rate-limit bursts
    this.DEBOUNCE_TIME = 100; // ms
  this.PERSIST_DEBOUNCE_MS = 2000; // batch writes at most once every 2s
  this.dirtyKeys = new Set(); // cache keys that changed and need persisting
  this.persistTimer = null;
    
    this.prefetchTimeouts = new Map();
    this.startupPrefetchComplete = false;
    this.isInitialized = false;
    this.lastSyncTime = null;
  // New sync tracking (today vs others)
  this.lastTodayFetchTime = null; // timestamp (Date) of last explicit today fetch
  this.lastOthersSyncTime = null; // timestamp (Date) of last others (non-today) sync
  this.startupPhase = true; // suppress heavy prefetch during cold start

  // Time windows
  this.TODAY_FRESH_WINDOW_MS = 20 * 60 * 1000; // 10 minutes freshness window for today
  this.OTHERS_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours for non-today sync
    
    // Initialize AsyncStorage on construction
    this.initializeStorage();
  }

  // 🚀 INITIALIZE ASYNCSTORAGE CACHE
  async initializeStorage() {
    try {
      console.log('[SmartDataManager] 🔄 Initializing AsyncStorage cache...');
      
      // Load cached data from AsyncStorage (include legacy single-key cache as a fallback)
      const [indexData, cachedData, metadata, lastSync] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.CACHE_INDEX),
        AsyncStorage.getItem(this.STORAGE_KEYS.CACHE_DATA),
        AsyncStorage.getItem(this.STORAGE_KEYS.CACHE_METADATA),
        AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC),
      ]);

      // If per-date index exists, load only a small set at startup (fast) and schedule background load of rest
      if (indexData) {
        try {
          const index = JSON.parse(indexData) || [];
          if (Array.isArray(index) && index.length) {
            // Load at most N recent entries synchronously for fast startup
            const N = Math.min(8, index.length);
            const recent = index.slice(-N);
            const keys = recent.map(k => `${this.STORAGE_PREFIX}date_${encodeURIComponent(k)}`);
            const pairs = await AsyncStorage.multiGet(keys);
            const obj = {};
            pairs.forEach(([storageKey, value]) => {
              if (!value) return;
              try {
                const rawKey = decodeURIComponent(storageKey.split('date_').pop());
                obj[rawKey] = JSON.parse(value);
              } catch (e) {}
            });
            this.cache = new Map(Object.entries(obj));
            console.log(`[SmartDataManager] ✅ Fast-loaded ${this.cache.size} recent cached entries`);

            // Schedule background load of remaining keys (non-blocking)
            setTimeout(async () => {
              try {
                const remaining = index.slice(0, Math.max(0, index.length - N));
                if (!remaining.length) return;
                const remKeys = remaining.map(k => `${this.STORAGE_PREFIX}date_${encodeURIComponent(k)}`);
                const remPairs = await AsyncStorage.multiGet(remKeys);
                remPairs.forEach(([storageKey, value]) => {
                  if (!value) return;
                  try {
                    const rawKey = decodeURIComponent(storageKey.split('date_').pop());
                    this.cache.set(rawKey, JSON.parse(value));
                  } catch (e) {}
                });
                console.log(`[SmartDataManager] ✅ Background-loaded ${remaining.length} cached entries`);
              } catch (e) {
                console.warn('[SmartDataManager] Background load failed:', e);
              }
            }, 1000);
          }
        } catch (e) {
          console.warn('[SmartDataManager] Failed to parse cache index:', e);
        }
      } else if (cachedData) {
        // Fallback for older single-key cache format
        const parsedCache = JSON.parse(cachedData);
        this.cache = new Map(Object.entries(parsedCache));
        console.log(`[SmartDataManager] ✅ Loaded ${this.cache.size} cached entries from storage`);
      }

      if (metadata) {
        const parsedMetadata = JSON.parse(metadata);
        this.lastSyncTime = parsedMetadata.lastSyncTime ? new Date(parsedMetadata.lastSyncTime) : this.lastSyncTime;
        this.startupPrefetchComplete = parsedMetadata.startupPrefetchComplete || false;
        this.lastTodayFetchTime = parsedMetadata.lastTodayFetchTime ? new Date(parsedMetadata.lastTodayFetchTime) : null;
        this.lastOthersSyncTime = parsedMetadata.lastOthersSyncTime ? new Date(parsedMetadata.lastOthersSyncTime) : null;
      }

      if (lastSync) {
        this.lastSyncTime = new Date(lastSync);
      }

      this.isInitialized = true;
      console.log('[SmartDataManager] 🎉 AsyncStorage cache initialized');
      
  // New startup flow: ensure today's data only; others scheduled separately (24h)
  this.ensureTodayFresh(); // async, handles its own completion
  this.maybeScheduleOthersSync();
      
    } catch (error) {
      console.warn('[SmartDataManager] Failed to initialize storage:', error);
      this.isInitialized = true; // Continue without cache
    }
  }

  // Debounced per-date persist to AsyncStorage. Call schedulePersist() after cache changes.
  schedulePersist(cacheKey) {
    if (!this.isInitialized) return;
    if (cacheKey) this.dirtyKeys.add(cacheKey);
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.doPersist(), this.PERSIST_DEBOUNCE_MS);
  }

  async doPersist() {
    if (!this.isInitialized) return;
    if (!this.dirtyKeys.size) return;

    const start = Date.now();
    try {
      const setOps = [];
      const removeKeys = [];

      for (const cacheKey of Array.from(this.dirtyKeys)) {
        const entry = this.cache.get(cacheKey);
        const storageKey = `${this.STORAGE_PREFIX}date_${encodeURIComponent(cacheKey)}`;
        if (entry) {
          setOps.push([storageKey, JSON.stringify(entry)]);
        } else {
          removeKeys.push(storageKey);
        }
      }

      if (setOps.length) await AsyncStorage.multiSet(setOps);
      if (removeKeys.length) await AsyncStorage.multiRemove(removeKeys);

      // Update index of keys
      const allKeys = Array.from(this.cache.keys());
      await AsyncStorage.setItem(this.STORAGE_KEYS.CACHE_INDEX, JSON.stringify(allKeys));

      const metadata = {
        lastSyncTime: this.lastSyncTime ? this.lastSyncTime.toISOString() : null,
        startupPrefetchComplete: this.startupPrefetchComplete,
        cacheSize: this.cache.size,
        timestamp: Date.now(),
        lastTodayFetchTime: this.lastTodayFetchTime ? this.lastTodayFetchTime.toISOString() : null,
        lastOthersSyncTime: this.lastOthersSyncTime ? this.lastOthersSyncTime.toISOString() : null,
      };
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.CACHE_METADATA, JSON.stringify(metadata)),
        AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, this.lastSyncTime?.toISOString() || new Date().toISOString()),
      ]);

      this.dirtyKeys.clear();
      const took = Date.now() - start;
      console.log(`[SmartDataManager] 💾 Persisted in ${took}ms`);
    } catch (error) {
      console.warn('[SmartDataManager] Failed to persist cache:', error);
    }
  }

  // === TODAY & OTHERS SYNC MODEL ===
  async ensureTodayFresh() {
    const todayKey = getLocalDateString();
    const cacheKey = `${todayKey}:all`;
    const cached = this.cache.get(cacheKey);

    const isFresh = cached && cached.status === 'complete' && (Date.now() - cached.timestamp) < this.TODAY_FRESH_WINDOW_MS;
    if (isFresh) {
      console.log('[SmartDataManager] 🔍 ensureTodayFresh(): hit (fresh)');
      this.startupPhase = false;
      return;
    }
    if (cached && cached.status === 'complete') {
      console.log('[SmartDataManager] 🔍 ensureTodayFresh(): stale (older than 10m) -> refetch');
    } else if (!cached) {
      console.log('[SmartDataManager] 🔍 ensureTodayFresh(): missing -> fetch');
    }
    try {
      await this.fetchDate(todayKey, 'all', 'startup-today');
      this.lastTodayFetchTime = new Date();
      // mark key dirty for persistence
      this.schedulePersist(cacheKey);
    } catch (e) {
      console.warn('[SmartDataManager] ensureTodayFresh() fetch failed:', e);
    } finally {
      this.startupPhase = false;
    }
  }

  maybeScheduleOthersSync() {
    const now = Date.now();
    const last = this.lastOthersSyncTime ? this.lastOthersSyncTime.getTime() : 0;
    const dueIn = (last + this.OTHERS_SYNC_INTERVAL_MS) - now;
    if (dueIn <= 0) {
      console.log('[SmartDataManager] � Scheduling others sync (due now)');
      setTimeout(() => this.runOthersSync(), 3000); // small delay to avoid competing with initial render
    } else {
      console.log(`[SmartDataManager] ⏰ Others sync in ${Math.round(dueIn/60000)} minutes`);
    }
  }

  async runOthersSync() {
    if (!this.isInitialized) return;
    console.log('[SmartDataManager] 🔄 Others sync start (±2 days excluding today)');
    const todayKey = getLocalDateString();
    const targets = [];
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue; // skip today (today handled separately)
      const d = new Date();
      d.setDate(d.getDate() + i);
      targets.push(getLocalDateString(d));
    }
    for (const date of targets) {
      try {
        await this.fetchDate(date, 'all', 'others-sync');
        await new Promise(r => setTimeout(r, 250));
      } catch (e) {
        console.warn('[SmartDataManager] Others sync fetch failed for', date, e);
      }
    }
    this.lastOthersSyncTime = new Date();
    // mark all keys dirty for persistence
    this.cache.forEach((_, key) => this.dirtyKeys.add(key));
    this.schedulePersist();
    console.log('[SmartDataManager] ✅ Others sync complete');
  }

  // Subscribe to data changes
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify all subscribers
  notify(dateKey, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(dateKey, data);
      } catch (e) {
        console.warn('[SmartDataManager] Subscriber error:', e);
      }
    });
  }

  // Get data for a date - returns immediately if cached, starts fetch if not
  getData(dateKey, leagueKey = 'all') {
    const cacheKey = `${dateKey}:${leagueKey}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isValid(cached)) {
      // Trigger prefetch (unless in startup phase when we keep things minimal)
      if (!this.startupPhase) {
        try { this.startPrefetching(dateKey, leagueKey); } catch (e) { /* ignore */ }
      } else {
        console.log('[SmartDataManager] ⏳ Skipping prefetch during startupPhase');
      }
      return {
        data: cached.data,
        loading: false,
        fromCache: true
      };
    }

    // Not cached or stale - start fetch and return loading state
    // Trigger prefetch (unless startup suppression)
    if (!this.startupPhase) {
      try { this.startPrefetching(dateKey, leagueKey); } catch (e) { /* ignore */ }
    } else {
      console.log('[SmartDataManager] ⏳ Skipping prefetch (no cached data) during startupPhase');
    }
    this.fetchDate(dateKey, leagueKey);
    return {
      data: cached?.data || [],
      loading: true,
      fromCache: false
    };
  }

  // Check if cached data is still valid
  isValid(cached) {
    return cached && 
           cached.status === 'complete' && 
           (Date.now() - cached.timestamp) < this.CACHE_TTL;
  }

  // Fetch data for a specific date
  async fetchDate(dateKey, leagueKey = 'all', priority = 'normal') {
    const cacheKey = `${dateKey}:${leagueKey}`;
    
    // Don't fetch if already in progress
    if (this.cache.get(cacheKey)?.status === 'loading') {
      return;
    }

    // Mark as loading with priority
    this.cache.set(cacheKey, {
      data: this.cache.get(cacheKey)?.data || [],
      timestamp: Date.now(),
      status: 'loading',
      priority: priority
    });

    try {
      let rows = [];
      
      if (leagueKey === 'all') {
        rows = await fetchFixturesBulk({
          leagueIds: LEAGUES.map(l => l.id),
          date: dateKey,
          timezone: DEFAULT_TIMEZONE,
        });
      } else {
        const league = LEAGUES.find(l => l.key === leagueKey);
        if (league) {
          rows = await fetchFixturesBulk({
            leagueIds: [league.id],
            date: dateKey,
            timezone: DEFAULT_TIMEZONE,
          });
        }
      }

      // Process and cache the data
      const processedData = this.processFixtures(rows);
      
      this.cache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now(),
        status: 'complete'
      });

      // Notify subscribers
      this.notify(dateKey, processedData);

      // Clean up old cache entries
      this.pruneCache();

  // Mark this cache key as dirty and schedule a debounced persist
  this.schedulePersist(cacheKey);

    } catch (error) {
      console.warn(`[SmartDataManager] Fetch failed for ${dateKey}:`, error);
      
      // Mark as error but keep any existing data
      const existing = this.cache.get(cacheKey);
      const existingData = existing?.data || [];
      this.cache.set(cacheKey, {
        data: existingData,
        timestamp: Date.now(),
        status: 'error',
        error: error.message
      });
      this.notify(dateKey, existingData);
    }
  }

  // Process fixtures (implement your existing logic)
  processFixtures(rows) {
    // Import dynamically to avoid circular dependencies
    const dedupeFixtures = require('./apiFootball').dedupeFixtures;
    const mapFixtureToCard = require('./apiFootball').mapFixtureToCard;
    
    const deduped = dedupeFixtures(rows);
    return deduped.map(mapFixtureToCard);
  }

  // Smart prefetching around a target date
  startPrefetching(targetDate, leagueKey = 'all') {
    // Clear existing prefetch timeout
    const timeoutKey = `${targetDate}:${leagueKey}`;
    if (this.prefetchTimeouts.has(timeoutKey)) {
      clearTimeout(this.prefetchTimeouts.get(timeoutKey));
    }

    // Debounced prefetch
    const timeout = setTimeout(() => {
      this.doPrefetch(targetDate, leagueKey);
    }, this.DEBOUNCE_TIME);
    
    this.prefetchTimeouts.set(timeoutKey, timeout);
  }

  async doPrefetch(targetDate, leagueKey) {
    if (this.isActivelyPrefetching) return;
    
    this.isActivelyPrefetching = true;
    
    try {
      // Generate dates to prefetch around target
      const datesToPrefetch = this.generatePrefetchDates(targetDate);
      
      // Filter out already cached dates
      const uncachedDates = datesToPrefetch.filter(date => {
        const cached = this.cache.get(`${date}:${leagueKey}`);
        return !this.isValid(cached);
      });

      console.log(`[SmartDataManager] Prefetching ${uncachedDates.length} dates around ${targetDate}`);

      // Process in batches to avoid overwhelming the API
      for (let i = 0; i < uncachedDates.length; i += this.BATCH_SIZE) {
        const batch = uncachedDates.slice(i, i + this.BATCH_SIZE);
        
        // Process batch in parallel
        await Promise.all(
          batch.map(date => this.fetchDate(date, leagueKey, 'prefetch'))
        );

        // Small delay between batches to be nice to the API
        if (i + this.BATCH_SIZE < uncachedDates.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

    } catch (error) {
      console.warn('[SmartDataManager] Prefetch error:', error);
    } finally {
      this.isActivelyPrefetching = false;
    }
  }

  // Generate dates for prefetching
  generatePrefetchDates(targetDate) {
    const dates = [];
    const baseDate = parseLocalDate(targetDate);
    
    // Add dates in priority order: target, ±1, ±2, ±3, etc.
    for (let offset = 0; offset <= this.PREFETCH_RADIUS; offset++) {
      if (offset === 0) {
        dates.push(targetDate);
      } else {
        // Add future date
        const futureDate = new Date(baseDate);
        futureDate.setDate(futureDate.getDate() + offset);
        dates.push(getLocalDateString(futureDate));
        
        // Add past date
        const pastDate = new Date(baseDate);
        pastDate.setDate(pastDate.getDate() - offset);
        dates.push(getLocalDateString(pastDate));
      }
    }
    
    return dates;
  }

  // Clean up old cache entries
  pruneCache() {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;
    
    // Convert to array and sort by timestamp
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => this.cache.delete(key));
    
    console.log(`[SmartDataManager] Pruned ${toRemove.length} old cache entries`);
    
  // Schedule persist for remaining keys after pruning
  this.cache.forEach((_, key) => this.dirtyKeys.add(key));
  this.schedulePersist();
  }

  // Force refresh a date
  async refreshDate(dateKey, leagueKey = 'all') {
    const cacheKey = `${dateKey}:${leagueKey}`;
    this.cache.delete(cacheKey);
    if (dateKey === getLocalDateString() && leagueKey === 'all') {
      console.log('[SmartDataManager] 🔁 Manual today refresh');
      this.lastTodayFetchTime = new Date();
    }
    return this.fetchDate(dateKey, leagueKey, 'refresh');
  }

  // Get cache statistics
  getCacheStats() {
    const total = this.cache.size;
    const valid = Array.from(this.cache.values()).filter(this.isValid).length;
    const loading = Array.from(this.cache.values()).filter(c => c.status === 'loading').length;
    
    return {
      total,
      valid,
      loading,
      hitRate: total > 0 ? ((valid / total) * 100).toFixed(1) + '%' : '0%',
      isActivelyPrefetching: this.isActivelyPrefetching
    };
  }

  // Clear all cache
  async clearCache() {
    this.cache.clear();
    this.prefetchQueue.clear();
    this.prefetchTimeouts.forEach(timeout => clearTimeout(timeout));
    this.prefetchTimeouts.clear();
    
    // Clear AsyncStorage
    try {
      // Remove per-date keys if index exists
      const indexData = await AsyncStorage.getItem(this.STORAGE_KEYS.CACHE_INDEX);
      if (indexData) {
        try {
          const index = JSON.parse(indexData) || [];
          const perDateKeys = index.map(k => `${this.STORAGE_PREFIX}date_${encodeURIComponent(k)}`);
          if (perDateKeys.length) await AsyncStorage.multiRemove(perDateKeys);
        } catch (e) { /* ignore */ }
        await AsyncStorage.removeItem(this.STORAGE_KEYS.CACHE_INDEX);
      }

      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEYS.CACHE_METADATA),
        AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_SYNC),
      ]);
      console.log('[SmartDataManager] 🗑️ Cleared AsyncStorage cache');
    } catch (error) {
      console.warn('[SmartDataManager] Failed to clear AsyncStorage:', error);
    }
  }
}

// Export singleton instance
export const smartDataManager = new SmartDataManager();
