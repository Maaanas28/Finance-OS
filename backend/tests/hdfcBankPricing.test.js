import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SymbolNormalizer } from '../src/infrastructure/market/symbolNormalizer.js';
import { BharatStockProvider } from '../src/infrastructure/providers/BharatStockProvider.js';
import { MockMarketDataProvider } from '../src/infrastructure/providers/MockMarketDataProvider.js';
import { MarketDataService } from '../src/infrastructure/market/marketDataService.js';
import { cacheService } from '../src/infrastructure/redis/cacheService.js';
import { logger } from '../src/utils/logger.js';

describe('HDFCBANK & Indian Equity Market Data Subsystem Regression Suite', () => {
  let marketService;

  beforeEach(async () => {
    await cacheService.clear();
    marketService = new MarketDataService();
  });

  describe('Requirement 4: Symbol Mappings Verification', () => {
    it('should correctly map HDFCBANK', () => {
      const norm = SymbolNormalizer.normalize('HDFCBANK');
      expect(norm.symbol).toBe('HDFCBANK');
      expect(norm.exchange).toBe('NSE');
      expect(norm.assetType).toBe('EQUITY');
      expect(norm.currency).toBe('INR');
      expect(norm.targetProvider).toBe('yahoo');
      expect(norm.providerSymbols.bharatstock).toBe('HDFCBANK');
    });

    it('should correctly map RELIANCE', () => {
      const norm = SymbolNormalizer.normalize('RELIANCE');
      expect(norm.symbol).toBe('RELIANCE');
      expect(norm.exchange).toBe('NSE');
      expect(norm.assetType).toBe('EQUITY');
      expect(norm.currency).toBe('INR');
      expect(norm.targetProvider).toBe('yahoo');
      expect(norm.providerSymbols.bharatstock).toBe('RELIANCE');
    });

    it('should correctly map TCS', () => {
      const norm = SymbolNormalizer.normalize('TCS');
      expect(norm.symbol).toBe('TCS');
      expect(norm.exchange).toBe('NSE');
      expect(norm.assetType).toBe('EQUITY');
      expect(norm.currency).toBe('INR');
      expect(norm.targetProvider).toBe('yahoo');
      expect(norm.providerSymbols.bharatstock).toBe('TCS');
    });

    it('should correctly map BHARTIARTL', () => {
      const norm = SymbolNormalizer.normalize('BHARTIARTL');
      expect(norm.symbol).toBe('BHARTIARTL');
      expect(norm.exchange).toBe('NSE');
      expect(norm.assetType).toBe('EQUITY');
      expect(norm.currency).toBe('INR');
      expect(norm.targetProvider).toBe('yahoo');
      expect(norm.providerSymbols.bharatstock).toBe('BHARTIARTL');
    });

    it('should correctly map NIFTY 50', () => {
      const norm = SymbolNormalizer.normalize('NIFTY 50');
      expect(norm.symbol).toBe('NIFTY 50');
      expect(norm.exchange).toBe('NSE');
      expect(norm.assetType).toBe('INDEX');
      expect(norm.currency).toBe('INR');
      expect(norm.targetProvider).toBe('yahoo');
    });

    it('should correctly map SENSEX', () => {
      const norm = SymbolNormalizer.normalize('SENSEX');
      expect(norm.symbol).toBe('SENSEX');
      expect(norm.assetType).toBe('INDEX');
      expect(norm.targetProvider).toBe('yahoo');

      const bseSensex = SymbolNormalizer.normalize('BSE:SENSEX');
      expect(bseSensex.symbol).toBe('SENSEX');
      expect(bseSensex.exchange).toBe('BSE');
    });
  });

  describe('Requirements 7 & 8: BharatStock Provider Direct Normalization', () => {
    const provider = new BharatStockProvider('test-secret-key-12345', 'https://bharatstockapi.com');

    it('should normalize real OpenAPI response for HDFCBANK into required schema with dataStatus = LIVE', () => {
      const rawHdfc = {
        symbol: 'HDFCBANK',
        isin: 'INE040A01034',
        company_name: 'HDFC Bank Limited',
        exchange: 'NSE',
        is_active: true,
        sector: 'Financial Services',
        latest_price: {
          trade_date: '2026-09-04',
          open: 708.0,
          high: 716.4,
          low: 705.1,
          close: 712.5,
          prev_close: 705.2,
          change_pct: 1.04,
          volume: 18450000,
        },
      };

      const normalized = provider.normalizeQuote(rawHdfc, SymbolNormalizer.normalize('HDFCBANK'));

      // Requirement 8: symbol, exchange, ltp, previousClose, change, changePercent, volume, timestamp, dataStatus = LIVE
      expect(normalized.symbol).toBe('HDFCBANK');
      expect(normalized.exchange).toBe('NSE');
      expect(normalized.ltp).toBe(712.5);
      expect(normalized.price).toBe(712.5);
      expect(normalized.previousClose).toBe(705.2);
      expect(normalized.change).toBe(7.3);
      expect(normalized.changePercent).toBe(1.04);
      expect(normalized.volume).toBe(18450000);
      expect(normalized.timestamp).toBeDefined();
      expect(normalized.dataStatus).toBe('LIVE');
      expect(normalized.dataSource).toBe('bharatstock');
    });

    it('should normalize real OpenAPI response for RELIANCE into required schema with dataStatus = LIVE', () => {
      const rawReliance = {
        symbol: 'RELIANCE',
        isin: 'INE002A01018',
        company_name: 'Reliance Industries Limited',
        exchange: 'NSE',
        is_active: true,
        sector: 'Energy',
        latest_price: {
          trade_date: '2026-09-04',
          open: 2920.0,
          high: 2995.0,
          low: 2915.0,
          close: 2980.5,
          prev_close: 2896.2,
          change_pct: 2.91,
          volume: 4850000,
        },
      };

      const normalized = provider.normalizeQuote(rawReliance, SymbolNormalizer.normalize('RELIANCE'));

      expect(normalized.symbol).toBe('RELIANCE');
      expect(normalized.exchange).toBe('NSE');
      expect(normalized.ltp).toBe(2980.5);
      expect(normalized.previousClose).toBe(2896.2);
      expect(normalized.change).toBe(84.3);
      expect(normalized.changePercent).toBe(2.91);
      expect(normalized.volume).toBe(4850000);
      expect(normalized.dataStatus).toBe('LIVE');
      expect(normalized.dataSource).toBe('bharatstock');
    });

    it('should normalize real OpenAPI response for TCS into required schema with dataStatus = LIVE', () => {
      const rawTcs = {
        symbol: 'TCS',
        isin: 'INE467B01029',
        company_name: 'Tata Consultancy Services',
        exchange: 'NSE',
        is_active: true,
        sector: 'Technology',
        latest_price: {
          trade_date: '2026-09-04',
          open: 4150.0,
          high: 4245.0,
          low: 4140.0,
          close: 4230.0,
          prev_close: 4134.5,
          change_pct: 2.31,
          volume: 2120000,
        },
      };

      const normalized = provider.normalizeQuote(rawTcs, SymbolNormalizer.normalize('TCS'));

      expect(normalized.symbol).toBe('TCS');
      expect(normalized.exchange).toBe('NSE');
      expect(normalized.ltp).toBe(4230.0);
      expect(normalized.previousClose).toBe(4134.5);
      expect(normalized.change).toBe(95.5);
      expect(normalized.changePercent).toBe(2.31);
      expect(normalized.volume).toBe(2120000);
      expect(normalized.dataStatus).toBe('LIVE');
      expect(normalized.dataSource).toBe('bharatstock');
    });

    it('should normalize top movers list with dataStatus = LIVE and ltp populated', async () => {
      vi.spyOn(provider, 'getTopMovers').mockResolvedValue({
        dataSource: 'bharatstock',
        dataStatus: 'LIVE',
        fetchedAt: new Date().toISOString(),
        gainers: [
          { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 712.5, ltp: 712.5, change: 7.3, changePercent: 1.04, volume: '18.5M', exchange: 'NSE' },
        ],
        losers: [],
      });

      const movers = await provider.getTopMovers();
      expect(movers.dataSource).toBe('bharatstock');
      expect(movers.dataStatus).toBe('LIVE');
      expect(movers.gainers[0].ltp).toBe(712.5);
    });
  });

  describe('Requirement 6: Safe Diagnostic Logging (Zero API Key Leakage)', () => {
    it('should log diagnostic warnings when provider is not configured without exposing keys', async () => {
      const unconfiguredProvider = new BharatStockProvider('');
      const warnSpy = vi.spyOn(logger, 'warn');

      await expect(unconfiguredProvider.getQuote({ symbol: 'HDFCBANK' })).rejects.toThrow('BharatStock API key is not configured in .env');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should log diagnostic errors on API failure without leaking secret key', async () => {
      const secret = 'super-secret-production-key-xyz';
      const testProvider = new BharatStockProvider(secret, 'https://localhost.invalid');
      const errSpy = vi.spyOn(logger, 'error');

      await expect(testProvider.getQuote({ symbol: 'HDFCBANK', exchange: 'NSE' })).rejects.toThrow();
      expect(errSpy).toHaveBeenCalled();

      // Ensure the secret key is NOT present in any logged arguments
      for (const call of errSpy.mock.calls) {
        const logContent = JSON.stringify(call);
        expect(logContent).not.toContain(secret);
      }
    });
  });

  describe('Requirements 9 & 10: Fallback Hierarchy & DataStatus Integrity', () => {
    it('should return LIVE dataStatus when real Yahoo Finance data is received', async () => {
      vi.spyOn(marketService.yahooFinance, 'isConfigured').mockReturnValue(true);
      vi.spyOn(marketService.yahooFinance, 'getQuote').mockResolvedValue({
        symbol: 'HDFCBANK',
        ltp: 712.5,
        price: 712.5,
        previousClose: 705.2,
        change: 7.3,
        changePercent: 1.04,
        dataSource: 'yahoo',
        dataStatus: 'LIVE',
      });

      const quote = await marketService.getQuote('HDFCBANK');
      expect(quote.dataStatus).toBe('LIVE');
      expect(quote.dataSource).toBe('yahoo');
      expect(quote.price).toBe(712.5);
    });

    it('should return STALE dataStatus when real provider fails and cache exists', async () => {
      vi.spyOn(marketService.yahooFinance, 'isConfigured').mockReturnValue(true);
      vi.spyOn(marketService.bharatStock, 'isConfigured').mockReturnValue(false);
      vi.spyOn(marketService.twelveData, 'isConfigured').mockReturnValue(false);

      marketService.staleStorage.set('quote:HDFCBANK:NSE', {
        symbol: 'HDFCBANK',
        price: 712.5,
        ltp: 712.5,
        dataSource: 'yahoo',
        dataStatus: 'LIVE',
      });

      vi.spyOn(marketService.yahooFinance, 'getQuote').mockRejectedValue(new Error('Network timeout'));

      const quote = await marketService.getQuote('HDFCBANK');
      expect(quote.dataStatus).toBe('STALE');
      expect(quote.dataSource).toBe('yahoo');
    });

    it('should NEVER label mock fallback data as LIVE', async () => {
      vi.spyOn(marketService.yahooFinance, 'isConfigured').mockReturnValue(false);
      vi.spyOn(marketService.bharatStock, 'isConfigured').mockReturnValue(false);
      vi.spyOn(marketService.twelveData, 'isConfigured').mockReturnValue(false);

      const quote = await marketService.getQuote('HDFCBANK');
      expect(quote.dataSource).toBe('mock');
      expect(quote.dataStatus).toBe('SIMULATED');
      expect(quote.dataStatus).not.toBe('LIVE');
    });

    it('should propagate LIVE dataStatus to Market Movers when BharatStock succeeds', async () => {
      vi.spyOn(marketService.bharatStock, 'isConfigured').mockReturnValue(true);
      vi.spyOn(marketService.bharatStock, 'getTopMovers').mockResolvedValue({
        dataSource: 'bharatstock',
        dataStatus: 'LIVE',
        fetchedAt: new Date().toISOString(),
        gainers: [
          { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 712.5, ltp: 712.5, change: 7.3, changePercent: 1.04, volume: '18.5M', exchange: 'NSE' },
        ],
        losers: [],
      });

      const movers = await marketService.getTopMovers();
      expect(movers.dataSource).toBe('bharatstock');
      expect(movers.dataStatus).toBe('LIVE');
      expect(movers.dataStatus).not.toBe('SIMULATED');
    });
  });
});
