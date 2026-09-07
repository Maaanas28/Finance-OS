import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { marketDataService } from '../src/infrastructure/market/marketDataService.js';

describe('Risk API Integration Tests', () => {
  beforeAll(() => {
    vi.spyOn(marketDataService, 'getQuote').mockImplementation(async (symbol) => ({
      symbol,
      exchange: 'NSE',
      price: 1500,
      currency: 'INR',
      dataStatus: 'LIVE',
      dataSource: 'mock-test',
      timestamp: new Date().toISOString(),
    }));

    vi.spyOn(marketDataService, 'getHistoricalPrices').mockImplementation(async (symbol) => {
      const candles = [];
      const today = new Date();
      let price = 1500;
      for (let i = 252; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        price += Math.sin(i) * 10;
        candles.push({
          time: d.toISOString().split('T')[0],
          timestamp: d.toISOString(),
          open: price,
          high: price + 10,
          low: price - 10,
          close: price,
          volume: 100000,
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

  describe('GET /api/v1/risk/snapshot', () => {
    it('should return risk snapshot cards for command center', async () => {
      const res = await request(app).get('/api/v1/risk/snapshot?portfolioId=portfolio-model-alpha');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('volatility');
      expect(res.body.data).toHaveProperty('beta');
      expect(res.body.data).toHaveProperty('sharpe');
      expect(res.body.data).toHaveProperty('maxDrawdown');
      expect(res.body.data).toHaveProperty('var95');
      expect(res.body.data).toHaveProperty('cvar95');
    });
  });

  describe('GET /api/v1/risk/metrics', () => {
    it('should return detailed quantitative risk metrics', async () => {
      const res = await request(app).get('/api/v1/risk/metrics?portfolioId=portfolio-model-alpha&riskFreeRate=0.065');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('valueAtRisk');
      expect(res.body.data).toHaveProperty('drawdown');
      expect(res.body.data.summary).toHaveProperty('annualizedVolatility');
      expect(res.body.data.summary).toHaveProperty('beta');
      expect(res.body.data.summary).toHaveProperty('sharpe');
      expect(res.body.data.assumptions.riskFreeRate).toBe(0.065);
    });
  });

  describe('GET /api/v1/risk/correlation', () => {
    it('should return correlation matrix', async () => {
      const res = await request(app).get('/api/v1/risk/correlation?portfolioId=portfolio-model-alpha');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('symbols');
      expect(res.body.data).toHaveProperty('matrix');
      expect(Array.isArray(res.body.data.matrix)).toBe(true);
    });
  });

  describe('GET /api/v1/risk/contribution', () => {
    it('should return component risk contributions', async () => {
      const res = await request(app).get('/api/v1/risk/contribution?portfolioId=portfolio-model-alpha');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('positions');
      expect(Array.isArray(res.body.data.positions)).toBe(true);
    });
  });

  describe('GET /api/v1/risk/stress-scenarios', () => {
    it('should return available stress scenarios', async () => {
      const res = await request(app).get('/api/v1/risk/stress-scenarios');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/risk/stress-test', () => {
    it('should evaluate a stress test scenario', async () => {
      const res = await request(app)
        .post('/api/v1/risk/stress-test')
        .send({
          portfolioId: 'portfolio-model-alpha',
          scenarioId: 'scenario-rbi-hike-100',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('scenario');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('positionImpacts');
    });

    it('should reject invalid stress test parameters', async () => {
      const res = await request(app)
        .post('/api/v1/risk/stress-test')
        .send({
          customScenario: {
            name: '',
            shocks: [],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/risk/monte-carlo', () => {
    it('should run Monte Carlo simulation', async () => {
      const res = await request(app)
        .post('/api/v1/risk/monte-carlo')
        .send({
          portfolioId: 'portfolio-model-alpha',
          simulationCount: 200,
          horizonDays: 63,
          targetReturn: 0.10,
          seed: 42,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('parameters');
      expect(res.body.data).toHaveProperty('outcomes');
      expect(res.body.data).toHaveProperty('trajectoryPercentiles');
      expect(res.body.data).toHaveProperty('sampleTrajectories');
      expect(res.body.data).toHaveProperty('terminalHistogram');
    });

    it('should reject simulation with out-of-bounds horizon', async () => {
      const res = await request(app)
        .post('/api/v1/risk/monte-carlo')
        .send({
          horizonDays: 10000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
