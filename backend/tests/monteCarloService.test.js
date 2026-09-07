import { describe, it, expect, beforeAll, vi } from 'vitest';
import { monteCarloService } from '../src/modules/risk/monteCarlo.service.js';
import { riskService } from '../src/modules/risk/risk.service.js';

describe('MonteCarloService Engine & Stochastic Simulation', () => {
  beforeAll(() => {
    // Mock riskService.getSynchronizedReturns for deterministic, fast testing
    vi.spyOn(riskService, 'getSynchronizedReturns').mockImplementation(async () => {
      const dates = [];
      const today = new Date();
      const pReturns = [];

      for (let i = 252; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        dates.push(d.toISOString().split('T')[0]);
      }

      for (let t = 0; t < 252; t++) {
        // Daily drift around 0.05% with ~1% daily volatility
        const r = 0.0005 + Math.sin(t * 0.2) * 0.008;
        pReturns.push({ date: dates[t + 1], return: r });
      }

      return {
        valuation: {
          portfolio: { id: 'portfolio-model-alpha', name: 'Alpha Model' },
          summary: { totalValue: 750000, equityValue: 665000, cashBalance: 85000 },
          holdings: [],
        },
        portfolioDailyReturns: pReturns,
        dataStatus: 'EOD',
      };
    });
  });

  it('should run Monte Carlo simulation and compute percentile envelopes across time steps', async () => {
    const res = await monteCarloService.runSimulation('portfolio-model-alpha', {
      simulationCount: 500,
      horizonDays: 252,
      targetReturn: 0.12,
      seed: 42,
    });

    expect(res).toHaveProperty('parameters');
    expect(res.parameters.simulationCount).toBe(500);
    expect(res.parameters.horizonDays).toBe(252);
    expect(res.parameters.isDeterministicSeed).toBe(true);

    expect(res).toHaveProperty('outcomes');
    expect(res.outcomes.expectedTerminalValue).toBeGreaterThan(0);
    expect(res.outcomes.medianTerminalValue).toBeGreaterThan(0);
    expect(res.outcomes.worstCaseTerminalValue).toBeLessThanOrEqual(res.outcomes.medianTerminalValue);
    expect(res.outcomes.bestCaseTerminalValue).toBeGreaterThanOrEqual(res.outcomes.medianTerminalValue);

    // Probability of loss & hurdle rate within [0, 100]%
    expect(res.outcomes.probabilityOfLossPercent).toBeGreaterThanOrEqual(0);
    expect(res.outcomes.probabilityOfLossPercent).toBeLessThanOrEqual(100);
    expect(res.outcomes.probabilityExceedingTargetPercent).toBeGreaterThanOrEqual(0);
    expect(res.outcomes.probabilityExceedingTargetPercent).toBeLessThanOrEqual(100);

    // Trajectory Percentiles check
    expect(res.trajectoryPercentiles.length).toBeGreaterThan(0);
    const midStep = res.trajectoryPercentiles[Math.floor(res.trajectoryPercentiles.length / 2)];
    expect(midStep.p5).toBeLessThanOrEqual(midStep.p25);
    expect(midStep.p25).toBeLessThanOrEqual(midStep.p50);
    expect(midStep.p50).toBeLessThanOrEqual(midStep.p75);
    expect(midStep.p75).toBeLessThanOrEqual(midStep.p95);

    // Sample paths check
    expect(res.sampleTrajectories.length).toBeGreaterThan(0);
    expect(res.sampleTrajectories.length).toBeLessThanOrEqual(20);

    // Histogram check
    expect(res.terminalHistogram.length).toBe(15);
  });

  it('should produce identical results when given identical random seed', async () => {
    const runA = await monteCarloService.runSimulation('portfolio-model-alpha', {
      simulationCount: 200,
      horizonDays: 126,
      seed: 9999,
    });

    const runB = await monteCarloService.runSimulation('portfolio-model-alpha', {
      simulationCount: 200,
      horizonDays: 126,
      seed: 9999,
    });

    expect(runA.outcomes.expectedTerminalValue).toBe(runB.outcomes.expectedTerminalValue);
    expect(runA.outcomes.medianTerminalValue).toBe(runB.outcomes.medianTerminalValue);
    expect(runA.outcomes.probabilityOfLossPercent).toBe(runB.outcomes.probabilityOfLossPercent);
  });
});
