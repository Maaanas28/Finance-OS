import { MarketDataProvider } from './MarketDataProvider.js';
import { INDIAN_SECURITY_UNIVERSE, searchSecurityUniverse } from '../market/securityUniverse.js';
import { NotFoundError } from '../../utils/errors.js';

export class MockMarketDataProvider extends MarketDataProvider {
  constructor() {
    super('mock');
    this.quotes = {
      'NIFTY 50': {
        symbol: 'NIFTY 50',
        displaySymbol: 'NIFTY 50',
        name: 'Nifty 50 Index',
        exchange: 'NSE',
        assetType: 'INDEX',
        currency: 'INR',
        price: 24852.15,
        open: 24780.00,
        high: 24890.40,
        low: 24750.10,
        previousClose: 24709.85,
        change: 142.30,
        changePercent: 0.58,
        volume: 245000000,
        marketStatus: 'OPEN',
      },
      'SENSEX': {
        symbol: 'SENSEX',
        displaySymbol: 'SENSEX',
        name: 'BSE Sensex Index',
        exchange: 'BSE',
        assetType: 'INDEX',
        currency: 'INR',
        price: 81387.40,
        open: 81050.20,
        high: 81450.00,
        low: 80980.50,
        previousClose: 80907.20,
        change: 480.20,
        changePercent: 0.59,
        volume: 180000000,
        marketStatus: 'OPEN',
      },
      'S&P 500': {
        symbol: 'S&P 500',
        displaySymbol: 'S&P 500',
        name: 'S&P 500 Index',
        exchange: 'US_INDEX',
        assetType: 'INDEX',
        currency: 'USD',
        price: 5864.67,
        open: 5880.12,
        high: 5890.45,
        low: 5855.20,
        previousClose: 5883.12,
        change: -18.45,
        changePercent: -0.31,
        volume: 3200000000,
        marketStatus: 'CLOSED',
      },
      'NASDAQ': {
        symbol: 'NASDAQ',
        displaySymbol: 'NASDAQ',
        name: 'Nasdaq Composite',
        exchange: 'US_INDEX',
        assetType: 'INDEX',
        currency: 'USD',
        price: 18415.20,
        open: 18500.00,
        high: 18520.10,
        low: 18390.00,
        previousClose: 18497.30,
        change: -82.10,
        changePercent: -0.44,
        volume: 4100000000,
        marketStatus: 'CLOSED',
      },
      'USD/INR': {
        symbol: 'USD/INR',
        displaySymbol: 'USD/INR',
        name: 'US Dollar / Indian Rupee',
        exchange: 'FOREX',
        assetType: 'FOREX',
        currency: 'INR',
        price: 83.98,
        open: 83.94,
        high: 84.02,
        low: 83.92,
        previousClose: 83.94,
        change: 0.04,
        changePercent: 0.05,
        volume: null,
        marketStatus: 'OPEN',
      },
      'GOLD': {
        symbol: 'GOLD',
        displaySymbol: 'GOLD',
        name: 'Gold Spot 1oz',
        exchange: 'COMMODITY',
        assetType: 'COMMODITY',
        currency: 'USD',
        price: 2682.40,
        open: 2670.10,
        high: 2688.50,
        low: 2668.00,
        previousClose: 2669.60,
        change: 12.80,
        changePercent: 0.48,
        volume: null,
        marketStatus: 'OPEN',
      },
      'RELIANCE': {
        symbol: 'RELIANCE',
        displaySymbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        exchange: 'NSE',
        assetType: 'EQUITY',
        sector: 'Energy',
        currency: 'INR',
        price: 2980.50,
        open: 2920.00,
        high: 2995.00,
        low: 2915.00,
        previousClose: 2896.20,
        change: 84.30,
        changePercent: 2.91,
        volume: 4850000,
        marketStatus: 'OPEN',
      },
      'TCS': {
        symbol: 'TCS',
        displaySymbol: 'TCS',
        name: 'Tata Consultancy Services',
        exchange: 'NSE',
        assetType: 'EQUITY',
        sector: 'Information Technology',
        currency: 'INR',
        price: 4230.00,
        open: 4150.00,
        high: 4245.00,
        low: 4140.00,
        previousClose: 4134.50,
        change: 95.50,
        changePercent: 2.31,
        volume: 2120000,
        marketStatus: 'OPEN',
      },
      'HDFCBANK': {
        symbol: 'HDFCBANK',
        displaySymbol: 'HDFCBANK',
        name: 'HDFC Bank Ltd',
        exchange: 'NSE',
        assetType: 'EQUITY',
        sector: 'Financial Services',
        currency: 'INR',
        price: 1675.20,
        open: 1660.00,
        high: 1682.50,
        low: 1655.00,
        previousClose: 1660.00,
        change: 15.20,
        changePercent: 0.92,
        volume: 8500000,
        marketStatus: 'OPEN',
      },
      'INFY': {
        symbol: 'INFY',
        displaySymbol: 'INFY',
        name: 'Infosys Ltd',
        exchange: 'NSE',
        assetType: 'EQUITY',
        sector: 'Information Technology',
        currency: 'INR',
        price: 1845.30,
        open: 1890.00,
        high: 1895.00,
        low: 1840.00,
        previousClose: 1893.50,
        change: -48.20,
        changePercent: -2.55,
        volume: 7200000,
        marketStatus: 'OPEN',
      },
      'TATAMOTORS': {
        symbol: 'TATAMOTORS',
        displaySymbol: 'TATAMOTORS',
        name: 'Tata Motors Ltd',
        exchange: 'NSE',
        assetType: 'EQUITY',
        sector: 'Automobile',
        currency: 'INR',
        price: 978.40,
        open: 1000.00,
        high: 1002.00,
        low: 974.50,
        previousClose: 1000.00,
        change: -21.60,
        changePercent: -2.16,
        volume: 8900000,
        marketStatus: 'OPEN',
      },
      'ICICIBANK': {
        symbol: 'ICICIBANK',
        displaySymbol: 'ICICIBANK',
        name: 'ICICI Bank Ltd',
        exchange: 'NSE',
        assetType: 'EQUITY',
        sector: 'Financial Services',
        currency: 'INR',
        price: 1210.80,
        open: 1229.00,
        high: 1232.00,
        low: 1207.00,
        previousClose: 1229.00,
        change: -18.20,
        changePercent: -1.48,
        volume: 6500000,
        marketStatus: 'OPEN',
      },
      'WIPRO': {
        symbol: 'WIPRO',
        displaySymbol: 'WIPRO',
        name: 'Wipro Limited',
        exchange: 'NSE',
        assetType: 'EQUITY',
        sector: 'Information Technology',
        currency: 'INR',
        price: 524.10,
        open: 531.60,
        high: 533.00,
        low: 522.00,
        previousClose: 531.60,
        change: -7.50,
        changePercent: -1.41,
        volume: 3100000,
        marketStatus: 'OPEN',
      },
      'BHARTIARTL': {
        symbol: 'BHARTIARTL',
        displaySymbol: 'BHARTIARTL',
        name: 'Bharti Airtel Ltd',
        exchange: 'NSE',
        assetType: 'EQUITY',
        sector: 'Telecommunication',
        currency: 'INR',
        price: 1640.10,
        open: 1615.50,
        high: 1645.00,
        low: 1612.00,
        previousClose: 1615.50,
        change: 24.60,
        changePercent: 1.52,
        volume: 3600000,
        marketStatus: 'OPEN',
      },
      'AAPL': {
        symbol: 'AAPL',
        displaySymbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        assetType: 'EQUITY',
        currency: 'USD',
        price: 232.50,
        open: 230.10,
        high: 233.80,
        low: 229.70,
        previousClose: 230.20,
        change: 2.30,
        changePercent: 1.00,
        volume: 45200000,
        marketStatus: 'CLOSED',
      },
      'MSFT': {
        symbol: 'MSFT',
        displaySymbol: 'MSFT',
        name: 'Microsoft Corporation',
        exchange: 'NASDAQ',
        assetType: 'EQUITY',
        currency: 'USD',
        price: 428.15,
        open: 425.00,
        high: 430.20,
        low: 424.10,
        previousClose: 426.00,
        change: 2.15,
        changePercent: 0.50,
        volume: 18400000,
        marketStatus: 'CLOSED',
      },
      'BTC/USD': {
        symbol: 'BTC/USD',
        displaySymbol: 'BTC/USD',
        name: 'Bitcoin / US Dollar',
        exchange: 'CRYPTO',
        assetType: 'CRYPTO',
        currency: 'USD',
        price: 68420.00,
        open: 67100.00,
        high: 68900.00,
        low: 66800.00,
        previousClose: 67200.00,
        change: 1220.00,
        changePercent: 1.82,
        volume: 28500000000,
        marketStatus: 'OPEN',
      },
      'BTC-USD': {
        symbol: 'BTC-USD',
        displaySymbol: 'BTC-USD',
        name: 'Bitcoin / US Dollar',
        exchange: 'CRYPTO',
        assetType: 'CRYPTO',
        currency: 'USD',
        price: 68420.00,
        open: 67100.00,
        high: 68900.00,
        low: 66800.00,
        previousClose: 67200.00,
        change: 1220.00,
        changePercent: 1.82,
        volume: 28500000000,
        marketStatus: 'OPEN',
      },
    };
  }

  async getQuote(normalizedInfo) {
    const key = normalizedInfo.symbol.toUpperCase();
    if (this.quotes[key]) {
      return {
        ...this.quotes[key],
        dataSource: 'mock',
        dataStatus: 'SIMULATED',
        fetchedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };
    }

    // P1.2: Check if symbol is in the known universe
    const foundInMaster = INDIAN_SECURITY_UNIVERSE.find(
      (s) => s.symbol.toUpperCase() === key
    );

    if (!foundInMaster) {
      // P1.2: Unknown symbols throw NotFoundError — cannot be traded in any mode
      throw new NotFoundError(`Unknown symbol: ${key}. Symbol not found in security universe.`);
    }

    // Symbol found in universe but no static quote — generate a deterministic mock price
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
    const basePrice = Math.abs(hash % 2500) + 120;
    const change = Number(((hash % 45) + 2.5).toFixed(2));
    const changePercent = Number((change / basePrice * 100).toFixed(2));

    const base = {
      symbol: key,
      displaySymbol: key,
      name: foundInMaster.name,
      exchange: foundInMaster.exchange,
      assetType: foundInMaster.assetType,
      sector: foundInMaster.sector,
      currency: foundInMaster.currency || 'INR',
      price: basePrice,
      open: basePrice - change,
      high: basePrice + Math.abs(change) * 1.5,
      low: basePrice - Math.abs(change) * 1.5,
      previousClose: basePrice - change,
      change,
      changePercent,
      volume: Math.abs(hash * 1000) + 500000,
      marketStatus: 'OPEN',
    };

    return {
      ...base,
      dataSource: 'mock',
      dataStatus: 'SIMULATED',
      fetchedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  async getHistoricalPrices(normalizedInfo, options = {}) {
    const { timeframe = '1M', interval = '1day' } = options;

    // P3.1: For 1Y + daily interval, return 252 business-day candles (skip weekends)
    let points;
    if (timeframe === '1Y' && (interval === '1day' || interval === '1d')) {
      points = 252; // trading days
    } else if (timeframe === '1D') {
      points = 24;
    } else if (timeframe === '1W') {
      points = 7;
    } else if (timeframe === '1M') {
      points = 30;
    } else if (timeframe === '3M') {
      points = 63; // ~63 trading days
    } else if (timeframe === '6M') {
      points = 126; // ~126 trading days
    } else if (timeframe === '5Y') {
      points = 60; // weeks
    } else {
      points = 52; // 1Y weekly default
    }

    const currentQuote = await this.getQuote(normalizedInfo);
    const basePrice = currentQuote.price;

    const candles = [];
    let cur = basePrice * 0.94;
    let dayOffset = points;

    for (let i = 0; i < points; i++) {
      let date;
      if (timeframe === '1D') {
        date = new Date(Date.now() - (points - i) * 3600000);
      } else {
        // P3.1: For daily candles, skip weekends to get business days
        let d = new Date(Date.now());
        let bizDaysBack = points - i;
        while (bizDaysBack > 0) {
          d = new Date(d.getTime() - 86400000);
          const dow = d.getUTCDay();
          if (dow !== 0 && dow !== 6) bizDaysBack--;
        }
        date = d;
      }

      const drift = (Math.random() - 0.48) * (basePrice * 0.015);
      cur = Math.max(1, cur + drift);
      const open = cur - Math.random() * (basePrice * 0.005);
      const close = cur;
      const high = Math.max(open, close) + Math.random() * (basePrice * 0.008);
      const low = Math.min(open, close) - Math.random() * (basePrice * 0.008);
      const volume = Math.floor(Math.random() * 500000) + 100000;

      candles.push({
        timestamp: date.toISOString(),
        date: date.toISOString().split('T')[0],
        time: timeframe === '1D' ? date.toISOString().substring(11, 16) : date.toISOString().split('T')[0],
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
      });
    }

    return {
      symbol: normalizedInfo.symbol,
      exchange: normalizedInfo.exchange,
      interval,
      timeframe,
      dataSource: 'mock',
      dataStatus: 'SIMULATED',
      fetchedAt: new Date().toISOString(),
      candles,
    };
  }

  async getTopMovers() {
    return {
      dataSource: 'mock',
      dataStatus: 'SIMULATED',
      fetchedAt: new Date().toISOString(),
      gainers: [
        { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2980.50, change: 84.30, changePercent: 2.91, volume: '4.8M', sector: 'Energy', exchange: 'NSE' },
        { symbol: 'TCS', name: 'Tata Consultancy Services', price: 4230.00, change: 95.50, changePercent: 2.31, volume: '2.1M', sector: 'Information Technology', exchange: 'NSE' },
        { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1675.20, change: 29.80, changePercent: 1.81, volume: '11.4M', sector: 'Financial Services', exchange: 'NSE' },
        { symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 1640.10, change: 24.60, changePercent: 1.52, volume: '3.6M', sector: 'Telecommunication', exchange: 'NSE' },
      ],
      losers: [
        { symbol: 'INFY', name: 'Infosys Ltd', price: 1845.30, change: -48.20, changePercent: -2.55, volume: '7.2M', sector: 'Information Technology', exchange: 'NSE' },
        { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 978.40, change: -21.60, changePercent: -2.16, volume: '8.9M', sector: 'Automobile', exchange: 'NSE' },
        { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1210.80, change: -18.20, changePercent: -1.48, volume: '6.5M', sector: 'Financial Services', exchange: 'NSE' },
        { symbol: 'WIPRO', name: 'Wipro Limited', price: 524.10, change: -7.50, changePercent: -1.41, volume: '3.1M', sector: 'Information Technology', exchange: 'NSE' },
      ],
    };
  }

  async searchSymbols(query) {
    const matched = searchSecurityUniverse(query, 25);
    const results = matched.map((item) => ({
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      sector: item.sector,
      assetType: item.assetType,
      currency: item.currency,
    }));

    return {
      query,
      dataSource: 'mock',
      dataStatus: 'SIMULATED',
      results,
    };
  }

  async healthCheck() {
    return {
      status: 'HEALTHY',
      configured: true,
      message: 'Simulated engine available',
    };
  }
}
