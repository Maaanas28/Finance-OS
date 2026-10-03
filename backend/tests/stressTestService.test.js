/**
 * StressTestService Engine & Scenario Evaluation
 * P1.5: Uses real authenticated portfolios
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { stressTestService } from '../src/modules/risk/stressTest.service.js';
import { marketDataService } from '../src/infrastructure/market/marketDataService.js';
import { registerAndLogin, depositCash, buyStock } from './helpers/auth.js';

let testPortfolioId, testUserId;

describe('StressTestService Engine & Scenario Evaluation', () => {
  beforeAll(async () => {
    vi.spyOn(marketDataService, 'getQuote').mockImplementation(async (symbol, exchange) => {
      const prices = {
        'RELIANCE': 2980.50,
        'TCS': 4210.00,
        'HDFCBANK': 1650.25,
        'INFY': 1890.00,
        'TATAMOTORS': 985.50,
      };
      return {
        symbol,
        exchange: exchange || 'NSE',
        price: prices[symbol] || 1000,
        currency: 'INR',
        dataStatus: 'LIVE',
        dataSource: 'mock-test',
        sector: symbol === 'RELIANCE' ? 'Energy'
          : symbol === 'TCS' || symbol === 'INFY' ? 'Information Technology'
          : symbol === 'HDFCBANK' ? 'Financial Services'
          : symbol === 'TATAMOTORS' ? 'Automobile'
          : 'Other',
        fetchedAt: new Date().toISOString(),
      };
    });

    // P1.5: Create real user + portfolio with holdings
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

  it('should list all built-in macro and sector stress scenarios', async () => {
    const scenarios = await stressTestService.getScenarios();
    expect(Array.isArray(scenarios)).toBe(true);
    expect(scenarios.length).toBeGreaterThanOrEqual(8);

    const rbiHike = scenarios.find((s) => s.id === 'scenario-rbi-hike-100');
    expect(rbiHike).toBeDefined();
    expect(rbiHike.name).toContain('RBI Rate Hike');
    expect(rbiHike.category).toBe('MACRO');
  });

  it('should execute RBI Rate Hike (+100 bps) and compute position-level and portfolio P&L impact', async () => {
    const result = await stressTestService.executeStressTest(testPortfolioId, {
      scenarioId: 'scenario-rbi-hike-100',
    }, testUserId);

    expect(result).toHaveProperty('scenario');
    expect(result.scenario.name).toContain('RBI Rate Hike');
    expect(result).toHaveProperty('summary');
    expect(result.summary.currentPortfolioValue).toBeGreaterThan(0);
    expect(result.summary.postShockPortfolioValue).toBeGreaterThan(0);

    // Negative impact on equities under rate hike
    expect(result.summary.portfolioImpactAmount).toBeLessThan(0);
    expect(result.summary.portfolioImpactPercent).toBeLessThan(0);

    // Position impacts should be populated
    expect(result.positionImpacts.length).toBeGreaterThan(0);
    const hdfc = result.positionImpacts.find((p) => p.symbol === 'HDFCBANK');
    expect(hdfc).toBeDefined();
    expect(hdfc.shockPercent).toBeLessThan(0); // Financials hit
    expect(hdfc.pnlImpact).toBeLessThan(0);
    expect(hdfc.shockedValue).toBeLessThan(hdfc.currentValue);
  });

  it('should execute Technology Sector Correction (-15%) impacting tech holdings', async () => {
    const result = await stressTestService.executeStressTest(testPortfolioId, {
      scenarioId: 'scenario-tech-correction-15',
    }, testUserId);

    expect(result.summary.portfolioImpactAmount).toBeLessThan(0);
    const tcs = result.positionImpacts.find((p) => p.symbol === 'TCS');
    const infy = result.positionImpacts.find((p) => p.symbol === 'INFY');

    expect(tcs).toBeDefined();
    expect(infy).toBeDefined();
    // Both TCS and INFY are in IT sector, so get sector + market spillover shock
    expect(tcs.shockPercent).toBeLessThan(0);
    expect(infy.shockPercent).toBeLessThan(0);
  });

  it('should evaluate custom user-defined shock scenario', async () => {
    const customScenario = {
      name: 'Automotive Electric Vehicle Boom',
      description: 'Massive demand surge for EV makers',
      category: 'SECTOR',
      shocks: [
        { target: 'SECTOR', identifier: 'Automobile', shockPercent: 20.0 },
        { target: 'SYMBOL', identifier: 'RELIANCE', shockPercent: -5.0 },
      ],
    };

    const result = await stressTestService.executeStressTest(testPortfolioId, {
      customScenario,
    }, testUserId);

    expect(result.scenario.name).toBe('Automotive Electric Vehicle Boom');
    const tata = result.positionImpacts.find((p) => p.symbol === 'TATAMOTORS');
    expect(tata).toBeDefined();
    expect(tata.pnlImpact).toBeGreaterThan(0);

    const rel = result.positionImpacts.find((p) => p.symbol === 'RELIANCE');
    expect(rel).toBeDefined();
    expect(rel.shockPercent).toBe(-5.0);
    expect(rel.pnlImpact).toBeLessThan(0);
  });
});
