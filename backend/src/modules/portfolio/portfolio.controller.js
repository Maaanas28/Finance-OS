import { portfolioService } from './portfolio.service.js';
import { createPortfolioSchema, executeTransactionSchema } from './portfolio.validation.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class PortfolioController {
  // P1.5: All methods require req.user (set by authMiddleware)
  // Anonymous guest access removed

  async getPortfolios(req, res, next) {
    try {
      const userId = req.user.id;
      const portfolios = await portfolioService.getUserPortfolios(userId);
      return sendSuccess(res, portfolios, 200);
    } catch (err) {
      next(err);
    }
  }

  async createPortfolio(req, res, next) {
    try {
      const userId = req.user.id;
      const validated = createPortfolioSchema.parse(req.body);
      const portfolio = await portfolioService.createPortfolio(userId, validated);
      return sendSuccess(res, portfolio, 201);
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user.id;
      // P4.4: Risk not included in summary by default; use ?includeRisk=true to opt-in
      const includeRisk = req.query.includeRisk === 'true';
      const valuation = await portfolioService.getValuation(portfolioId, userId, { includeRisk });
      return sendSuccess(res, {
        ...valuation.summary,
        portfolio: valuation.portfolio,
        currency: valuation.portfolio.currency,
        currencySymbol: valuation.portfolio.currencySymbol,
      }, 200);
    } catch (err) {
      next(err);
    }
  }

  async getHoldings(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user.id;
      const valuation = await portfolioService.getValuation(portfolioId, userId, { includeRisk: false });
      return sendSuccess(res, valuation.holdings, 200);
    } catch (err) {
      next(err);
    }
  }

  async getAllocations(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user.id;
      const allocations = await portfolioService.getAllocations(portfolioId, userId);
      return sendSuccess(res, allocations, 200);
    } catch (err) {
      next(err);
    }
  }

  async getTransactions(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user.id;
      const transactions = await portfolioService.getTransactions(portfolioId, userId);
      return sendSuccess(res, transactions, 200);
    } catch (err) {
      next(err);
    }
  }

  async executeTransaction(req, res, next) {
    try {
      const userId = req.user.id;
      const validated = executeTransactionSchema.parse(req.body);
      const result = await portfolioService.executeTransaction(validated, userId);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async getPerformanceHistory(req, res, next) {
    try {
      const { portfolioId, timeframe = '1M' } = req.query;
      const userId = req.user.id;
      const history = await portfolioService.getPerformanceHistory(portfolioId, userId, timeframe);
      return sendSuccess(res, history, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const portfolioController = new PortfolioController();
