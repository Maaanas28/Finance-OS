/**
 * Finance OS — Security Master Universe (India Equities & Key Indices)
 *
 * A comprehensive local repository of 100+ major Indian equities and market indices
 * categorized by sector, exchange, and asset type.
 * Zero external API cost, instant local search and symbol resolution.
 */

export const INDIAN_SECURITY_UNIVERSE = [
  // ─── MARKET INDICES ────────────────────────────────────────────────────────
  { symbol: 'NIFTY 50', name: 'Nifty 50 Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR', displaySymbol: 'NIFTY 50' },
  { symbol: 'SENSEX', name: 'BSE Sensex Index', exchange: 'BSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR', displaySymbol: 'SENSEX' },
  { symbol: 'NIFTY BANK', name: 'Nifty Bank Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR', displaySymbol: 'BANKNIFTY' },
  { symbol: 'NIFTY IT', name: 'Nifty IT Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR', displaySymbol: 'NIFTYIT' },
  { symbol: 'NIFTY AUTO', name: 'Nifty Auto Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR', displaySymbol: 'NIFTYAUTO' },
  { symbol: 'NIFTY PHARMA', name: 'Nifty Pharma Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR', displaySymbol: 'NIFTYPHARMA' },
  { symbol: 'NIFTY FMCG', name: 'Nifty FMCG Index', exchange: 'NSE', sector: 'Indices', assetType: 'INDEX', currency: 'INR', displaySymbol: 'NIFTYFMCG' },

  // ─── BANKING & FINANCIAL SERVICES ──────────────────────────────────────────
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'PNB', name: 'Punjab National Bank', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment & Finance', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'JIOFIN', name: 'Jio Financial Services Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'FEDERALBNK', name: 'Federal Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'LICHSGFIN', name: 'LIC Housing Finance Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'RECLTD', name: 'REC Limited', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'PFC', name: 'Power Finance Corporation', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },

  // ─── IT & SOFTWARE SERVICES ────────────────────────────────────────────────
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'COFORGE', name: 'Coforge Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'MPHASIS', name: 'Mphasis Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'KPITTECH', name: 'KPIT Technologies Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'TATAELXSI', name: 'Tata Elxsi Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'LTTS', name: 'L&T Technology Services Ltd', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },

  // ─── AUTOMOTIVE & MOBILITY ──────────────────────────────────────────────────
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BHARATFORG', name: 'Bharat Forge Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'BOSCHLTD', name: 'Bosch Ltd', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'MOTHERSON', name: 'Samvardhana Motherson International', exchange: 'NSE', sector: 'Automotive', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },

  // ─── OIL, GAS & ENERGY ──────────────────────────────────────────────────────
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'NTPC', name: 'NTPC Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ADANIPOWER', name: 'Adani Power Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'SUZLON', name: 'Suzlon Energy Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'NHPC', name: 'NHPC Ltd', exchange: 'NSE', sector: 'Energy', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },

  // ─── PHARMACEUTICALS & HEALTHCARE ───────────────────────────────────────────
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd", exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'CIPLA', name: 'Cipla Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories Ltd", exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'LUPIN', name: 'Lupin Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'MAXHEALTH', name: 'Max Healthcare Institute Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'TORNTPHARM', name: 'Torrent Pharmaceuticals Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'MANKIND', name: 'Mankind Pharma Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ZYDUSLIFE', name: 'Zydus Lifesciences Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd', exchange: 'NSE', sector: 'Healthcare', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },

  // ─── FMCG & CONSUMER PRODUCTS ───────────────────────────────────────────────
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'GODREJCP', name: 'Godrej Consumer Products Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'DABUR', name: 'Dabur India Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'VBL', name: 'Varun Beverages Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'COLPAL', name: 'Colgate-Palmolive (India) Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'MARICO', name: 'Marico Ltd', exchange: 'NSE', sector: 'FMCG', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },

  // ─── METALS & MINING ────────────────────────────────────────────────────────
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'VEDL', name: 'Vedanta Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'NMDC', name: 'NMDC Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'NATIONALUM', name: 'National Aluminium Co Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'SAIL', name: 'Steel Authority of India Ltd', exchange: 'NSE', sector: 'Metals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },

  // ─── INFRASTRUCTURE, INDUSTRIALS & REAL ESTATE ──────────────────────────────
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'SIEMENS', name: 'Siemens Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ABB', name: 'ABB India Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'DLF', name: 'DLF Ltd', exchange: 'NSE', sector: 'Real Estate', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'GMRINFRA', name: 'GMR Airports Infrastructure Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'IRCTC', name: 'Indian Railway Catering & Tourism', exchange: 'NSE', sector: 'Services', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'CONCOR', name: 'Container Corporation of India', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'GODREJPROP', name: 'Godrej Properties Ltd', exchange: 'NSE', sector: 'Real Estate', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'OBEROIRLTY', name: 'Oberoi Realty Ltd', exchange: 'NSE', sector: 'Real Estate', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },

  // ─── TELECOM & CONSUMER DISCRETIONARY ───────────────────────────────────────
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', sector: 'Telecom', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'TITAN', name: 'Titan Company Ltd', exchange: 'NSE', sector: 'Consumer Discretionary', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', exchange: 'NSE', sector: 'Consumer Discretionary', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'BERGEPAINT', name: 'Berger Paints India Ltd', exchange: 'NSE', sector: 'Consumer Discretionary', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'HAVELLES', name: 'Havells India Ltd', exchange: 'NSE', sector: 'Consumer Discretionary', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'POLYCAB', name: 'Polycab India Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd', exchange: 'NSE', sector: 'Chemicals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'SRF', name: 'SRF Ltd', exchange: 'NSE', sector: 'Chemicals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },

  // ─── CEMENT, MATERIALS & CHEMICALS ──────────────────────────────────────────
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', exchange: 'NSE', sector: 'Materials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd', exchange: 'NSE', sector: 'Materials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'AMBUJACEM', name: 'Ambuja Cements Ltd', exchange: 'NSE', sector: 'Materials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ACC', name: 'ACC Ltd', exchange: 'NSE', sector: 'Materials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'PIIND', name: 'PI Industries Ltd', exchange: 'NSE', sector: 'Chemicals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'UPL', name: 'UPL Ltd', exchange: 'NSE', sector: 'Chemicals', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },

  // ─── RETAIL & NEW AGE TECH ─────────────────────────────────────────────────
  { symbol: 'TRENT', name: 'Trent Ltd', exchange: 'NSE', sector: 'Retail', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'DMART', name: 'Avenue Supermarts Ltd', exchange: 'NSE', sector: 'Retail', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'ZOMATO', name: 'Zomato Ltd (Eternal Ltd)', exchange: 'NSE', sector: 'Technology', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'LARGE_CAP' },
  { symbol: 'PAYTM', name: 'One97 Communications Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'NYKAA', name: 'FSN E-Commerce Ventures Ltd', exchange: 'NSE', sector: 'Retail', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'POLICYBZR', name: 'PB Fintech Ltd', exchange: 'NSE', sector: 'Financials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' },
  { symbol: 'DELHIVERY', name: 'Delhivery Ltd', exchange: 'NSE', sector: 'Industrials', assetType: 'EQUITY', currency: 'INR', marketCapCategory: 'MID_CAP' }
];

/**
 * Searches the local security universe for matching symbols or names.
 */
export function searchSecurityUniverse(query, limit = 25) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const matches = INDIAN_SECURITY_UNIVERSE.filter((sec) => {
    return (
      sec.symbol.toUpperCase().includes(q) ||
      sec.name.toUpperCase().includes(q) ||
      (sec.displaySymbol && sec.displaySymbol.toUpperCase().includes(q))
    );
  });

  matches.sort((a, b) => {
    const aSym = a.symbol.toUpperCase();
    const bSym = b.symbol.toUpperCase();
    if (aSym === q) return -1;
    if (bSym === q) return 1;
    if (aSym.startsWith(q) && !bSym.startsWith(q)) return -1;
    if (bSym.startsWith(q) && !aSym.startsWith(q)) return 1;
    return aSym.localeCompare(bSym);
  });

  return matches.slice(0, limit);
}
