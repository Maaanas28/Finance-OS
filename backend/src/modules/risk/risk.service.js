import { portfolioService } from '../portfolio/portfolio.service.js';
import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { RiskMath } from './riskMath.js';
import { logger } from '../../utils/logger.js';

export class RiskService {
  constructor() {
    this.DEFAULT_RISK_FREE_RATE = 0.065; // 6.5% Annualized (RBI 91-Day T-Bill standard)
  }

  /**
   * Synchronize historical return series across all active holdings + benchmark
   */
  async getSynchronizedReturns(portfolioId = null, userId = null) {
    const valuation = await portfolioService.getValuation(portfolioId, userId, { includeRisk: false });
    const { holdings, summary, portfolio } = valuation;

    const equityHoldings = holdings.filter((h) => Number(h.quantity) > 0 && h.currentValue > 0);
    const benchmarkSymbol = portfolio.benchmarkSymbol || 'NIFTY 50';

    // If portfolio has no equity holdings, return clean zero return matrix
    if (equityHoldings.length === 0) {
      return {
        valuation,
        equityHoldings: [],
        weights: {},
        benchmarkSymbol,
        returnDates: [],
        returnMatrix: { [benchmarkSymbol]: [] },
        portfolioDailyReturns: [],
        dataStatus: valuation.summary?.dataStatus || 'LIVE',
      };
    }

    // Collect historical candles for each holding + benchmark
    const assetSymbols = equityHoldings.map((h) => ({ symbol: h.symbol, exchange: h.exchange }));
    assetSymbols.push({ symbol: benchmarkSymbol, exchange: 'NSE' });

    const candlesMap = new Map();
    let overallDataStatus = 'LIVE';

    await Promise.all(
      assetSymbols.map(async ({ symbol, exchange }) => {
        try {
          const hist = await marketDataService.getHistoricalPrices(symbol, {
            timeframe: '1Y',
            interval: '1day',
            exchange,
          });
          if (hist?.candles && hist.candles.length > 0) {
            candlesMap.set(symbol, hist.candles);
            if (hist.dataStatus === 'SIMULATED' && overallDataStatus !== 'STALE') {
              overallDataStatus = 'SIMULATED';
            }
          }
        } catch (err) {
          logger.warn(`RiskEngine: history fetch failed for [${symbol}]: ${err.message}`);
        }
      })
    );

    // If no history returned, fallback gracefully
    if (candlesMap.size === 0 || !candlesMap.has(benchmarkSymbol)) {
      return this.generateSyntheticReturnSeries(equityHoldings, summary, benchmarkSymbol);
    }

    // Benchmark dates serve as reference trading calendar
    const benchmarkCandles = candlesMap.get(benchmarkSymbol);
    const dateList = benchmarkCandles.map((c) => c.time || c.timestamp?.split('T')[0]);

    // Align daily prices across all assets
    const priceMatrix = {};
    for (const h of equityHoldings) {
      const candles = candlesMap.get(h.symbol) || [];
      const datePriceMap = new Map(candles.map((c) => [c.time || c.timestamp?.split('T')[0], c.close]));
      
      let lastKnown = Number(h.ltp || h.averageBuyPrice);
      priceMatrix[h.symbol] = dateList.map((dt) => {
        if (datePriceMap.has(dt)) {
          lastKnown = datePriceMap.get(dt);
        }
        return lastKnown;
      });
    }

    priceMatrix[benchmarkSymbol] = benchmarkCandles.map((c) => c.close);

    // Compute simple percentage returns: r_t = (P_t - P_{t-1}) / P_{t-1}
    const returnMatrix = {};
    const returnDates = dateList.slice(1);

    for (const sym of Object.keys(priceMatrix)) {
      const prices = priceMatrix[sym];
      const rets = [];
      for (let t = 1; t < prices.length; t++) {
        const prev = prices[t - 1];
        const cur = prices[t];
        const r = prev > 0 ? (cur - prev) / prev : 0;
        rets.push(r);
      }
      returnMatrix[sym] = rets;
    }

    // Compute portfolio returns based on current equity weights
    const totalEquityVal = equityHoldings.reduce((sum, h) => sum + h.currentValue, 0) || 1;
    const weights = {};
    for (const h of equityHoldings) {
      weights[h.symbol] = h.currentValue / totalEquityVal;
    }

    const portfolioDailyReturns = [];
    const numDays = returnDates.length;

    for (let t = 0; t < numDays; t++) {
      let dailyRet = 0;
      for (const h of equityHoldings) {
        const r = returnMatrix[h.symbol]?.[t] || 0;
        dailyRet += weights[h.symbol] * r;
      }
      portfolioDailyReturns.push({
        date: returnDates[t],
        return: RiskMath.round(dailyRet, 6),
      });
    }

    return {
      valuation,
      equityHoldings,
      weights,
      benchmarkSymbol,
      returnDates,
      returnMatrix,
      portfolioDailyReturns,
      dataStatus: overallDataStatus,
    };
  }

  /**
   * Complete Quantitative Risk Assessment
   */
  async getRiskMetrics(portfolioId = null, userId = null, customRf = null) {
    const rf = customRf !== null && customRf !== undefined ? Number(customRf) : this.DEFAULT_RISK_FREE_RATE;
    const sync = await this.getSynchronizedReturns(portfolioId, userId);
    const { valuation, equityHoldings, weights, benchmarkSymbol, portfolioDailyReturns, returnMatrix, dataStatus } = sync;

    const pReturns = portfolioDailyReturns.map((pt) => pt.return);
    const benchReturns = returnMatrix[benchmarkSymbol] || [];
    const totalVal = valuation.summary.totalValue;

    if (equityHoldings.length === 0 || pReturns.length === 0) {
      return {
        portfolio: valuation.portfolio,
        totalValue: totalVal,
        observationPeriodDays: 0,
        dataStatus,
        assumptions: {
          riskFreeRate: rf,
          riskFreeRatePercent: `${(rf * 100).toFixed(1)}%`,
          benchmarkSymbol,
          confidenceIntervals: ['95%', '99%'],
        },
        summary: {
          compositeScore: 0,
          riskLevel: 'CONSERVATIVE',
          annualizedVolatility: 0,
          benchmarkVolatility: 0,
          beta: 0,
          sharpe: 0,
          sortino: 0,
          maxDrawdown: 0,
          peakDate: new Date().toISOString().split('T')[0],
          troughDate: new Date().toISOString().split('T')[0],
        },
        valueAtRisk: {
          historical: {
            confidence95: { percent: 0, amount: 0 },
            confidence99: { percent: 0, amount: 0 },
          },
          parametric: {
            confidence95: { percent: 0, amount: 0 },
            confidence99: { percent: 0, amount: 0 },
          },
          conditionalVaR: {
            confidence95: { percent: 0, amount: 0 },
            confidence99: { percent: 0, amount: 0 },
          },
        },
        drawdown: { maxDrawdown: 0, peakDate: new Date().toISOString().split('T')[0], troughDate: new Date().toISOString().split('T')[0], series: [] },
      };
    }

    // 1. Annualized Portfolio Volatility
    const dailyStd = RiskMath.standardDeviation(pReturns, true);
    const annualizedVolatility = RiskMath.round(dailyStd * Math.sqrt(252) * 100, 2);

    // 2. Benchmark Volatility
    const benchDailyStd = RiskMath.standardDeviation(benchReturns, true);
    const benchmarkVolatility = RiskMath.round(benchDailyStd * Math.sqrt(252) * 100, 2);

    // 3. Beta vs Benchmark
    const covPortBench = RiskMath.covariance(pReturns, benchReturns);
    const varBench = RiskMath.variance(benchReturns, true);
    const beta = varBench > 0 ? RiskMath.round(covPortBench / varBench, 2) : 0.0;

    // 4. Annualized Average Return
    const avgDailyReturn = RiskMath.mean(pReturns);
    const annualizedReturn = avgDailyReturn * 252;

    // 5. Sharpe Ratio
    const sharpe = dailyStd > 0 ? RiskMath.round((annualizedReturn - rf) / (dailyStd * Math.sqrt(252)), 2) : 0;

    // 6. Sortino Ratio (Downside Deviation below daily risk-free rate)
    const dailyRf = rf / 252;
    const downsideSqDiffs = pReturns.map((r) => (r < dailyRf ? (r - dailyRf) ** 2 : 0));
    const downsideDev = Math.sqrt(RiskMath.mean(downsideSqDiffs)) * Math.sqrt(252);
    const sortino = downsideDev > 0 ? RiskMath.round((annualizedReturn - rf) / downsideDev, 2) : 0;

    // 7. Maximum Drawdown & Underwater Path
    const drawdownAnalysis = RiskMath.calculateDrawdowns(portfolioDailyReturns);

    // 8. Value at Risk (Historical 95% & 99%)
    const sortedReturns = [...pReturns].sort((a, b) => a - b);
    const nReturns = sortedReturns.length;

    const k95 = Math.max(1, Math.floor(0.05 * nReturns));
    const k99 = Math.max(1, Math.floor(0.01 * nReturns));

    const histVaR95Percent = RiskMath.round(-sortedReturns[k95] * 100, 2);
    const histVaR99Percent = RiskMath.round(-sortedReturns[k99] * 100, 2);
    const histVaR95Amount = RiskMath.round((histVaR95Percent / 100) * totalVal, 2);
    const histVaR99Amount = RiskMath.round((histVaR99Percent / 100) * totalVal, 2);

    // 9. Parametric (Variance-Covariance) VaR (Z95 = 1.6449, Z99 = 2.3263)
    const z95 = 1.64485;
    const z99 = 2.32635;
    const paramVaR95Percent = RiskMath.round((z95 * dailyStd - avgDailyReturn) * 100, 2);
    const paramVaR99Percent = RiskMath.round((z99 * dailyStd - avgDailyReturn) * 100, 2);
    const paramVaR95Amount = RiskMath.round((paramVaR95Percent / 100) * totalVal, 2);
    const paramVaR99Amount = RiskMath.round((paramVaR99Percent / 100) * totalVal, 2);

    // 10. Conditional VaR (Expected Shortfall)
    const tailLosses95 = sortedReturns.slice(0, k95);
    const tailLosses99 = sortedReturns.slice(0, k99);
    const cvar95Percent = RiskMath.round(-RiskMath.mean(tailLosses95) * 100, 2);
    const cvar99Percent = RiskMath.round(-RiskMath.mean(tailLosses99) * 100, 2);
    const cvar95Amount = RiskMath.round((cvar95Percent / 100) * totalVal, 2);
    const cvar99Amount = RiskMath.round((cvar99Percent / 100) * totalVal, 2);

    // 11. Composite Institutional Risk Score (0-100)
    // Weighted factor score: Volatility (30%), Beta (25%), Drawdown (25%), Concentration (20%)
    const volScore = Math.min(100, (annualizedVolatility / 30) * 100);
    const betaScore = Math.min(100, (beta / 2.0) * 100);
    const ddScore = Math.min(100, (Math.abs(drawdownAnalysis.maxDrawdown) / 25) * 100);
    const maxWeight = Math.max(...Object.values(weights), 0);
    const concScore = Math.min(100, (maxWeight / 0.35) * 100);

    const compositeScore = Math.round(volScore * 0.3 + betaScore * 0.25 + ddScore * 0.25 + concScore * 0.2);
    const riskLevel = compositeScore > 65 ? 'HIGH' : compositeScore > 40 ? 'MODERATE' : 'CONSERVATIVE';

    return {
      portfolio: valuation.portfolio,
      totalValue: totalVal,
      observationPeriodDays: pReturns.length,
      dataStatus,
      assumptions: {
        riskFreeRate: rf,
        riskFreeRatePercent: `${(rf * 100).toFixed(1)}%`,
        benchmarkSymbol,
        confidenceIntervals: ['95%', '99%'],
      },
      summary: {
        compositeScore,
        riskLevel,
        annualizedVolatility,
        benchmarkVolatility,
        beta,
        sharpe,
        sortino,
        maxDrawdown: drawdownAnalysis.maxDrawdown,
        peakDate: drawdownAnalysis.peakDate,
        troughDate: drawdownAnalysis.troughDate,
      },
      valueAtRisk: {
        historical: {
          confidence95: { percent: histVaR95Percent, amount: histVaR95Amount },
          confidence99: { percent: histVaR99Percent, amount: histVaR99Amount },
        },
        parametric: {
          confidence95: { percent: paramVaR95Percent, amount: paramVaR95Amount },
          confidence99: { percent: paramVaR99Percent, amount: paramVaR99Amount },
        },
        conditionalVaR: {
          confidence95: { percent: cvar95Percent, amount: cvar95Amount },
          confidence99: { percent: cvar99Percent, amount: cvar99Amount },
        },
      },
      drawdown: drawdownAnalysis,
    };
  }

  /**
   * Pairwise Asset Correlation Matrix
   */
  async getCorrelationMatrix(portfolioId = null, userId = null) {
    const sync = await this.getSynchronizedReturns(portfolioId, userId);
    const { equityHoldings, benchmarkSymbol, returnMatrix, dataStatus } = sync;

    if (equityHoldings.length === 0) {
      return {
        symbols: [],
        matrix: [],
        dataStatus,
        benchmarkSymbol,
      };
    }

    const symbols = equityHoldings.map((h) => h.symbol);
    if (!symbols.includes(benchmarkSymbol)) {
      symbols.push(benchmarkSymbol);
    }

    const seriesArray = symbols.map((sym) => returnMatrix[sym] || []);
    const matrix = RiskMath.correlationMatrix(seriesArray);

    return {
      symbols,
      matrix,
      dataStatus,
      benchmarkSymbol,
    };
  }

  /**
   * Marginal Contribution to Risk (MCR) & Component Volatility
   */
  async getRiskContribution(portfolioId = null, userId = null) {
    const sync = await this.getSynchronizedReturns(portfolioId, userId);
    const { equityHoldings, weights, returnMatrix, dataStatus, valuation } = sync;

    const symbols = equityHoldings.map((h) => h.symbol);
    const n = symbols.length;

    if (n === 0) {
      return { positions: [], dataStatus };
    }

    const seriesArray = symbols.map((sym) => returnMatrix[sym] || []);
    const covMatrix = RiskMath.covarianceMatrix(seriesArray);
    const wVector = symbols.map((sym) => weights[sym] || 0);

    // Compute portfolio variance: w^T * Cov * w
    const covW = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        covW[i] += covMatrix[i][j] * wVector[j];
      }
    }

    let portVariance = 0;
    for (let i = 0; i < n; i++) {
      portVariance += wVector[i] * covW[i];
    }
    const portStd = Math.sqrt(portVariance) || 1e-6;

    // Component percentage risk contribution = (w_i * (Cov * w)_i) / portVariance
    const contributions = symbols.map((sym, i) => {
      const holding = equityHoldings.find((h) => h.symbol === sym);
      const mcr = covW[i] / portStd;
      const pctContrib = portVariance > 0 ? (wVector[i] * covW[i]) / portVariance : 0;
      const individualVol = RiskMath.standardDeviation(seriesArray[i]) * Math.sqrt(252);

      return {
        symbol: sym,
        name: holding?.name || sym,
        sector: holding?.sector || 'Other',
        capitalWeightPercent: RiskMath.round(wVector[i] * 100, 2),
        riskContributionPercent: RiskMath.round(pctContrib * 100, 2),
        annualizedVolatility: RiskMath.round(individualVol * 100, 2),
        marginalRisk: RiskMath.round(mcr, 4),
      };
    });

    return {
      portfolioValue: valuation.summary.totalValue,
      dataStatus,
      positions: contributions.sort((a, b) => b.riskContributionPercent - a.riskContributionPercent),
    };
  }

  /**
   * Fallback for offline/initial state when market feeds are initializing
   */
  generateSyntheticReturnSeries(equityHoldings, summary, benchmarkSymbol) {
    const dates = [];
    const today = new Date();
    for (let i = 252; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      dates.push(d.toISOString().split('T')[0]);
    }

    const returnMatrix = {};
    const symbols = equityHoldings.map((h) => h.symbol);
    symbols.push(benchmarkSymbol);

    const rand = RiskMath.createMulberry32(1337);

    for (const sym of symbols) {
      const rets = [];
      for (let t = 1; t < dates.length; t++) {
        rets.push((rand() - 0.49) * 0.03);
      }
      returnMatrix[sym] = rets;
    }

    const weights = {};
    const totalEquity = summary.equityValue || 1;
    for (const h of equityHoldings) {
      weights[h.symbol] = h.currentValue / totalEquity;
    }

    const pReturns = [];
    for (let t = 0; t < dates.length - 1; t++) {
      let r = 0;
      for (const h of equityHoldings) {
        r += (weights[h.symbol] || 0) * (returnMatrix[h.symbol][t] || 0);
      }
      pReturns.push({ date: dates[t + 1], return: RiskMath.round(r, 6) });
    }

    return {
      valuation: { holdings: equityHoldings, summary, portfolio: { id: 'model', benchmarkSymbol } },
      equityHoldings,
      weights,
      benchmarkSymbol,
      returnDates: dates.slice(1),
      returnMatrix,
      portfolioDailyReturns: pReturns,
      dataStatus: 'SIMULATED',
    };
  }
}

export const riskService = new RiskService();
