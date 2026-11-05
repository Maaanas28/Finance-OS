import { portfolioService } from '../portfolio/portfolio.service.js';
import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { RiskMath } from './riskMath.js';
import { BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class MonteCarloService {
  /**
   * Portfolio-Aware Stochastic Monte Carlo Simulation Engine
   *
   * Genuinely simulates the user's ACTUAL portfolio holdings using Multi-Asset Correlated
   * Geometric Brownian Motion (GBM):
   *
   * S_i(t + Δt) = S_i(t) × exp[ (μ_i - 0.5 * σ_i²)Δt + σ_i × √Δt × Z_i ]
   *
   * Where:
   * - S_i(t): Price of holding i at trading session t
   * - μ_i: Annualized expected return estimated from historical daily closes (drift)
   * - σ_i: Annualized volatility estimated from historical daily returns (diffusion)
   * - Δt: 1 / 252 (daily time step in a 252-day market year)
   * - Z_i: Correlated standard normal random shock derived via Cholesky factor L:
   *        Z = L × ε, where ε ~ N(0, I)
   * - Portfolio NAV at each time step:
   *        V(t) = ∑ [ q_i × S_i(t) ] + Cash
   *
   * @param {string} portfolioId - Portfolio identifier
   * @param {Object} options - Simulation options (simulationCount, horizonDays, seed, overrides, userId)
   */
  async runSimulation(portfolioId = null, options = {}) {
    const {
      simulationCount = 1000,
      horizonDays = 252,
      targetReturn = 0.12,
      seed = null,
      userId = null,
      historicalYears = 3,
    } = options;

    const numPaths = Math.max(100, Math.min(10000, Number(simulationCount) || 1000));
    const horizon = Math.max(10, Math.min(504, Number(horizonDays) || 252));
    const histYears = Math.max(1, Math.min(5, Number(historicalYears) || 3));

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

    // 3. Fetch Historical Price Data & Calibrate Parameters for Each Holding
    // Map historicalYears (1-5) to timeframe strings the provider understands
    const timeframeForYears = (years) => {
      if (years >= 5) return '5Y';
      if (years >= 3) return '3Y';
      if (years >= 2) return '2Y';
      return '1Y';
    };

    // Build ordered list of timeframes to try (most preferred first, fallback shorter)
    const timeframesToTry = (() => {
      const primary = timeframeForYears(histYears);
      const fallbacks = ['3Y', '2Y', '1Y'].filter((tf) => tf !== primary);
      return [primary, ...fallbacks];
    })();

    const candlesMap = new Map();
    if (activeHoldings.length > 0) {
      await Promise.all(
        activeHoldings.map(async (h) => {
          for (const timeframe of timeframesToTry) {
            try {
              const hist = await marketDataService.getHistoricalPrices(h.symbol, {
                timeframe,
                interval: '1day',
                exchange: h.exchange || 'NSE',
              });
              if (hist?.candles && Array.isArray(hist.candles) && hist.candles.length >= 20) {
                candlesMap.set(h.symbol, hist.candles);
                break; // Got enough data, stop trying shorter timeframes
              }
            } catch (err) {
              logger.warn(`MonteCarlo: historical fetch failed for [${h.symbol}] @ ${timeframe}: ${err.message}`);
            }
          }
        })
      );
    }

    // Calibrate each holding's historical return series, μ_i, and σ_i using log returns
    const calibratedHoldings = [];
    const holdingReturnMaps = [];   // Map<date-string, log-return>
    const holdingLogReturnArrays = []; // For empirical covariance matrix
    let hasAnyFallback = false;

    if (activeHoldings.length > 0) {
      for (const h of activeHoldings) {
        const candles = candlesMap.get(h.symbol) || [];
        const sortedCandles = [...candles].sort(
          (a, b) => new Date(a.time || a.timestamp || 0) - new Date(b.time || b.timestamp || 0)
        );

        const returns = [];
        const dateReturnMap = new Map();
        for (let t = 1; t < sortedCandles.length; t++) {
          const prev = Number(sortedCandles[t - 1].close);
          const cur = Number(sortedCandles[t].close);
          if (prev > 0 && cur > 0) {
            const ret = Math.log(cur / prev); // Log returns for GBM calibration
            returns.push(ret);
            const dtStr = sortedCandles[t].time || sortedCandles[t].timestamp?.split('T')[0];
            if (dtStr) dateReturnMap.set(dtStr, ret);
          }
        }

        let mu_i;
        let sigma_i;
        let isFallback = false;
        let fallbackReason = null;

        // Minimum 20 trading sessions for valid statistical sample
        if (returns.length >= 20) {
          const dailyMean = RiskMath.mean(returns);
          const dailyVar = RiskMath.variance(returns, true);
          // GBM: annualized drift = annualized_log_mean + 0.5*annualized_var (Itô correction already in GBM formula)
          mu_i = dailyMean * 252;
          const dailyStd = Math.sqrt(Math.max(0, dailyVar));
          sigma_i = Math.max(0.00, dailyStd * Math.sqrt(252));
        } else {
          isFallback = true;
          hasAnyFallback = true;
          fallbackReason = `Insufficient historical price data (${returns.length} days found, minimum 20 required). Using benchmark proxy.`;
          mu_i = 0.12; // 12% standard Indian equity return baseline
          sigma_i = 0.15; // 15% standard market volatility
        }

        // Apply user overrides if explicitly specified
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
          historicalObservations: returns.length,
          isFallback,
          fallbackReason,
          dataStatus: isFallback ? 'BENCHMARK_FALLBACK' : 'LIVE',
        });

        holdingReturnMaps.push(dateReturnMap);
        holdingLogReturnArrays.push(returns);
      }
    } else {
      // Ad-hoc single portfolio-level asset when no equity holdings exist
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
        isFallback: true,
        fallbackReason: 'No equity holdings registered. Simulating portfolio-level Geometric Brownian Motion.',
        dataStatus: 'BENCHMARK_FALLBACK',
      });
      hasAnyFallback = true;
      cashBalance = 0; // Entire portfolio value is represented by the asset
    }

    const N = calibratedHoldings.length;

    // 4. Build Empirical N×N Daily Covariance Matrix from Date-Aligned Returns,
    //    Derive correlation matrix, then Cholesky-decompose the CORRELATION matrix
    //    for GBM shock generation (preserves per-stock σ_i scaling).
    let dailyCovMatrix = [];  // N×N empirical daily covariance
    let correlationMatrix = []; // N×N empirical correlation (or fallback)
    let L = [];               // Cholesky of CORRELATION matrix for GBM shocks
    let alignedTradingDays = 0;

    if (N > 0) {
      // Find the common date set across all holdings (intersection of their return date maps)
      const allDateSets = holdingReturnMaps.map((m) => new Set(m.keys()));
      let commonDates = [...(allDateSets[0] || new Set())];
      for (let i = 1; i < allDateSets.length; i++) {
        commonDates = commonDates.filter((d) => allDateSets[i].has(d));
      }
      commonDates.sort(); // chronological order
      alignedTradingDays = commonDates.length;

      if (commonDates.length >= 20) {
        // Build N aligned return series over the common date set
        const alignedReturns = holdingReturnMaps.map((m) => commonDates.map((d) => m.get(d) ?? 0));

        // Empirical daily covariance matrix (sample covariance, Bessel's correction)
        dailyCovMatrix = Array.from({ length: N }, () => Array(N).fill(0));
        const means = alignedReturns.map((arr) => RiskMath.mean(arr));
        const nObs = commonDates.length;
        for (let i = 0; i < N; i++) {
          for (let j = i; j < N; j++) {
            let cov = 0;
            for (let t = 0; t < nObs; t++) {
              cov += (alignedReturns[i][t] - means[i]) * (alignedReturns[j][t] - means[j]);
            }
            cov /= nObs - 1;
            dailyCovMatrix[i][j] = cov;
            dailyCovMatrix[j][i] = cov;
          }
        }

        // Derive empirical correlation matrix from covariance matrix
        correlationMatrix = Array.from({ length: N }, (_, i) =>
          Array.from({ length: N }, (__, j) => {
            const sigI = Math.sqrt(Math.max(0, dailyCovMatrix[i][i]));
            const sigJ = Math.sqrt(Math.max(0, dailyCovMatrix[j][j]));
            if (i === j) return 1.0;
            if (sigI === 0 || sigJ === 0) return 0.0;
            return RiskMath.round(Math.max(-0.95, Math.min(0.95, dailyCovMatrix[i][j] / (sigI * sigJ))), 4);
          })
        );
      } else {
        // Fallback: build diagonal covariance and pairwise correlation from individual σ_i
        logger.warn(`MonteCarlo: insufficient aligned observations (${commonDates.length}) for empirical covariance. Using per-stock sigma with 0.30 baseline correlation.`);
        dailyCovMatrix = Array.from({ length: N }, (_, i) =>
          Array.from({ length: N }, (__, j) => {
            if (i !== j) return 0;
            const dailyVar = (calibratedHoldings[i].volatility / Math.sqrt(252)) ** 2;
            return dailyVar;
          })
        );
        correlationMatrix = Array.from({ length: N }, (_, i) =>
          Array.from({ length: N }, (__, j) => {
            if (i === j) return 1.0;
            // Use pairwise alignment if available, otherwise 0.30 baseline
            const mapI = holdingReturnMaps[i];
            const mapJ = holdingReturnMaps[j];
            if (mapI && mapJ) {
              const alignedI = [], alignedJ = [];
              for (const [dt, rI] of mapI.entries()) {
                if (mapJ.has(dt)) { alignedI.push(rI); alignedJ.push(mapJ.get(dt)); }
              }
              if (alignedI.length >= 5) {
                const r = RiskMath.correlation(alignedI, alignedJ);
                return RiskMath.round(Math.max(-0.95, Math.min(0.95, r)), 4);
              }
            }
            return 0.30;
          })
        );
      }

      // Cholesky of CORRELATION matrix for GBM shock generation
      // (per-stock σ_i scaling is applied separately via diffusions[i])
      L = RiskMath.cholesky(correlationMatrix, 1e-4);
    }

    // 5. Effective Portfolio Return & Volatility Metrics (Markowitz formula)
    let effectivePortfolioMu = 0;
    let portfolioVariance = 0;

    for (let i = 0; i < N; i++) {
      const wi = calibratedHoldings[i].portfolioWeightPercent / 100;
      effectivePortfolioMu += wi * calibratedHoldings[i].expectedReturn;
      for (let j = 0; j < N; j++) {
        const wj = calibratedHoldings[j].portfolioWeightPercent / 100;
        // σ_i × σ_j × ρ_ij gives annualized covariance
        const rho_ij = correlationMatrix[i]?.[j] ?? (i === j ? 1.0 : 0.0);
        const cov_ij = calibratedHoldings[i].volatility * calibratedHoldings[j].volatility * rho_ij;
        portfolioVariance += wi * wj * cov_ij;
      }
    }
    const effectivePortfolioSigma = Math.sqrt(Math.max(0, portfolioVariance));

    // 6. Time Step & Simulation Parameters
    const dt = 1 / 252;
    const sqrtDt = Math.sqrt(dt);

    // Precompute GBM drift and per-stock diffusion coefficients
    // GBM step: S_i(t+Δt) = S_i(t) × exp((μ_i − 0.5σ_i²)Δt + σ_i × √Δt × Z_i)
    // where Z = L × ε (L = Cholesky of CORRELATION matrix, ε ~ N(0,I))
    // so Z_i ~ N(0,1) with cross-asset correlations preserved.
    const drifts = new Float64Array(N);
    const diffusions = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const mu_i = calibratedHoldings[i].expectedReturn;
      const sig_i = calibratedHoldings[i].volatility;
      drifts[i] = (mu_i - 0.5 * (sig_i ** 2)) * dt;
      diffusions[i] = sig_i * sqrtDt; // σ_i × √Δt: scales N(0,1) shock to correct magnitude
    }

    // Mulberry32 PRNG for deterministic seed or standard Math.random
    const randFn = seed !== null && seed !== undefined ? RiskMath.createMulberry32(seed) : Math.random;

    // Sampling steps for visualization
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

    // 7. Execute Multi-Asset Correlated Monte Carlo Simulation
    const currentPrices = new Float64Array(N);
    const eps = new Float64Array(N);
    const zShocks = new Float64Array(N);

    for (let p = 0; p < numPaths; p++) {
      // Initialize prices at Day 0
      for (let i = 0; i < N; i++) {
        currentPrices[i] = calibratedHoldings[i].currentPrice;
      }

      let stepIdx = 0;
      pathValuesAtStep[0][p] = initialValue;

      for (let d = 1; d <= horizon; d++) {
        // Generate independent standard normal variates epsilon ~ N(0, I)
        for (let i = 0; i < N; i++) {
          eps[i] = RiskMath.boxMuller(randFn);
        }

        // Apply Cholesky transformation: Z = L * eps
        // L = Cholesky of CORRELATION matrix → Z_i ~ N(0,1) with correlations
        for (let i = 0; i < N; i++) {
          let sum = 0;
          for (let k = 0; k <= i; k++) {
            sum += L[i][k] * eps[k];
          }
          zShocks[i] = sum;
        }

        // Advance each stock's price via correlated GBM
        // S_i(t+Δt) = S_i(t) × exp((μ_i − 0.5σ_i²)Δt + σ_i × √Δt × Z_i)
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

      // Record terminal value at horizon
      let finalNav = cashBalance;
      for (let i = 0; i < N; i++) {
        finalNav += calibratedHoldings[i].quantity * currentPrices[i];
      }
      terminalValues[p] = finalNav;
    }

    // 8. 20 Sample Paths for Visual Paths Chart
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

    // 9. Trajectory Percentile Bands per Step (P5, P25, Median P50, P75, P95)
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

    // 10. Core Outcome Metrics
    const sortedTerminal = Array.from(terminalValues).sort((a, b) => a - b);
    const meanTerminal = RiskMath.mean(sortedTerminal);
    const medianTerminal = RiskMath.percentile(sortedTerminal, 50);
    const p5Terminal = RiskMath.percentile(sortedTerminal, 5);
    const p95Terminal = RiskMath.percentile(sortedTerminal, 95);
    const minVal = sortedTerminal[0];
    const maxVal = sortedTerminal[sortedTerminal.length - 1];

    // Probability of capital loss: P(Ending Value < Initial Value)
    let lossCount = 0;
    for (let i = 0; i < numPaths; i++) {
      if (terminalValues[i] < initialValue) lossCount++;
    }
    const probabilityOfLossPercent = RiskMath.round((lossCount / numPaths) * 100, 2);

    // Value at Risk (95%): VaR = V(0) - P5(terminal values)
    // Interpretation: with 95% confidence, losses won't exceed VaR over the simulation horizon
    const var95Amount = RiskMath.round(Math.max(0, initialValue - p5Terminal), 2);
    const var95Percent = initialValue > 0 ? RiskMath.round((var95Amount / initialValue) * 100, 2) : 0;

    // Conditional Value at Risk / Expected Shortfall (95%):
    // CVaR = average of terminal values in the worst 5% of paths
    const tail5Cutoff = Math.floor(numPaths * 0.05);
    const tailValues = sortedTerminal.slice(0, Math.max(1, tail5Cutoff));
    const cvarTerminalMean = RiskMath.mean(tailValues);
    const cvar95Amount = RiskMath.round(Math.max(0, initialValue - cvarTerminalMean), 2);
    const cvar95Percent = initialValue > 0 ? RiskMath.round((cvar95Amount / initialValue) * 100, 2) : 0;

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

    // Build Holdings Breakdown including Cash balance
    const holdingsBreakdown = [...calibratedHoldings];
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
        volatility: 0,
        volatilityPercent: 0,
        historicalObservations: 252,
        isFallback: false,
        fallbackReason: null,
        dataStatus: 'LIQUID_CASH',
      });
    }

    const fallbackNotice = hasAnyFallback
      ? 'One or more portfolio holdings had insufficient historical daily prices (< 20 days). Standard Indian benchmark parameters (12% return, 15% volatility) were used as transparent proxies for those assets.'
      : null;

    return {
      simulationId: `mc-${Date.now()}`,
      portfolio: {
        id: resolvedPortfolioId,
        name: portfolioName,
        benchmarkSymbol: portfolio.benchmarkSymbol || 'NIFTY 50',
      },
      parameters: {
        initialPortfolioValue: RiskMath.round(initialValue, 2),
        effectivePortfolioReturn: RiskMath.round(effectivePortfolioMu, 4),
        effectivePortfolioReturnPercent: RiskMath.round(effectivePortfolioMu * 100, 2),
        effectivePortfolioVolatility: RiskMath.round(effectivePortfolioSigma, 4),
        effectivePortfolioVolatilityPercent: RiskMath.round(effectivePortfolioSigma * 100, 2),
        // Backward-compatible aliases
        expectedReturn: RiskMath.round(effectivePortfolioMu, 4),
        expectedReturnPercent: RiskMath.round(effectivePortfolioMu * 100, 2),
        annualizedDrift: RiskMath.round(effectivePortfolioMu * 100, 2),
        volatility: RiskMath.round(effectivePortfolioSigma, 4),
        volatilityPercent: RiskMath.round(effectivePortfolioSigma * 100, 2),
        annualizedVolatility: RiskMath.round(effectivePortfolioSigma * 100, 2),
        horizonDays: horizon,
        simulationCount: numPaths,
        historicalYears: histYears,
        alignedTradingDays,
        dataSource: hasAnyFallback ? 'Yahoo Finance (partial — benchmark proxy used)' : `Yahoo Finance (${histYears}Y historical)`,
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
      outcomes: {
        medianTerminalValue: RiskMath.round(medianTerminal, 2),
        probabilityOfLossPercent,
        percentile5TerminalValue: RiskMath.round(p5Terminal, 2),
        percentile95TerminalValue: RiskMath.round(p95Terminal, 2),
        expectedTerminalValue: RiskMath.round(meanTerminal, 2),
        potentialGainLoss,
        potentialGainLossPercent,
        worstCaseTerminalValue: RiskMath.round(minVal, 2),
        bestCaseTerminalValue: RiskMath.round(maxVal, 2),
        // Value at Risk (95%): absolute INR loss at the 5th percentile outcome
        var95Amount,
        var95Percent,
        // Conditional VaR / Expected Shortfall (95%): average loss in worst 5% of paths
        cvar95Amount,
        cvar95Percent,
        cvarTerminalMean: RiskMath.round(cvarTerminalMean, 2),
      },
      sampleTrajectories,
      trajectoryPercentiles,
      terminalHistogram: histogram,
      modelExplanation: {
        modelType: 'Multi-Asset Correlated Geometric Brownian Motion (GBM) — Historical Data Calibrated',
        formula: 'S_i(t + Δt) = S_i(t) × exp[(μ_i - 0.5σ_i²)Δt + Z_i × √Δt]',
        portfolioNAVFormula: 'V(t) = ∑ [ q_i × S_i(t) ] + Cash',
        correlationMethod: `Empirical Daily Covariance Matrix (${histYears}Y aligned returns) → Cholesky: Z = L×ε, L×L^T = Σ`,
        varDefinition: 'VaR(95%) = V(0) − P5(terminal values): maximum expected horizon loss at 95% confidence',
        cvarDefinition: 'CVaR(95%) = average of terminal values in worst 5% of paths: expected loss beyond VaR threshold',
        timeStep: 'Daily trading session: Δt = 1/252 years',
      },
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const monteCarloService = new MonteCarloService();
