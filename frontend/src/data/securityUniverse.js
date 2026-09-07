/**
 * Finance OS — Frontend Local Security Master Universe (100+ Equities)
 *
 * Provides client-side instant search, autocomplete, and symbol details for Indian Equities.
 * Zero API latency, zero quota consumption.
 */

export const FRONTEND_SECURITY_UNIVERSE = [
  // INDICES
  { symbol: 'NIFTY 50', name: 'Nifty 50 Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR' },
  { symbol: 'SENSEX', name: 'BSE Sensex Index', exchange: 'BSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR' },
  { symbol: 'NIFTY BANK', name: 'Nifty Bank Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR' },
  { symbol: 'NIFTY IT', name: 'Nifty IT Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR' },

  // FINANCIALS
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'PNB', name: 'Punjab National Bank', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment & Finance', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'JIOFIN', name: 'Jio Financial Services Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'FEDERALBNK', name: 'Federal Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },

  // TECHNOLOGY
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'COFORGE', name: 'Coforge Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'MPHASIS', name: 'Mphasis Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'KPITTECH', name: 'KPIT Technologies Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },

  // AUTOMOTIVE
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'BHARATFORG', name: 'Bharat Forge Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR' },

  // ENERGY & POWER
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'NTPC', name: 'NTPC Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp of India', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corp', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'IOC', name: 'Indian Oil Corp Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR' },

  // PHARMA & HEALTHCARE
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd", exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'CIPLA', name: 'Cipla Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories Ltd", exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'LUPIN', name: 'Lupin Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'MAXHEALTH', name: 'Max Healthcare Institute', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR' },

  // FMCG
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'GODREJCP', name: 'Godrej Consumer Products', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'DABUR', name: 'Dabur India Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'VBL', name: 'Varun Beverages Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR' },

  // METALS
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'VEDL', name: 'Vedanta Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'NMDC', name: 'NMDC Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR' },

  // INDUSTRIALS & INFRASTRUCTURE
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'SIEMENS', name: 'Siemens Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ABB', name: 'ABB India Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'DLF', name: 'DLF Ltd', exchange: 'NSE', sector: 'Real Estate', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'IRCTC', name: 'Indian Railway Catering & Tourism', exchange: 'NSE', sector: 'Services', assetType: 'EQUITY', currency: 'INR' },

  // TELECOM & CONSUMER DISCRETIONARY
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', sector: 'Telecom', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'TITAN', name: 'Titan Company Ltd', exchange: 'NSE', sector: 'Consumer Discretionary', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', exchange: 'NSE', sector: 'Consumer Discretionary', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd', exchange: 'NSE', sector: 'Chemicals', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', exchange: 'NSE', sector: 'Materials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd', exchange: 'NSE', sector: 'Materials', assetType: 'EQUITY', currency: 'INR' },

  // RETAIL & NEW AGE TECH
  { symbol: 'TRENT', name: 'Trent Ltd', exchange: 'NSE', sector: 'Retail', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'DMART', name: 'Avenue Supermarts Ltd', exchange: 'NSE', sector: 'Retail', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'ZOMATO', name: 'Zomato Ltd (Eternal Ltd)', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'PAYTM', name: 'One97 Communications Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'NYKAA', name: 'FSN E-Commerce Ventures', exchange: 'NSE', sector: 'Retail', assetType: 'EQUITY', currency: 'INR' },
  { symbol: 'POLICYBZR', name: 'PB Fintech Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR' }
];

export function searchFrontendSecurities(query, limit = 15) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const results = FRONTEND_SECURITY_UNIVERSE.filter((s) => {
    return (
      s.symbol.toUpperCase().includes(q) ||
      s.name.toUpperCase().includes(q) ||
      s.sector.toUpperCase().includes(q)
    );
  });

  results.sort((a, b) => {
    const aSym = a.symbol.toUpperCase();
    const bSym = b.symbol.toUpperCase();
    if (aSym === q) return -1;
    if (bSym === q) return 1;
    if (aSym.startsWith(q) && !bSym.startsWith(q)) return -1;
    if (bSym.startsWith(q) && !aSym.startsWith(q)) return 1;
    return aSym.localeCompare(bSym);
  });

  return results.slice(0, limit);
}
