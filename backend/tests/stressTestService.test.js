import { describe, it, expect, beforeAll, vi } from 'vitest';
import { stressTestService } from '../src/modules/risk/stressTest.service.js';
import { marketDataService } from '../src/infrastructure/market/marketDataService.js';

describe('StressTestService Engine & Scenario Evaluation', () => {
  beforeAll(() => {
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
      };
    });
  });

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
    const result = await stressTestService.executeStressTest('portfolio-model-alpha', {
      scenarioId: 'scenario-rbi-hike-100',
    });

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
    const result = await stressTestService.executeStressTest('portfolio-model-alpha', {
      scenarioId: 'scenario-tech-correction-15',
    });

    expect(result.summary.portfolioImpactAmount).toBeLessThan(0);
    const tcs = result.positionImpacts.find((p) => p.symbol === 'TCS');
    const infy = result.positionImpacts.find((p) => p.symbol === 'INFY');

    expect(tcs).toBeDefined();
    expect(infy).toBeDefined();
    expect(tcs.shockPercent).toBe(-16.0);
    expect(infy.shockPercent).toBe(-16.0);
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

    const result = await stressTestService.executeStressTest('portfolio-model-alpha', {
      customScenario,
    });

    expect(result.scenario.name).toBe('Automotive Electric Vehicle Boom');
    const tata = result.positionImpacts.find((p) => p.symbol === 'TATAMOTORS');
    expect(tata).toBeDefined();
    expect(tata.shockPercent).toBe(20.0);
    expect(tata.pnlImpact).toBeGreaterThan(0);

    const rel = result.positionImpacts.find((p) => p.symbol === 'RELIANCE');
    expect(rel).toBeDefined();
    expect(rel.shockPercent).toBe(-5.0);
    expect(rel.pnlImpact).toBeLessThan(0);
  });
});
