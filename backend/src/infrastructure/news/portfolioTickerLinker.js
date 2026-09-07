/**
 * Portfolio Ticker Linker
 *
 * Extracts NSE/BSE ticker symbols from news article text by matching
 * against a curated dictionary of Indian equity symbols and company name aliases.
 * Returns the top-3 matched tickers per article.
 *
 * Zero external dependencies, zero API calls.
 */

// ─── Symbol Dictionary ────────────────────────────────────────────────────────
// Format: 'ALIAS_OR_NAME' → 'NSE_SYMBOL'
// All keys are lowercase for case-insensitive matching.
const TICKER_ALIASES = {
  // HDFC Group
  'hdfc bank': 'HDFCBANK',
  'hdfcbank': 'HDFCBANK',
  'hdfc bank ltd': 'HDFCBANK',
  'hdfc': 'HDFCBANK',
  'hdfc ltd': 'HDFC',
  'housing development finance': 'HDFCBANK',

  // TCS
  'tcs': 'TCS',
  'tata consultancy': 'TCS',
  'tata consultancy services': 'TCS',

  // Reliance
  'reliance': 'RELIANCE',
  'reliance industries': 'RELIANCE',
  'ril': 'RELIANCE',
  'jio': 'RELIANCE',
  'mukesh ambani': 'RELIANCE',

  // Infosys
  'infosys': 'INFY',
  'infy': 'INFY',

  // Wipro
  'wipro': 'WIPRO',

  // ICICI Bank
  'icici bank': 'ICICIBANK',
  'icicibank': 'ICICIBANK',
  'icici': 'ICICIBANK',

  // Axis Bank
  'axis bank': 'AXISBANK',
  'axisbank': 'AXISBANK',

  // SBI
  'sbi': 'SBIN',
  'sbin': 'SBIN',
  'state bank': 'SBIN',
  'state bank of india': 'SBIN',

  // Kotak
  'kotak': 'KOTAKBANK',
  'kotak mahindra': 'KOTAKBANK',
  'kotak bank': 'KOTAKBANK',
  'kotakbank': 'KOTAKBANK',

  // Bharti / Airtel
  'airtel': 'BHARTIARTL',
  'bharti airtel': 'BHARTIARTL',
  'bhartiartl': 'BHARTIARTL',
  'bharti': 'BHARTIARTL',

  // HUL
  'hul': 'HINDUNILVR',
  'hindustan unilever': 'HINDUNILVR',
  'hindunilvr': 'HINDUNILVR',
  'unilever india': 'HINDUNILVR',

  // ITC
  'itc': 'ITC',
  'itc ltd': 'ITC',
  'itc limited': 'ITC',

  // Bajaj Finance
  'bajaj finance': 'BAJFINANCE',
  'bajfinance': 'BAJFINANCE',
  'bajaj finserv': 'BAJAJFINSV',
  'bajajfinsv': 'BAJAJFINSV',

  // Maruti
  'maruti': 'MARUTI',
  'maruti suzuki': 'MARUTI',
  'msil': 'MARUTI',

  // Asian Paints
  'asian paints': 'ASIANPAINT',
  'asianpaint': 'ASIANPAINT',

  // Titan
  'titan': 'TITAN',
  'titan company': 'TITAN',

  // L&T
  'l&t': 'LT',
  'larsen': 'LT',
  'larsen & toubro': 'LT',
  'larsen and toubro': 'LT',
  'lt': 'LT',

  // Tech Mahindra
  'tech mahindra': 'TECHM',
  'techm': 'TECHM',

  // HCL Tech
  'hcl tech': 'HCLTECH',
  'hcl technologies': 'HCLTECH',
  'hcltech': 'HCLTECH',

  // Sun Pharma
  'sun pharma': 'SUNPHARMA',
  'sunpharma': 'SUNPHARMA',
  'sun pharmaceutical': 'SUNPHARMA',

  // Dr Reddy
  'dr reddys': 'DRREDDY',
  "dr reddy's": 'DRREDDY',
  'drreddy': 'DRREDDY',

  // Cipla
  'cipla': 'CIPLA',

  // Power Grid
  'power grid': 'POWERGRID',
  'powergrid': 'POWERGRID',

  // NTPC
  'ntpc': 'NTPC',
  'national thermal power': 'NTPC',

  // Coal India
  'coal india': 'COALINDIA',
  'coalindia': 'COALINDIA',

  // ONGC
  'ongc': 'ONGC',
  'oil and natural gas': 'ONGC',

  // IOC
  'ioc': 'IOC',
  'indian oil': 'IOC',
  'indian oil corporation': 'IOC',

  // BPCL
  'bpcl': 'BPCL',
  'bharat petroleum': 'BPCL',

  // Tata Motors
  'tata motors': 'TATAMOTORS',
  'tatamotors': 'TATAMOTORS',
  'jaguar': 'TATAMOTORS',
  'land rover': 'TATAMOTORS',

  // Tata Steel
  'tata steel': 'TATASTEEL',
  'tatasteel': 'TATASTEEL',

  // Hindalco
  'hindalco': 'HINDALCO',
  'novelis': 'HINDALCO',

  // JSW Steel
  'jsw': 'JSWSTEEL',
  'jsw steel': 'JSWSTEEL',
  'jswsteel': 'JSWSTEEL',

  // Adani Group
  'adani': 'ADANIENT',
  'adani enterprises': 'ADANIENT',
  'adanient': 'ADANIENT',
  'adani ports': 'ADANIPORTS',
  'adaniports': 'ADANIPORTS',
  'adani green': 'ADANIGREEN',
  'adani power': 'ADANIPOWER',
  'gautam adani': 'ADANIENT',

  // Zomato
  'zomato': 'ZOMATO',

  // Paytm / One97
  'paytm': 'PAYTM',
  'one97': 'PAYTM',

  // Nykaa
  'nykaa': 'NYKAA',
  'fss': 'NYKAA',

  // Indices
  'nifty': 'NIFTY 50',
  'nifty 50': 'NIFTY 50',
  'sensex': 'SENSEX',
  'bse sensex': 'SENSEX',
};

/**
 * Extract NSE ticker symbols from article title + body text.
 * Returns a deduplicated array of up to 3 matched symbols.
 *
 * @param {string} title
 * @param {string} body
 * @returns {string[]}
 */
export function extractTickers(title = '', body = '') {
  const combined = `${title} ${body}`.toLowerCase();
  const foundSymbols = new Map(); // symbol → match confidence (longer alias = higher confidence)

  for (const [alias, symbol] of Object.entries(TICKER_ALIASES)) {
    if (combined.includes(alias)) {
      const existing = foundSymbols.get(symbol) || 0;
      // Longer alias match = more specific = higher weight
      if (alias.length > existing) {
        foundSymbols.set(symbol, alias.length);
      }
    }
  }

  // Sort by match confidence (specificity) descending
  return Array.from(foundSymbols.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([symbol]) => symbol);
}

/**
 * Compute trending tickers across a list of articles.
 * Returns an array sorted by mention count descending.
 *
 * @param {object[]} articles - Array of NewsArticle objects with relatedTickers
 * @returns {{ symbol: string, mentions: number }[]}
 */
export function computeTrendingTickers(articles = []) {
  const counts = {};
  for (const article of articles) {
    for (const ticker of article.relatedTickers || []) {
      counts[ticker] = (counts[ticker] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([symbol, mentions]) => ({ symbol, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);
}
