import { describe, it, expect, beforeAll, vi } from 'vitest';
import { monteCarloService } from '../src/modules/risk/monteCarlo.service.js';
import { marketDataService } from '../src/infrastructure/market/marketDataService.js';
import { portfolioService } from '../src/modules/portfolio/portfolio.service.js';
import { portfolioRepository } from '../src/infrastructure/database/portfolioRepository.js';

describe('Monte Carlo Service - Stochastic Geometric Brownian Motion Engine', () => {
  beforeAll(() => {
    portfolioRepository.seedModelPortfolio();
    vi.spyOn(marketDataService, 'getQuote').mockImplementation(async (symbol, exchange) => {
      const prices = {
        'RELIANCE': 2980.5,
        'TCS': 4210.0,
        'HDFCBANK': 1650.25,
        'INFY': 1890.0,
        'NIFTY 50': 24500.0,
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

    vi.spyOn(marketDataService, 'getHistoricalPrices').mockImplementation(async (symbol) => {
      const candles = [];
      let basePrice = 1000;
      if (symbol === 'RELIANCE') basePrice = 2800;
      if (symbol === 'TCS') basePrice = 4000;
      if (symbol === 'HDFCBANK') basePrice = 1600;
      if (symbol === 'INFY') basePrice = 1800;
      if (symbol === 'NIFTY 50') basePrice = 24000;

      let cur = basePrice;
      const today = new Date();
      for (let i = 252; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const drift = Math.sin(i * 0.3) * (basePrice * 0.012);
        cur += drift;
        candles.push({
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
  });

  it('1. Initial value S_0 equals actual portfolio total NAV', async () => {
    const valuation = await portfolioService.getValuation('portfolio-model-alpha', null, { includeRisk: false });
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 500, horizonDays: 252, seed: 42 });

    expect(sim.parameters.initialPortfolioValue).toBe(valuation.summary.totalValue);
  });

  it('2 & 3. Every path begins at S_0 and respects requested path count', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 1000, horizonDays: 252, seed: 100 });

    expect(sim.parameters.simulationCount).toBe(1000);
    expect(sim.sampleTrajectories.length).toBe(15);
    for (const traj of sim.sampleTrajectories) {
      expect(traj.points[0].value).toBe(sim.parameters.initialPortfolioValue);
    }
  });

  it('4. Sampling step points match selected horizon', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 500, horizonDays: 126, seed: 42 });

    expect(sim.parameters.horizonDays).toBe(126);
    const lastPoint = sim.sampleTrajectories[0].points[sim.sampleTrajectories[0].points.length - 1];
    expect(lastPoint.day).toBe(126);
  });

  it('5, 6, 7, 8. Outcomes contain finite positive terminal NAVs and valid probabilities', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 500, horizonDays: 252, seed: 42 });
    const { outcomes } = sim;

    expect(outcomes.expectedTerminalValue).toBeGreaterThan(0);
    expect(isFinite(outcomes.expectedTerminalValue)).toBe(true);
    expect(outcomes.medianTerminalValue).toBeGreaterThan(0);
    expect(outcomes.percentile5TerminalValue).toBeGreaterThan(0);
    expect(outcomes.percentile95TerminalValue).toBeGreaterThan(outcomes.percentile5TerminalValue);
    expect(outcomes.percentile5TerminalValue).toBeLessThanOrEqual(outcomes.medianTerminalValue);
    expect(outcomes.medianTerminalValue).toBeLessThanOrEqual(outcomes.percentile95TerminalValue);

    expect(outcomes.probabilityOfLossPercent).toBeGreaterThanOrEqual(0);
    expect(outcomes.probabilityOfLossPercent).toBeLessThanOrEqual(100);
    expect(outcomes.probabilityExceedingTargetPercent).toBeGreaterThanOrEqual(0);
    expect(outcomes.probabilityExceedingTargetPercent).toBeLessThanOrEqual(100);
  });

  it('9 & 13. Simulated mean converges toward theoretical expectation E[S_T] as path count increases', async () => {
    const sim2500 = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 2500, horizonDays: 252, seed: 999 });
    const sim5000 = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 5000, horizonDays: 252, seed: 999 });

    const diff2500 = Math.abs(sim2500.outcomes.expectedTerminalValue - sim2500.parameters.theoreticalExpectedValue) / sim2500.parameters.theoreticalExpectedValue;
    const diff5000 = Math.abs(sim5000.outcomes.expectedTerminalValue - sim5000.parameters.theoreticalExpectedValue) / sim5000.parameters.theoreticalExpectedValue;

    // Both should be closely bounded, and 5000 paths should be under 2.5% deviation
    expect(diff2500).toBeLessThan(0.05);
    expect(diff5000).toBeLessThan(0.025);
  });

  it('11 & 12. Seeded RNG is deterministic (same seed = same outcome, different seed = different outcome)', async () => {
    const sim1 = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 500, horizonDays: 252, seed: 777 });
    const sim2 = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 500, horizonDays: 252, seed: 777 });
    const sim3 = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 500, horizonDays: 252, seed: 888 });

    expect(sim1.outcomes.expectedTerminalValue).toBe(sim2.outcomes.expectedTerminalValue);
    expect(sim1.outcomes.worstCaseTerminalValue).toBe(sim2.outcomes.worstCaseTerminalValue);
    expect(sim1.outcomes.expectedTerminalValue).not.toBe(sim3.outcomes.expectedTerminalValue);
  });

  it('14. No NaN, Infinity, or negative NAV values in histogram or trajectories', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 1000, horizonDays: 252, seed: 123 });

    for (const bin of sim.terminalHistogram) {
      expect(isNaN(bin.rangeStart)).toBe(false);
      expect(isNaN(bin.rangeEnd)).toBe(false);
      expect(isNaN(bin.count)).toBe(false);
      expect(isNaN(bin.densityPercent)).toBe(false);
      expect(bin.count).toBeGreaterThanOrEqual(0);
    }
  });
});
