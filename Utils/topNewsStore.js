// In‑memory store of the current top news article keys used in the header carousel.
// A "key" is (id || uri || key || title) from the raw API article.
let topNewsSet = new Set();

export function setTopNewsArticles(articles = []) {
  topNewsSet = new Set(
    articles.map(a => (a?.id || a?.uri || a?.key || a?.title || '')).filter(Boolean)
  );
}

export function getTopNewsKeys() {
  return topNewsSet;
}
