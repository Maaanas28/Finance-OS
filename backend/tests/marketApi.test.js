import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Market API Endpoints (/api/v1/market)', () => {
  it('GET /api/v1/market/quote/:symbol - should return normalized quote', async () => {
    const res = await request(app).get('/api/v1/market/quote/RELIANCE');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.symbol).toBe('RELIANCE');
    expect(res.body.data.price).toBeGreaterThan(0);
    expect(res.body.data.dataSource).toBeDefined();
    expect(res.body.data.dataStatus).toBeDefined();
    expect(res.body.data.currency).toBe('INR');
  });

  it('GET /api/v1/market/quote/:symbol - should support US stocks like AAPL', async () => {
    const res = await request(app).get('/api/v1/market/quote/AAPL');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.symbol).toBe('AAPL');
    expect(res.body.data.currency).toBe('USD');
  });

  it('GET /api/v1/market/history/:symbol - should return normalized OHLCV candles', async () => {
    const res = await request(app).get('/api/v1/market/history/NIFTY%2050?timeframe=1M');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.symbol).toBe('NIFTY 50');
    expect(res.body.data.candles).toBeInstanceOf(Array);
    expect(res.body.data.candles.length).toBeGreaterThan(0);
    expect(res.body.data.candles[0].open).toBeDefined();
    expect(res.body.data.candles[0].close).toBeDefined();
  });

  it('GET /api/v1/market/movers - should return gainers and losers with status', async () => {
    const res = await request(app).get('/api/v1/market/movers');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.gainers).toBeInstanceOf(Array);
    expect(res.body.data.losers).toBeInstanceOf(Array);
    expect(res.body.data.dataSource).toBeDefined();
    expect(res.body.data.dataStatus).toBeDefined();
  });

  it('GET /api/v1/market/status - should return global venue states', async () => {
    const res = await request(app).get('/api/v1/market/status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.venues.NSE).toBeDefined();
    expect(res.body.data.venues.NYSE).toBeDefined();
  });

  it('GET /api/v1/market/health - should return quota and provider statuses without leaking secrets', async () => {
    const res = await request(app).get('/api/v1/market/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.providers.mock).toBeDefined();

    const text = JSON.stringify(res.body);
    expect(text).not.toContain('BHARATSTOCK_API_KEY');
    expect(text).not.toContain('TWELVE_DATA_API_KEY');
  });

  it('GET /api/v1/market/search - should return search hits', async () => {
    const res = await request(app).get('/api/v1/market/search?q=REL');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results.length).toBeGreaterThan(0);
  });
});
