// News API configuration
// IMPORTANT: Provide this key via environment variables at build time.
// Do NOT commit API keys to source. Use EXPO_PUBLIC_NEWS_API_KEY for client-safe keys,
// or proxy news requests through your server for better control.
export const NEWS_API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY;
if (!process.env.EXPO_PUBLIC_NEWS_API_KEY) console.warn('[newsConfig] Missing EXPO_PUBLIC_NEWS_API_KEY – news requests will fail.');

export const NEWS_API_BASE_URL = 'https://newsapi.ai/api/v1/article/getArticles';

// Default query settings for football related news
// (Concept-based default removed; fetching handled in Utils/newsApi.js)
