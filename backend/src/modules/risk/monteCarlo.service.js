import { riskService } from './risk.service.js';
import { RiskMath } from './riskMath.js';
import { BadRequestError } from '../../utils/errors.js';

export class MonteCarloService {
  /**
   * Run Stochastic Geometric Brownian Motion (GBM) Monte Carlo Simulation
   * @param {string} portfolioId
   * @param {Object} options - { simulationCount, horizonDays, targetReturn, seed, userId }
   */
  async runSimulation(portfolioId = null, options = {}) {
    const {
      simulationCount = 1000,
      horizonDays = 252,
      targetReturn = 0.12, // 12% annual target
      seed = null,
      userId = null,
    } = options;

    const numPaths = Math.max(100, Math.min(5000, Number(simulationCount) || 1000));
    const horizon = Math.max(10, Math.min(504, Number(horizonDays) || 252));
    const hurdle = Number(targetReturn) || 0.12;

    // Get historical return series
    const sync = await riskService.getSynchronizedReturns(portfolioId, userId);
    const { valuation, portfolioDailyReturns, dataStatus } = sync;

    const initialValue = Number(valuation.summary.totalValue) || 0;
    const historicalReturns = portfolioDailyReturns.map((pt) => pt.return);

    // Calculate historical drift (mu) and daily volatility (sigma)
    const mu = RiskMath.mean(historicalReturns);
    const sigma = RiskMath.standardDeviation(historicalReturns) || 0.012;

    // Daily drift parameter for Geometric Brownian Motion: (mu - 0.5 * sigma^2)
    const drift = mu - 0.5 * sigma ** 2;

    // Initialize RNG (deterministic if seed provided)
    const randFn = seed !== null && seed !== undefined ? RiskMath.createMulberry32(seed) : Math.random;

    // Pre-allocate matrix of trajectories: [dayIndex 0..H][path 0..N-1]
    // To minimize memory overhead, sample at step intervals if horizon is large
    const stepInterval = horizon > 252 ? 2 : 1;
    const sampledDays = [];
    for (let d = 0; d <= horizon; d += stepInterval) {
      sampledDays.push(d);
    }
    if (sampledDays[sampledDays.length - 1] !== horizon) {
      sampledDays.push(horizon);
    }

    const numSampledSteps = sampledDays.length;
    // pathValuesAtStep[stepIndex] = Array of path values at that step
    const pathValuesAtStep = Array.from({ length: numSampledSteps }, () => new Float64Array(numPaths));

    // Terminal values array
    const terminalValues = new Float64Array(numPaths);

    // Run simulation paths
    for (let p = 0; p < numPaths; p++) {
      let curVal = initialValue;
      let stepIdx = 0;
      pathValuesAtStep[0][p] = curVal;

      for (let d = 1; d <= horizon; d++) {
        const z = RiskMath.boxMuller(randFn);
        const dailyGrowth = Math.exp(drift + sigma * z);
        curVal *= dailyGrowth;

        if (d === sampledDays[stepIdx + 1]) {
          stepIdx++;
          pathValuesAtStep[stepIdx][p] = curVal;
        }
      }

      terminalValues[p] = curVal;
    }

    // Compute percentile envelopes across time steps
    const trajectoryPercentiles = sampledDays.map((day, sIdx) => {
      const stepVals = Array.from(pathValuesAtStep[sIdx]).sort((a, b) => a - b);
      return {
        day,
        p5: RiskMath.round(RiskMath.percentile(stepVals, 5), 2),
        p25: RiskMath.round(RiskMath.percentile(stepVals, 25), 2),
        p50: RiskMath.round(RiskMath.percentile(stepVals, 50), 2), // Median
        p75: RiskMath.round(RiskMath.percentile(stepVals, 75), 2),
        p95: RiskMath.round(RiskMath.percentile(stepVals, 95), 2),
      };
    });

    // Pick 15 representative sample paths for chart rendering
    const samplePathIndices = [];
    const step = Math.floor(numPaths / 15);
    for (let i = 0; i < 15; i++) {
      samplePathIndices.push(Math.min(i * step, numPaths - 1));
    }

    const sampleTrajectories = samplePathIndices.map((pIdx, lineIdx) => {
      const points = sampledDays.map((day, sIdx) => ({
        day,
        value: RiskMath.round(pathValuesAtStep[sIdx][pIdx], 2),
      }));
      return {
        id: `path-${lineIdx + 1}`,
        points,
      };
    });

    // Terminal Distribution Analysis
    const sortedTerminal = Array.from(terminalValues).sort((a, b) => a - b);
    const meanTerminal = RiskMath.mean(sortedTerminal);
    const medianTerminal = RiskMath.percentile(sortedTerminal, 50);
    const p5Terminal = RiskMath.percentile(sortedTerminal, 5);
    const p95Terminal = RiskMath.percentile(sortedTerminal, 95);

    // Probability of capital loss: P(V_T < V_0)
    let lossCount = 0;
    // Probability of exceeding target return hurdle: P(V_T >= V_0 * (1 + hurdle))
    const hurdleTargetVal = initialValue * (1 + hurdle);
    let hurdleCount = 0;

    for (let i = 0; i < numPaths; i++) {
      if (terminalValues[i] < initialValue) lossCount++;
      if (terminalValues[i] >= hurdleTargetVal) hurdleCount++;
    }

    const probOfLossPercent = RiskMath.round((lossCount / numPaths) * 100, 2);
    const probExceedingHurdlePercent = RiskMath.round((hurdleCount / numPaths) * 100, 2);

    // Generate terminal histogram density bins (15 bins)
    const minVal = sortedTerminal[0];
    const maxVal = sortedTerminal[sortedTerminal.length - 1];
    const binCount = 15;
    const binWidth = (maxVal - minVal) / binCount || 1;
    const histogram = [];

    for (let b = 0; b < binCount; b++) {
      const rangeStart = minVal + b * binWidth;
      const rangeEnd = rangeStart + binWidth;
      const count = sortedTerminal.filter((v) => v >= rangeStart && (b === binCount - 1 ? v <= rangeEnd : v < rangeEnd)).length;
      histogram.push({
        binIndex: b,
        rangeLabel: `₹${Math.round(rangeStart).toLocaleString('en-IN')}`,
        rangeStart: RiskMath.round(rangeStart, 2),
        rangeEnd: RiskMath.round(rangeEnd, 2),
        count,
        densityPercent: RiskMath.round((count / numPaths) * 100, 2),
      });
    }

    return {
      simulationId: `mc-${Date.now()}`,
      portfolio: {
        id: valuation.portfolio.id,
        name: valuation.portfolio.name,
      },
      parameters: {
        simulationCount: numPaths,
        horizonDays: horizon,
        targetReturnHurdle: hurdle,
        targetReturnHurdlePercent: `${(hurdle * 100).toFixed(1)}%`,
        initialPortfolioValue: initialValue,
        annualizedDrift: RiskMath.round(mu * 252 * 100, 2),
        annualizedVolatility: RiskMath.round(sigma * Math.sqrt(252) * 100, 2),
        isDeterministicSeed: seed !== null && seed !== undefined,
        dataStatus: 'STOCHASTIC_SIMULATION',
      },
      outcomes: {
        expectedTerminalValue: RiskMath.round(meanTerminal, 2),
        medianTerminalValue: RiskMath.round(medianTerminal, 2),
        percentile5TerminalValue: RiskMath.round(p5Terminal, 2),
        percentile95TerminalValue: RiskMath.round(p95Terminal, 2),
        expectedReturnPercent: initialValue > 0 ? RiskMath.round(((meanTerminal - initialValue) / initialValue) * 100, 2) : 0,
        probabilityOfLossPercent: probOfLossPercent,
        probabilityExceedingTargetPercent: probExceedingHurdlePercent,
        worstCaseTerminalValue: RiskMath.round(minVal, 2),
        bestCaseTerminalValue: RiskMath.round(maxVal, 2),
      },
      trajectoryPercentiles,
      sampleTrajectories,
      terminalHistogram: histogram,
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const monteCarloService = new MonteCarloService();
