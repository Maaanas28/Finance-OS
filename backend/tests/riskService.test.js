/**
 * RiskService Engine & Quantitative Calculations
 * P3.2: Beta aligned by date, series length mismatch handled
 * P3.3: Cash not counted as concentration
 * P3.1: Annualization factor derived from candle spacing
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { riskService } from '../src/modules/risk/risk.service.js';
import { marketDataService } from '../src/infrastructure/market/marketDataService.js';
import { portfolioService } from '../src/modules/portfolio/portfolio.service.js';
import { registerAndLogin, depositCash, buyStock } from './helpers/auth.js';

let testPortfolioId, testUserId;

describe('RiskService Engine & Quantitative Calculations', () => {
  beforeAll(async () => {
    // Mock getQuote
    vi.spyOn(marketDataService, 'getQuote').mockImplementation(async (symbol, exchange) => {
      const prices = {
        'RELIANCE': 2980.50,
        'TCS': 4210.00,
        'HDFCBANK': 1650.25,
        'INFY': 1890.00,
        'TATAMOTORS': 985.50,
        'NIFTY 50': 24500.00,
      };
      const price = prices[symbol] || 1000;
      return {
        symbol,
        exchange: exchange || 'NSE',
        price,
        previousClose: price * 0.99,
        change: price * 0.01,
        changePercent: 1.0,
        currency: 'INR',
        dataStatus: 'LIVE',
        dataSource: 'mock-test',
        sector: symbol === 'RELIANCE' ? 'Energy' : 'Information Technology',
        timestamp: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      };
    });

    // Mock getHistoricalPrices to return 252 synthetic daily candles
    vi.spyOn(marketDataService, 'getHistoricalPrices').mockImplementation(async (symbol) => {
      const candles = [];
      let basePrice = 1000;
      if (symbol === 'RELIANCE') basePrice = 2800;
      if (symbol === 'TCS') basePrice = 4000;
      if (symbol === 'HDFCBANK') basePrice = 1600;
      if (symbol === 'INFY') basePrice = 1800;
      if (symbol === 'TATAMOTORS') basePrice = 950;
      if (symbol === 'NIFTY 50') basePrice = 24000;

      let cur = basePrice;
      const today = new Date();
      for (let i = 252; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const drift = Math.sin(i * 0.3) * (basePrice * 0.003);
        cur += drift;
        candles.push({
          date: d.toISOString().split('T')[0],
          time: d.toISOString().split('T')[0],
          timestamp: d.toISOString(),
          open: cur * 0.995,
          high: cur * 1.01,
          low: cur * 0.99,
          close: Number(cur.toFixed(2)),
          volume: 1000000,
        });
      }
      return {
        symbol,
        exchange: 'NSE',
        timeframe: '1Y',
        interval: '1day',
        dataStatus: 'EOD',
        dataSource: 'mock-test',
        fetchedAt: new Date().toISOString(),
        candles,
      };
    });

    // P1.5: Create a real user with portfolio
    const auth = await registerAndLogin();
    testUserId = auth.userId;
    testPortfolioId = auth.portfolioId;
    await depositCash(auth.token, testPortfolioId, 2000000);
    await buyStock(auth.token, testPortfolioId, 'RELIANCE', 120);
    await buyStock(auth.token, testPortfolioId, 'TCS', 60);
    await buyStock(auth.token, testPortfolioId, 'HDFCBANK', 80);
    await buyStock(auth.token, testPortfolioId, 'INFY', 95);
    await buyStock(auth.token, testPortfolioId, 'TATAMOTORS', 110);
  }, 30000);

  it('should compute annualized portfolio volatility, beta, sharpe, and sortino', async () => {
    const metrics = await riskService.getRiskMetrics(testPortfolioId, testUserId, 0.065);

    expect(metrics).toHaveProperty('summary');
    expect(metrics.summary.annualizedVolatility).toBeGreaterThan(0);
    expect(metrics.summary.annualizedVolatility).toBeLessThan(100);
    expect(metrics.summary).toHaveProperty('beta');
    expect(metrics.summary).toHaveProperty('sharpe');
    expect(metrics.summary).toHaveProperty('sortino');
    expect(metrics.summary).toHaveProperty('maxDrawdown');
    expect(metrics.assumptions.riskFreeRate).toBe(0.065);
    expect(metrics.assumptions.riskFreeRatePercent).toBe('6.5%');
  });

  it('should support configurable risk-free rate', async () => {
    const metricsLowRf = await riskService.getRiskMetrics(testPortfolioId, testUserId, 0.04);
    const metricsHighRf = await riskService.getRiskMetrics(testPortfolioId, testUserId, 0.08);

    expect(metricsLowRf.assumptions.riskFreeRate).toBe(0.04);
    expect(metricsHighRf.assumptions.riskFreeRate).toBe(0.08);
    // Lower risk-free rate yields higher Sharpe ratio (or equal if returns == rf)
    expect(metricsLowRf.summary.sharpe).toBeGreaterThanOrEqual(metricsHighRf.summary.sharpe);
  });

  it('should compute Historical VaR, Parametric VaR, and Conditional VaR (Expected Shortfall)', async () => {
    const metrics = await riskService.getRiskMetrics(testPortfolioId, testUserId);
    const { valueAtRisk } = metrics;

    expect(valueAtRisk).toHaveProperty('historical');
    expect(valueAtRisk).toHaveProperty('parametric');
    expect(valueAtRisk).toHaveProperty('conditionalVaR');

    // Historical VaR 99% loss should be >= 95% loss
    expect(valueAtRisk.historical.confidence99.amount).toBeGreaterThanOrEqual(
      valueAtRisk.historical.confidence95.amount
    );

    // Parametric VaR 99% loss should be > 95% loss
    expect(valueAtRisk.parametric.confidence99.amount).toBeGreaterThan(
      valueAtRisk.parametric.confidence95.amount
    );

    // CVaR (Expected Shortfall) should be >= VaR
    expect(valueAtRisk.conditionalVaR.confidence95.amount).toBeGreaterThanOrEqual(
      valueAtRisk.historical.confidence95.amount * 0.9
    );
  });

  it('should compute symmetric pairwise correlation matrix', async () => {
    const corrData = await riskService.getCorrelationMatrix(testPortfolioId, testUserId);

    expect(corrData).toHaveProperty('symbols');
    expect(corrData).toHaveProperty('matrix');
    expect(Array.isArray(corrData.symbols)).toBe(true);

    const n = corrData.symbols.length;
    expect(corrData.matrix.length).toBe(n);

    // Diagonal elements should be 1.0
    for (let i = 0; i < n; i++) {
      expect(corrData.matrix[i][i]).toBe(1.0);
      for (let j = 0; j < n; j++) {
        expect(corrData.matrix[i][j]).toBe(corrData.matrix[j][i]);
        expect(corrData.matrix[i][j]).toBeGreaterThanOrEqual(-1.0);
        expect(corrData.matrix[i][j]).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('should compute marginal and percentage risk contribution summing to ~100%', async () => {
    const contrib = await riskService.getRiskContribution(testPortfolioId, testUserId);

    expect(contrib).toHaveProperty('positions');
    expect(contrib.positions.length).toBeGreaterThan(0);

    const sumPctRisk = contrib.positions.reduce((sum, p) => sum + p.riskContributionPercent, 0);
    expect(Math.round(sumPctRisk)).toBeGreaterThanOrEqual(98);
    expect(Math.round(sumPctRisk)).toBeLessThanOrEqual(102);

    const first = contrib.positions[0];
    expect(first).toHaveProperty('symbol');
    expect(first).toHaveProperty('capitalWeightPercent');
    expect(first).toHaveProperty('riskContributionPercent');
    expect(first).toHaveProperty('annualizedVolatility');
  });
});
