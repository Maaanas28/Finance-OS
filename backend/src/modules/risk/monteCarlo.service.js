import { riskService } from './risk.service.js';
import { RiskMath } from './riskMath.js';
import { BadRequestError } from '../../utils/errors.js';

export class MonteCarloService {
  /**
   * Run Stochastic Geometric Brownian Motion (GBM) Monte Carlo Simulation
   * Parameter estimation uses log returns: x_t = ln(1 + r_t)
   * mu_annual = mean(x_t) * 252, sigma_annual = std(x_t) * sqrt(252)
   * S_{t+1} = S_t * exp((mu_annual - 0.5 * sigma_annual^2)*dt + sigma_annual * sqrt(dt) * Z)
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
    // P3.6: Fix targetReturn=0 bug: || operator treats 0 as falsy, use ?? with explicit numeric parse
    const rawTarget = options.targetReturn;
    const hurdle = typeof rawTarget === 'number' ? rawTarget : (rawTarget !== undefined && rawTarget !== null ? Number(rawTarget) : 0.12);

    // Get historical flow-adjusted return series
    const sync = await riskService.getSynchronizedReturns(portfolioId, userId);
    const { valuation, portfolioDailyReturns, dataStatus, insufficientHistory } = sync;

    const initialValue = Number(valuation.summary.totalValue) || 0;

    if (insufficientHistory || portfolioDailyReturns.length < 2 || initialValue <= 0) {
      throw new BadRequestError(
        'Insufficient historical portfolio return data to estimate Monte Carlo parameters (at least 2 trading sessions required).'
      );
    }

    const simpleReturns = portfolioDailyReturns.map((pt) => pt.return);

    // Compute daily log returns: x_t = ln(1 + r_t)
    const logReturns = RiskMath.logReturns(simpleReturns);

    // Estimate log-return daily mean (muLogDaily) and daily volatility (sigmaDaily)
    const muLogDaily = RiskMath.mean(logReturns);
    const sigmaDaily = RiskMath.standardDeviation(logReturns, true) || 0.01;

    // Convert to arithmetic GBM drift: mu_gbm_daily = mu_log_daily + 0.5 * sigma_daily^2
    const muGbmDaily = muLogDaily + 0.5 * (sigmaDaily ** 2);
    const muGbmAnnual = muGbmDaily * 252;
    const sigmaAnnual = sigmaDaily * Math.sqrt(252);

    // Initialized seeded RNG function if seed provided
    const randFn = seed !== null && seed !== undefined ? RiskMath.createMulberry32(seed) : Math.random;

    // Daily step terms: S_{t+1} = S_t * exp(mu_log_daily + sigma_daily * Z)
    // Note: mu_log_daily equals (mu_gbm_daily - 0.5 * sigma_daily^2), so 0.5*sigma^2 is not subtracted again.
    const gbmStepDrift = muLogDaily;
    const gbmStepVol = sigmaDaily;

    // Path values pre-allocation
    const stepInterval = horizon > 252 ? 2 : 1;
    const sampledDays = [];
    for (let d = 0; d <= horizon; d += stepInterval) {
      sampledDays.push(d);
    }
    if (sampledDays[sampledDays.length - 1] !== horizon) {
      sampledDays.push(horizon);
    }

    const numSampledSteps = sampledDays.length;
    const pathValuesAtStep = Array.from({ length: numSampledSteps }, () => new Float64Array(numPaths));
    const terminalValues = new Float64Array(numPaths);

    // Simulate GBM paths starting at initial portfolio NAV S_0
    for (let p = 0; p < numPaths; p++) {
      let curVal = initialValue;
      let stepIdx = 0;
      pathValuesAtStep[0][p] = curVal;

      for (let d = 1; d <= horizon; d++) {
        const z = RiskMath.boxMuller(randFn);
        curVal *= Math.exp(gbmStepDrift + gbmStepVol * z);

        if (d === sampledDays[stepIdx + 1]) {
          stepIdx++;
          pathValuesAtStep[stepIdx][p] = curVal;
        }
      }

      terminalValues[p] = curVal;
    }

    // Trajectory percentiles band per sampled step
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

    // 15 representative sample paths for chart rendering
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

    // Probability of capital loss: P(S_T < S_0)
    let lossCount = 0;
    const hurdleTargetVal = initialValue * (1 + hurdle);
    let hurdleCount = 0;

    for (let i = 0; i < numPaths; i++) {
      if (terminalValues[i] < initialValue) lossCount++;
      if (terminalValues[i] >= hurdleTargetVal) hurdleCount++;
    }

    const probOfLossPercent = RiskMath.round((lossCount / numPaths) * 100, 2);
    const probExceedingHurdlePercent = RiskMath.round((hurdleCount / numPaths) * 100, 2);

    // Bins for terminal density histogram
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

    // Theoretical expected terminal value: E[S_T] = S_0 * exp(mu_gbm_annual * T)
    const T = horizon / 252;
    const theoreticalExpectedVal = RiskMath.round(initialValue * Math.exp(muGbmAnnual * T), 2);

    return {
      simulationId: `mc-${Date.now()}`,
      portfolio: {
        id: valuation.portfolio.id,
        name: valuation.portfolio.name,
      },
      parameters: {
        simulationCount: numPaths,
        horizonDays: horizon,
        targetReturn: hurdle,  // P3.6: renamed from targetReturnHurdle for test clarity
        targetReturnHurdle: hurdle,
        targetReturnHurdlePercent: `${(hurdle * 100).toFixed(1)}%`,
        initialPortfolioValue: initialValue,
        annualizedDrift: RiskMath.round(muGbmAnnual * 100, 2),
        annualizedLogDrift: RiskMath.round(muLogDaily * 252 * 100, 2),
        annualizedVolatility: RiskMath.round(sigmaAnnual * 100, 2),
        theoreticalExpectedValue: theoreticalExpectedVal,
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
