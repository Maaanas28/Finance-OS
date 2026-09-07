/**
 * News Controller — 5 endpoints
 *
 * All responses follow the existing Finance OS envelope:
 * { success, data, meta, timestamp }
 *
 * No authentication required — consistent with market data routes.
 * API keys are NEVER included in responses.
 */

import { newsService } from '../../infrastructure/news/newsService.js';
import { sendSuccess } from '../../utils/response.js';
import { BadRequestError } from '../../utils/errors.js';

export class NewsController {
  /**
   * GET /api/v1/news
   * Query params: category (string), ticker (string), limit (number), page (number)
   */
  async getNews(req, res, next) {
    try {
      const {
        category = 'ALL',
        ticker = null,
        limit: rawLimit = '25',
        page: rawPage = '1',
      } = req.query;

      const limit = Math.min(50, Math.max(1, parseInt(rawLimit, 10) || 25));
      const page = Math.max(1, parseInt(rawPage, 10) || 1);

      const result = await newsService.getNews(category, ticker, limit, page);

      return sendSuccess(res, result, 200, {
        dataSource: result.dataSource,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/news/categories
   * Returns available news categories for UI filters
   */
  async getCategories(req, res, next) {
    try {
      const categories = newsService.getCategories();
      return sendSuccess(res, categories);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/news/ticker/:symbol
   * News articles linked to a specific NSE/BSE ticker
   */
  async getTickerNews(req, res, next) {
    try {
      const { symbol } = req.params;
      if (!symbol || symbol.trim().length === 0) {
        throw new BadRequestError('Ticker symbol is required');
      }

      const { limit: rawLimit = '10' } = req.query;
      const limit = Math.min(25, Math.max(1, parseInt(rawLimit, 10) || 10));

      const articles = await newsService.getTickerNews(symbol.trim().toUpperCase(), limit);
      return sendSuccess(res, articles, 200, { symbol: symbol.toUpperCase(), count: articles.length });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/news/sentiment
   * Aggregate market sentiment summary
   */
  async getMarketSentiment(req, res, next) {
    try {
      const sentiment = await newsService.getMarketSentiment();
      return sendSuccess(res, sentiment);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/news/health
   * Data pipeline health check
   */
  async getHealth(req, res, next) {
    try {
      const health = newsService.getHealth();
      return sendSuccess(res, health);
    } catch (err) {
      next(err);
    }
  }
}

export const newsController = new NewsController();
