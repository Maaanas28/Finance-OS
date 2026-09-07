import { describe, it, expect } from 'vitest';
import { BharatStockProvider } from '../src/infrastructure/providers/BharatStockProvider.js';
import { TwelveDataProvider } from '../src/infrastructure/providers/TwelveDataProvider.js';
import { MockMarketDataProvider } from '../src/infrastructure/providers/MockMarketDataProvider.js';

describe('Market Data Providers (Zero API Quota Unit Tests)', () => {
  describe('BharatStockProvider Normalization', () => {
    const provider = new BharatStockProvider('fake-key');

    it('should correctly normalize valid BharatStock quote payload', () => {
      const mockRaw = {
        data: {
          symbol: 'RELIANCE',
          companyName: 'Reliance Industries',
          price: 2980.5,
          open: 2920.0,
          high: 2995.0,
          low: 2915.0,
          previousClose: 2896.2,
          change: 84.3,
          changePercent: 2.91,
          volume: 4850000,
          isLive: false,
          timestamp: '2026-09-05T10:00:00Z',
        },
      };

      const normalizedInfo = { symbol: 'RELIANCE', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' };
      const res = provider.normalizeQuote(mockRaw, normalizedInfo);

      expect(res.symbol).toBe('RELIANCE');
      expect(res.price).toBe(2980.5);
      expect(res.change).toBe(84.3);
      expect(res.changePercent).toBe(2.91);
      expect(res.volume).toBe(4850000);
      expect(res.dataSource).toBe('bharatstock');
      expect(res.dataStatus).toBe('LIVE');
      expect(res.currency).toBe('INR');
      expect(res.fetchedAt).toBeDefined();
    });

    it('should handle missing change or percent by computing them from previousClose', () => {
      const mockRaw = {
        price: 1500,
        previousClose: 1400,
      };

      const normalizedInfo = { symbol: 'INFY', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' };
      const res = provider.normalizeQuote(mockRaw, normalizedInfo);

      expect(res.change).toBe(100);
      expect(res.changePercent).toBe(7.14);
      expect(res.volume).toBeNull();
    });

    it('should throw when payload is null or malformed', () => {
      expect(() => provider.normalizeQuote(null, { symbol: 'TCS' })).toThrow();
    });
  });

  describe('TwelveDataProvider Normalization', () => {
    const provider = new TwelveDataProvider('fake-key');

    it('should correctly normalize valid Twelve Data quote payload', () => {
      const mockRaw = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        currency: 'USD',
        datetime: '2026-09-05 16:00:00',
        open: '230.10',
        high: '233.80',
        low: '229.70',
        close: '232.50',
        volume: '45200000',
        previous_close: '230.20',
        change: '2.30',
        percent_change: '1.00',
        is_market_open: false,
      };

      const normalizedInfo = { symbol: 'AAPL', exchange: 'NASDAQ', assetType: 'EQUITY', currency: 'USD' };
      const res = provider.normalizeQuote(mockRaw, normalizedInfo);

      expect(res.symbol).toBe('AAPL');
      expect(res.price).toBe(232.5);
      expect(res.open).toBe(230.1);
      expect(res.high).toBe(233.8);
      expect(res.change).toBe(2.3);
      expect(res.changePercent).toBe(1.0);
      expect(res.volume).toBe(45200000);
      expect(res.dataSource).toBe('twelve-data');
      expect(res.dataStatus).toBe('EOD');
    });

    it('should identify crypto and forex quotes correctly', () => {
      const mockFxRaw = {
        symbol: 'USD/INR',
        name: 'US Dollar / Indian Rupee',
        exchange: 'FOREX',
        currency: 'INR',
        datetime: '2026-09-05 16:00:00',
        close: '83.98',
        is_market_open: true,
      };

      const normalizedInfo = { symbol: 'USD/INR', exchange: 'FOREX', assetType: 'FOREX', currency: 'INR' };
      const res = provider.normalizeQuote(mockFxRaw, normalizedInfo);

      expect(res.symbol).toBe('USD/INR');
      expect(res.price).toBe(83.98);
      expect(res.assetType).toBe('FOREX');
      expect(res.dataStatus).toBe('LIVE');
    });
  });

  describe('MockMarketDataProvider', () => {
    const mock = new MockMarketDataProvider();

    it('should always return simulated quotes with SIMULATED dataStatus', async () => {
      const res = await mock.getQuote({ symbol: 'RELIANCE', exchange: 'NSE' });

      expect(res.symbol).toBe('RELIANCE');
      expect(res.price).toBeGreaterThan(0);
      expect(res.dataStatus).toBe('SIMULATED');
      expect(res.dataSource).toBe('mock');
    });

    it('should return simulated historical OHLCV data', async () => {
      const history = await mock.getHistoricalPrices({ symbol: 'NIFTY 50', exchange: 'NSE' }, { timeframe: '1M' });

      expect(history.symbol).toBe('NIFTY 50');
      expect(history.dataStatus).toBe('SIMULATED');
      expect(history.candles.length).toBeGreaterThan(10);
      expect(history.candles[0].open).toBeDefined();
      expect(history.candles[0].close).toBeDefined();
    });

    it('should return simulated top movers with gainers and losers', async () => {
      const movers = await mock.getTopMovers();

      expect(movers.dataStatus).toBe('SIMULATED');
      expect(movers.gainers.length).toBeGreaterThan(0);
      expect(movers.losers.length).toBeGreaterThan(0);
    });
  });
});
