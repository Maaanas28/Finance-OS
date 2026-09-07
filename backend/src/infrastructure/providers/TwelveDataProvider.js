import { MarketDataProvider } from './MarketDataProvider.js';
import { secureFetch, HttpError } from '../http/httpClient.js';
import { logger } from '../../utils/logger.js';

export class TwelveDataProvider extends MarketDataProvider {
  constructor(apiKey, baseUrl = 'https://api.twelvedata.com') {
    super('twelve-data');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async getQuote(normalizedInfo) {
    if (!this.isConfigured()) {
      throw new Error('Twelve Data API key is not configured');
    }

    const symbol = normalizedInfo.providerSymbols?.twelveData || normalizedInfo.symbol;
    const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(this.apiKey)}`;

    logger.debug(`Fetching Twelve Data quote for [${symbol}]`);
    const raw = await secureFetch(url);

    if (raw?.status === 'error' || raw?.code === 429) {
      const isRateLimit = raw?.code === 429 || (raw?.message && raw.message.toLowerCase().includes('limit'));
      throw new HttpError(raw.message || 'Twelve Data error', isRateLimit ? 429 : 400, raw, url);
    }

    return this.normalizeQuote(raw, normalizedInfo);
  }

  normalizeQuote(raw, normalizedInfo) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Malformed Twelve Data quote response');
    }

    const price = raw.close !== undefined ? Number(raw.close) : null;
    const open = raw.open !== undefined ? Number(raw.open) : null;
    const high = raw.high !== undefined ? Number(raw.high) : null;
    const low = raw.low !== undefined ? Number(raw.low) : null;
    const previousClose = raw.previous_close !== undefined ? Number(raw.previous_close) : null;
    const change = raw.change !== undefined ? Number(raw.change) : null;
    const changePercent = raw.percent_change !== undefined ? Number(raw.percent_change) : null;
    const volume = raw.volume !== undefined && raw.volume !== null ? Number(raw.volume) : null;
    const timestamp = raw.datetime || new Date().toISOString();

    return {
      symbol: normalizedInfo.symbol,
      displaySymbol: normalizedInfo.displaySymbol || normalizedInfo.symbol,
      name: raw.name || normalizedInfo.name || normalizedInfo.symbol,
      exchange: raw.exchange || normalizedInfo.exchange || 'US',
      assetType: normalizedInfo.assetType || (raw.currency === 'USD' ? 'EQUITY' : 'FOREX'),
      currency: raw.currency || normalizedInfo.currency || 'USD',
      price,
      open,
      high,
      low,
      previousClose,
      change,
      changePercent,
      volume,
      timestamp,
      marketStatus: raw.is_market_open ? 'OPEN' : 'CLOSED',
      dataSource: 'twelve-data',
      dataStatus: raw.is_market_open ? 'LIVE' : 'EOD',
      fetchedAt: new Date().toISOString(),
    };
  }

  async getHistoricalPrices(normalizedInfo, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Twelve Data API key is not configured');
    }

    const symbol = normalizedInfo.providerSymbols?.twelveData || normalizedInfo.symbol;
    const intervalMap = {
      '1D': '1day',
      '1W': '1week',
      '1M': '1day',
      '1Y': '1week',
      'ALL': '1month',
    };
    const interval = options.interval || intervalMap[options.timeframe] || '1day';
    const outputsize = options.timeframe === '1D' ? 24 : options.timeframe === '1Y' ? 52 : 30;

    const url = `${this.baseUrl}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=${outputsize}&apikey=${encodeURIComponent(this.apiKey)}`;

    logger.debug(`Fetching Twelve Data time series for [${symbol}] interval [${interval}]`);
    const raw = await secureFetch(url);

    if (raw?.status === 'error' || raw?.code === 429) {
      const isRateLimit = raw?.code === 429 || (raw?.message && raw.message.toLowerCase().includes('limit'));
      throw new HttpError(raw.message || 'Twelve Data error', isRateLimit ? 429 : 400, raw, url);
    }

    const rawValues = Array.isArray(raw?.values) ? raw.values : [];
    // Twelve Data returns newest first; reverse so oldest is first
    const candles = rawValues.slice().reverse().map((c) => {
      const dateStr = c.datetime;
      return {
        timestamp: new Date(dateStr).toISOString(),
        time: dateStr.length === 10 ? dateStr : dateStr.substring(0, 10),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: c.volume !== undefined && c.volume !== null ? Number(c.volume) : null,
      };
    }).filter((c) => !isNaN(c.open) && !isNaN(c.close));

    return {
      symbol: normalizedInfo.symbol,
      exchange: raw.meta?.exchange || normalizedInfo.exchange || 'US',
      interval,
      timeframe: options.timeframe || '1M',
      dataSource: 'twelve-data',
      dataStatus: 'HISTORICAL',
      fetchedAt: new Date().toISOString(),
      candles,
    };
  }

  async searchSymbols(query) {
    if (!this.isConfigured()) {
      throw new Error('Twelve Data API key is not configured');
    }

    const url = `${this.baseUrl}/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=10&apikey=${encodeURIComponent(this.apiKey)}`;
    const raw = await secureFetch(url);
    const data = Array.isArray(raw?.data) ? raw.data : [];

    return {
      query,
      dataSource: 'twelve-data',
      dataStatus: 'LIVE',
      results: data.map((it) => ({
        symbol: it.symbol,
        name: it.instrument_name || it.symbol,
        exchange: it.exchange,
        assetType: it.instrument_type?.toUpperCase() || 'EQUITY',
        currency: it.currency || 'USD',
      })),
    };
  }

  async healthCheck() {
    if (!this.isConfigured()) {
      return { status: 'NOT_CONFIGURED', configured: false, message: 'API key not provided' };
    }
    return {
      status: 'CONFIGURED',
      configured: true,
      provider: 'twelve-data',
      baseUrl: this.baseUrl,
    };
  }
}
