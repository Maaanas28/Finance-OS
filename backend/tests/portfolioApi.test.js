import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { marketDataService } from '../src/infrastructure/market/marketDataService.js';

describe('Portfolio API Integration Tests', () => {
  beforeAll(() => {
    // Mock getQuote to prevent external network calls and quota burn
    vi.spyOn(marketDataService, 'getQuote').mockImplementation(async (symbol, exchange) => {
      const prices = {
        'RELIANCE': 2980.50,
        'TCS': 4210.00,
        'HDFCBANK': 1650.25,
        'INFY': 1890.00,
        'TATAMOTORS': 985.50,
        'ITC': 460.00,
      };
      const price = prices[symbol] || 1000.00;
      return {
        symbol,
        exchange: exchange || 'NSE',
        price,
        previousClose: price * 0.98,
        change: price * 0.02,
        changePercent: 2.0,
        currency: 'INR',
        dataStatus: 'LIVE',
        dataSource: 'mock-test',
        timestamp: new Date().toISOString(),
      };
    });
  });

  describe('GET /api/v1/portfolio/list', () => {
    it('should return available portfolios', async () => {
      const res = await request(app).get('/api/v1/portfolio/list');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/portfolio/summary', () => {
    it('should return computed portfolio summary with mark-to-market totals', async () => {
      const res = await request(app).get('/api/v1/portfolio/summary?portfolioId=portfolio-model-alpha');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalValue');
      expect(res.body.data).toHaveProperty('cashBalance');
      expect(res.body.data).toHaveProperty('investedAmount');
      expect(res.body.data).toHaveProperty('totalReturn');
      expect(res.body.data).toHaveProperty('todayPnl');
      expect(res.body.data.totalValue).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/portfolio/holdings', () => {
    it('should return enriched holdings with current mark-to-market valuations', async () => {
      const res = await request(app).get('/api/v1/portfolio/holdings?portfolioId=portfolio-model-alpha');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const firstHolding = res.body.data[0];
      expect(firstHolding).toHaveProperty('symbol');
      expect(firstHolding).toHaveProperty('ltp');
      expect(firstHolding).toHaveProperty('currentValue');
      expect(firstHolding).toHaveProperty('totalPnl');
      expect(firstHolding).toHaveProperty('totalPnlPercent');
      expect(firstHolding).toHaveProperty('allocationPercent');
    });
  });

  describe('GET /api/v1/portfolio/allocations', () => {
    it('should return sector and asset allocations with risk alerts', async () => {
      const res = await request(app).get('/api/v1/portfolio/allocations?portfolioId=portfolio-model-alpha');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('sectors');
      expect(res.body.data).toHaveProperty('assetClasses');
      expect(res.body.data).toHaveProperty('hasConcentrationRisk');
      expect(Array.isArray(res.body.data.sectors)).toBe(true);
    });
  });

  describe('POST /api/v1/portfolio/transactions', () => {
    it('should validate and reject trade with invalid parameters', async () => {
      const res = await request(app)
        .post('/api/v1/portfolio/transactions')
        .send({
          portfolioId: 'portfolio-model-alpha',
          type: 'INVALID_TYPE',
          quantity: -5,
          price: 100
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should execute a valid BUY transaction and update portfolio ledger', async () => {
      const res = await request(app)
        .post('/api/v1/portfolio/transactions')
        .send({
          portfolioId: 'portfolio-model-alpha',
          type: 'BUY',
          symbol: 'ITC',
          exchange: 'NSE',
          assetClass: 'EQUITY',
          quantity: 20,
          price: 450.00,
          fees: 15.00,
          notes: 'Tactical FMCG allocation'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('transaction');
      expect(res.body.data.transaction.type).toBe('BUY');
      expect(res.body.data.transaction.symbol).toBe('ITC');
      expect(res.body.data.transaction.quantity).toBe(20);
    });

    it('should reject overselling holding not held in portfolio', async () => {
      const res = await request(app)
        .post('/api/v1/portfolio/transactions')
        .send({
          portfolioId: 'portfolio-model-alpha',
          type: 'SELL',
          symbol: 'NONEXISTENT',
          exchange: 'NSE',
          quantity: 10,
          price: 500
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot SELL');
    });

    it('should handle cash DEPOSIT', async () => {
      const res = await request(app)
        .post('/api/v1/portfolio/transactions')
        .send({
          portfolioId: 'portfolio-model-alpha',
          type: 'DEPOSIT',
          amount: 50000,
          notes: 'Client capital infusion'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.type).toBe('DEPOSIT');
      expect(res.body.data.transaction.amount).toBe(50000);
    });
  });

  describe('GET /api/v1/portfolio/transactions', () => {
    it('should retrieve full transaction audit history', async () => {
      const res = await request(app).get('/api/v1/portfolio/transactions?portfolioId=portfolio-model-alpha');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('type');
      expect(res.body.data[0]).toHaveProperty('executedAt');
    });
  });

  describe('GET /api/v1/portfolio/performance', () => {
    it('should return benchmark comparison and performance metrics', async () => {
      const res = await request(app).get('/api/v1/portfolio/performance?portfolioId=portfolio-model-alpha&timeframe=1M');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('currentValuation');
      expect(res.body.data).toHaveProperty('benchmark');
      expect(res.body.data).toHaveProperty('performance');
      expect(Array.isArray(res.body.data.performance)).toBe(true);
    });
  });
});
