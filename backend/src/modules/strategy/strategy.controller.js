import { strategyService } from './strategy.service.js';
import { sendSuccess } from '../../utils/response.js';

export class StrategyController {
  async getTemplates(req, res, next) {
    try {
      const templates = strategyService.getTemplates();
      return sendSuccess(res, templates, 200);
    } catch (err) {
      next(err);
    }
  }

  async runBacktest(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const result = await strategyService.runBacktest(req.body, userId);
      return sendSuccess(res, result, 200, {
        dataStatus: result.meta?.dataStatus || 'HISTORICAL',
        dataSource: result.meta?.dataSource || 'yahoo',
        providerName: result.meta?.providerName || 'Yahoo Finance',
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserHistory(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const history = await strategyService.getUserHistory(userId);
      return sendSuccess(res, history, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const strategyController = new StrategyController();
