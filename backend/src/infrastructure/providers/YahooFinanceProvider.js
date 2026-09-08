import YahooFinance from 'yahoo-finance2';
import { MarketDataProvider } from './MarketDataProvider.js';
import { secureFetch } from '../http/httpClient.js';
import { logger } from '../../utils/logger.js';

export class YahooFinanceProvider extends MarketDataProvider {
  constructor() {
    super('yahoo');
    try {
      this.yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    } catch (err) {
      this.yf = YahooFinance;
    }
  }

  isConfigured() {
    return true; // Yahoo Finance requires no API key
  }

  /**
   * Helper to format Yahoo Finance symbol for Indian & global instruments
   */
  getYahooSymbol(normalizedInfo) {
    if (normalizedInfo?.providerSymbols?.yahoo) {
      return normalizedInfo.providerSymbols.yahoo;
    }

    const sym = normalizedInfo?.symbol || normalizedInfo;
    if (typeof sym !== 'string') return 'HDFCBANK.NS';

    const clean = sym.trim().toUpperCase();

    // Market index & special ticker mappings
    if (clean === 'NIFTY 50' || clean === 'NIFTY') return '^NSEI';
    if (clean === 'SENSEX') return '^BSESN';
    if (clean === 'BANK NIFTY' || clean === 'NIFTY BANK') return '^NSEBANK';
    if (clean === 'S&P 500' || clean === 'SPX') return '^GSPC';
    if (clean === 'NASDAQ') return '^IXIC';
    if (clean === 'GOLD') return 'GC=F';
    if (clean === 'USD/INR') return 'INR=X';
    if (clean === 'TATAMOTORS') return 'TMPV.NS';
    if (clean === 'M&M') return 'M&M.NS';
    if (clean === 'BAJAJ-AUTO') return 'BAJAJ-AUTO.NS';

    // Suffix .NS for Indian equities if no explicit extension
    if (!clean.includes('.')) {
      return `${clean}.NS`;
    }

    return clean;
  }

  /**
   * Dynamically search Yahoo Finance if a symbol returns 404
   */
  async resolveSymbolViaYahooSearch(rawQuery) {
    try {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(rawQuery)}&quotesCount=5&newsCount=0`;
      const res = await secureFetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const quotes = res?.quotes || [];
      const indianQuote = quotes.find(
        (q) => q.symbol?.endsWith('.NS') || q.symbol?.endsWith('.BO') || q.exchDisp === 'NSE' || q.exchDisp === 'BSE'
      );
      return indianQuote ? indianQuote.symbol : quotes[0]?.symbol || null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Safely convert regularMarketTime into valid ISO timestamp string
   */
  parseTimestamp(rawTime) {
    if (!rawTime) return new Date().toISOString();
    try {
      if (rawTime instanceof Date) return rawTime.toISOString();
      const num = Number(rawTime);
      if (isNaN(num)) return new Date().toISOString();
      const date = num > 1e11 ? new Date(num) : new Date(num * 1000);
      return date.getFullYear() > 2000 && date.getFullYear() < 2100
        ? date.toISOString()
        : new Date().toISOString();
    } catch (_) {
      return new Date().toISOString();
    }
  }

  /**
   * Fetch single quote
   */
  async getQuote(normalizedInfo) {
    const yahooSymbol = this.getYahooSymbol(normalizedInfo);
    logger.debug(`Fetching Yahoo Finance quote for [${yahooSymbol}]`);

    try {
      let quote;
      if (this.yf && typeof this.yf.quote === 'function') {
        quote = await this.yf.quote(yahooSymbol);
      } else if (typeof YahooFinance.quote === 'function') {
        quote = await YahooFinance.quote(yahooSymbol);
      }

      if (!quote || quote.regularMarketPrice === undefined) {
        throw new Error(`Empty quote object received for ${yahooSymbol}`);
      }

      return this.normalizeQuote(quote, normalizedInfo, yahooSymbol);
    } catch (primaryErr) {
      logger.debug(`yahoo-finance2 quote note for [${yahooSymbol}]: ${primaryErr.message}. Attempting v8 chart fallback...`);
      return await this.fetchChartFallbackQuote(normalizedInfo, yahooSymbol);
    }
  }

  /**
   * Resilient HTTP fallback via Yahoo Finance v8 chart API
   */
  async fetchChartFallbackQuote(normalizedInfo, yahooSymbol) {
    let targetSymbol = yahooSymbol;
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=1d`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    let res;
    try {
      res = await secureFetch(url, { headers });
    } catch (err) {
      logger.info(`Primary Yahoo symbol [${targetSymbol}] failed. Searching Yahoo Search API...`);
      const resolved = await this.resolveSymbolViaYahooSearch(normalizedInfo.symbol);
      if (resolved && resolved !== targetSymbol) {
        logger.info(`Resolved [${normalizedInfo.symbol}] -> Yahoo ticker [${resolved}]`);
        targetSymbol = resolved;
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=1d`;
        res = await secureFetch(url, { headers });
      } else if (targetSymbol.endsWith('.NS')) {
        const altSymbol = targetSymbol.replace('.NS', '.BO');
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(altSymbol)}?interval=1d&range=1d`;
        res = await secureFetch(url, { headers });
        targetSymbol = altSymbol;
      } else {
        throw err;
      }
    }

    const result = res?.chart?.result?.[0];
    if (!result || !result.meta) {
      throw new Error(`Yahoo Finance v8 chart response empty for ${yahooSymbol}`);
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol: normalizedInfo.symbol || yahooSymbol.replace(/\.(NS|BO)$/, ''),
      displaySymbol: normalizedInfo.displaySymbol || normalizedInfo.symbol || yahooSymbol.replace(/\.(NS|BO)$/, ''),
      name: meta.shortName || meta.longName || normalizedInfo.name || yahooSymbol,
      exchange: meta.exchangeName || 'NSE',
      price: Number(price.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      open: Number((meta.regularMarketDayOpen || price).toFixed(2)),
      previousClose: Number(prevClose.toFixed(2)),
      high: Number((meta.regularMarketDayHigh || price).toFixed(2)),
      low: Number((meta.regularMarketDayLow || price).toFixed(2)),
      volume: Number(meta.regularMarketVolume || 0),
      currency: meta.currency || 'INR',
      dataStatus: 'DELAYED',
      provider: 'yahoo',
      dataSource: 'yahoo',
      providerSymbol: targetSymbol,
      timestamp: new Date().toISOString(),
      isDelayed: true,
      delayMinutes: 15,
    };
  }

  normalizeQuote(raw, normalizedInfo, yahooSymbol) {
    const price = Number(raw.regularMarketPrice || 0);
    const prevClose = Number(raw.regularMarketPreviousClose || price);
    const change = Number(raw.regularMarketChange ?? (price - prevClose));
    const changePercent = Number(raw.regularMarketChangePercent ?? (prevClose > 0 ? (change / prevClose) * 100 : 0));
    let delay = raw.exchangeDataDelayedBy || 0;

    const isNSEorBSE = raw.exchange === 'NSE' || raw.exchange === 'BSE' || yahooSymbol.endsWith('.NS') || yahooSymbol.endsWith('.BO') || yahooSymbol.startsWith('^NSE') || yahooSymbol.startsWith('^BSESN');
    if (isNSEorBSE && delay === 0) {
      delay = 15;
    }
    const isDelayed = delay > 0 || Boolean(raw.isDelayed);

    return {
      symbol: normalizedInfo.symbol || yahooSymbol.replace(/\.(NS|BO)$/, ''),
      displaySymbol: normalizedInfo.displaySymbol || normalizedInfo.symbol || yahooSymbol.replace(/\.(NS|BO)$/, ''),
      name: raw.longName || raw.shortName || normalizedInfo.name || yahooSymbol,
      exchange: raw.fullExchangeName || raw.exchangeName || raw.exchange || 'NSE',
      price: Number(price.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      open: Number((raw.regularMarketOpen || price).toFixed(2)),
      previousClose: Number(prevClose.toFixed(2)),
      high: Number((raw.regularMarketDayHigh || price).toFixed(2)),
      low: Number((raw.regularMarketDayLow || price).toFixed(2)),
      volume: Number(raw.regularMarketVolume || 0),
      currency: raw.currency || 'INR',
      marketCap: raw.marketCap || null,
      peRatio: raw.trailingPE || null,
      fiftyTwoWeekHigh: raw.fiftyTwoWeekHigh ? Number(raw.fiftyTwoWeekHigh.toFixed(2)) : null,
      fiftyTwoWeekLow: raw.fiftyTwoWeekLow ? Number(raw.fiftyTwoWeekLow.toFixed(2)) : null,
      dataStatus: isDelayed ? 'DELAYED' : 'LIVE',
      provider: 'yahoo',
      dataSource: 'yahoo',
      providerSymbol: yahooSymbol,
      timestamp: this.parseTimestamp(raw.regularMarketTime),
      isDelayed,
      delayMinutes: delay,
    };
  }

  /**
   * Fetch historical candles for 1D, 1W, 1M, 1Y
   */
  async getHistoricalPrices(normalizedInfo, rangeInput = '1m') {
    const rawRange = typeof rangeInput === 'string'
      ? rangeInput
      : (rangeInput?.timeframe || rangeInput?.range || '1m');
    const range = String(rawRange).toLowerCase();
    const yahooSymbol = this.getYahooSymbol(normalizedInfo);
    logger.debug(`Fetching Yahoo Finance historical prices for [${yahooSymbol}], range [${range}]`);

    const now = Date.now();
    const rangeMap = {
      '1d': { period1: new Date(now - 86400 * 1000), interval: '5m', queryRange: '1d' },
      '1w': { period1: new Date(now - 7 * 86400 * 1000), interval: '15m', queryRange: '5d' },
      '1m': { period1: new Date(now - 30 * 86400 * 1000), interval: '1d', queryRange: '1mo' },
      '1y': { period1: new Date(now - 365 * 86400 * 1000), interval: '1wk', queryRange: '1y' },
    };

    const configRange = rangeMap[range.toLowerCase()] || rangeMap['1m'];

    try {
      let result;
      if (this.yf && typeof this.yf.chart === 'function') {
        result = await this.yf.chart(yahooSymbol, {
          period1: configRange.period1,
          interval: configRange.interval,
        });
      } else if (typeof YahooFinance.chart === 'function') {
        result = await YahooFinance.chart(yahooSymbol, {
          period1: configRange.period1,
          interval: configRange.interval,
        });
      }

      if (result && result.quotes && result.quotes.length > 0) {
        const candles = result.quotes
          .filter((q) => q.close !== null && q.close !== undefined)
          .map((q) => ({
            timestamp: q.date ? new Date(q.date).toISOString() : new Date().toISOString(),
            open: Number((q.open || q.close).toFixed(2)),
            high: Number((q.high || q.close).toFixed(2)),
            low: Number((q.low || q.close).toFixed(2)),
            close: Number(q.close.toFixed(2)),
            volume: Number(q.volume || 0),
          }));

        return {
          symbol: normalizedInfo.symbol || yahooSymbol.replace(/\.(NS|BO)$/, ''),
          range,
          dataStatus: 'HISTORICAL',
          provider: 'yahoo',
          providerSymbol: yahooSymbol,
          candles,
        };
      }

      throw new Error(`Empty quotes array returned from yahooFinance.chart for ${yahooSymbol}`);
    } catch (err) {
      logger.debug(`yahooFinance.chart note for [${yahooSymbol}]: ${err.message}. Using v8 direct chart fallback...`);
      return await this.fetchChartFallbackCandles(normalizedInfo, yahooSymbol, range, configRange);
    }
  }

  /**
   * Fallback for historical candles using query1.finance.yahoo.com/v8/finance/chart/
   */
  async fetchChartFallbackCandles(normalizedInfo, yahooSymbol, range, configRange) {
    let targetSymbol = yahooSymbol;
    const qRange = configRange.queryRange || '1mo';
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?range=${qRange}&interval=${configRange.interval}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    let res;
    try {
      res = await secureFetch(url, { headers });
    } catch (err) {
      logger.info(`Primary Yahoo symbol [${targetSymbol}] failed for candles. Searching Yahoo Search API...`);
      const resolved = await this.resolveSymbolViaYahooSearch(normalizedInfo.symbol);
      if (resolved && resolved !== targetSymbol) {
        targetSymbol = resolved;
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?range=${qRange}&interval=${configRange.interval}`;
        res = await secureFetch(url, { headers });
      } else if (targetSymbol.endsWith('.NS')) {
        const altSymbol = targetSymbol.replace('.NS', '.BO');
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(altSymbol)}?range=${qRange}&interval=${configRange.interval}`;
        res = await secureFetch(url, { headers });
        targetSymbol = altSymbol;
      } else {
        throw err;
      }
    }

    const result = res?.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      throw new Error(`v8 chart fallback candles empty for ${yahooSymbol}`);
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const candles = [];

    for (let i = 0; i < timestamps.length; i++) {
      const close = quotes.close[i];
      if (close !== null && close !== undefined) {
        candles.push({
          timestamp: new Date(timestamps[i] * 1000).toISOString(),
          open: Number((quotes.open[i] || close).toFixed(2)),
          high: Number((quotes.high[i] || close).toFixed(2)),
          low: Number((quotes.low[i] || close).toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: Number(quotes.volume[i] || 0),
        });
      }
    }

    return {
      symbol: normalizedInfo.symbol || yahooSymbol.replace(/\.(NS|BO)$/, ''),
      range,
      dataStatus: 'HISTORICAL',
      provider: 'yahoo',
      providerSymbol: targetSymbol,
      candles,
    };
  }

  /**
   * Fetch live Market Movers (Gainers & Losers) with zero token cost via Yahoo Finance
   */
  async getTopMovers() {
    logger.debug('Fetching Yahoo Finance market movers via NIFTY 50 securities ranking...');
    const topSymbols = [
      'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
      'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK',
      'HINDUNILVR', 'SBIN', 'MARUTI', 'BAJFINANCE', 'SUNPHARMA',
      'TITAN', 'WIPRO', 'HCLTECH', 'ASIANPAINT', 'ULTRACEMCO',
      'NTPC', 'POWERGRID', 'ONGC', 'COALINDIA', 'ADANIENT'
    ];

    const quotes = await Promise.all(
      topSymbols.map((sym) =>
        this.getQuote({ symbol: sym, providerSymbols: { yahoo: `${sym}.NS` } }).catch(() => null)
      )
    );

    const validQuotes = quotes.filter((q) => q && typeof q.price === 'number' && q.price > 0);
    if (validQuotes.length === 0) {
      throw new Error('Yahoo Finance market movers ranking yielded no valid quotes');
    }

    validQuotes.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));

    const gainers = validQuotes.slice(0, 5);
    const losers = validQuotes.slice(-5).reverse();

    return {
      gainers,
      losers,
      dataStatus: validQuotes[0]?.dataStatus || 'DELAYED',
      provider: 'yahoo',
      dataSource: 'yahoo',
      timestamp: new Date().toISOString(),
    };
  }
}
