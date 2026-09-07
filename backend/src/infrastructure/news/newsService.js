/**
 * News Service — Orchestrator
 *
 * Central service managing news data flow:
 *   - Provider selection (RSS → Mock fallback)
 *   - Caching (5-minute TTL via existing cacheService)
 *   - Ticker & category filtering
 *   - Aggregate sentiment computation
 *   - Health reporting
 */

import { cacheService } from '../redis/cacheService.js';
import { RSSNewsProvider, NEWS_CATEGORIES } from './rssNewsProvider.js';
import { computeAggregateSentiment } from './sentimentAnalyzer.js';
import { computeTrendingTickers } from './portfolioTickerLinker.js';
import { logger } from '../../utils/logger.js';

// Cache TTLs in seconds
const CACHE_TTL = {
  news: 300,       // 5 minutes
  sentiment: 180,  // 3 minutes
  categories: 3600, // 1 hour
};

export class NewsService {
  constructor(mockProvider = null) {
    this.rssProvider = new RSSNewsProvider();
    this.mockProvider = mockProvider; // injected; created lazily if needed
    this._useMock = false;
    this._initialized = false;
  }

  /**
   * Lazily get the mock provider (avoids circular imports at module load).
   */
  async getMockProvider() {
    if (this.mockProvider) return this.mockProvider;
    const { MockNewsProvider } = await import('../providers/NewsProvider.js');
    this.mockProvider = new MockNewsProvider();
    return this.mockProvider;
  }

  /**
   * Determine whether to use RSS or mock provider.
   * Tries RSS on first call; falls back to mock if unreachable.
   */
  async resolveProvider() {
    // Always prefer RSS unless explicitly set to mock
    const mode = process.env.NEWS_PROVIDER || 'rss';
    if (mode === 'mock') {
      this._useMock = true;
      return this.getMockProvider();
    }

    // Auto: attempt RSS, fall back gracefully
    return this.rssProvider;
  }

  /**
   * Get news articles with optional category and ticker filtering.
   * @param {string} [category='ALL']
   * @param {string|null} [ticker=null]
   * @param {number} [limit=25]
   * @param {number} [page=1]
   * @returns {Promise<{ articles: object[], total: number, dataSource: string, page: number, limit: number }>}
   */
  async getNews(category = 'ALL', ticker = null, limit = 25, page = 1) {
    const cacheKey = `news:feed:${category}:${ticker || 'all'}:${limit}:${page}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`[NewsService] Cache hit: ${cacheKey}`);
      return cached;
    }

    let articles = [];
    let dataSource = 'MOCK';

    try {
      // Try RSS provider
      const rssArticles = await this.rssProvider.getLatestNews(category, limit * page + 10);
      if (rssArticles && rssArticles.length > 0) {
        articles = rssArticles;
        dataSource = 'RSS_LIVE';
      } else {
        throw new Error('No articles from RSS feeds');
      }
    } catch (err) {
      logger.warn(`[NewsService] RSS provider failed, falling back to mock: ${err.message}`);
      try {
        const mock = await this.getMockProvider();
        articles = await mock.getLatestNews(category, limit * 2);
        dataSource = 'MOCK';
      } catch (mockErr) {
        logger.error(`[NewsService] Mock provider also failed: ${mockErr.message}`);
        articles = [];
      }
    }

    // Apply ticker filter
    if (ticker) {
      const upperTicker = ticker.toUpperCase();
      articles = articles.filter((a) =>
        (a.relatedTickers || []).includes(upperTicker) ||
        a.title.toUpperCase().includes(upperTicker) ||
        (a.summary || '').toUpperCase().includes(upperTicker)
      );
    }

    // Pagination
    const total = articles.length;
    const start = (page - 1) * limit;
    const paginatedArticles = articles.slice(start, start + limit);

    const result = {
      articles: paginatedArticles,
      total,
      page,
      limit,
      dataSource,
      fetchedAt: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, result, CACHE_TTL.news);
    return result;
  }

  /**
   * Get news articles for a specific ticker symbol.
   * @param {string} symbol
   * @param {number} [limit=10]
   * @returns {Promise<object[]>}
   */
  async getTickerNews(symbol, limit = 10) {
    const cacheKey = `news:ticker:${symbol.toUpperCase()}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    let articles = [];

    try {
      articles = await this.rssProvider.getTickerNews(symbol, limit);
      if (articles.length === 0) {
        // Fall back to filtering general news
        const general = await this.rssProvider.getLatestNews('ALL', 50);
        const sym = symbol.toUpperCase();
        articles = general
          .filter((a) =>
            (a.relatedTickers || []).includes(sym) ||
            a.title.toUpperCase().includes(sym)
          )
          .slice(0, limit);
      }
    } catch (err) {
      logger.warn(`[NewsService] Ticker news failed for [${symbol}]: ${err.message}`);
      const mock = await this.getMockProvider();
      const allMock = await mock.getLatestNews('all', 20);
      articles = allMock.slice(0, limit);
    }

    await cacheService.set(cacheKey, articles, CACHE_TTL.news);
    return articles;
  }

  /**
   * Get aggregate market sentiment from today's articles.
   * @returns {Promise<object>}
   */
  async getMarketSentiment() {
    const cacheKey = 'news:sentiment:aggregate';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    let articles = [];
    let dataSource = 'MOCK';

    try {
      articles = await this.rssProvider.getLatestNews('ALL', 50);
      dataSource = articles.length > 0 ? 'RSS_LIVE' : 'MOCK';
    } catch {
      const mock = await this.getMockProvider();
      articles = await mock.getLatestNews('all', 20);
    }

    const aggregate = computeAggregateSentiment(articles);
    const trending = computeTrendingTickers(articles);
    const highImpact = articles
      .filter((a) => a.impact === 'HIGH')
      .slice(0, 5);

    const result = {
      ...aggregate,
      trendingTickers: trending,
      highImpactArticles: highImpact,
      dataSource,
      computedAt: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, result, CACHE_TTL.sentiment);
    return result;
  }

  /**
   * Get available news categories.
   * @returns {object[]}
   */
  getCategories() {
    return NEWS_CATEGORIES;
  }

  /**
   * Get health status of the news data pipeline.
   * @returns {object}
   */
  getHealth() {
    const rssHealth = this.rssProvider.getHealth();
    return {
      newsProvider: process.env.NEWS_PROVIDER || 'rss',
      rss: rssHealth,
      cache: { driver: 'in-memory', ttlSeconds: CACHE_TTL.news },
      aiEnrichment: process.env.NEWS_AI_ENRICHMENT === 'true' ? 'enabled' : 'disabled',
    };
  }
}

export const newsService = new NewsService();
