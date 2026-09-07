import { riskService } from './risk.service.js';
import { stressTestService } from './stressTest.service.js';
import { monteCarloService } from './monteCarlo.service.js';
import { riskMetricsQuerySchema, stressTestSchema, monteCarloSchema } from './risk.validation.js';
import { sendSuccess } from '../../utils/response.js';

export class RiskController {
  /**
   * Lightweight Risk Snapshot for Command Center Dashboard
   */
  async getSnapshot(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user?.id || null;
      const metrics = await riskService.getRiskMetrics(portfolioId, userId);

      const snapshot = {
        compositeScore: metrics.summary.compositeScore,
        riskLevel: metrics.summary.riskLevel,
        volatility: {
          value: `${metrics.summary.annualizedVolatility}%`,
          label: 'Annualized Volatility',
          status: metrics.summary.annualizedVolatility > 20 ? 'ELEVATED' : 'STABLE',
          benchmark: `${metrics.summary.benchmarkVolatility}% (NIFTY 50)`,
        },
        beta: {
          value: metrics.summary.beta.toFixed(2),
          label: 'Portfolio Beta',
          status: metrics.summary.beta > 1.2 ? 'AGGRESSIVE' : 'BALANCED',
          description: 'Sensitivity relative to NIFTY 50 benchmark',
        },
        sharpe: {
          value: metrics.summary.sharpe.toFixed(2),
          label: 'Sharpe Ratio',
          status: metrics.summary.sharpe > 1.5 ? 'EXCELLENT' : metrics.summary.sharpe > 1.0 ? 'GOOD' : 'POOR',
          description: `Risk-adjusted return vs ${metrics.assumptions.riskFreeRatePercent} risk-free rate`,
        },
        sortino: {
          value: metrics.summary.sortino.toFixed(2),
          label: 'Sortino Ratio',
          status: metrics.summary.sortino > 1.5 ? 'EXCELLENT' : 'MODERATE',
          description: 'Focus on downside volatility penalty only',
        },
        maxDrawdown: {
          value: `${metrics.summary.maxDrawdown}%`,
          label: 'Max Drawdown (1Y)',
          status: Math.abs(metrics.summary.maxDrawdown) < 15 ? 'CONTROLLED' : 'HIGH',
          peakDate: metrics.summary.peakDate,
          troughDate: metrics.summary.troughDate,
        },
        var95: {
          value: `₹${metrics.valueAtRisk.historical.confidence95.amount.toLocaleString('en-IN')}`,
          percent: `${metrics.valueAtRisk.historical.confidence95.percent}%`,
          label: 'Value at Risk (95% 1D)',
          status: 'MODERATE',
          description: 'Maximum expected 1-day loss at 95% confidence',
        },
        cvar95: {
          value: `₹${metrics.valueAtRisk.conditionalVaR.confidence95.amount.toLocaleString('en-IN')}`,
          percent: `${metrics.valueAtRisk.conditionalVaR.confidence95.percent}%`,
          label: 'Expected Shortfall (CVaR 95%)',
          status: 'WATCH',
          description: 'Average expected loss in worst 5% tail scenarios',
        },
      };

      return sendSuccess(res, snapshot, 200, { dataStatus: metrics.dataStatus });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Detailed Quantitative Risk Metrics
   */
  async getMetrics(req, res, next) {
    try {
      const validated = riskMetricsQuerySchema.parse(req.query);
      const userId = req.user?.id || null;
      const metrics = await riskService.getRiskMetrics(validated.portfolioId, userId, validated.riskFreeRate);
      return sendSuccess(res, metrics, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Pairwise Correlation Matrix
   */
  async getCorrelation(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user?.id || null;
      const matrixData = await riskService.getCorrelationMatrix(portfolioId, userId);
      return sendSuccess(res, matrixData, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Component Risk Contribution
   */
  async getContribution(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user?.id || null;
      const contribution = await riskService.getRiskContribution(portfolioId, userId);
      return sendSuccess(res, contribution, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Historical Drawdown Series
   */
  async getDrawdownHistory(req, res, next) {
    try {
      const { portfolioId } = req.query;
      const userId = req.user?.id || null;
      const metrics = await riskService.getRiskMetrics(portfolioId, userId);
      return sendSuccess(res, metrics.drawdown, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List Available Stress Scenarios
   */
  async getStressScenarios(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const scenarios = await stressTestService.getScenarios(userId);
      return sendSuccess(res, scenarios, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute Stress Test Evaluation
   */
  async executeStressTest(req, res, next) {
    try {
      const validated = stressTestSchema.parse(req.body);
      const userId = req.user?.id || null;
      const result = await stressTestService.executeStressTest(validated.portfolioId, {
        scenarioId: validated.scenarioId,
        customScenario: validated.customScenario,
        userId,
      });
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Run Stochastic Monte Carlo Simulation
   */
  async runMonteCarlo(req, res, next) {
    try {
      const validated = monteCarloSchema.parse(req.body);
      const userId = req.user?.id || null;
      const simulation = await monteCarloService.runSimulation(validated.portfolioId, {
        simulationCount: validated.simulationCount,
        horizonDays: validated.horizonDays,
        targetReturn: validated.targetReturn,
        seed: validated.seed,
        userId,
      });
      return sendSuccess(res, simulation, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const riskController = new RiskController();
