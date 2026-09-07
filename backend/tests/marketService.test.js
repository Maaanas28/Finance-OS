import { describe, it, expect, vi } from 'vitest';
import { MarketDataService } from '../src/infrastructure/market/marketDataService.js';

describe('MarketDataService Orchestration', () => {
  it('should deduplicate multiple concurrent requests for the same symbol', async () => {
    const service = new MarketDataService();

    let callsMade = 0;
    // Spy on yahooFinance.getQuote
    vi.spyOn(service.yahooFinance, 'getQuote').mockImplementation(async (info) => {
      callsMade++;
      await new Promise((r) => setTimeout(r, 50));
      return {
        symbol: info.symbol,
        price: 3000,
        provider: 'yahoo',
        dataSource: 'yahoo',
        dataStatus: 'LIVE',
      };
    });

    // Fire 4 concurrent requests
    const promises = [
      service.getQuote('RELIANCE'),
      service.getQuote('RELIANCE'),
      service.getQuote('RELIANCE'),
      service.getQuote('RELIANCE'),
    ];

    const results = await Promise.all(promises);

    expect(results.length).toBe(4);
    expect(results[0].price).toBe(3000);
    // Deduplication should result in only 1 provider call
    expect(callsMade).toBe(1);
  });

  it('should return stale cached data when primary provider fails and cache exists', async () => {
    const service = new MarketDataService();

    // Prime the stale cache
    service.staleStorage.set('quote:TCS:NSE', {
      symbol: 'TCS',
      price: 4100,
      dataSource: 'yahoo',
      dataStatus: 'LIVE',
    });

    // Force failure on primary provider (yahooFinance)
    vi.spyOn(service.yahooFinance, 'getQuote').mockRejectedValue(new Error('Network outage'));
    vi.spyOn(service.bharatStock, 'isConfigured').mockReturnValue(false);
    vi.spyOn(service.twelveData, 'isConfigured').mockReturnValue(false);

    const quote = await service.getQuote('TCS');

    expect(quote.symbol).toBe('TCS');
    expect(quote.price).toBe(4100);
    expect(quote.dataStatus).toBe('STALE');
    expect(quote.notice).toBeDefined();
  });

  it('should accurately calculate market status for global venues', async () => {
    const service = new MarketDataService();
    const status = await service.getMarketStatus();

    expect(status.timestamp).toBeDefined();
    expect(status.venues.NSE).toBeDefined();
    expect(status.venues.NYSE).toBeDefined();
    expect(status.venues.FOREX).toBeDefined();
    expect(status.venues.CRYPTO.status).toBe('OPEN');
  });

  it('should never expose API keys or secrets in market health check', async () => {
    const service = new MarketDataService();
    const health = await service.getHealth();

    const jsonStr = JSON.stringify(health);
    expect(jsonStr).not.toContain('BHARATSTOCK_API_KEY');
    expect(jsonStr).not.toContain('TWELVE_DATA_API_KEY');
    expect(jsonStr).not.toContain('XAI_API_KEY');
    expect(health.providers.mock.status).toBe('AVAILABLE');
  });
});
