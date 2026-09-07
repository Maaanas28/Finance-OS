import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class MarketController {
  async getQuote(req, res, next) {
    try {
      const { symbol } = req.params;
      const { exchange } = req.query;

      if (!symbol) {
        return sendError(res, 'Symbol is required', 400, 'BAD_REQUEST');
      }

      const quote = await marketDataService.getQuote(symbol, exchange);
      return sendSuccess(res, quote, 200);
    } catch (err) {
      next(err);
    }
  }

  async getQuotes(req, res, next) {
    try {
      const { symbols } = req.query;
      const symbolList = symbols ? symbols.split(',').map((s) => s.trim()) : [];
      const quotes = await marketDataService.getQuotes(symbolList);
      return sendSuccess(res, quotes, 200);
    } catch (err) {
      next(err);
    }
  }

  async getHistoricalPrices(req, res, next) {
    try {
      const { symbol } = req.params;
      const { timeframe = '1M', interval, exchange } = req.query;

      if (!symbol) {
        return sendError(res, 'Symbol is required', 400, 'BAD_REQUEST');
      }

      const history = await marketDataService.getHistoricalPrices(symbol, {
        timeframe,
        interval,
        exchange,
      });

      return sendSuccess(res, history, 200);
    } catch (err) {
      next(err);
    }
  }

  async getTopMovers(req, res, next) {
    try {
      const movers = await marketDataService.getTopMovers();
      return sendSuccess(res, movers, 200);
    } catch (err) {
      next(err);
    }
  }

  async getMarketStatus(req, res, next) {
    try {
      const status = await marketDataService.getMarketStatus();
      return sendSuccess(res, status, 200);
    } catch (err) {
      next(err);
    }
  }

  async searchSymbols(req, res, next) {
    try {
      const { q = '' } = req.query;
      const results = await marketDataService.searchSymbols(q);
      return sendSuccess(res, results, 200);
    } catch (err) {
      next(err);
    }
  }

  async getHealth(req, res, next) {
    try {
      const health = await marketDataService.getHealth();
      return sendSuccess(res, health, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const marketController = new MarketController();
