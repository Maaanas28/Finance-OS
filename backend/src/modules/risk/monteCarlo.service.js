import { portfolioService } from '../portfolio/portfolio.service.js';
import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { RiskMath } from './riskMath.js';
import { BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Safely extract YYYY-MM-DD date string from candle object
 */
function extractCandleDate(c) {
  if (!c) return null;
  if (c.date && typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date)) {
    return c.date;
  }
  const raw = c.date || c.time || c.timestamp;
  if (!raw) return null;
  if (typeof raw === 'string' && raw.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.substring(0, 10);
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export class MonteCarloService {
  /**
   * Fetch 3-5 years of historical daily closes per holding with graceful timeframe fallback
   * @param {string} symbol - Stock symbol
   * @param {string} exchange - Exchange (NSE/BSE)
   * @param {number} targetYears - Target lookback in years (1 to 5)
   * @returns {Promise<{candles: Array, timeframe: string|null}>}
   */
  async fetchHoldingHistoricalPrices(symbol, exchange, targetYears = 3) {
    const tryTfs = [`${targetYears}Y`];
    for (const y of [5, 3, 2, 1]) {
      const tf = `${y}Y`;
      if (!tryTfs.includes(tf)) tryTfs.push(tf);
    }

    for (const tf of tryTfs) {
      try {
        const hist = await marketDataService.getHistoricalPrices(symbol, {
          timeframe: tf,
          interval: '1day',
          exchange: exchange || 'NSE',
        });
        if (hist?.candles && Array.isArray(hist.candles)) {
          const validCandles = hist.candles.filter(
            (c) => Number(c.close) > 0 && extractCandleDate(c) !== null
          );
          if (validCandles.length >= 60) {
            return { candles: validCandles, timeframe: tf };
          }
        }
      } catch (err) {
        logger.warn(`MonteCarlo: historical fetch failed for [${symbol}] at [${tf}]: ${err.message}`);
      }
    }

    return { candles: [], timeframe: null };
  }

  /**
   * Portfolio-Aware Historical Stochastic Monte Carlo Simulation Engine
   *
   * Genuinely simulates the user's ACTUAL portfolio holdings using Multi-Asset Correlated
   * Geometric Brownian Motion (GBM) driven by 3-5 years of real Yahoo Finance historical prices:
   *
   * S_i(t + Δt) = S_i(t) × exp[ (μ_i - 0.5 * σ_i²)Δt + σ_i × √Δt × Z_i ]
   *
   * Where:
   * - S_i(t): Price of holding i at trading session t
   * - μ_i: Annualized expected return estimated from empirical aligned daily closes (drift)
   * - σ_i: Annualized volatility estimated from empirical aligned daily returns (diffusion)
   * - Δt: 1 / 252 (daily time step in a 252-day market year)
   * - Z_i: Correlated standard normal random shock derived via Cholesky factor L:
   *        Z = L × ε, where ε ~ N(0, I) and L × L^T = CorrelationMatrix
   * - Portfolio NAV at each time step:
   *        V(t) = ∑ [ q_i × S_i(t) ] + Cash
   *
   * @param {string} portfolioId - Portfolio identifier
   * @param {Object} options - Simulation options (simulationCount, horizonDays, historicalYears, seed, overrides, userId)
   */
  async runSimulation(portfolioId = null, options = {}) {
    const {
      simulationCount = 1000,
      horizonDays = 252,
      historicalYears = 3,
      seed = null,
      userId = null,
    } = options;

    const numPaths = Math.max(100, Math.min(10000, Number(simulationCount) || 1000));
    const horizon = Math.max(10, Math.min(504, Number(horizonDays) || 252));
    const targetYears = Math.max(1, Math.min(5, Number(historicalYears) || 3));

    // 1. Validate explicit initial value override if provided
    if (options.initialPortfolioValue !== undefined && options.initialPortfolioValue !== null) {
      if (Number(options.initialPortfolioValue) <= 0 || isNaN(options.initialPortfolioValue)) {
        throw new BadRequestError('Initial portfolio value must be greater than zero.');
      }
    }

    // 2. Fetch User Portfolio and Live Valuation
    let valuation = null;
    try {
      valuation = await portfolioService.getValuation(portfolioId, userId, { includeRisk: false });
    } catch (err) {
      logger.warn(`MonteCarlo: valuation fetch failed: ${err.message}`);
    }

    const portfolio = valuation?.portfolio || {};
    const summary = valuation?.summary || {};
    const rawHoldings = valuation?.holdings || [];
    let cashBalance = Math.max(0, Number(summary.cashBalance) || 0);

    const portfolioName = portfolio.name || 'Portfolio';
    const resolvedPortfolioId = portfolio.id || portfolioId;

    // Filter active equity holdings with positive quantity
    const activeHoldings = rawHoldings.filter((h) => Number(h.quantity) > 0);

    // Calculate actual portfolio value from holdings and cash
    const actualEquityValue = activeHoldings.reduce((sum, h) => {
      const q = Number(h.quantity) || 0;
      const p = Number(h.ltp || h.averageBuyPrice || 0);
      return sum + (Number(h.currentValue) || q * p);
    }, 0);

    const calculatedTotalValue = RiskMath.round(actualEquityValue + cashBalance, 2);

    let initialValue;
    let scaleFactor = 1.0;

    if (options.initialPortfolioValue !== undefined && options.initialPortfolioValue !== null) {
      initialValue = Number(options.initialPortfolioValue);
      if (calculatedTotalValue > 0) {
        scaleFactor = initialValue / calculatedTotalValue;
      }
      cashBalance = RiskMath.round(cashBalance * scaleFactor, 2);
    } else {
      initialValue = calculatedTotalValue > 0 ? calculatedTotalValue : 100000;
    }

    if (initialValue <= 0) {
      throw new BadRequestError('Initial portfolio value must be greater than zero.');
    }

    // 3. Step A: Fetch 3-5 Years Historical Price Data Per Holding via MarketDataService
    const candlesMap = new Map();
    if (activeHoldings.length > 0) {
      await Promise.all(
        activeHoldings.map(async (h) => {
          const hist = await this.fetchHoldingHistoricalPrices(h.symbol, h.exchange, targetYears);
          candlesMap.set(h.symbol, hist);
        })
      );
    }

    // Extract return maps per holding
    const parsedHoldings = [];
    let hasAnyFallback = false;

    if (activeHoldings.length > 0) {
      for (const h of activeHoldings) {
        const histData = candlesMap.get(h.symbol);
        const candles = histData?.candles || [];

        // Sort chronologically ascending
        const sortedCandles = [...candles].sort((a, b) => {
          const tA = new Date(a.timestamp || a.time || a.date || 0).getTime();
          const tB = new Date(b.timestamp || b.time || b.date || 0).getTime();
          return tA - tB;
        });

        // Deduplicate by date (retain latest close)
        const dedupMap = new Map();
        for (const c of sortedCandles) {
          const dt = extractCandleDate(c);
          if (dt && Number(c.close) > 0) {
            dedupMap.set(dt, Number(c.close));
          }
        }
        const dedupEntries = Array.from(dedupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        // Calculate daily returns
        const dateReturnMap = new Map();
        const rawReturns = [];
        for (let t = 1; t < dedupEntries.length; t++) {
          const prev = dedupEntries[t - 1][1];
          const cur = dedupEntries[t][1];
          if (prev > 0 && cur > 0) {
            const ret = (cur - prev) / prev;
            const dt = dedupEntries[t][0];
            dateReturnMap.set(dt, ret);
            rawReturns.push(ret);
          }
        }

        const isInsufficient = rawReturns.length < 60;
        parsedHoldings.push({
          rawHolding: h,
          symbol: h.symbol,
          exchange: h.exchange || 'NSE',
          name: h.name || h.symbol,
          dateReturnMap,
          rawReturns,
          isInsufficient,
          fallbackReason: isInsufficient
            ? `Insufficient historical price data (${rawReturns.length} days found, minimum 60 required). Using benchmark proxy.`
            : null,
        });
      }
    }

    // Step B: Align Trading Dates Across All Non-Fallback Holdings
    let nonFallbackCandidates = parsedHoldings.filter((p) => !p.isInsufficient);
    let commonTradingDates = [];

    if (nonFallbackCandidates.length > 0) {
      let intersectionSet = new Set(nonFallbackCandidates[0].dateReturnMap.keys());
      for (let i = 1; i < nonFallbackCandidates.length; i++) {
        const nextSet = new Set();
        const mapI = nonFallbackCandidates[i].dateReturnMap;
        for (const d of intersectionSet) {
          if (mapI.has(d)) nextSet.add(d);
        }
        intersectionSet = nextSet;
      }

      // If intersection is < 60 days across multi-stocks, iteratively drop the holding with fewest trading days
      while (intersectionSet.size < 60 && nonFallbackCandidates.length > 1) {
        let minIdx = 0;
        let minDays = nonFallbackCandidates[0].dateReturnMap.size;
        for (let i = 1; i < nonFallbackCandidates.length; i++) {
          if (nonFallbackCandidates[i].dateReturnMap.size < minDays) {
            minDays = nonFallbackCandidates[i].dateReturnMap.size;
            minIdx = i;
          }
        }
        const dropped = nonFallbackCandidates.splice(minIdx, 1)[0];
        dropped.isInsufficient = true;
        dropped.fallbackReason = 'Insufficient overlapping trading history with portfolio (< 60 common days). Using benchmark proxy.';

        intersectionSet = new Set(nonFallbackCandidates[0].dateReturnMap.keys());
        for (let i = 1; i < nonFallbackCandidates.length; i++) {
          const nextSet = new Set();
          const mapI = nonFallbackCandidates[i].dateReturnMap;
          for (const d of intersectionSet) {
            if (mapI.has(d)) nextSet.add(d);
          }
          intersectionSet = nextSet;
        }
      }

      if (intersectionSet.size >= 60) {
        commonTradingDates = Array.from(intersectionSet).sort();
      } else if (nonFallbackCandidates.length === 1 && nonFallbackCandidates[0].dateReturnMap.size >= 60) {
        commonTradingDates = Array.from(nonFallbackCandidates[0].dateReturnMap.keys()).sort();
      } else {
        // Fallback for all
        for (const c of nonFallbackCandidates) {
          c.isInsufficient = true;
          c.fallbackReason = 'Insufficient aligned trading days across portfolio holdings. Using benchmark proxy.';
        }
        nonFallbackCandidates = [];
        commonTradingDates = [];
      }
    }

    const alignedDaysCount = commonTradingDates.length;

    // Step C: Compute Empirical Statistics from Aligned Returns
    const calibratedHoldings = [];

    if (parsedHoldings.length > 0) {
      for (const item of parsedHoldings) {
        const h = item.rawHolding;
        let isFallback = item.isInsufficient;
        let fallbackReason = item.fallbackReason;
        let mu_i;
        let sigma_i;
        let alignedReturns = [];

        if (!isFallback && commonTradingDates.length >= 60) {
          alignedReturns = commonTradingDates.map((d) => item.dateReturnMap.get(d));
          const dailyMean = RiskMath.mean(alignedReturns);
          mu_i = dailyMean * 252;
          const dailyStd = RiskMath.standardDeviation(alignedReturns, true);
          sigma_i = Math.max(0.001, dailyStd * Math.sqrt(252));
        } else {
          isFallback = true;
          hasAnyFallback = true;
          if (!fallbackReason) {
            fallbackReason = `Insufficient historical price data (${item.rawReturns.length} days found, minimum 60 required). Using benchmark proxy.`;
          }
          mu_i = 0.12; // 12% standard Indian equity baseline
          sigma_i = 0.15; // 15% standard market volatility
        }

        // Apply explicit user overrides if specified
        if (options.expectedReturn !== undefined && options.expectedReturn !== null && !isNaN(options.expectedReturn)) {
          const raw = Number(options.expectedReturn);
          mu_i = Math.abs(raw) > 1 ? raw / 100 : raw;
        }
        if (options.volatility !== undefined && options.volatility !== null && !isNaN(options.volatility)) {
          const raw = Number(options.volatility);
          sigma_i = Math.max(0, Math.abs(raw) > 1 ? raw / 100 : raw);
        }

        const qty = Number(h.quantity) * scaleFactor;
        const ltp = Number(h.ltp || h.averageBuyPrice || 100);
        const curVal = RiskMath.round(qty * ltp, 2);
        const weight = initialValue > 0 ? curVal / initialValue : 0;

        calibratedHoldings.push({
          id: h.id || h.symbol,
          symbol: h.symbol,
          exchange: h.exchange || 'NSE',
          name: h.name || h.symbol,
          quantity: RiskMath.round(qty, 4),
          currentPrice: ltp,
          currentValue: curVal,
          portfolioWeightPercent: RiskMath.round(weight * 100, 2),
          expectedReturn: RiskMath.round(mu_i, 4),
          expectedReturnPercent: RiskMath.round(mu_i * 100, 2),
          volatility: RiskMath.round(sigma_i, 4),
          volatilityPercent: RiskMath.round(sigma_i * 100, 2),
          historicalObservations: alignedReturns.length > 0 ? alignedReturns.length : item.rawReturns.length,
          historicalDays: alignedReturns.length > 0 ? alignedReturns.length : item.rawReturns.length,
          alignedTradingDays: alignedReturns.length > 0 ? alignedReturns.length : 0,
          isFallback,
          fallbackReason,
          dataStatus: isFallback ? 'BENCHMARK_FALLBACK' : 'LIVE',
          alignedReturns,
        });
      }
    } else {
      // Portfolio aggregate fallback when no equity holdings exist
      let defaultMu = 0.12;
      let defaultSigma = 0.15;
      if (options.expectedReturn !== undefined && options.expectedReturn !== null && !isNaN(options.expectedReturn)) {
        const raw = Number(options.expectedReturn);
        defaultMu = Math.abs(raw) > 1 ? raw / 100 : raw;
      }
      if (options.volatility !== undefined && options.volatility !== null && !isNaN(options.volatility)) {
        const raw = Number(options.volatility);
        defaultSigma = Math.max(0, Math.abs(raw) > 1 ? raw / 100 : raw);
      }

      calibratedHoldings.push({
        id: 'portfolio-aggregate',
        symbol: 'PORTFOLIO',
        exchange: 'NSE',
        name: portfolioName || 'Portfolio Aggregate',
        quantity: 1,
        currentPrice: initialValue,
        currentValue: initialValue,
        portfolioWeightPercent: 100,
        expectedReturn: RiskMath.round(defaultMu, 4),
        expectedReturnPercent: RiskMath.round(defaultMu * 100, 2),
        volatility: RiskMath.round(defaultSigma, 4),
        volatilityPercent: RiskMath.round(defaultSigma * 100, 2),
        historicalObservations: 252,
        historicalDays: 252,
        alignedTradingDays: 252,
        isFallback: true,
        fallbackReason: 'No equity holdings registered. Simulating portfolio-level Geometric Brownian Motion.',
        dataStatus: 'BENCHMARK_FALLBACK',
        alignedReturns: [],
      });
      hasAnyFallback = true;
      cashBalance = 0;
    }

    const N = calibratedHoldings.length;

    // 4. Construct N x N Empirical Covariance & Correlation Matrix & Cholesky Factor L
    const correlationMatrix = Array.from({ length: N }, () => Array(N).fill(0));
    const covarianceMatrix = Array.from({ length: N }, () => Array(N).fill(0));

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1.0;
          const dailyVar = (calibratedHoldings[i].volatility ** 2) / 252;
          covarianceMatrix[i][j] = RiskMath.round(dailyVar, 8);
        } else if (j > i) {
          const retI = calibratedHoldings[i].alignedReturns;
          const retJ = calibratedHoldings[j].alignedReturns;
          let pairCorr = 0.30;
          let pairCov = (pairCorr * calibratedHoldings[i].volatility * calibratedHoldings[j].volatility) / 252;

          if (retI.length >= 60 && retJ.length >= 60 && retI.length === retJ.length) {
            const r = RiskMath.correlation(retI, retJ);
            pairCorr = Math.max(-0.95, Math.min(0.95, r));
            pairCov = RiskMath.covariance(retI, retJ);
          }

          correlationMatrix[i][j] = RiskMath.round(pairCorr, 4);
          correlationMatrix[j][i] = RiskMath.round(pairCorr, 4);
          covarianceMatrix[i][j] = RiskMath.round(pairCov, 8);
          covarianceMatrix[j][i] = RiskMath.round(pairCov, 8);
        }
      }
    }

    // Step D: Cholesky decomposition of the correlation matrix
    const L = RiskMath.cholesky(correlationMatrix, 1e-4);

    // 5. Portfolio Weighted Return and Markowitz Portfolio Volatility
    let effectivePortfolioMu = 0;
    let portfolioVariance = 0;

    for (let i = 0; i < N; i++) {
      const wi = calibratedHoldings[i].portfolioWeightPercent / 100;
      effectivePortfolioMu += wi * calibratedHoldings[i].expectedReturn;
      for (let j = 0; j < N; j++) {
        const wj = calibratedHoldings[j].portfolioWeightPercent / 100;
        const annualCov_ij = calibratedHoldings[i].volatility * calibratedHoldings[j].volatility * correlationMatrix[i][j];
        portfolioVariance += wi * wj * annualCov_ij;
      }
    }
    const effectivePortfolioSigma = Math.sqrt(Math.max(0, portfolioVariance));

    // 6. Time Step & Stochastic Parameters
    const dt = 1 / 252;
    const sqrtDt = Math.sqrt(dt);

    const drifts = new Float64Array(N);
    const diffusions = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const mu_i = calibratedHoldings[i].expectedReturn;
      const sig_i = calibratedHoldings[i].volatility;
      drifts[i] = (mu_i - 0.5 * (sig_i ** 2)) * dt;
      diffusions[i] = sig_i * sqrtDt;
    }

    const randFn = seed !== null && seed !== undefined ? RiskMath.createMulberry32(seed) : Math.random;

    // Visualization sample milestones
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

    // 7. Step E: Execute Multi-Asset Correlated Monte Carlo Simulation
    const currentPrices = new Float64Array(N);
    const eps = new Float64Array(N);
    const zShocks = new Float64Array(N);

    for (let p = 0; p < numPaths; p++) {
      for (let i = 0; i < N; i++) {
        currentPrices[i] = calibratedHoldings[i].currentPrice;
      }

      let stepIdx = 0;
      pathValuesAtStep[0][p] = initialValue;

      for (let d = 1; d <= horizon; d++) {
        // Draw N standard normals
        for (let i = 0; i < N; i++) {
          eps[i] = calibratedHoldings[i].volatility > 0 ? RiskMath.boxMuller(randFn) : 0;
        }

        // Correlated shocks Z = L * eps
        for (let i = 0; i < N; i++) {
          let sum = 0;
          for (let k = 0; k <= i; k++) {
            sum += L[i][k] * eps[k];
          }
          zShocks[i] = sum;
        }

        // Advance each stock's price via correlated GBM
        let currentPortfolioNav = cashBalance;
        for (let i = 0; i < N; i++) {
          currentPrices[i] *= Math.exp(drifts[i] + diffusions[i] * zShocks[i]);
          currentPortfolioNav += calibratedHoldings[i].quantity * currentPrices[i];
        }

        if (d === sampledDays[stepIdx + 1]) {
          stepIdx++;
          pathValuesAtStep[stepIdx][p] = currentPortfolioNav;
        }
      }

      // Terminal portfolio NAV
      let finalNav = cashBalance;
      for (let i = 0; i < N; i++) {
        finalNav += calibratedHoldings[i].quantity * currentPrices[i];
      }
      terminalValues[p] = finalNav;
    }

    // 8. 20 Sample Paths for Visualization
    const samplePathCount = Math.min(20, numPaths);
    const sampleIndices = [];
    const stepSpacing = (numPaths - 1) / Math.max(1, samplePathCount - 1);
    for (let i = 0; i < samplePathCount; i++) {
      sampleIndices.push(Math.round(i * stepSpacing));
    }

    const sampleTrajectories = sampleIndices.map((pIdx, lineIdx) => ({
      id: `path-${lineIdx + 1}`,
      points: sampledDays.map((day, sIdx) => ({
        day,
        value: RiskMath.round(pathValuesAtStep[sIdx][pIdx], 2),
      })),
    }));

    // 9. Trajectory Percentiles per Step (P5, P25, P50, P75, P95)
    const trajectoryPercentiles = sampledDays.map((day, sIdx) => {
      const stepVals = Array.from(pathValuesAtStep[sIdx]).sort((a, b) => a - b);
      return {
        day,
        p5: RiskMath.round(RiskMath.percentile(stepVals, 5), 2),
        p25: RiskMath.round(RiskMath.percentile(stepVals, 25), 2),
        p50: RiskMath.round(RiskMath.percentile(stepVals, 50), 2),
        p75: RiskMath.round(RiskMath.percentile(stepVals, 75), 2),
        p95: RiskMath.round(RiskMath.percentile(stepVals, 95), 2),
      };
    });

    // 10. Step F: Output Metrics (VaR 95%, CVaR 95%, Expected Value, Median, etc.)
    const sortedTerminal = Array.from(terminalValues).sort((a, b) => a - b);
    const meanTerminal = RiskMath.mean(sortedTerminal);
    const medianTerminal = RiskMath.percentile(sortedTerminal, 50);
    const p5Terminal = RiskMath.percentile(sortedTerminal, 5);
    const p95Terminal = RiskMath.percentile(sortedTerminal, 95);
    const minVal = sortedTerminal[0];
    const maxVal = sortedTerminal[sortedTerminal.length - 1];

    // Probability of capital loss: % of paths where V_T < V_0
    let lossCount = 0;
    for (let i = 0; i < numPaths; i++) {
      if (terminalValues[i] < initialValue) lossCount++;
    }
    const probabilityOfLossPercent = RiskMath.round((lossCount / numPaths) * 100, 2);

    // Value at Risk (95% Confidence): V_0 - P5 (monetary loss)
    const var95Amount = Math.max(0, RiskMath.round(initialValue - p5Terminal, 2));
    const var95Percent = initialValue > 0 ? RiskMath.round((var95Amount / initialValue) * 100, 2) : 0;

    // Expected Shortfall (CVaR 95%): average of paths in worst 5% tail
    const worst5Count = Math.max(1, Math.floor(numPaths * 0.05));
    const worst5Paths = sortedTerminal.slice(0, worst5Count);
    const worst5MeanVal = RiskMath.mean(worst5Paths);
    const cvarTerminalMean = RiskMath.round(worst5MeanVal, 2);
    const cvar95Amount = Math.max(0, RiskMath.round(initialValue - worst5MeanVal, 2));
    const cvar95Percent = initialValue > 0 ? RiskMath.round((cvar95Amount / initialValue) * 100, 2) : 0;

    // Expected return %: (mean terminal - V_0) / V_0 * 100
    const expectedReturnPercent = initialValue > 0
      ? RiskMath.round(((meanTerminal - initialValue) / initialValue) * 100, 2)
      : 0;

    // Portfolio volatility %: annualized weighted portfolio volatility
    const portfolioVolatilityPercent = RiskMath.round(effectivePortfolioSigma * 100, 2);

    // Potential Gain / Loss from initial value to median outcome
    const potentialGainLoss = RiskMath.round(medianTerminal - initialValue, 2);
    const potentialGainLossPercent = initialValue > 0
      ? RiskMath.round((potentialGainLoss / initialValue) * 100, 2)
      : 0;

    // Theoretical expected value: E[V_T] = sum(q_i * S_i(0) * exp(mu_i * T)) + Cash
    const T = horizon / 252;
    let theoreticalVal = cashBalance;
    for (let i = 0; i < N; i++) {
      theoreticalVal += calibratedHoldings[i].quantity * calibratedHoldings[i].currentPrice * Math.exp(calibratedHoldings[i].expectedReturn * T);
    }
    const theoreticalExpectedVal = RiskMath.round(theoreticalVal, 2);

    // 11. Ending Value Distribution Histogram (15 bins)
    const binCount = 15;
    const binWidth = (maxVal - minVal) / binCount || 1;
    const histogram = [];

    for (let b = 0; b < binCount; b++) {
      const rangeStart = minVal + b * binWidth;
      const rangeEnd = rangeStart + binWidth;
      const count = sortedTerminal.filter((v) =>
        v >= rangeStart && (b === binCount - 1 ? v <= rangeEnd : v < rangeEnd)
      ).length;

      histogram.push({
        binIndex: b,
        rangeLabel: `₹${Math.round(rangeStart).toLocaleString('en-IN')}`,
        rangeStart: RiskMath.round(rangeStart, 2),
        rangeEnd: RiskMath.round(rangeEnd, 2),
        count,
        densityPercent: RiskMath.round((count / numPaths) * 100, 2),
      });
    }

    // Holdings Breakdown with Cash
    const holdingsBreakdown = calibratedHoldings.map((h) => ({
      id: h.id,
      symbol: h.symbol,
      exchange: h.exchange,
      name: h.name,
      quantity: h.quantity,
      currentPrice: h.currentPrice,
      currentValue: h.currentValue,
      portfolioWeightPercent: h.portfolioWeightPercent,
      expectedReturn: h.expectedReturn,
      expectedReturnPercent: h.expectedReturnPercent,
      annualReturn: h.expectedReturn,
      annualReturnPercent: h.expectedReturnPercent,
      volatility: h.volatility,
      volatilityPercent: h.volatilityPercent,
      historicalObservations: h.historicalObservations,
      historicalDays: h.historicalDays,
      alignedTradingDays: h.alignedTradingDays,
      isFallback: h.isFallback,
      fallbackReason: h.fallbackReason,
      dataStatus: h.dataStatus,
    }));

    if (cashBalance > 0) {
      holdingsBreakdown.push({
        id: 'holding-cash',
        symbol: 'INR CASH',
        exchange: 'RBI',
        name: 'Available Cash Reserves',
        quantity: 1,
        currentPrice: cashBalance,
        currentValue: cashBalance,
        portfolioWeightPercent: initialValue > 0 ? RiskMath.round((cashBalance / initialValue) * 100, 2) : 0,
        expectedReturn: 0,
        expectedReturnPercent: 0,
        annualReturn: 0,
        annualReturnPercent: 0,
        volatility: 0,
        volatilityPercent: 0,
        historicalObservations: alignedDaysCount || 252,
        historicalDays: alignedDaysCount || 252,
        alignedTradingDays: alignedDaysCount || 252,
        isFallback: false,
        fallbackReason: null,
        dataStatus: 'LIQUID_CASH',
      });
    }

    const fallbackNotice = hasAnyFallback
      ? 'One or more portfolio holdings had insufficient historical daily prices (< 60 days). Standard Indian benchmark parameters (12% return, 15% volatility) were used as transparent proxies for those assets.'
      : null;

    return {
      simulationId: `mc-${Date.now()}`,
      portfolio: {
        id: resolvedPortfolioId,
        name: portfolioName,
        benchmarkSymbol: portfolio.benchmarkSymbol || 'NIFTY 50',
      },
      parameters: {
        dataSource: 'Yahoo Finance (historical prices)',
        historicalYears: targetYears,
        alignedTradingDays: alignedDaysCount,
        initialPortfolioValue: RiskMath.round(initialValue, 2),
        effectivePortfolioReturn: RiskMath.round(effectivePortfolioMu, 4),
        effectivePortfolioReturnPercent: RiskMath.round(effectivePortfolioMu * 100, 2),
        effectivePortfolioVolatility: RiskMath.round(effectivePortfolioSigma, 4),
        effectivePortfolioVolatilityPercent: RiskMath.round(effectivePortfolioSigma * 100, 2),
        expectedReturnPercent,
        portfolioVolatilityPercent,
        // Backward-compatible aliases
        expectedReturn: RiskMath.round(effectivePortfolioMu, 4),
        annualizedDrift: RiskMath.round(effectivePortfolioMu * 100, 2),
        volatility: RiskMath.round(effectivePortfolioSigma, 4),
        volatilityPercent: RiskMath.round(effectivePortfolioSigma * 100, 2),
        annualizedVolatility: RiskMath.round(effectivePortfolioSigma * 100, 2),
        horizonDays: horizon,
        simulationCount: numPaths,
        timeStepDays: 1,
        timeStepYears: RiskMath.round(dt, 6),
        cashBalance: RiskMath.round(cashBalance, 2),
        equityValue: RiskMath.round(actualEquityValue * scaleFactor, 2),
        holdingsCount: N,
        isUsingFallback: hasAnyFallback,
        fallbackNotice,
        isDeterministicSeed: seed !== null && seed !== undefined,
        seed: seed || null,
        theoreticalExpectedValue: theoreticalExpectedVal,
        dataStatus: hasAnyFallback ? 'BENCHMARK_FALLBACK' : 'LIVE',
      },
      holdingsBreakdown,
      correlationMatrix: {
        symbols: calibratedHoldings.map((h) => h.symbol),
        matrix: correlationMatrix,
      },
      covarianceMatrix: {
        symbols: calibratedHoldings.map((h) => h.symbol),
        matrix: covarianceMatrix,
      },
      outcomes: {
        medianTerminalValue: RiskMath.round(medianTerminal, 2),
        expectedTerminalValue: RiskMath.round(meanTerminal, 2),
        percentile5TerminalValue: RiskMath.round(p5Terminal, 2),
        percentile95TerminalValue: RiskMath.round(p95Terminal, 2),
        probabilityOfLossPercent,
        var95: var95Amount,
        var95Amount,
        var95Percent,
        cvar95: cvar95Amount,
        cvar95Amount,
        cvar95Percent,
        cvarTerminalMean,
        expectedShortfall95: cvar95Amount,
        expectedShortfall95TerminalMean: cvarTerminalMean,
        expectedShortfall95Loss: cvar95Amount,
        expectedShortfall95Percent: cvar95Percent,
        expectedReturnPercent,
        portfolioVolatilityPercent,
        potentialGainLoss,
        potentialGainLossPercent,
        worstCaseTerminalValue: RiskMath.round(minVal, 2),
        bestCaseTerminalValue: RiskMath.round(maxVal, 2),
      },
      sampleTrajectories,
      trajectoryPercentiles,
      terminalHistogram: histogram,
      modelExplanation: {
        modelType: 'Multi-Asset Correlated Geometric Brownian Motion (GBM)',
        dataSource: 'Yahoo Finance (historical prices)',
        formula: 'S_i(t + Δt) = S_i(t) × exp[(μ_i - 0.5σ_i²)Δt + σ_i√Δt × Z_i]',
        portfolioNAVFormula: 'V(t) = ∑ [ q_i × S_i(t) ] + Cash',
        correlationMethod: 'Empirical covariance and correlation decomposed via Cholesky Factorization: Z = L × ε',
        timeStep: 'Daily trading session: Δt = 1/252 years',
        calibration: `${alignedDaysCount} aligned trading sessions from Yahoo Finance historical prices`,
      },
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const monteCarloService = new MonteCarloService();
