import { analyticsService } from './analytics.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AnalyticsController {
  async getSummary(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user?.id || null;
      const summary = await analyticsService.getAnalyticsSummary(portfolioId, userId);
      return sendSuccess(res, summary, 200);
    } catch (err) {
      next(err);
    }
  }

  async getPerformanceSeries(req, res, next) {
    try {
      const { portfolioId, timeframe } = req.query;
      const userId = req.user?.id || null;
      const series = await analyticsService.getPerformanceSeries(portfolioId, userId, timeframe);
      return sendSuccess(res, series, 200);
    } catch (err) {
      next(err);
    }
  }

  async getAttribution(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user?.id || null;
      const attribution = await analyticsService.getAttribution(portfolioId, userId);
      return sendSuccess(res, attribution, 200);
    } catch (err) {
      next(err);
    }
  }

  async getRatios(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user?.id || null;
      const ratios = await analyticsService.getRatios(portfolioId, userId);
      return sendSuccess(res, ratios, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
