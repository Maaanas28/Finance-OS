import { portfolioService } from '../portfolio/portfolio.service.js';
import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { RiskMath } from './riskMath.js';
import { logger } from '../../utils/logger.js';

export class RiskService {
  constructor() {
    this.DEFAULT_RISK_FREE_RATE = 0.065; // 6.5% Annualized (RBI 91-Day T-Bill standard)
  }

  /**
   * Synchronize historical return series across actual portfolio holdings + cash + benchmark
   * Reconstruction is date-aware from transaction ledger.
   * Daily external cash flows (DEPOSIT/WITHDRAWAL) use end-of-day timing convention:
   * r_t = (NAV_t - ExternalFlow_t) / NAV_{t-1} - 1
   */
  async getSynchronizedReturns(portfolioId = null, userId = null) {
    const valuation = await portfolioService.getValuation(portfolioId, userId, { includeRisk: false });
    const { holdings, summary, portfolio } = valuation;

    const totalNav = Number(summary.totalValue) || 0;
    const cashBalance = Number(summary.cashBalance) || 0;
    const equityHoldings = holdings.filter((h) => Number(h.quantity) > 0 && h.currentValue > 0);
    const benchmarkSymbol = portfolio.benchmarkSymbol || 'NIFTY 50';

    // 1. Calculate Capital Weights today (including cash)
    const weights = {};
    if (totalNav > 0) {
      weights['CASH'] = cashBalance / totalNav;
      for (const h of equityHoldings) {
        weights[h.symbol] = h.currentValue / totalNav;
      }
    }

    // 2. Fetch transaction ledger for date-aware holdings & cash flow reconstruction
    let transactions = [];
    try {
      transactions = await portfolioService.getTransactions(portfolio.id || portfolioId, userId);
    } catch (err) {
      logger.warn(`RiskEngine: transactions fetch failed: ${err.message}`);
    }

    // Sort transactions chronologically
    const sortedTx = [...transactions].sort(
      (a, b) => new Date(a.executedAt || a.createdAt) - new Date(b.executedAt || b.createdAt)
    );

    // Collect historical candles for each active equity holding + benchmark
    const assetSymbols = equityHoldings.map((h) => ({ symbol: h.symbol, exchange: h.exchange }));
    if (!assetSymbols.some((a) => a.symbol === benchmarkSymbol)) {
      assetSymbols.push({ symbol: benchmarkSymbol, exchange: 'NSE' });
    }

    const candlesMap = new Map();
    let overallDataStatus = valuation.summary?.dataStatus || 'LIVE';

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

    // If benchmark history unavailable, fallback to synthetic
    if (!candlesMap.has(benchmarkSymbol)) {
      return this.generateSyntheticReturnSeries(equityHoldings, summary, benchmarkSymbol);
    }

    const benchmarkCandles = candlesMap.get(benchmarkSymbol);
    const rawDateList = benchmarkCandles.map((c) => c.time || c.timestamp?.split('T')[0]).filter(Boolean);
    const dateList = Array.from(new Set(rawDateList)).sort();

    // Map benchmark close prices by date
    const benchPriceMap = new Map(benchmarkCandles.map((c) => [c.time || c.timestamp?.split('T')[0], c.close]));
    const benchPrices = dateList.map((dt) => benchPriceMap.get(dt) || 0);
    const benchReturns = [];
    for (let t = 1; t < benchPrices.length; t++) {
      const prev = benchPrices[t - 1];
      const cur = benchPrices[t];
      benchReturns.push(prev > 0 ? (cur - prev) / prev : 0);
    }

    // Align daily prices for equity holdings
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

    const returnMatrix = { [benchmarkSymbol]: benchReturns };
    const returnDates = dateList.slice(1);

    for (const h of equityHoldings) {
      const prices = priceMatrix[h.symbol];
      const rets = [];
      for (let t = 1; t < prices.length; t++) {
        const prev = prices[t - 1];
        const cur = prices[t];
        rets.push(prev > 0 ? (cur - prev) / prev : 0);
      }
      returnMatrix[h.symbol] = rets;
    }

    // Reconstruct date-aware portfolio NAV and flow-adjusted returns
    const portfolioDailyReturns = [];
    const navSeries = [];

    if (sortedTx.length > 0) {
      const firstTxDate = new Date(sortedTx[0].executedAt || sortedTx[0].createdAt).toISOString().split('T')[0];

      let netExplicitDeposits = 0;
      let netTradeOutlay = 0;
      for (const tx of sortedTx) {
        const amount = Number(tx.amount || tx.totalCost || 0);
        const fees = Number(tx.fees || 0);
        if (tx.type === 'DEPOSIT') netExplicitDeposits += amount;
        else if (tx.type === 'WITHDRAWAL') netExplicitDeposits -= amount;
        else if (tx.type === 'BUY') netTradeOutlay += (amount + fees);
        else if (tx.type === 'SELL') netTradeOutlay -= (amount - fees);
      }

      const currentCash = summary?.cashBalance ?? valuation?.summary?.cashBalance ?? 0;
      const implicitInitialCash = Math.max(0, netTradeOutlay + currentCash - netExplicitDeposits);

      let runningCash = implicitInitialCash;
      const runningHoldings = {};
      let txIdx = 0;
      let initialFlowAccounted = false;

      for (let idx = 0; idx < dateList.length; idx++) {
        const dt = dateList[idx];
        let dayExternalFlow = 0;

        if (implicitInitialCash > 0 && !initialFlowAccounted && dt >= firstTxDate) {
          dayExternalFlow += implicitInitialCash;
          initialFlowAccounted = true;
        }

        while (txIdx < sortedTx.length) {
          const tx = sortedTx[txIdx];
          const txDate = new Date(tx.executedAt || tx.createdAt).toISOString().split('T')[0];
          if (txDate > dt) break;

          const amount = Number(tx.amount || tx.totalCost || 0);
          const qty = Number(tx.quantity || 0);
          const fees = Number(tx.fees || 0);

          if (tx.type === 'DEPOSIT') {
            runningCash += amount;
            dayExternalFlow += amount;
          } else if (tx.type === 'WITHDRAWAL') {
            runningCash -= amount;
            dayExternalFlow -= amount;
          } else if (tx.type === 'BUY') {
            runningCash -= (amount + fees);
            runningHoldings[tx.symbol] = (runningHoldings[tx.symbol] || 0) + qty;
          } else if (tx.type === 'SELL') {
            runningCash += (amount - fees);
            runningHoldings[tx.symbol] = Math.max(0, (runningHoldings[tx.symbol] || 0) - qty);
          }

          txIdx++;
        }

        let dayEquityVal = 0;
        for (const [sym, q] of Object.entries(runningHoldings)) {
          if (q > 0) {
            const p = priceMatrix[sym]?.[idx] || 0;
            dayEquityVal += q * p;
          }
        }

        const dayNav = Math.round((runningCash + dayEquityVal) * 100) / 100;
        navSeries.push({ date: dt, nav: dayNav, cash: runningCash, externalFlow: dayExternalFlow });

        // Calculate flow-adjusted return r_t = (NAV_t - ExternalFlow_t) / NAV_{t-1} - 1 (EOD convention)
        if (idx > 0 && dt >= firstTxDate) {
          const prevNav = navSeries[idx - 1]?.nav || 0;
          if (prevNav > 0) {
            const flowAdjRet = (dayNav - dayExternalFlow) / prevNav - 1;
            portfolioDailyReturns.push({
              date: dt,
              return: RiskMath.round(flowAdjRet, 6),
              nav: dayNav,
            });
          }
        }
      }
    }

    if (portfolioDailyReturns.length < 2) {
      portfolioDailyReturns.length = 0; // reset
      const numDays = returnDates.length;
      for (let t = 0; t < numDays; t++) {
        let dailyRet = 0;
        for (const h of equityHoldings) {
          const r = returnMatrix[h.symbol]?.[t] || 0;
          dailyRet += (weights[h.symbol] || 0) * r;
        }
        portfolioDailyReturns.push({
          date: returnDates[t],
          return: RiskMath.round(dailyRet, 6),
          nav: totalNav,
        });
      }
    }

    const obsCount = portfolioDailyReturns.length;

    return {
      valuation,
      equityHoldings,
      weights, // Capital weights (includes CASH)
      benchmarkSymbol,
      returnDates: portfolioDailyReturns.map((pt) => pt.date),
      returnMatrix,
      portfolioDailyReturns,
      navSeries,
      dataStatus: overallDataStatus,
      observationPeriodDays: obsCount,
      insufficientHistory: obsCount < 2,
    };
  }

  /**
   * Complete Quantitative Risk Assessment
   */
  async getRiskMetrics(portfolioId = null, userId = null, customRf = null) {
    const rf = customRf !== null && customRf !== undefined ? Number(customRf) : this.DEFAULT_RISK_FREE_RATE;
    const sync = await this.getSynchronizedReturns(portfolioId, userId);
    const { valuation, equityHoldings, weights, benchmarkSymbol, portfolioDailyReturns, returnMatrix, dataStatus, insufficientHistory, observationPeriodDays } = sync;

    const pReturns = portfolioDailyReturns.map((pt) => pt.return);
    const benchReturns = returnMatrix[benchmarkSymbol] || [];
    const totalVal = valuation.summary.totalValue;

    if (insufficientHistory || pReturns.length < 2) {
      return {
        portfolio: valuation.portfolio,
        totalValue: totalVal,
        observationPeriodDays: observationPeriodDays || 0,
        insufficientHistory: true,
        dataStatus,
        assumptions: {
          riskFreeRate: rf,
          riskFreeRatePercent: `${(rf * 100).toFixed(1)}%`,
          benchmarkSymbol,
          confidenceIntervals: ['95%', '99%'],
          cashFlowTimingConvention: 'End-of-Day (EOD)',
        },
        summary: {
          compositeScore: 0,
          riskLevel: 'INSUFFICIENT_DATA',
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
        drawdown: { maxDrawdown: 0, peakDate: null, troughDate: null, series: [] },
      };
    }

    // 1. Annualized Portfolio Volatility (sample std * sqrt(252))
    const dailyStd = RiskMath.standardDeviation(pReturns, true);
    const annualizedVolatility = RiskMath.round(dailyStd * Math.sqrt(252) * 100, 2);

    // 2. Benchmark Volatility
    const benchDailyStd = RiskMath.standardDeviation(benchReturns, true);
    const benchmarkVolatility = RiskMath.round(benchDailyStd * Math.sqrt(252) * 100, 2);

    // 3. Beta vs Benchmark
    const covPortBench = RiskMath.covariance(pReturns, benchReturns);
    const varBench = RiskMath.variance(benchReturns, true);
    const beta = varBench > 0 && dailyStd > 0 ? RiskMath.round(covPortBench / varBench, 2) : 0.0;

    // 4. Daily Risk-Free Rate Compounding: r_f_daily = (1 + R_f)^(1/252) - 1
    const dailyRf = (1 + rf) ** (1 / 252) - 1;
    const excessReturns = pReturns.map((r) => r - dailyRf);

    // 5. Sharpe Ratio: mean(excess) / std(excess) * sqrt(252)
    const meanExcess = RiskMath.mean(excessReturns);
    const stdExcess = RiskMath.standardDeviation(excessReturns, true);
    const sharpe = stdExcess > 0 ? RiskMath.round((meanExcess / stdExcess) * Math.sqrt(252), 2) : 0;

    // 6. Sortino Ratio: mean(excess) * 252 / (downside_std * sqrt(252))
    const downsideSqDiffs = excessReturns.map((r) => (r < 0 ? r ** 2 : 0));
    const downsideDevDaily = Math.sqrt(RiskMath.mean(downsideSqDiffs));
    const sortino = downsideDevDaily > 0 ? RiskMath.round((meanExcess * 252) / (downsideDevDaily * Math.sqrt(252)), 2) : 0;

    // 7. Maximum Drawdown & Underwater Path
    const drawdownAnalysis = RiskMath.calculateDrawdowns(portfolioDailyReturns);

    // 8. Historical VaR & CVaR (Empirical Quantiles)
    const sortedReturns = [...pReturns].sort((a, b) => a - b);
    const q05 = RiskMath.percentile(sortedReturns, 5);
    const q01 = RiskMath.percentile(sortedReturns, 1);

    const histVaR95Percent = RiskMath.round(-q05 * 100, 2);
    const histVaR99Percent = RiskMath.round(-q01 * 100, 2);
    const histVaR95Amount = RiskMath.round(Math.max(0, -q05) * totalVal, 2);
    const histVaR99Amount = RiskMath.round(Math.max(0, -q01) * totalVal, 2);

    const tailLosses95 = sortedReturns.filter((r) => r <= q05);
    const tailLosses99 = sortedReturns.filter((r) => r <= q01);

    const cvar95Ret = tailLosses95.length > 0 ? RiskMath.mean(tailLosses95) : q05;
    const cvar99Ret = tailLosses99.length > 0 ? RiskMath.mean(tailLosses99) : q01;

    const cvar95Percent = RiskMath.round(-cvar95Ret * 100, 2);
    const cvar99Percent = RiskMath.round(-cvar99Ret * 100, 2);
    const cvar95Amount = RiskMath.round(Math.max(0, -cvar95Ret) * totalVal, 2);
    const cvar99Amount = RiskMath.round(Math.max(0, -cvar99Ret) * totalVal, 2);

    // 9. 1-Day Parametric VaR (Gaussian assumption)
    // VaR = (z * daily_std - daily_mean) * totalVal
    const avgDailyReturn = RiskMath.mean(pReturns);
    const z95 = 1.644853626;
    const z99 = 2.326347874;

    const paramVaR95Percent = RiskMath.round((z95 * dailyStd - avgDailyReturn) * 100, 2);
    const paramVaR99Percent = RiskMath.round((z99 * dailyStd - avgDailyReturn) * 100, 2);
    const paramVaR95Amount = RiskMath.round(Math.max(0, z95 * dailyStd - avgDailyReturn) * totalVal, 2);
    const paramVaR99Amount = RiskMath.round(Math.max(0, z99 * dailyStd - avgDailyReturn) * totalVal, 2);

    // 10. 1-Day Parametric CVaR (Gaussian Expected Shortfall)
    // ES_daily = mean - std * phi(z_p) / p
    const phi95 = RiskMath.normalPDF(-z95);
    const phi99 = RiskMath.normalPDF(-z99);

    const paramES95Ret = avgDailyReturn - dailyStd * (phi95 / 0.05);
    const paramES99Ret = avgDailyReturn - dailyStd * (phi99 / 0.01);

    const paramCVaR95Percent = RiskMath.round(-paramES95Ret * 100, 2);
    const paramCVaR99Percent = RiskMath.round(-paramES99Ret * 100, 2);
    const paramCVaR95Amount = RiskMath.round(Math.max(0, -paramES95Ret) * totalVal, 2);
    const paramCVaR99Amount = RiskMath.round(Math.max(0, -paramES99Ret) * totalVal, 2);

    // 11. Composite Risk Score (0-100)
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
      observationPeriodDays: observationPeriodDays || pReturns.length,
      insufficientHistory: false,
      dataStatus,
      assumptions: {
        riskFreeRate: rf,
        riskFreeRatePercent: `${(rf * 100).toFixed(1)}%`,
        benchmarkSymbol,
        confidenceIntervals: ['95%', '99%'],
        cashFlowTimingConvention: 'End-of-Day (EOD)',
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
        parametricCVaR: {
          confidence95: { percent: paramCVaR95Percent, amount: paramCVaR95Amount },
          confidence99: { percent: paramCVaR99Percent, amount: paramCVaR99Amount },
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
   * Cash has 0% volatility and 0% risk contribution. Capital weights and risk contributions are distinct.
   */
  async getRiskContribution(portfolioId = null, userId = null) {
    const sync = await this.getSynchronizedReturns(portfolioId, userId);
    const { equityHoldings, weights, returnMatrix, dataStatus, valuation } = sync;

    const totalVal = valuation.summary.totalValue;
    const cashVal = valuation.summary.cashBalance;

    const eqSymbols = equityHoldings.map((h) => h.symbol);
    const n = eqSymbols.length;

    const positions = [];

    // 1. Cash Position (Capital Weight = Cash / Total NAV, Risk Contribution = 0%)
    if (cashVal > 0 || n === 0) {
      positions.push({
        symbol: 'CASH',
        name: 'Cash & Liquid Reserve',
        sector: 'Cash Equivalent',
        capitalWeightPercent: totalVal > 0 ? RiskMath.round((cashVal / totalVal) * 100, 2) : 100,
        riskContributionPercent: 0.00, // Cash has 0% risk contribution
        annualizedVolatility: 0.00,
        marginalRisk: 0.0000,
      });
    }

    if (n === 0) {
      return { portfolioValue: totalVal, dataStatus, positions };
    }

    // 2. Equity Positions Risk Decomposition
    const seriesArray = eqSymbols.map((sym) => returnMatrix[sym] || []);
    const covMatrix = RiskMath.covarianceMatrix(seriesArray);

    const eqVal = equityHoldings.reduce((sum, h) => sum + h.currentValue, 0) || 1;
    const eqWVector = eqSymbols.map((sym) => equityHoldings.find((h) => h.symbol === sym).currentValue / eqVal);

    const covW = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        covW[i] += covMatrix[i][j] * eqWVector[j];
      }
    }

    let portVariance = 0;
    for (let i = 0; i < n; i++) {
      portVariance += eqWVector[i] * covW[i];
    }
    const portStd = Math.sqrt(portVariance) || 1e-6;

    for (let i = 0; i < n; i++) {
      const sym = eqSymbols[i];
      const holding = equityHoldings.find((h) => h.symbol === sym);
      const capWeight = totalVal > 0 ? (holding.currentValue / totalVal) * 100 : 0;
      const mcr = covW[i] / portStd;
      const pctContrib = portVariance > 0 ? (eqWVector[i] * covW[i]) / portVariance : 0;
      const individualVol = RiskMath.standardDeviation(seriesArray[i]) * Math.sqrt(252);

      positions.push({
        symbol: sym,
        name: holding?.name || sym,
        sector: holding?.sector || 'Other',
        capitalWeightPercent: RiskMath.round(capWeight, 2),
        riskContributionPercent: RiskMath.round(pctContrib * 100, 2),
        annualizedVolatility: RiskMath.round(individualVol * 100, 2),
        marginalRisk: RiskMath.round(mcr, 4),
      });
    }

    return {
      portfolioValue: totalVal,
      dataStatus,
      positions: positions.sort((a, b) => b.riskContributionPercent - a.riskContributionPercent),
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
      observationPeriodDays: pReturns.length,
      insufficientHistory: false,
    };
  }
}

export const riskService = new RiskService();
