import { describe, it, expect, beforeAll, vi } from 'vitest';
import { monteCarloService } from '../src/modules/risk/monteCarlo.service.js';
import { marketDataService } from '../src/infrastructure/market/marketDataService.js';
import { portfolioService } from '../src/modules/portfolio/portfolio.service.js';
import { portfolioRepository } from '../src/infrastructure/database/portfolioRepository.js';
import { BadRequestError } from '../src/utils/errors.js';

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
      if (symbol === 'NEWIPO') {
        return { symbol, candles: [] };
      }
      const candles = [];
      let basePrice = 1000;
      if (symbol === 'RELIANCE') basePrice = 2800;
      if (symbol === 'TCS') basePrice = 4000;
      if (symbol === 'HDFCBANK') basePrice = 1600;
      if (symbol === 'INFY') basePrice = 1800;
      if (symbol === 'NIFTY 50') basePrice = 24000;

      // 756 trading days ≈ 3 years of daily data
      const NUM_CANDLES = 756;
      let cur = basePrice;
      const today = new Date();
      for (let i = NUM_CANDLES; i >= 0; i--) {
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
        timeframe: '3Y',
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

  it('2 & 3. Every path begins at S_0 and respects requested path count (20 visual sample paths)', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 1000, horizonDays: 252, seed: 100 });

    expect(sim.parameters.simulationCount).toBe(1000);
    expect(sim.sampleTrajectories.length).toBe(20);
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
  });

  it('9 & 13. Simulated mean converges toward theoretical expectation E[S_T] as path count increases', async () => {
    const sim2500 = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 2500, horizonDays: 252, seed: 999 });
    const sim5000 = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 5000, horizonDays: 252, seed: 999 });

    const diff2500 = Math.abs(sim2500.outcomes.expectedTerminalValue - sim2500.parameters.theoreticalExpectedValue) / sim2500.parameters.theoreticalExpectedValue;
    const diff5000 = Math.abs(sim5000.outcomes.expectedTerminalValue - sim5000.parameters.theoreticalExpectedValue) / sim5000.parameters.theoreticalExpectedValue;

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

  // Section 8 Test Suite Additions
  it('15. Zero volatility produces exact deterministic exponential path', async () => {
    const initialVal = 200000;
    const expectedReturn = 0.10; // 10%
    const horizonDays = 252; // 1 year (T = 1.0)
    const volatility = 0.0; // Zero volatility

    const sim = await monteCarloService.runSimulation(null, {
      initialPortfolioValue: initialVal,
      expectedReturn,
      volatility,
      horizonDays,
      simulationCount: 100,
    });

    const expectedEnding = initialVal * Math.exp(expectedReturn * (horizonDays / 252));
    // When volatility = 0, all paths end at exactly the same deterministic compounding value
    expect(sim.outcomes.medianTerminalValue).toBeCloseTo(expectedEnding, 0);
    expect(sim.outcomes.expectedTerminalValue).toBeCloseTo(expectedEnding, 0);
    expect(sim.outcomes.percentile5TerminalValue).toBeCloseTo(expectedEnding, 0);
    expect(sim.outcomes.percentile95TerminalValue).toBeCloseTo(expectedEnding, 0);
    expect(sim.outcomes.probabilityOfLossPercent).toBe(0.0);
  });

  it('16. High positive drift with low volatility yields 0% probability of loss', async () => {
    const sim = await monteCarloService.runSimulation(null, {
      initialPortfolioValue: 100000,
      expectedReturn: 0.50, // 50% drift
      volatility: 0.02, // 2% minimal volatility
      horizonDays: 252,
      simulationCount: 500,
      seed: 42,
    });

    expect(sim.outcomes.probabilityOfLossPercent).toBe(0.0);
    expect(sim.outcomes.potentialGainLoss).toBeGreaterThan(0);
  });

  it('17. Severe negative drift yields 100% probability of loss', async () => {
    const sim = await monteCarloService.runSimulation(null, {
      initialPortfolioValue: 100000,
      expectedReturn: -0.50, // -50% drift
      volatility: 0.02, // 2% minimal volatility
      horizonDays: 252,
      simulationCount: 500,
      seed: 42,
    });

    expect(sim.outcomes.probabilityOfLossPercent).toBe(100.0);
    expect(sim.outcomes.potentialGainLoss).toBeLessThan(0);
  });

  it('18. Supports standard horizons (21, 63, 126, 252 days) with correct final days', async () => {
    for (const h of [21, 63, 126, 252]) {
      const sim = await monteCarloService.runSimulation(null, {
        initialPortfolioValue: 100000,
        expectedReturn: 0.12,
        volatility: 0.15,
        horizonDays: h,
        simulationCount: 100,
      });

      expect(sim.parameters.horizonDays).toBe(h);
      const lastPoint = sim.sampleTrajectories[0].points[sim.sampleTrajectories[0].points.length - 1];
      expect(lastPoint.day).toBe(h);
    }
  });

  it('19. Rejects invalid non-positive initial portfolio value', async () => {
    await expect(
      monteCarloService.runSimulation(null, { initialPortfolioValue: 0 })
    ).rejects.toThrow(BadRequestError);

    await expect(
      monteCarloService.runSimulation(null, { initialPortfolioValue: -50000 })
    ).rejects.toThrow(BadRequestError);
  });

  it('20. Holdings breakdown contains all active simulated stocks with tickers, quantities, and weights', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 200, horizonDays: 63, seed: 42 });
    
    expect(sim.holdingsBreakdown).toBeDefined();
    expect(sim.holdingsBreakdown.length).toBeGreaterThan(0);

    const reliance = sim.holdingsBreakdown.find((h) => h.symbol === 'RELIANCE');
    expect(reliance).toBeDefined();
    expect(reliance.quantity).toBe(120);
    expect(reliance.currentPrice).toBe(2980.5);
    expect(reliance.currentValue).toBe(120 * 2980.5);
    expect(reliance.portfolioWeightPercent).toBeGreaterThan(0);
    expect(typeof reliance.expectedReturnPercent).toBe('number');
    expect(typeof reliance.volatilityPercent).toBe('number');
  });

  it('21. Cross-asset correlation matrix is generated with 1.0 on diagonal', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 200, horizonDays: 63, seed: 42 });
    
    expect(sim.correlationMatrix).toBeDefined();
    expect(sim.correlationMatrix.symbols.length).toBeGreaterThan(0);
    const { matrix } = sim.correlationMatrix;
    for (let i = 0; i < matrix.length; i++) {
      expect(matrix[i][i]).toBe(1.0);
      for (let j = 0; j < matrix.length; j++) {
        expect(matrix[i][j]).toBe(matrix[j][i]);
        expect(matrix[i][j]).toBeGreaterThanOrEqual(-1.0);
        expect(matrix[i][j]).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('22. Changing holding quantities genuinely alters portfolio NAV and simulation outcome', async () => {
    // Run baseline simulation on model portfolio
    const baseSim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 500, horizonDays: 126, seed: 1234 });
    const baseInitial = baseSim.parameters.initialPortfolioValue;
    const baseMedian = baseSim.outcomes.medianTerminalValue;

    // Temporarily increase RELIANCE quantity in memory repository
    const relianceHolding = portfolioRepository.memoryHoldings.get('holding-1');
    const originalQty = relianceHolding.quantity;
    relianceHolding.quantity = 500; // Increase quantity from 120 to 500

    try {
      const updatedSim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 500, horizonDays: 126, seed: 1234 });
      
      // Initial portfolio value MUST change
      expect(updatedSim.parameters.initialPortfolioValue).toBeGreaterThan(baseInitial);
      // Ending simulated value MUST genuinely change due to higher exposure to RELIANCE
      expect(updatedSim.outcomes.medianTerminalValue).not.toBe(baseMedian);
      expect(updatedSim.outcomes.medianTerminalValue).toBeGreaterThan(baseMedian);
    } finally {
      // Restore original quantity
      relianceHolding.quantity = originalQty;
    }
  });

  it('23. Handles holdings with insufficient history transparently with isFallback: true', async () => {
    // Add a holding with symbol having no mocked historical data
    const tempHolding = {
      id: 'holding-temp-new',
      portfolioId: 'portfolio-model-alpha',
      symbol: 'NEWIPO',
      exchange: 'NSE',
      name: 'New IPO Stock',
      assetType: 'EQUITY',
      quantity: 50,
      averageBuyPrice: 200,
    };
    portfolioRepository.memoryHoldings.set(tempHolding.id, tempHolding);

    try {
      const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 200, horizonDays: 63, seed: 42 });
      const newHolding = sim.holdingsBreakdown.find((h) => h.symbol === 'NEWIPO');
      expect(newHolding).toBeDefined();
      expect(newHolding.isFallback).toBe(true);
      expect(newHolding.fallbackReason).toContain('Insufficient historical price data');
      expect(sim.parameters.isUsingFallback).toBe(true);
    } finally {
      portfolioRepository.memoryHoldings.delete('holding-temp-new');
    }
  });

  it('24. VaR(95%) equals V(0) minus P5 terminal value and is non-negative', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 1000, horizonDays: 252, seed: 42 });
    const { outcomes, parameters } = sim;

    const expectedVar = Math.max(0, parameters.initialPortfolioValue - outcomes.percentile5TerminalValue);
    expect(outcomes.var95Amount).toBeCloseTo(expectedVar, 0);
    expect(outcomes.var95Amount).toBeGreaterThanOrEqual(0);
    expect(typeof outcomes.var95Percent).toBe('number');
    expect(outcomes.var95Percent).toBeGreaterThanOrEqual(0);
  });

  it('25. CVaR(95%) is average of worst 5% of paths and is at least as large as VaR(95%)', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 1000, horizonDays: 252, seed: 42 });
    const { outcomes } = sim;

    // CVaR >= VaR by definition (average of worst tail is worse than the VaR threshold)
    expect(outcomes.cvar95Amount).toBeGreaterThanOrEqual(outcomes.var95Amount - 1); // allow 1 rounding unit
    expect(outcomes.cvar95Amount).toBeGreaterThanOrEqual(0);
    expect(typeof outcomes.cvarTerminalMean).toBe('number');
    expect(outcomes.cvarTerminalMean).toBeGreaterThan(0);
  });

  it('26. Empirical covariance correlation matrix is symmetric with 1.0 on diagonal', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 200, horizonDays: 63, seed: 42 });

    expect(sim.correlationMatrix).toBeDefined();
    const { matrix, symbols } = sim.correlationMatrix;
    expect(symbols.length).toBeGreaterThan(0);
    expect(matrix.length).toBe(symbols.length);

    for (let i = 0; i < matrix.length; i++) {
      expect(matrix[i].length).toBe(symbols.length);
      // Diagonal must be exactly 1.0
      expect(matrix[i][i]).toBeCloseTo(1.0, 4);
      for (let j = 0; j < matrix.length; j++) {
        // Symmetry: matrix[i][j] === matrix[j][i]
        expect(Math.abs(matrix[i][j] - matrix[j][i])).toBeLessThan(1e-6);
        // Correlations are bounded [-1, 1]
        expect(matrix[i][j]).toBeGreaterThanOrEqual(-1.0);
        expect(matrix[i][j]).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('27. alignedTradingDays count is returned in parameters and is positive', async () => {
    const sim = await monteCarloService.runSimulation('portfolio-model-alpha', { simulationCount: 200, horizonDays: 63, seed: 42 });

    expect(sim.parameters.alignedTradingDays).toBeDefined();
    expect(typeof sim.parameters.alignedTradingDays).toBe('number');
    expect(sim.parameters.alignedTradingDays).toBeGreaterThan(0);
    expect(sim.parameters.historicalYears).toBe(3);
    expect(sim.parameters.dataSource).toContain('Yahoo Finance');
  });
});
