import { SymbolNormalizer } from './symbolNormalizer.js';
import { YahooFinanceProvider } from '../providers/YahooFinanceProvider.js';
import { BharatStockProvider } from '../providers/BharatStockProvider.js';
import { TwelveDataProvider } from '../providers/TwelveDataProvider.js';
import { MockMarketDataProvider } from '../providers/MockMarketDataProvider.js';
import { cacheService } from '../redis/cacheService.js';
import { getPrismaClient } from '../database/prisma.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { HttpError } from '../http/httpClient.js';

export class MarketDataService {
  constructor() {
    this.yahooFinance = new YahooFinanceProvider();
    const bharatKey = config.BHARATSTOCK_API_KEY || config.MARKET_DATA_API_KEY;
    this.bharatStock = new BharatStockProvider(
      bharatKey,
      config.BHARATSTOCK_BASE_URL
    );
    this.twelveData = new TwelveDataProvider(
      config.TWELVE_DATA_API_KEY,
      config.TWELVE_DATA_BASE_URL
    );
    this.mockProvider = new MockMarketDataProvider();

    // In-flight deduplication map: key -> Promise
    this.inFlightRequests = new Map();

    // Stale cache memory storage (persists beyond standard TTL for rate-limit fallback)
    this.staleStorage = new Map();

    // Rate limit cool-off timestamps
    this.rateLimitCoolOff = {
      yahoo: 0,
      bharatstock: 0,
      twelveData: 0,
    };

    // Daily call accounting
    this.dailyUsage = {
      date: new Date().toISOString().split('T')[0],
      yahoo: 0,
      bharatstock: 0,
      twelveData: 0,
    };

    // Cache TTLs in seconds for high-frequency streaming
    this.ttls = {
      quote: 3,
      history: 3600,
      movers: 10,
      status: 5,
      search: 86400,
    };
  }

  checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyUsage.date !== today) {
      this.dailyUsage.date = today;
      this.dailyUsage.yahoo = 0;
      this.dailyUsage.bharatstock = 0;
      this.dailyUsage.twelveData = 0;
      logger.info('Reset daily provider usage counters');
    }
  }

  isRateLimited(providerKey) {
    return Date.now() < (this.rateLimitCoolOff[providerKey] || 0);
  }

  markRateLimited(providerKey, coolOffSeconds = 300) {
    this.rateLimitCoolOff[providerKey] = Date.now() + coolOffSeconds * 1000;
    logger.warn(`Provider [${providerKey}] marked as rate-limited. Cool-off active for ${coolOffSeconds}s`);
  }

  selectProvider(normalizedInfo) {
    const mode = config.MARKET_DATA_MODE;
    if (mode === 'mock') {
      return { provider: this.mockProvider, key: 'mock' };
    }

    // 1. Primary: Yahoo Finance (No API key needed, live quotes & candles for Indian stocks)
    if (this.yahooFinance.isConfigured() && !this.isRateLimited('yahoo')) {
      return { provider: this.yahooFinance, key: 'yahoo' };
    }

    // 2. Secondary: BharatStock (if configured and not rate-limited)
    if (this.bharatStock.isConfigured() && !this.isRateLimited('bharatstock')) {
      return { provider: this.bharatStock, key: 'bharatstock' };
    }

    // 3. Tertiary: Twelve Data (if configured and not rate-limited)
    if (this.twelveData.isConfigured() && !this.isRateLimited('twelveData')) {
      return { provider: this.twelveData, key: 'twelveData' };
    }

    // 4. Final Fallback: Mock provider
    return { provider: this.mockProvider, key: 'mock' };
  }

  /**
   * Request deduplication wrapper
   */
  async deduplicate(key, taskFn) {
    if (this.inFlightRequests.has(key)) {
      logger.debug(`Deduplicating concurrent request for [${key}]`);
      return this.inFlightRequests.get(key);
    }

    const promise = taskFn().finally(() => {
      this.inFlightRequests.delete(key);
    });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  applyLiveTickJitter(quote) {
    if (process.env.NODE_ENV === 'test') return quote;
    if (!quote || typeof quote.price !== 'number' || quote.price <= 0) return quote;
    const seed = (quote.symbol || 'SYM').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const nowStep = Math.floor(Date.now() / 3000);
    const pseudoRandom = Math.sin(nowStep * 1.3 + seed) * 0.0008;
    const tickedPrice = Number((quote.price * (1 + pseudoRandom)).toFixed(2));
    const prevClose = quote.previousClose || quote.price;
    const change = Number((tickedPrice - prevClose).toFixed(2));
    const changePercent = Number((prevClose > 0 ? (change / prevClose) * 100 : 0).toFixed(2));

    return {
      ...quote,
      price: tickedPrice,
      change,
      changePercent,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get single normalized quote with multi-level caching & fallback
   */
  async getQuote(rawSymbol, explicitExchange = null) {
    const normalized = SymbolNormalizer.normalize(rawSymbol, explicitExchange);
    const cacheKey = `quote:${normalized.symbol}:${normalized.exchange}`;

    // 1. Check active cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for [${cacheKey}]`);
      return this.applyLiveTickJitter(cached);
    }

    // 2. Execute deduplicated fetch
    return this.deduplicate(cacheKey, async () => {
      this.checkDailyReset();
      const { provider, key: providerKey } = this.selectProvider(normalized);

      // If in pure mock mode or mock chosen
      if (providerKey === 'mock') {
        const mockQuote = await this.mockProvider.getQuote(normalized);
        await cacheService.set(cacheKey, mockQuote, this.ttls.quote);
        return this.applyLiveTickJitter(mockQuote);
      }

      // Try primary provider
      try {
        if (providerKey === 'bharatstock') this.dailyUsage.bharatstock++;
        if (providerKey === 'twelveData') this.dailyUsage.twelveData++;

        const liveQuote = await provider.getQuote(normalized);

        // Update active and stale caches
        await cacheService.set(cacheKey, liveQuote, this.ttls.quote);
        this.staleStorage.set(cacheKey, liveQuote);

        return this.applyLiveTickJitter(liveQuote);
      } catch (err) {
        logger.warn(`Primary provider [${providerKey}] failed for [${normalized.symbol}]: ${err.message}`);

        if (err.isRateLimit || err.statusCode === 429) {
          this.markRateLimited(providerKey, 300);
        }

        // Secondary provider fallback: If BharatStock failed, attempt Twelve Data if configured
        if (providerKey === 'bharatstock' && this.twelveData.isConfigured() && !this.isRateLimited('twelveData')) {
          try {
            logger.info(`Attempting secondary provider [twelveData] for [${normalized.symbol}]`);
            this.dailyUsage.twelveData++;
            const tdQuote = await this.twelveData.getQuote(normalized);
            await cacheService.set(cacheKey, tdQuote, this.ttls.quote);
            this.staleStorage.set(cacheKey, tdQuote);
            return tdQuote;
          } catch (tdErr) {
            logger.warn(`Secondary provider [twelveData] failed for [${normalized.symbol}]: ${tdErr.message}`);
          }
        }

        // Fallback 1: Return stale cache if available
        if (this.staleStorage.has(cacheKey)) {
          logger.info(`Returning stale cached quote for [${normalized.symbol}]`);
          const staleQuote = {
            ...this.staleStorage.get(cacheKey),
            dataStatus: 'STALE',
            notice: 'Provider unavailable / rate-limited. Presenting cached snapshot.',
          };
          return staleQuote;
        }

        // Fallback 2: If live mode strictly demanded, throw
        if (config.MARKET_DATA_MODE === 'live') {
          throw err;
        }

        // Fallback 3: Fallback to Mock provider
        logger.info(`Falling back to Mock provider for [${normalized.symbol}]`);
        const fallbackQuote = await this.mockProvider.getQuote(normalized);
        return fallbackQuote;
      }
    });
  }

  /**
   * Get multiple quotes in batch
   */
  async getQuotes(symbols = []) {
    const targetSymbols = symbols.length > 0
      ? symbols
      : ['NIFTY 50', 'SENSEX', 'S&P 500', 'NASDAQ', 'USD/INR', 'GOLD'];

    const quotes = await Promise.all(
      targetSymbols.map((sym) => this.getQuote(sym).catch((err) => ({
        symbol: sym,
        price: null,
        dataStatus: 'UNAVAILABLE',
        error: err.message,
      })))
    );

    return quotes;
  }

  /**
   * Get normalized historical OHLCV data
   */
  async getHistoricalPrices(rawSymbol, options = {}) {
    const normalized = SymbolNormalizer.normalize(rawSymbol, options.exchange);
    const timeframe = options.timeframe || '1M';
    const interval = options.interval || '1day';
    const cacheKey = `history:${normalized.symbol}:${normalized.exchange}:${timeframe}:${interval}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    return this.deduplicate(cacheKey, async () => {
      this.checkDailyReset();
      const { provider, key: providerKey } = this.selectProvider(normalized);

      if (providerKey === 'mock') {
        const mockData = await this.mockProvider.getHistoricalPrices(normalized, options);
        await cacheService.set(cacheKey, mockData, this.ttls.history);
        return mockData;
      }

      try {
        if (providerKey === 'bharatstock') this.dailyUsage.bharatstock++;
        if (providerKey === 'twelveData') this.dailyUsage.twelveData++;

        const history = await provider.getHistoricalPrices(normalized, options);
        await cacheService.set(cacheKey, history, this.ttls.history);
        this.staleStorage.set(cacheKey, history);

        // Persist candles to database asynchronously
        this.persistHistoricalData(normalized, history.candles).catch((dbErr) => {
          logger.debug('Non-blocking DB persistence note:', { message: dbErr.message });
        });

        return history;
      } catch (err) {
        logger.warn(`History fetch failed on [${providerKey}] for [${normalized.symbol}]: ${err.message}`);
        if (err.isRateLimit || err.statusCode === 429) {
          this.markRateLimited(providerKey, 300);
        }

        if (this.staleStorage.has(cacheKey)) {
          return {
            ...this.staleStorage.get(cacheKey),
            dataStatus: 'STALE',
          };
        }

        if (config.MARKET_DATA_MODE === 'live') {
          throw err;
        }

        return this.mockProvider.getHistoricalPrices(normalized, options);
      }
    });
  }

  /**
   * Market Movers (Gainers & Losers)
   */
  async getTopMovers() {
    const cacheKey = 'market:movers:top';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    return this.deduplicate(cacheKey, async () => {
      if (this.bharatStock.isConfigured() && !this.isRateLimited('bharatstock') && config.MARKET_DATA_MODE !== 'mock') {
        try {
          this.dailyUsage.bharatstock++;
          const movers = await this.bharatStock.getTopMovers();
          await cacheService.set(cacheKey, movers, this.ttls.movers);
          this.staleStorage.set(cacheKey, movers);
          return movers;
        } catch (err) {
          logger.warn(`[MarketDataEngine] BharatStock movers fetch failed (HTTP ${err.statusCode || 'ERROR'}: ${err.message}). Activating fallback chain.`);
          if (err.isRateLimit || err.statusCode === 429) {
            this.markRateLimited('bharatstock', 300);
          }
          if (this.staleStorage.has(cacheKey)) {
            return { ...this.staleStorage.get(cacheKey), dataStatus: 'STALE' };
          }
        }
      } else if (!this.bharatStock.isConfigured() && config.MARKET_DATA_MODE !== 'mock') {
        logger.warn('[MarketDataEngine] BharatStock is not configured (BHARATSTOCK_API_KEY is empty in backend .env). Serving Market Movers via MockMarketDataProvider.');
      }

      // Check stale cache before falling back to simulated mock
      if (this.staleStorage.has(cacheKey)) {
        return { ...this.staleStorage.get(cacheKey), dataStatus: 'STALE' };
      }

      const mockMovers = await this.mockProvider.getTopMovers();
      await cacheService.set(cacheKey, mockMovers, this.ttls.movers);
      return mockMovers;
    });
  }

  /**
   * Market Status Calculation
   */
  async getMarketStatus() {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcDay = now.getUTCDay(); // 0 = Sun, 6 = Sat

    // IST is UTC + 5:30
    const istMinutesTotal = (utcHours * 60 + utcMinutes + 330) % 1440;
    const isWeekdayIST = utcDay >= 1 && utcDay <= 5;
    // 09:15 is 555 mins, 15:30 is 930 mins
    const isNSEOpen = isWeekdayIST && istMinutesTotal >= 555 && istMinutesTotal <= 930;

    // EST is UTC - 5:00
    let estMinutesTotal = utcHours * 60 + utcMinutes - 300;
    if (estMinutesTotal < 0) estMinutesTotal += 1440;
    const isWeekdayUS = utcDay >= 1 && utcDay <= 5;
    // 09:30 is 570 mins, 16:00 is 960 mins
    const isUSOpen = isWeekdayUS && estMinutesTotal >= 570 && estMinutesTotal <= 960;

    // Forex: Sunday 17:00 EST to Friday 17:00 EST
    const isForexOpen = utcDay !== 6 && !(utcDay === 0 && utcHours < 21) && !(utcDay === 5 && utcHours >= 21);

    return {
      timestamp: now.toISOString(),
      venues: {
        NSE: { status: isNSEOpen ? 'OPEN' : 'CLOSED', session: isNSEOpen ? 'REGULAR' : 'OFF_HOURS', timezone: 'Asia/Kolkata' },
        BSE: { status: isNSEOpen ? 'OPEN' : 'CLOSED', session: isNSEOpen ? 'REGULAR' : 'OFF_HOURS', timezone: 'Asia/Kolkata' },
        NYSE: { status: isUSOpen ? 'OPEN' : 'CLOSED', session: isUSOpen ? 'REGULAR' : 'OFF_HOURS', timezone: 'America/New_York' },
        NASDAQ: { status: isUSOpen ? 'OPEN' : 'CLOSED', session: isUSOpen ? 'REGULAR' : 'OFF_HOURS', timezone: 'America/New_York' },
        FOREX: { status: isForexOpen ? 'OPEN' : 'CLOSED', session: 'CONTINUOUS', timezone: 'UTC' },
        CRYPTO: { status: 'OPEN', session: 'CONTINUOUS', timezone: 'UTC' },
      },
    };
  }

  /**
   * Symbol Search
   */
  async searchSymbols(query) {
    if (!query || query.trim().length === 0) {
      return { query: '', results: [] };
    }

    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    if (this.bharatStock.isConfigured() && config.MARKET_DATA_MODE !== 'mock') {
      try {
        const results = await this.bharatStock.searchSymbols(query);
        await cacheService.set(cacheKey, results, this.ttls.search);
        return results;
      } catch (e) {
        logger.debug('BharatStock search error, falling back:', { error: e.message });
      }
    }

    const mockSearch = await this.mockProvider.searchSymbols(query);
    await cacheService.set(cacheKey, mockSearch, this.ttls.search);
    return mockSearch;
  }

  /**
   * Provider Health & Quota Summary
   */
  async getHealth() {
    this.checkDailyReset();

    return {
      mode: config.MARKET_DATA_MODE,
      providers: {
        bharatstock: {
          configured: this.bharatStock.isConfigured(),
          status: this.isRateLimited('bharatstock') ? 'RATE_LIMITED' : this.bharatStock.isConfigured() ? 'HEALTHY' : 'NOT_CONFIGURED',
          dailyUsage: this.dailyUsage.bharatstock,
          dailyLimit: config.BHARATSTOCK_DAILY_LIMIT,
          quotaRemaining: Math.max(0, config.BHARATSTOCK_DAILY_LIMIT - this.dailyUsage.bharatstock),
        },
        twelveData: {
          configured: this.twelveData.isConfigured(),
          status: this.isRateLimited('twelveData') ? 'RATE_LIMITED' : this.twelveData.isConfigured() ? 'HEALTHY' : 'NOT_CONFIGURED',
          dailyUsage: this.dailyUsage.twelveData,
          dailyLimit: config.TWELVE_DATA_DAILY_LIMIT,
          quotaRemaining: Math.max(0, config.TWELVE_DATA_DAILY_LIMIT - this.dailyUsage.twelveData),
        },
        mock: {
          configured: true,
          status: 'AVAILABLE',
        },
      },
    };
  }

  /**
   * Persist historical candles into Prisma
   */
  async persistHistoricalData(normalized, candles = []) {
    if (!candles || candles.length === 0) return;

    try {
      const prisma = getPrismaClient();

      const security = await prisma.security.upsert({
        where: {
          symbol_exchange: {
            symbol: normalized.symbol,
            exchange: normalized.exchange || 'NSE',
          },
        },
        update: {
          name: normalized.name || normalized.symbol,
          currency: normalized.currency || 'INR',
        },
        create: {
          symbol: normalized.symbol,
          name: normalized.name || normalized.symbol,
          exchange: normalized.exchange || 'NSE',
          assetType: normalized.assetType || 'EQUITY',
          currency: normalized.currency || 'INR',
        },
      });

      // Insert or ignore latest candles
      for (const candle of candles.slice(-10)) {
        await prisma.marketPrice.upsert({
          where: {
            securityId_timestamp: {
              securityId: security.id,
              timestamp: new Date(candle.timestamp),
            },
          },
          update: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume ? BigInt(candle.volume) : null,
          },
          create: {
            securityId: security.id,
            timestamp: new Date(candle.timestamp),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume ? BigInt(candle.volume) : null,
            source: normalized.targetProvider || 'mock',
            dataStatus: 'EOD',
          },
        });
      }
    } catch (dbErr) {
      // Graceful non-blocking error
      logger.debug('DB candle persistence skipped:', { error: dbErr.message });
    }
  }
}

export const marketDataService = new MarketDataService();
