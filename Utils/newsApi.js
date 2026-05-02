// Dedicated News API utility (football only, EN/ES)
import { NEWS_API_KEY } from '../Config/newsConfig';

// Simple in-memory cache with size management
const newsCache = new Map();
const MAX_CACHE_SIZE = 100;
// Increment this if filtering logic changes so old empty caches are ignored
const CACHE_SCHEMA_VERSION = 2;
const TTL_MS = 5 * 60 * 1000; // Increased to 5 minutes for better performance

// Mapping front-end i18n codes to API language codes
const LANG_MAP = { en: 'eng', es: 'spa' };

// Football concept URIs (generic + soccer) to widen variety while staying in topic
const FOOTBALL_CONCEPTS = [
  'http://en.wikipedia.org/wiki/Association_football',
  // Add more specific if needed (clubs, competitions) later
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function getFootballNews({ lang = 'en', count = 10, page = 1, randomize = true, signal } = {}) {
  const apiLang = LANG_MAP[lang] || 'eng';
  const cacheKey = `${CACHE_SCHEMA_VERSION}:${apiLang}:${page}:${count}`;
  const existing = newsCache.get(cacheKey);
  if (existing && Date.now() - existing.time < TTL_MS) return existing.data;

  // We request up to 'count' items (articlesCount) directly (max 100 allowed) sorted by date.
  const body = {
    action: 'getArticles',
    resultType: 'articles',
    articlesPage: page,
    articlesCount: count,
    articlesSortBy: 'date',
    articlesSortByAsc: false,
    articleBodyLen: -1,
    dataType: ['news'],
    lang: [apiLang],
    // Use conceptUri array filter (any of them) to keep to football; docs allow array for conceptUri.
    conceptUri: FOOTBALL_CONCEPTS,
    apiKey: NEWS_API_KEY,
  };

  try {
    const res = await fetch('https://eventregistry.org/api/v1/article/getArticles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);

    const results = json?.articles?.results || [];
    // Map raw articles
    let articles = results.map(a => ({
      id: a.uri,
      title: a.title || '',
      description: (a.body || '').slice(0, 240),
      body: a.body || '',
      url: a.url,
      image: a.image || null,
      source: a.source?.title || a.source?.uri || '',
      date: a.dateTime || a.date || '',
      lang: a.lang,
    }));

    // Language‑aware football keyword whitelist to reduce unrelated articles.
    // Keep fairly broad to avoid excluding genuine football stories.
    const KEYWORDS_BY_LANG = {
      en: ['football','soccer','league','cup','match','goal','coach','manager','player','transfer','signing','club','striker','midfielder','defender'],
      es: ['futbol','fútbol','liga','copa','partido','gol','entrenador','tecnico','técnico','jugador','traspaso','fichaje','club','delantero','centrocampista','defensa'],
    };
    const baseKeywords = KEYWORDS_BY_LANG[lang] || KEYWORDS_BY_LANG.en;
    // Normalize (remove diacritics, lowercase)
    const normalize = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const normKeywords = baseKeywords.map(normalize);
    const preFilterCount = articles.length;
    let filtered = articles.filter(a => {
      const text = normalize(a.title + ' ' + a.description);
      return normKeywords.some(k => text.includes(k));
    });
    // If filtering removed everything (e.g., API wording differs) keep originals to avoid blank UI
    if (!filtered.length && preFilterCount) {
      filtered = articles;
    }
    articles = filtered;

    // De-duplicate by normalized title + date (some APIs repeat items)
    const seen = new Set();
    articles = articles.filter(a => {
      const key = (a.title||'').trim().toLowerCase() + '|' + (a.date||'').slice(0,10);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (randomize) articles = shuffle(articles);

    const mapped = {
      articles,
      total: json?.articles?.totalResults || articles.length,
      page: json?.articles?.page || page,
      pages: json?.articles?.pages || 1,
      lang: apiLang,
    };
    newsCache.set(cacheKey, { time: Date.now(), data: mapped });
    return mapped;
  } catch (e) {
    return { articles: [], total: 0, page: 1, pages: 1, error: e.message };
  }
}
