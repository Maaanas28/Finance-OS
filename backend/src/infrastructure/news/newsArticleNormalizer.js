/**
 * News Article Normalizer
 *
 * Transforms raw RSS items from rssParser into the canonical NewsArticle shape,
 * running sentiment analysis and ticker extraction in the process.
 *
 * Canonical shape:
 * {
 *   id            string   — SHA-256-equivalent deterministic ID from URL
 *   title         string
 *   summary       string   — cleaned text excerpt (max 300 chars)
 *   url           string
 *   source        string   — feed name
 *   category      string   — feed-mapped category
 *   publishedAt   string   — ISO 8601
 *   imageUrl      string|null
 *   sentiment     string   — 'BULLISH'|'BEARISH'|'NEUTRAL'
 *   sentimentScore number  — 0.0–1.0
 *   impact        string   — 'HIGH'|'MEDIUM'|'LOW'
 *   sentimentMethod string — 'rule-based'|'ai-enriched'
 *   relatedTickers string[]
 *   dataSource    string   — 'RSS_LIVE'|'CACHED'|'MOCK'
 * }
 */

import { analyzeRuleBased } from './sentimentAnalyzer.js';
import { extractTickers } from './portfolioTickerLinker.js';

/**
 * Generate a simple deterministic hash string from a URL.
 * Uses a djb2-style hash converted to hex — no crypto module needed.
 * @param {string} str
 * @returns {string}
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit integer
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Parse a date string safely, returning ISO 8601 or null.
 * @param {string|null} dateStr
 * @returns {string}
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Truncate text to a maximum length, breaking at a word boundary.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(text = '', maxLen = 300) {
  if (text.length <= maxLen) return text;
  const cut = text.substring(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLen - 60 ? cut.substring(0, lastSpace) : cut) + '…';
}

/**
 * Normalize a raw RSS item into a canonical NewsArticle.
 * @param {object} raw - Raw item from rssParser
 * @param {string} category - Feed category label
 * @param {string} dataSource - 'RSS_LIVE'|'CACHED'|'MOCK'
 * @returns {object} Canonical NewsArticle
 */
export function normalizeArticle(raw, category = 'MARKETS', dataSource = 'RSS_LIVE') {
  const url = (raw.link || '').trim();
  const id = `news-${hashString(url || raw.title || String(Date.now()))}`;
  const title = (raw.title || '').trim();
  const summary = truncate(raw.description || '', 300);

  // Sentiment analysis (rule-based, always synchronous)
  const { sentiment, sentimentScore, impact, method } = analyzeRuleBased(title, summary);

  // Ticker extraction
  const relatedTickers = extractTickers(title, summary);

  return {
    id,
    title,
    summary,
    url,
    source: raw.source || 'Financial Wire',
    category,
    publishedAt: parseDate(raw.pubDate),
    imageUrl: raw.imageUrl || null,
    sentiment,
    sentimentScore,
    impact,
    sentimentMethod: method,
    relatedTickers,
    dataSource,
  };
}

/**
 * Normalize a batch of raw RSS items.
 * Deduplicates by article ID and filters out malformed items.
 * @param {object[]} rawItems
 * @param {string} category
 * @param {string} dataSource
 * @returns {object[]} Sorted by publishedAt descending
 */
export function normalizeArticles(rawItems = [], category = 'MARKETS', dataSource = 'RSS_LIVE') {
  const seen = new Set();
  const articles = [];

  for (const raw of rawItems) {
    if (!raw.title || raw.title.length < 5) continue;
    const article = normalizeArticle(raw, category, dataSource);
    if (seen.has(article.id)) continue;
    seen.add(article.id);
    articles.push(article);
  }

  // Sort newest first
  articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return articles;
}
