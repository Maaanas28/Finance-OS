/**
 * RSS News Provider
 *
 * Fetches financial news from free public RSS feeds, parses them,
 * and returns normalized NewsArticle objects.
 *
 * All feeds are public HTTP endpoints — no API keys required.
 * Graceful degradation: any individual feed failure is silently skipped.
 */

import { secureFetch } from '../http/httpClient.js';
import { parseRssFeed } from './rssParser.js';
import { normalizeArticles } from './newsArticleNormalizer.js';
import { logger } from '../../utils/logger.js';

// ─── Feed Definitions ─────────────────────────────────────────────────────────

/**
 * Public RSS feeds grouped by category.
 * Each feed is free to access with no authentication required.
 */
const RSS_FEEDS = [
  {
    url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    source: 'Economic Times Markets',
    category: 'MARKETS',
    priority: 1,
  },
  {
    url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
    source: 'Economic Times Stocks',
    category: 'EQUITIES',
    priority: 1,
  },
  {
    url: 'https://economictimes.indiatimes.com/markets/bonds/rssfeeds/3369027.cms',
    source: 'Economic Times Macro',
    category: 'MACRO',
    priority: 2,
  },
  {
    url: 'https://www.moneycontrol.com/rss/latestnews.xml',
    source: 'Moneycontrol',
    category: 'MARKETS',
    priority: 1,
  },
  {
    url: 'https://www.business-standard.com/rss/markets-106.rss',
    source: 'Business Standard Markets',
    category: 'EQUITIES',
    priority: 2,
  },
  {
    url: 'https://www.livemint.com/rss/economy',
    source: 'LiveMint Economy',
    category: 'ECONOMY',
    priority: 2,
  },
  {
    url: 'https://feeds.feedburner.com/ndtvprofit-latest',
    source: 'NDTV Profit',
    category: 'MARKETS',
    priority: 2,
  },
];

// ─── Category metadata ────────────────────────────────────────────────────────

export const NEWS_CATEGORIES = [
  { id: 'ALL', label: 'All News' },
  { id: 'MARKETS', label: 'Markets' },
  { id: 'EQUITIES', label: 'Equities' },
  { id: 'MACRO', label: 'Macro' },
  { id: 'ECONOMY', label: 'Economy' },
  { id: 'GLOBAL', label: 'Global' },
];

// ─── Provider Class ───────────────────────────────────────────────────────────

export class RSSNewsProvider {
  constructor() {
    this.name = 'RSSNewsProvider';
    this._feedHealthCache = new Map(); // feedUrl → { healthy, lastChecked }
  }

  /**
   * Fetch a single RSS feed and return normalized articles.
   * Returns empty array on any failure — never throws.
   * @param {object} feedDef
   * @returns {Promise<object[]>}
   */
  async fetchFeed(feedDef) {
    const { url, source, category } = feedDef;
    try {
      const rawXml = await secureFetch(url, {
        headers: {
          'User-Agent': 'FinanceOS/1.0 NewsReader (compatible; RSS reader)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      }, 10000); // 10 second timeout per feed

      if (!rawXml || typeof rawXml !== 'string') {
        logger.debug(`[RSSNewsProvider] Empty response from feed [${source}]`);
        this._feedHealthCache.set(url, { healthy: false, lastChecked: Date.now() });
        return [];
      }

      const { items } = parseRssFeed(rawXml, source, 20);
      const articles = normalizeArticles(items, category, 'RSS_LIVE');

      this._feedHealthCache.set(url, { healthy: true, lastChecked: Date.now(), count: articles.length });
      logger.debug(`[RSSNewsProvider] Feed [${source}] fetched ${articles.length} articles`);
      return articles;
    } catch (err) {
      logger.warn(`[RSSNewsProvider] Feed [${source}] failed: ${err.message}`);
      this._feedHealthCache.set(url, { healthy: false, lastChecked: Date.now(), error: err.message });
      return [];
    }
  }

  /**
   * Fetch all feeds concurrently and merge results.
   * @param {number} [maxPerFeed=15] - Max articles per feed
   * @returns {Promise<object[]>} All articles, sorted newest-first, deduplicated
   */
  async fetchAllFeeds(maxPerFeed = 15) {
    // Fetch all feeds concurrently — individual failures are gracefully skipped
    const results = await Promise.allSettled(
      RSS_FEEDS.map((feed) => this.fetchFeed(feed))
    );

    const allArticles = [];
    const seenIds = new Set();
    const seenTitles = new Set();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const article of (result.value || []).slice(0, maxPerFeed)) {
          const normTitle = (article.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!seenIds.has(article.id) && (!normTitle || !seenTitles.has(normTitle))) {
            seenIds.add(article.id);
            if (normTitle) seenTitles.add(normTitle);
            allArticles.push(article);
          }
        }
      }
    }

    // Sort all articles by newest first
    allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return allArticles;
  }

  /**
   * Get latest news, optionally filtered by category.
   * @param {string} [category='ALL']
   * @param {number} [limit=25]
   * @returns {Promise<object[]>}
   */
  async getLatestNews(category = 'ALL', limit = 25) {
    const allArticles = await this.fetchAllFeeds(20);

    if (category && category !== 'ALL') {
      let targetCat = category.toUpperCase();
      if (targetCat === 'STOCKS') targetCat = 'EQUITIES';

      const filtered = allArticles.filter((a) => a.category === targetCat || (targetCat === 'INDIA' && (a.category === 'MARKETS' || a.category === 'EQUITIES' || a.category === 'ECONOMY')));
      return filtered.slice(0, limit);
    }

    return allArticles.slice(0, limit);
  }

  /**
   * Get news related to a specific ticker symbol.
   * @param {string} symbol
   * @param {number} [limit=10]
   * @returns {Promise<object[]>}
   */
  async getTickerNews(symbol, limit = 10) {
    const allArticles = await this.fetchAllFeeds(20);
    const upperSymbol = symbol.toUpperCase();

    return allArticles
      .filter((a) => (a.relatedTickers || []).includes(upperSymbol))
      .slice(0, limit);
  }

  /**
   * Check which feeds are healthy.
   * @returns {object}
   */
  getHealth() {
    const feedStatuses = RSS_FEEDS.map((feed) => {
      const health = this._feedHealthCache.get(feed.url);
      return {
        source: feed.source,
        category: feed.category,
        healthy: health ? health.healthy : null,
        lastChecked: health ? new Date(health.lastChecked).toISOString() : null,
        articleCount: health?.count || 0,
        error: health?.error || null,
      };
    });

    const healthyCount = feedStatuses.filter((f) => f.healthy === true).length;
    const checkedCount = feedStatuses.filter((f) => f.healthy !== null).length;

    return {
      provider: this.name,
      totalFeeds: RSS_FEEDS.length,
      healthyFeeds: healthyCount,
      checkedFeeds: checkedCount,
      feeds: feedStatuses,
    };
  }

  /**
   * Check if at least one feed is reachable (used for auto-detection).
   * Pings the highest-priority feed with a short timeout.
   * @returns {Promise<boolean>}
   */
  async isReachable() {
    try {
      const priorityFeed = RSS_FEEDS.find((f) => f.priority === 1) || RSS_FEEDS[0];
      const result = await secureFetch(priorityFeed.url, {
        headers: { 'User-Agent': 'FinanceOS/1.0 NewsReader' },
      }, 5000);
      return typeof result === 'string' && result.length > 100;
    } catch {
      return false;
    }
  }
}
