/**
 * Symbol Normalization & Routing Layer for Finance OS
 */

const INDIAN_INDEX_MAP = {
  'NIFTY': 'NIFTY 50',
  'NIFTY50': 'NIFTY 50',
  'NIFTY 50': 'NIFTY 50',
  'SENSEX': 'SENSEX',
  'BSE SENSEX': 'SENSEX',
  'BANKNIFTY': 'BANK NIFTY',
  'NIFTY BANK': 'BANK NIFTY',
};

const US_INDEX_MAP = {
  'S&P 500': 'S&P 500',
  'SPX': 'S&P 500',
  'SP500': 'S&P 500',
  'NASDAQ': 'NASDAQ',
  'COMP': 'NASDAQ',
  'IXIC': 'NASDAQ',
  'DJI': 'DOW JONES',
  'DOW': 'DOW JONES',
};

const FOREX_PAIRS = new Set([
  'USD/INR', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'EUR/INR', 'GBP/INR'
]);

const CRYPTO_PAIRS = new Set([
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'BTC/INR', 'ETH/INR'
]);

// Well-known Indian equities
const INDIAN_EQUITY_SET = new Set([
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'BHARTIARTL', 'ICICIBANK', 'TATAMOTORS', 'WIPRO',
  'SBIN', 'ITC', 'LT', 'HINDUNILVR', 'KOTAKBANK', 'AXISBANK', 'BAJFINANCE', 'MARUTI',
  'ASIANPAINT', 'TITAN', 'SUNPHARMA', 'ULTRACEMCO', 'ADANIENT', 'POWERGRID', 'NTPC'
]);

export class SymbolNormalizer {
  static normalize(rawSymbol, explicitExchange = null) {
    if (!rawSymbol || typeof rawSymbol !== 'string') {
      throw new Error('Symbol must be a non-empty string');
    }

    let cleaned = rawSymbol.trim().toUpperCase();

    // 1. Check for exchange suffix / prefix (e.g. "RELIANCE:NSE", "NSE:RELIANCE", "RELIANCE.NS", "RELIANCE.BO")
    let exchange = explicitExchange ? explicitExchange.toUpperCase() : null;

    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      if (['NSE', 'BSE', 'NASDAQ', 'NYSE'].includes(parts[0])) {
        exchange = parts[0];
        cleaned = parts[1];
      } else if (['NSE', 'BSE', 'NASDAQ', 'NYSE'].includes(parts[1])) {
        cleaned = parts[0];
        exchange = parts[1];
      }
    } else if (cleaned.endsWith('.NS')) {
      exchange = 'NSE';
      cleaned = cleaned.slice(0, -3);
    } else if (cleaned.endsWith('.BO')) {
      exchange = 'BSE';
      cleaned = cleaned.slice(0, -3);
    }

    // 2. Check Indian Indices
    if (INDIAN_INDEX_MAP[cleaned]) {
      const canonical = INDIAN_INDEX_MAP[cleaned];
      const yahooIndexMap = {
        'NIFTY 50': '^NSEI',
        'SENSEX': '^BSESN',
        'BANK NIFTY': '^NSEBANK',
      };
      return {
        symbol: canonical,
        displaySymbol: canonical,
        exchange: exchange || 'NSE',
        assetType: 'INDEX',
        currency: 'INR',
        targetProvider: 'yahoo',
        providerSymbols: {
          yahoo: yahooIndexMap[canonical] || '^NSEI',
          bharatstock: canonical,
          twelveData: canonical,
        },
      };
    }

    // 3. Check US Indices
    if (US_INDEX_MAP[cleaned]) {
      const canonical = US_INDEX_MAP[cleaned];
      return {
        symbol: canonical,
        displaySymbol: canonical,
        exchange: 'US_INDEX',
        assetType: 'INDEX',
        currency: 'USD',
        targetProvider: 'yahoo',
        providerSymbols: {
          yahoo: canonical === 'S&P 500' ? '^GSPC' : canonical === 'NASDAQ' ? '^IXIC' : canonical,
          twelveData: cleaned === 'S&P 500' ? 'SPX' : cleaned === 'NASDAQ' ? 'IXIC' : cleaned,
          bharatstock: canonical,
        },
      };
    }

    // 4. Check Crypto (e.g. "BTC/USD", "BTCUSD", "ETH/USD")
    let cryptoCandidate = cleaned.replace('-', '/');
    if (!cryptoCandidate.includes('/') && (cryptoCandidate.startsWith('BTC') || cryptoCandidate.startsWith('ETH') || cryptoCandidate.startsWith('SOL'))) {
      cryptoCandidate = `${cryptoCandidate.slice(0, 3)}/${cryptoCandidate.slice(3)}`;
    }
    if (CRYPTO_PAIRS.has(cryptoCandidate) || cryptoCandidate.startsWith('BTC') || cryptoCandidate.startsWith('ETH') || cryptoCandidate.startsWith('SOL')) {
      return {
        symbol: cryptoCandidate,
        displaySymbol: cryptoCandidate,
        exchange: 'CRYPTO',
        assetType: 'CRYPTO',
        currency: cryptoCandidate.split('/')[1] || 'USD',
        targetProvider: 'yahoo',
        providerSymbols: {
          yahoo: `${cryptoCandidate.split('/')[0]}-${cryptoCandidate.split('/')[1] || 'USD'}`,
          twelveData: cryptoCandidate,
          bharatstock: cryptoCandidate,
        },
      };
    }

    // 5. Check Forex (e.g. "USD/INR", "USDINR", "USD-INR")
    let fxCandidate = cleaned.replace('-', '/');
    if (!fxCandidate.includes('/') && fxCandidate.length === 6) {
      fxCandidate = `${fxCandidate.slice(0, 3)}/${fxCandidate.slice(3)}`;
    }
    if (FOREX_PAIRS.has(fxCandidate) || fxCandidate.startsWith('USD/') || fxCandidate.endsWith('/USD')) {
      return {
        symbol: fxCandidate,
        displaySymbol: fxCandidate,
        exchange: 'FOREX',
        assetType: 'FOREX',
        currency: fxCandidate.split('/')[1] || 'USD',
        targetProvider: 'yahoo',
        providerSymbols: {
          yahoo: fxCandidate === 'USD/INR' ? 'INR=X' : `${fxCandidate.replace('/', '')}=X`,
          twelveData: fxCandidate,
          bharatstock: fxCandidate,
        },
      };
    }

    // 6. Check Indian Equities
    const isIndian = exchange === 'NSE' || exchange === 'BSE' || INDIAN_EQUITY_SET.has(cleaned);
    if (isIndian) {
      const specialYahooMap = {
        'TATAMOTORS': 'TMPV.NS',
        'M&M': 'M&M.NS',
        'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
      };
      return {
        symbol: cleaned,
        displaySymbol: cleaned,
        exchange: exchange || 'NSE',
        assetType: 'EQUITY',
        currency: 'INR',
        targetProvider: 'yahoo',
        providerSymbols: {
          yahoo: specialYahooMap[cleaned] || `${cleaned}.NS`,
          bharatstock: cleaned,
          twelveData: `${cleaned}.NSE`,
        },
      };
    }

    // 7. Default to US Equities / Global (Yahoo Finance)
    return {
      symbol: cleaned,
      displaySymbol: cleaned,
      exchange: exchange || 'US',
      assetType: 'EQUITY',
      currency: 'USD',
      targetProvider: 'yahoo',
      providerSymbols: {
        yahoo: cleaned,
        twelveData: cleaned,
        bharatstock: cleaned,
      },
    };
  }
}
