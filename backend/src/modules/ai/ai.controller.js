import { aiProvider } from '../../infrastructure/providers/AIProvider.js';
import { portfolioService } from '../portfolio/portfolio.service.js';
import { riskService } from '../risk/risk.service.js';
import { sendSuccess } from '../../utils/response.js';
import { BadRequestError } from '../../utils/errors.js';

export class AIController {
  async getFinancialInsight(req, res, next) {
    try {
      const userId = req.user?.id || null;
      let valuation = null;
      let riskMetrics = null;

      if (userId) {
        try {
          valuation = await portfolioService.getValuation(null, userId);
          riskMetrics = await riskService.getSnapshot(null, userId);
        } catch (e) {}
      } else {
        try {
          valuation = await portfolioService.getValuation(null, null);
        } catch (e) {}
      }

      const insight = await aiProvider.generateFinancialInsight({
        userPrompt: 'General Financial Portfolio Insight',
        valuation,
        riskMetrics,
      });

      const isLive = aiProvider.name === 'GrokAIProvider';

      return sendSuccess(res, insight, 200, {
        provider: aiProvider.name,
        isLive,
        status: isLive ? 'AI_LIVE' : 'SIMULATED',
      });
    } catch (err) {
      next(err);
    }
  }

  async getRiskAnalysis(req, res, next) {
    try {
      const userId = req.user?.id || null;
      let valuation = null;
      let riskMetrics = null;

      if (userId) {
        try {
          valuation = await portfolioService.getValuation(null, userId);
          riskMetrics = await riskService.getSnapshot(null, userId);
        } catch (e) {}
      } else {
        try {
          valuation = await portfolioService.getValuation(null, null);
        } catch (e) {}
      }

      const analysis = await aiProvider.analyzePortfolioRisk({
        valuation,
        riskMetrics,
      });

      const isLive = aiProvider.name === 'GrokAIProvider';

      return sendSuccess(res, analysis, 200, {
        provider: aiProvider.name,
        isLive,
        status: isLive ? 'AI_LIVE' : 'SIMULATED',
      });
    } catch (err) {
      next(err);
    }
  }

  async processQuery(req, res, next) {
    try {
      const { prompt, context } = req.body || {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        throw new BadRequestError('Query prompt must be a non-empty string');
      }

      const userId = req.user?.id || null;
      let valuation = null;
      let riskMetrics = null;

      if (userId) {
        try {
          valuation = await portfolioService.getValuation(null, userId);
          riskMetrics = await riskService.getSnapshot(null, userId);
        } catch (e) {}
      } else {
        try {
          valuation = await portfolioService.getValuation(null, null);
        } catch (e) {}
      }

      const cleanPrompt = prompt.trim();
      const result = await aiProvider.generateFinancialInsight({
        userPrompt: cleanPrompt,
        valuation,
        riskMetrics,
        ...context,
      });

      const isLive = aiProvider.name === 'GrokAIProvider';

      return sendSuccess(res, {
        prompt: cleanPrompt,
        headline: result.headline || 'Portfolio Intelligence Report',
        answer: result.summary || result.analysis || 'Analysis complete.',
        keyTakeaways: Array.isArray(result.keyTakeaways) ? result.keyTakeaways : [],
        actionableRecommendations: Array.isArray(result.actionableRecommendations) ? result.actionableRecommendations : [],
        confidenceScore: result.confidenceScore || result.confidence || 0.90,
        provider: result.provider || 'Grok',
        timestamp: result.generatedAt || new Date().toISOString(),
      }, 200, {
        provider: aiProvider.name,
        isLive,
        status: isLive ? 'AI_LIVE' : 'SIMULATED',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();

