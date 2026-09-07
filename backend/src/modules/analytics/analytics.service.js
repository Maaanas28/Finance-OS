import { portfolioService } from '../portfolio/portfolio.service.js';
import { riskService } from '../risk/risk.service.js';
import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { RiskMath } from '../risk/riskMath.js';
import { logger } from '../../utils/logger.js';

export class AnalyticsService {
  constructor() {
    this.DEFAULT_RISK_FREE_RATE = 0.065; // 6.5% Annualized
  }

  /**
   * Comprehensive Analytics Overview & Key Financial Indicators (KPIs)
   */
  async getAnalyticsSummary(portfolioId = null, userId = null) {
    const valuation = await portfolioService.getValuation(portfolioId, userId);
    const { holdings = [], summary = {}, portfolio = {} } = valuation || {};
    const transactions = valuation?.transactions || [];

    const equityHoldings = holdings.filter((h) => Number(h.quantity) > 0 && h.currentValue > 0);

    // Fetch risk metrics from riskService
    const riskMetrics = await riskService.getRiskMetrics(portfolio.id, userId, this.DEFAULT_RISK_FREE_RATE);
    const rmSummary = riskMetrics.summary;

    // Calculate Trade Win Rate & Profit Factor from closed/realized trades
    let winCount = 0;
    let lossCount = 0;
    let totalRealizedGains = 0;
    let totalRealizedLosses = 0;

    const completedTxs = (transactions || []).filter((t) => t.type === 'SELL' || t.type === 'BUY');
    for (const tx of transactions || []) {
      if (tx.type === 'SELL') {
        const pnl = Number(tx.realizedPnl || 0);
        if (pnl > 0) {
          winCount++;
          totalRealizedGains += pnl;
        } else if (pnl < 0) {
          lossCount++;
          totalRealizedLosses += Math.abs(pnl);
        }
      }
    }

    const closedTradesCount = winCount + lossCount;
    const winRatePercent = closedTradesCount > 0 ? RiskMath.round((winCount / closedTradesCount) * 100, 2) : 0;
    const profitFactor = totalRealizedLosses > 0
      ? RiskMath.round(totalRealizedGains / totalRealizedLosses, 2)
      : (totalRealizedGains > 0 ? totalRealizedGains : 0);

    // Compute Jensen's Alpha: Alpha = R_p - [R_f + Beta * (R_m - R_f)]
    const rf = this.DEFAULT_RISK_FREE_RATE;
    const benchVol = rmSummary.benchmarkVolatility || 20; // Default NIFTY annualized benchmark return proxy
    const expectedReturnCapm = rf + rmSummary.beta * (0.12 - rf); // Assuming 12% market expected return
    const portAnnualizedRet = rmSummary.annualizedVolatility > 0 ? (rmSummary.sharpe * (rmSummary.annualizedVolatility / 100)) + rf : 0;
    const jensensAlpha = equityHoldings.length > 0 ? RiskMath.round((portAnnualizedRet - expectedReturnCapm) * 100, 2) : 0;

    return {
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        currency: portfolio.currency,
        currencySymbol: portfolio.currencySymbol,
        benchmarkSymbol: portfolio.benchmarkSymbol || 'NIFTY 50',
      },
      dataStatus: valuation.summary?.dataStatus || 'LIVE',
      valuation: {
        totalValue: summary.totalValue || 0,
        cashBalance: summary.cashBalance || 0,
        investedCapital: summary.investedCapital || 0,
        equityValue: summary.equityValue || 0,
        unrealizedPnL: summary.unrealizedPnL || 0,
        unrealizedPnLPercent: summary.unrealizedPnLPercent || 0,
        realizedPnL: summary.realizedPnL || 0,
        totalPnL: summary.totalPnL || 0,
      },
      ratios: {
        annualizedVolatility: rmSummary.annualizedVolatility,
        benchmarkVolatility: rmSummary.benchmarkVolatility,
        beta: rmSummary.beta,
        alpha: jensensAlpha,
        sharpe: rmSummary.sharpe,
        sortino: rmSummary.sortino,
        maxDrawdown: rmSummary.maxDrawdown,
        compositeRiskScore: rmSummary.compositeScore,
        riskLevel: rmSummary.riskLevel,
      },
      tradingStatistics: {
        totalTransactionsCount: transactions.length,
        closedTradesCount,
        winCount,
        lossCount,
        winRatePercent,
        profitFactor,
        totalRealizedGains: RiskMath.round(totalRealizedGains, 2),
        totalRealizedLosses: RiskMath.round(totalRealizedLosses, 2),
      },
    };
  }

  /**
   * Synchronized Performance Time Series (Portfolio vs Benchmark)
   */
  async getPerformanceSeries(portfolioId = null, userId = null, timeframe = '1M') {
    const valuation = await portfolioService.getValuation(portfolioId, userId);
    const { holdings, summary, portfolio } = valuation;

    const equityHoldings = holdings.filter((h) => Number(h.quantity) > 0 && h.currentValue > 0);
    const benchmarkSymbol = portfolio.benchmarkSymbol || 'NIFTY 50';

    // If portfolio has no equity holdings, generate zero performance curve
    if (equityHoldings.length === 0) {
      const dates = [];
      const today = new Date();
      const numDays = timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : 365;
      for (let i = numDays; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        dates.push(d.toISOString().split('T')[0]);
      }

      const series = dates.map((dt) => ({
        date: dt,
        portfolioNAV: summary.totalValue,
        portfolioReturnPercent: 0,
        benchmarkReturnPercent: 0,
      }));

      return {
        portfolio: { id: portfolio.id, name: portfolio.name },
        benchmarkSymbol,
        timeframe,
        dataStatus: summary?.dataStatus || 'LIVE',
        series,
      };
    }

    const sync = await riskService.getSynchronizedReturns(portfolio.id, userId);
    const { returnDates, returnMatrix, portfolioDailyReturns, dataStatus } = sync;

    const benchReturns = returnMatrix[benchmarkSymbol] || [];
    let cumulativePortRet = 0;
    let cumulativeBenchRet = 0;

    const initialNAV = summary.totalValue > 0 ? summary.totalValue : 100000;

    const series = portfolioDailyReturns.map((pt, idx) => {
      cumulativePortRet += pt.return;
      const bRet = benchReturns[idx] || 0;
      cumulativeBenchRet += bRet;

      return {
        date: pt.date,
        portfolioNAV: RiskMath.round(initialNAV * (1 + cumulativePortRet), 2),
        portfolioReturnPercent: RiskMath.round(cumulativePortRet * 100, 2),
        benchmarkReturnPercent: RiskMath.round(cumulativeBenchRet * 100, 2),
      };
    });

    return {
      portfolio: { id: portfolio.id, name: portfolio.name },
      benchmarkSymbol,
      timeframe,
      dataStatus,
      series,
    };
  }

  /**
   * Portfolio Performance Attribution & Allocation Breakdown
   */
  async getAttribution(portfolioId = null, userId = null) {
    const valuation = await portfolioService.getValuation(portfolioId, userId);
    const { holdings, summary, portfolio } = valuation;

    const equityHoldings = holdings.filter((h) => Number(h.quantity) > 0 && h.currentValue > 0);
    const totalVal = summary.totalValue || 1;

    // 1. Sector Allocation
    const sectorMap = new Map();
    if (summary.cashBalance > 0) {
      sectorMap.set('Cash & Equivalents', summary.cashBalance);
    }

    for (const h of holdings) {
      if (Number(h.quantity) > 0 && h.currentValue > 0) {
        const sec = h.sector || 'Other';
        const cur = sectorMap.get(sec) || 0;
        sectorMap.set(sec, cur + h.currentValue);
      }
    }

    const sectorAllocations = [];
    for (const [sector, value] of sectorMap.entries()) {
      sectorAllocations.push({
        sector,
        value: RiskMath.round(value, 2),
        percentage: RiskMath.round((value / totalVal) * 100, 2),
      });
    }

    // 2. Asset Class Allocation
    const assetClassAllocations = [
      {
        assetClass: 'Equities',
        value: RiskMath.round(summary.equityValue, 2),
        percentage: RiskMath.round((summary.equityValue / totalVal) * 100, 2),
      },
      {
        assetClass: 'Cash & Equivalents',
        value: RiskMath.round(summary.cashBalance, 2),
        percentage: RiskMath.round((summary.cashBalance / totalVal) * 100, 2),
      },
    ];

    // 3. Holding-level Attribution Table
    const totalEquityVal = summary.equityValue || 1;
    const totalUnrealizedPnL = summary.unrealizedPnL || 1;

    const positionAttributions = equityHoldings.map((h) => {
      const weightPercent = RiskMath.round((h.currentValue / totalVal) * 100, 2);
      const pnlContributionPercent = totalUnrealizedPnL !== 0
        ? RiskMath.round((h.unrealizedPnL / Math.abs(totalUnrealizedPnL)) * 100, 2)
        : 0;

      return {
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        sector: h.sector,
        quantity: h.quantity,
        averageBuyPrice: h.averageBuyPrice,
        ltp: h.ltp,
        costBasis: h.costBasis,
        currentValue: h.currentValue,
        unrealizedPnL: h.unrealizedPnL,
        unrealizedPnLPercent: h.unrealizedPnLPercent,
        weightPercent,
        pnlContributionPercent,
      };
    });

    return {
      portfolio: { id: portfolio.id, name: portfolio.name },
      dataStatus: summary?.dataStatus || 'LIVE',
      sectorAllocations: sectorAllocations.sort((a, b) => b.value - a.value),
      assetClassAllocations,
      positionAttributions: positionAttributions.sort((a, b) => b.unrealizedPnL - a.unrealizedPnL),
    };
  }

  /**
   * Quantitative Ratios & Statistical Dashboard Table
   */
  async getRatios(portfolioId = null, userId = null) {
    const riskMetrics = await riskService.getRiskMetrics(portfolioId, userId, this.DEFAULT_RISK_FREE_RATE);
    const rmSummary = riskMetrics.summary;
    const varData = riskMetrics.valueAtRisk;

    const rf = this.DEFAULT_RISK_FREE_RATE;
    const beta = rmSummary.beta;
    const portVol = rmSummary.annualizedVolatility;
    const benchVol = rmSummary.benchmarkVolatility;
    const sharpe = rmSummary.sharpe;
    const sortino = rmSummary.sortino;
    const maxDrawdown = rmSummary.maxDrawdown;

    // Treynor Ratio: (R_p - R_f) / Beta
    const portAnnualizedRet = portVol > 0 ? (sharpe * (portVol / 100)) + rf : 0;
    const treynorRatio = beta > 0 ? RiskMath.round((portAnnualizedRet - rf) / beta, 4) : 0;

    // Calmar Ratio: Annualized Return / Abs(Max Drawdown)
    const calmarRatio = Math.abs(maxDrawdown) > 0 ? RiskMath.round((portAnnualizedRet * 100) / Math.abs(maxDrawdown), 2) : 0;

    return {
      dataStatus: riskMetrics.dataStatus,
      riskFreeRate: rf,
      riskFreeRatePercent: `${(rf * 100).toFixed(1)}%`,
      metrics: [
        { key: 'annualizedVolatility', label: 'Annualized Volatility', value: `${portVol}%`, benchmark: `${benchVol}%`, status: portVol > 20 ? 'ELEVATED' : 'STABLE' },
        { key: 'beta', label: 'Portfolio Beta', value: beta.toFixed(2), benchmark: '1.00 (NIFTY)', status: beta > 1.2 ? 'AGGRESSIVE' : 'BALANCED' },
        { key: 'sharpe', label: 'Sharpe Ratio', value: sharpe.toFixed(2), benchmark: '> 1.00', status: sharpe > 1.5 ? 'EXCELLENT' : sharpe > 0.8 ? 'GOOD' : 'NEUTRAL' },
        { key: 'sortino', label: 'Sortino Ratio', value: sortino.toFixed(2), benchmark: '> 1.50', status: sortino > 1.5 ? 'EXCELLENT' : 'NEUTRAL' },
        { key: 'treynor', label: 'Treynor Ratio', value: treynorRatio.toFixed(4), benchmark: '> 0.05', status: treynorRatio > 0.05 ? 'EXCELLENT' : 'NEUTRAL' },
        { key: 'calmar', label: 'Calmar Ratio', value: calmarRatio.toFixed(2), benchmark: '> 1.00', status: calmarRatio > 1.0 ? 'STRONG' : 'NEUTRAL' },
        { key: 'maxDrawdown', label: 'Max Peak Drawdown', value: `${maxDrawdown}%`, benchmark: '< 15.0%', status: Math.abs(maxDrawdown) < 15 ? 'CONTROLLED' : 'HIGH' },
        { key: 'var95', label: '1D Historical VaR (95%)', value: `₹${varData.historical.confidence95.amount.toLocaleString('en-IN')}`, benchmark: `${varData.historical.confidence95.percent}%`, status: 'MODERATE' },
        { key: 'cvar95', label: '1D Tail CVaR (95%)', value: `₹${varData.conditionalVaR.confidence95.amount.toLocaleString('en-IN')}`, benchmark: `${varData.conditionalVaR.confidence95.percent}%`, status: 'WATCH' },
      ],
    };
  }
}

export const analyticsService = new AnalyticsService();
