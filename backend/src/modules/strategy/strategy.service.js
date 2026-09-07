import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { portfolioService } from '../portfolio/portfolio.service.js';
import { StrategyEngine } from './strategyEngine.js';
import { BadRequestError } from '../../utils/errors.js';

export class StrategyService {
  constructor() {
    this.savedRuns = new Map(); // userId -> backtest runs list
  }

  getTemplates() {
    return [
      {
        id: 'mean_reversion',
        name: 'RSI Mean Reversion',
        category: 'MEAN_REVERSION',
        description: 'Executes BUY when 14-day RSI drops below oversold threshold (default 30) and SELL when RSI exceeds overbought threshold (default 70).',
        defaultSymbol: 'RELIANCE',
        defaultParams: {
          rsiPeriod: 14,
          oversoldThreshold: 30,
          overboughtThreshold: 70,
          initialCapital: 100000,
          timeframe: '1Y',
        },
      },
      {
        id: 'momentum_ema',
        name: '20/50 EMA Trend Crossover',
        category: 'MOMENTUM',
        description: 'Captures trend momentum by going long when 20 EMA crosses above 50 EMA on daily timeframe.',
        defaultSymbol: 'NIFTY 50',
        defaultParams: {
          fastEma: 20,
          slowEma: 50,
          initialCapital: 100000,
          timeframe: '1Y',
        },
      },
      {
        id: 'macd_momentum',
        name: 'MACD Signal Line Crossover',
        category: 'MOMENTUM',
        description: 'Enters long positions when MACD line crosses above 9-day signal line with positive histogram expansion.',
        defaultSymbol: 'TCS',
        defaultParams: {
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          initialCapital: 100000,
          timeframe: '1Y',
        },
      },
    ];
  }

  async runBacktest(payload = {}, userId = null) {
    const {
      strategyId = 'mean_reversion',
      symbol = 'RELIANCE',
      initialCapital: inputCapital,
      timeframe = '1Y',
      slippagePercent = 0.1,
      commissionPercent = 0.05,
      params = {},
    } = payload;

    // 1. Parameter Validation
    if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
      throw new BadRequestError('Symbol must be a non-empty string');
    }

    const cleanSymbol = symbol.trim().toUpperCase();

    let initialCapital;
    if (inputCapital !== undefined && inputCapital !== null) {
      initialCapital = Number(inputCapital);
      if (isNaN(initialCapital) || initialCapital <= 0 || initialCapital > 100000000) {
        throw new BadRequestError('Initial capital must be a positive number up to ₹100,000,000');
      }
    } else if (userId) {
      try {
        const summary = await portfolioService.getSummary(null, userId);
        initialCapital = Number(summary?.totalValue || summary?.cashBalance || 100000);
        if (initialCapital <= 0) initialCapital = 100000;
      } catch (e) {
        initialCapital = 100000;
      }
    } else {
      initialCapital = 100000;
    }

    if (slippagePercent < 0 || slippagePercent > 5) {
      throw new BadRequestError('Slippage percent must be between 0% and 5%');
    }

    if (commissionPercent < 0 || commissionPercent > 5) {
      throw new BadRequestError('Commission percent must be between 0% and 5%');
    }

    // Validate strategy parameters
    if (params.rsiPeriod !== undefined && (Number(params.rsiPeriod) <= 0 || Number(params.rsiPeriod) > 100)) {
      throw new BadRequestError('RSI period must be between 1 and 100');
    }
    if (params.fastEma !== undefined && (Number(params.fastEma) <= 0 || Number(params.fastEma) >= 200)) {
      throw new BadRequestError('Fast EMA period must be between 1 and 200');
    }
    if (params.slowEma !== undefined && (Number(params.slowEma) <= 0 || Number(params.slowEma) >= 500)) {
      throw new BadRequestError('Slow EMA period must be between 1 and 500');
    }

    // 2. Fetch Genuine Historical Market Candles
    const history = await marketDataService.getHistoricalPrices(cleanSymbol, { timeframe, interval: '1d' });
    const candles = history?.candles || [];

    if (!candles || candles.length < 15) {
      throw new BadRequestError(`Insufficient historical market data returned for symbol ${cleanSymbol} (found ${candles.length} candles)`);
    }

    // 3. Execute Vectorized Backtest
    const result = StrategyEngine.runBacktest({
      strategyId,
      candles,
      initialCapital,
      slippagePercent,
      commissionPercent,
      params,
    });

    const fullResult = {
      runId: `RUN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      strategyId,
      symbol: cleanSymbol,
      timeframe,
      meta: {
        dataStatus: history.dataStatus || 'HISTORICAL',
        dataSource: history.dataSource || 'yahoo',
        providerName: history.dataSource === 'yahoo' ? 'Yahoo Finance' : 'TwelveData',
        exchange: history.exchange || 'NSE',
        assetType: history.assetType || 'EQUITY',
        fetchedAt: new Date().toISOString(),
      },
      ...result,
    };

    // 4. Save User Isolation Backtest History
    if (userId) {
      const userRuns = this.savedRuns.get(userId) || [];
      userRuns.unshift({
        runId: fullResult.runId,
        strategyId: fullResult.strategyId,
        symbol: fullResult.symbol,
        totalReturnPercent: fullResult.summary.totalReturnPercent,
        sharpeRatio: fullResult.summary.sharpeRatio,
        maxDrawdownPercent: fullResult.summary.maxDrawdownPercent,
        winRatePercent: fullResult.summary.winRatePercent,
        executedAt: new Date().toISOString(),
      });
      if (userRuns.length > 20) userRuns.pop();
      this.savedRuns.set(userId, userRuns);
    }

    return fullResult;
  }

  async getUserHistory(userId) {
    if (!userId) return [];
    return this.savedRuns.get(userId) || [];
  }
}

export const strategyService = new StrategyService();
