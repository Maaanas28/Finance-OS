import { MarketDataProvider } from './MarketDataProvider.js';
import { secureFetch } from '../http/httpClient.js';
import { logger } from '../../utils/logger.js';

export class BharatStockProvider extends MarketDataProvider {
  constructor(apiKey, baseUrl = 'https://bharatstockapi.com') {
    super('bharatstock');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  async getQuote(normalizedInfo) {
    if (!this.isConfigured()) {
      logger.warn(`[MarketDataEngine] BharatStock is not configured (BHARATSTOCK_API_KEY is empty in .env). Cannot fetch live quote for [${normalizedInfo?.symbol}].`);
      throw new Error('BharatStock API key is not configured in .env');
    }

    const symbol = normalizedInfo.providerSymbols?.bharatstock || normalizedInfo.symbol;
    const exchangeParam = normalizedInfo.exchange ? `?exchange=${encodeURIComponent(normalizedInfo.exchange)}` : '';
    const url = `${this.baseUrl}/v1/stocks/${encodeURIComponent(symbol)}${exchangeParam}`;

    logger.debug(`Fetching BharatStock quote for [${symbol}]`);
    try {
      const raw = await secureFetch(url, { headers: this.getHeaders() });
      return this.normalizeQuote(raw, normalizedInfo);
    } catch (err) {
      const status = err.statusCode || err.status || 'FETCH_ERROR';
      logger.error(`[MarketDataEngine] BharatStock API failure for symbol [${symbol}]: HTTP ${status} - ${err.message}`);
      throw err;
    }
  }

  normalizeQuote(raw, normalizedInfo) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Malformed BharatStock quote response');
    }

    // Handle OpenAPI StockDetail schema ({ latest_price: { close, open, ... } }), nested { data: { ... } }, or flat payload
    const d = raw.data || raw;
    const priceData = d.latest_price || d.price_snapshot || d;

    const price = priceData.close !== undefined && priceData.close !== null
      ? Number(priceData.close)
      : priceData.price !== undefined && priceData.price !== null
        ? Number(priceData.price)
        : priceData.currentPrice !== undefined && priceData.currentPrice !== null
          ? Number(priceData.currentPrice)
          : null;

    const open = priceData.open !== undefined && priceData.open !== null ? Number(priceData.open) : null;
    const high = priceData.high !== undefined && priceData.high !== null ? Number(priceData.high) : null;
    const low = priceData.low !== undefined && priceData.low !== null ? Number(priceData.low) : null;
    const previousClose = priceData.prev_close !== undefined && priceData.prev_close !== null
      ? Number(priceData.prev_close)
      : priceData.previousClose !== undefined && priceData.previousClose !== null
        ? Number(priceData.previousClose)
        : priceData.prevClose !== undefined && priceData.prevClose !== null
          ? Number(priceData.prevClose)
          : null;

    let change = priceData.change !== undefined && priceData.change !== null ? Number(priceData.change) : null;
    let changePercent = priceData.change_pct !== undefined && priceData.change_pct !== null
      ? Number(priceData.change_pct)
      : priceData.changePercent !== undefined && priceData.changePercent !== null
        ? Number(priceData.changePercent)
        : priceData.pChange !== undefined && priceData.pChange !== null
          ? Number(priceData.pChange)
          : null;

    if (change === null && price !== null && previousClose !== null) {
      change = Number((price - previousClose).toFixed(2));
    }
    if (changePercent === null && change !== null && previousClose) {
      changePercent = Number(((change / previousClose) * 100).toFixed(2));
    }

    const volume = priceData.volume !== undefined && priceData.volume !== null ? Number(priceData.volume) : null;
    const timestamp = priceData.trade_date
      ? new Date(priceData.trade_date).toISOString()
      : d.timestamp || d.updatedAt || new Date().toISOString();

    return {
      symbol: d.symbol || normalizedInfo.symbol,
      displaySymbol: normalizedInfo.displaySymbol || d.symbol || normalizedInfo.symbol,
      name: d.company_name || d.name || d.companyName || normalizedInfo.name || normalizedInfo.symbol,
      exchange: d.exchange || normalizedInfo.exchange || 'NSE',
      assetType: normalizedInfo.assetType || 'EQUITY',
      currency: d.currency || normalizedInfo.currency || 'INR',
      price,
      ltp: price,
      open,
      high,
      low,
      previousClose,
      change,
      changePercent,
      volume,
      timestamp,
      marketStatus: d.is_active === false ? 'CLOSED' : 'OPEN',
      dataSource: 'bharatstock',
      dataStatus: 'LIVE',
      fetchedAt: new Date().toISOString(),
    };
  }

  async getHistoricalPrices(normalizedInfo, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('BharatStock API key is not configured');
    }

    const symbol = normalizedInfo.providerSymbols?.bharatstock || normalizedInfo.symbol;
    const { interval = '1day', range = '1M' } = options;
    const exchangeParam = normalizedInfo.exchange ? `?exchange=${encodeURIComponent(normalizedInfo.exchange)}` : '';
    const url = `${this.baseUrl}/v1/stocks/${encodeURIComponent(symbol)}/prices${exchangeParam}`;

    logger.debug(`Fetching BharatStock history for [${symbol}]`);
    const raw = await secureFetch(url, { headers: this.getHeaders() });

    const rawCandles = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
        ? raw
        : raw?.prices || raw?.candles || [];

    const candles = rawCandles.map((c) => {
      const ts = c.trade_date || c.date || c.timestamp || c.time;
      return {
        timestamp: new Date(ts).toISOString(),
        time: typeof ts === 'string' && ts.length === 10 ? ts : new Date(ts).toISOString().split('T')[0],
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: c.volume !== undefined && c.volume !== null ? Number(c.volume) : null,
      };
    }).filter((c) => !isNaN(c.open) && !isNaN(c.close));

    return {
      symbol: normalizedInfo.symbol,
      exchange: normalizedInfo.exchange || 'NSE',
      interval,
      timeframe: range,
      dataSource: 'bharatstock',
      dataStatus: 'EOD',
      fetchedAt: new Date().toISOString(),
      candles,
    };
  }

  async getTopMovers(options = {}) {
    if (!this.isConfigured()) {
      logger.warn('[MarketDataEngine] BharatStock is not configured (BHARATSTOCK_API_KEY is empty in .env). Cannot fetch live market movers.');
      throw new Error('BharatStock API key is not configured in .env');
    }

    const limit = options.limit || 10;
    logger.debug('Fetching BharatStock market movers from /v1/movers');

    // Fetch gainers and losers in parallel from OpenAPI /v1/movers
    const [gainersRes, losersRes] = await Promise.all([
      secureFetch(`${this.baseUrl}/v1/movers?category=gainers&limit=${limit}`, { headers: this.getHeaders() }).catch((err) => {
        const status = err.statusCode || err.status || 'FETCH_ERROR';
        logger.error(`[MarketDataEngine] BharatStock gainers fetch failed: HTTP ${status} - ${err.message}`);
        return [];
      }),
      secureFetch(`${this.baseUrl}/v1/movers?category=losers&limit=${limit}`, { headers: this.getHeaders() }).catch((err) => {
        const status = err.statusCode || err.status || 'FETCH_ERROR';
        logger.error(`[MarketDataEngine] BharatStock losers fetch failed: HTTP ${status} - ${err.message}`);
        return [];
      }),
    ]);

    const rawGainers = Array.isArray(gainersRes?.data) ? gainersRes.data : Array.isArray(gainersRes) ? gainersRes : [];
    const rawLosers = Array.isArray(losersRes?.data) ? losersRes.data : Array.isArray(losersRes) ? losersRes : [];

    const mapMover = (m) => {
      const price = Number(m.close || m.price || m.currentPrice || 0);
      const prevClose = Number(m.prev_close || m.previousClose || (price - (m.change || 0)));
      const change = m.change !== undefined && m.change !== null
        ? Number(m.change)
        : Number((price - prevClose).toFixed(2));
      const changePercent = m.change_pct !== undefined && m.change_pct !== null
        ? Number(m.change_pct)
        : m.changePercent !== undefined && m.changePercent !== null
          ? Number(m.changePercent)
          : prevClose ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;

      let volStr = '—';
      if (m.volume !== undefined && m.volume !== null && !isNaN(m.volume)) {
        const v = Number(m.volume);
        volStr = v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v);
      }

      return {
        symbol: m.symbol,
        name: m.company_name || m.name || m.symbol,
        price,
        ltp: price,
        previousClose: prevClose,
        change,
        changePercent,
        volume: volStr,
        sector: m.sector || 'EQUITY',
        exchange: m.exchange || 'NSE',
      };
    };

    return {
      dataSource: 'bharatstock',
      dataStatus: 'LIVE',
      fetchedAt: new Date().toISOString(),
      gainers: rawGainers.map(mapMover),
      losers: rawLosers.map(mapMover),
    };
  }

  async searchSymbols(query) {
    if (!this.isConfigured()) {
      throw new Error('BharatStock API key is not configured');
    }

    const url = `${this.baseUrl}/v1/search?q=${encodeURIComponent(query)}&limit=10`;
    const raw = await secureFetch(url, { headers: this.getHeaders() });
    const items = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];

    return {
      query,
      dataSource: 'bharatstock',
      dataStatus: 'LIVE',
      results: items.map((it) => ({
        symbol: it.symbol,
        name: it.company_name || it.name || it.symbol,
        exchange: it.exchange || 'NSE',
        assetType: 'EQUITY',
        currency: 'INR',
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
      provider: 'bharatstock',
      baseUrl: this.baseUrl,
    };
  }
}
