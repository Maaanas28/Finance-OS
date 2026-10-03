import { describe, it, expect, beforeEach, vi } from 'vitest';
import { portfolioService } from '../src/modules/portfolio/portfolio.service.js';
import { portfolioRepository } from '../src/infrastructure/database/portfolioRepository.js';
import { marketDataService } from '../src/infrastructure/market/marketDataService.js';

describe('PortfolioService Engine & Financial Calculations', () => {
  beforeEach(() => {
    // Re-seed model alpha portfolio before tests
    portfolioRepository.seedModelPortfolio();

    vi.spyOn(marketDataService, 'getQuote').mockImplementation(async (symbol, exchange) => {
      const prices = {
        'RELIANCE': 3000,
        'TCS': 4200,
        'HDFCBANK': 755,
        'INFY': 1720,
        'TATAMOTORS': 820,
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
        timestamp: new Date().toISOString(),
      };
    });
  });

  it('should compute mark-to-market valuation, cost basis, and unrealized P&L', async () => {
    const valuation = await this?.valuation || await portfolioService.getValuation('portfolio-model-alpha');

    expect(valuation.portfolio.name).toBe('Institutional Alpha Model');
    expect(valuation.summary.totalValue).toBeGreaterThan(500000);
    expect(valuation.summary.investedAmount).toBeGreaterThan(0);
    expect(valuation.summary.cashBalance).toBe(85400);

    // Verify holding fields
    const reliance = valuation.holdings.find((h) => h.symbol === 'RELIANCE');
    expect(reliance).toBeDefined();
    expect(reliance.quantity).toBe(120);
    expect(reliance.averageBuyPrice).toBe(2450.0);
    expect(reliance.costBasis).toBe(120 * 2450.0);
    expect(reliance.currentValue).toBe(reliance.quantity * reliance.ltp);
    expect(reliance.totalPnl).toBe(reliance.currentValue - reliance.costBasis);
    expect(reliance.allocationPercent).toBeGreaterThan(0);
  });

  it('should calculate sector concentration and flag allocations above 30%', async () => {
    const allocations = await portfolioService.getAllocations('portfolio-model-alpha');

    expect(allocations.sectors.length).toBeGreaterThan(0);
    const techSector = allocations.sectors.find((s) => s.name === 'Information Technology' || s.name === 'Technology');
    expect(techSector).toBeDefined();
    // TCS + INFY make up > 30% of portfolio
    expect(techSector.percent).toBeGreaterThan(30);
    expect(techSector.isElevatedRisk).toBe(true);
    expect(allocations.hasConcentrationRisk).toBe(true);
  });

  it('should execute BUY transaction, update weighted average buy price, and deduct cash', async () => {
    const initialValuation = await portfolioService.getValuation('portfolio-model-alpha');
    const initialCash = initialValuation.summary.cashBalance;

    // BUY 10 shares of RELIANCE at ₹3,000 (total trade cost ₹30,000 + ₹15 fee = ₹30,015)
    const res = await portfolioService.executeTransaction({
      portfolioId: 'portfolio-model-alpha',
      type: 'BUY',
      symbol: 'RELIANCE',
      exchange: 'NSE',
      quantity: 10,
      price: 3000,
      fees: 15,
    });

    expect(res.success).toBe(true);
    expect(res.transaction.type).toBe('BUY');
    expect(res.transaction.amount).toBe(30020);

    const updatedValuation = await portfolioService.getValuation('portfolio-model-alpha');
    // Cash should decrease by ₹30,020
    expect(updatedValuation.summary.cashBalance).toBe(Math.round((initialCash - 30020) * 100) / 100);

    // Quantity should increase from 120 to 130
    const reliance = updatedValuation.holdings.find((h) => h.symbol === 'RELIANCE');
    expect(reliance.quantity).toBe(130);

    // Weighted average buy price: ((120 * 2450) + (10 * 3000)) / 130 = (294000 + 30000) / 130 = 2492.31
    expect(reliance.averageBuyPrice).toBe(2492.31);
  });

  it('should reject BUY transaction when cash balance is insufficient', async () => {
    // Attempt to buy ₹500,000 worth when cash balance is only ₹85,400
    await expect(
      portfolioService.executeTransaction({
        portfolioId: 'portfolio-model-alpha',
        type: 'BUY',
        symbol: 'TCS',
        quantity: 100,
        price: 5000,
      })
    ).rejects.toThrow('Insufficient cash balance');
  });

  it('should execute SELL transaction, credit cash, and calculate realized P&L', async () => {
    const initialValuation = await portfolioService.getValuation('portfolio-model-alpha');
    const initialCash = initialValuation.summary.cashBalance;

    // SELL 20 shares of TCS at ₹4,200 (averageBuyPrice was ₹3,500)
    // Gross: 20 * 4200 = 84,000. Fees: 20. Net proceeds: 83,980
    // Cost basis: 20 * 3500 = 70,000. Realized P&L: 83,980 - 70,000 = +₹13,980
    const res = await portfolioService.executeTransaction({
      portfolioId: 'portfolio-model-alpha',
      type: 'SELL',
      symbol: 'TCS',
      exchange: 'NSE',
      quantity: 20,
      price: 4200,
      fees: 42,
    });

    expect(res.success).toBe(true);
    expect(res.transaction.type).toBe('SELL');
    expect(res.transaction.notes).toContain('Realized P&L: +₹13980');

    const updatedValuation = await portfolioService.getValuation('portfolio-model-alpha');
    // Cash should increase by net proceeds
    expect(updatedValuation.summary.cashBalance).toBe(Math.round((initialCash + 83980) * 100) / 100);

    // TCS quantity should decrease from 60 to 40
    const tcs = updatedValuation.holdings.find((h) => h.symbol === 'TCS');
    expect(tcs.quantity).toBe(40);
  });

  it('should prevent overselling more shares than held', async () => {
    // Attempt to sell 500 shares of TCS when only 60 are held
    await expect(
      portfolioService.executeTransaction({
        portfolioId: 'portfolio-model-alpha',
        type: 'SELL',
        symbol: 'TCS',
        quantity: 500,
        price: 4000,
      })
    ).rejects.toThrow('Cannot SELL');
  });

  it('should handle CASH DEPOSIT and WITHDRAWAL accounting', async () => {
    const initialValuation = await portfolioService.getValuation('portfolio-model-alpha');
    const initialCash = initialValuation.summary.cashBalance;

    // DEPOSIT ₹50,000
    await portfolioService.executeTransaction({
      portfolioId: 'portfolio-model-alpha',
      type: 'DEPOSIT',
      amount: 50000,
    });

    let val = await portfolioService.getValuation('portfolio-model-alpha');
    expect(val.summary.cashBalance).toBe(initialCash + 50000);

    // WITHDRAWAL ₹20,000
    await portfolioService.executeTransaction({
      portfolioId: 'portfolio-model-alpha',
      type: 'WITHDRAWAL',
      amount: 20000,
    });

    val = await portfolioService.getValuation('portfolio-model-alpha');
    expect(val.summary.cashBalance).toBe(initialCash + 30000);

    // Reject overdraft withdrawal
    await expect(
      portfolioService.executeTransaction({
        portfolioId: 'portfolio-model-alpha',
        type: 'WITHDRAWAL',
        amount: 1000000,
      })
    ).rejects.toThrow('Insufficient cash balance');
  });
});
