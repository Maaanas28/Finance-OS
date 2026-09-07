/**
 * NewsProvider Interface + MockNewsProvider
 *
 * MockNewsProvider: 12 rich, realistic articles covering all categories —
 * used as the guaranteed fallback when RSS feeds are unreachable.
 * Articles simulate real-world financial news with proper sentiment tagging.
 */

import { logger } from '../../utils/logger.js';
import { analyzeRuleBased } from '../news/sentimentAnalyzer.js';
import { extractTickers } from '../news/portfolioTickerLinker.js';

// ─── Base Interface ───────────────────────────────────────────────────────────

export class NewsProvider {
  async getLatestNews(category = 'all', limit = 10) {
    throw new Error('Method getLatestNews() must be implemented');
  }
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RAW_ARTICLES = [
  {
    title: 'RBI Monetary Policy Committee Holds Repo Rate at 6.50%; Governor Signals Data-Dependent Path',
    description: 'The Reserve Bank of India kept its benchmark repo rate unchanged at 6.50% for the seventh consecutive meeting, maintaining its stance of withdrawal of accommodation while monitoring the inflation trajectory. Governor Das signaled a data-dependent approach ahead of the festive season demand surge.',
    category: 'MACRO',
    source: 'RBI Policy Wire',
    url: 'https://example.com/rbi-mpc-repo-rate',
    pubDate: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'HDFC Bank Quarterly Profits Beat Estimates; Net Interest Margin Expands to 4.3%',
    description: 'HDFC Bank reported a net profit of ₹16,735 crore for Q2, beating analyst estimates by 6.2%. Net interest income rose 18.5% year-on-year, driven by loan book expansion of 15% and improved cost-of-funds after the merger integration synergies. Management raised FY25 guidance.',
    category: 'EQUITIES',
    source: 'Financial Intelligence Wire',
    url: 'https://example.com/hdfcbank-q2-results',
    pubDate: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'Federal Reserve Minutes Signal Pause; Treasury Yields Fall 8 Basis Points',
    description: 'FOMC meeting minutes released Wednesday showed broad consensus for holding the federal funds rate steady amid cooling labour market data and moderating PCE inflation. The 10-year Treasury yield fell to 4.21%, its lowest in six weeks, supporting risk asset valuations globally.',
    category: 'GLOBAL',
    source: 'Global Markets Desk',
    url: 'https://example.com/fed-minutes-pause',
    pubDate: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'TCS Wins $850 Million Multi-Year Digital Transformation Contract with European Bank',
    description: 'Tata Consultancy Services announced a landmark $850 million, seven-year contract with a tier-1 European bank for end-to-end core banking modernisation, cloud migration, and AI-powered risk analytics. Management expects margin accretion of 40–60 basis points from FY26.',
    category: 'EQUITIES',
    source: 'IT Sector Intelligence',
    url: 'https://example.com/tcs-european-bank-deal',
    pubDate: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'SEBI Tightens F&O Framework: New Lot Sizes, Weekly Expiry Curbs Take Effect',
    description: 'The Securities and Exchange Board of India has implemented new derivatives regulations effective October 1, significantly increasing lot sizes across major equity indices to reduce retail speculation. Weekly expiry contracts are now restricted to two indices — Nifty and Sensex — down from nine. FII flows may shift.',
    category: 'MARKETS',
    source: 'SEBI Regulatory Desk',
    url: 'https://example.com/sebi-fno-framework',
    pubDate: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'Reliance Industries Announces ₹75,000 Crore Capex for Green Energy Vertical Over Three Years',
    description: 'Reliance Industries has accelerated its clean energy roadmap, committing ₹75,000 crore over the next three years for solar gigafactory expansion, green hydrogen production facilities, and battery storage integration. Jio-bp fuel retail network will transition to hydrogen dispensing by 2027.',
    category: 'EQUITIES',
    source: 'Corporate Strategy Wire',
    url: 'https://example.com/reliance-green-capex',
    pubDate: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'Adani Group Faces Fresh Short-Seller Report; Stocks Decline 4–8% in Early Trade',
    description: 'A new research report by an anonymous short-selling firm alleging related-party transactions and inflated EBITDA figures across three Adani Group entities triggered heavy selling across the conglomerate. Adani Enterprises fell 7.3%, Adani Ports declined 4.1%. Group management issued a categorical denial and pledged a point-by-point rebuttal.',
    category: 'MARKETS',
    source: 'Market Intelligence Terminal',
    url: 'https://example.com/adani-short-seller-report',
    pubDate: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'India GDP Growth Forecast Raised to 7.2% for FY25 by IMF; Domestic Consumption Drives Beat',
    description: 'The International Monetary Fund revised India GDP growth upward to 7.2% for FY2024–25, citing resilient domestic consumption, a robust services export pipeline, and accelerating government capital expenditure. India is now the fastest-growing major economy, exceeding both China (4.8%) and Indonesia (5.1%).',
    category: 'ECONOMY',
    source: 'Macro Intelligence Feed',
    url: 'https://example.com/imf-india-gdp-7-2',
    pubDate: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'Bajaj Finance Q2 AUM Crosses ₹3.7 Lakh Crore; Gross NPA Remains Contained at 0.83%',
    description: 'Bajaj Finance reported its assets under management crossed ₹3.7 lakh crore in Q2 FY25, growing 31% year-on-year. The consumer lending giant maintained asset quality with gross NPA at 0.83%, despite tighter RBI FLDG guidelines. New customer acquisitions hit a record 4.2 million this quarter.',
    category: 'EQUITIES',
    source: 'NBFC Sector Desk',
    url: 'https://example.com/bajaj-finance-q2-aum',
    pubDate: new Date(Date.now() - 420 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'Infosys Lowers Revenue Growth Guidance to 3.75–4.5% Citing Discretionary Spending Cuts by Clients',
    description: 'Infosys cut its FY25 constant-currency revenue growth guidance from 4–7% to 3.75–4.5%, citing client caution on discretionary technology transformation spending. Headcount was reduced by 2,400 in Q2. Operating margins held at 21.1% on cost optimisation. CEO Salil Parekh highlighted strong deal wins of $4.1 billion TCV as a leading indicator.',
    category: 'EQUITIES',
    source: 'IT Sector Intelligence',
    url: 'https://example.com/infosys-guidance-cut',
    pubDate: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'Oil Prices Spike 3.8% on Middle East Supply Risk Premium; Brent Crude at $89.4/bbl',
    description: 'Brent crude futures surged 3.8% to $89.4 per barrel following escalating geopolitical tensions that threaten shipping routes through the Strait of Hormuz. Energy economists warn of a sustained $5–8 risk premium if supply disruptions materialise. India, which imports 85% of its crude requirements, faces a potential ₹40,000 crore additional subsidy burden.',
    category: 'MACRO',
    source: 'Commodities Intelligence Desk',
    url: 'https://example.com/oil-price-spike-geopolitical',
    pubDate: new Date(Date.now() - 540 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
  {
    title: 'Kotak Mahindra Bank Announces ₹8,000 Crore Share Buyback at ₹1,950 Premium to Market',
    description: 'Kotak Mahindra Bank\'s board approved a ₹8,000 crore share buyback programme at ₹1,950 per share, a 12% premium to the last closing price. The bank\'s capital adequacy ratio of 21.8% provides headroom for the return of capital while maintaining growth investments in digital banking and the credit card vertical.',
    category: 'EQUITIES',
    source: 'Corporate Actions Desk',
    url: 'https://example.com/kotak-buyback-8000cr',
    pubDate: new Date(Date.now() - 600 * 60 * 1000).toISOString(),
    imageUrl: null,
  },
];

// ─── Mock Provider ────────────────────────────────────────────────────────────

export class MockNewsProvider extends NewsProvider {
  constructor() {
    super();
    this.name = 'MockNewsProvider';
    // Pre-build normalized articles from raw data
    this._articles = MOCK_RAW_ARTICLES.map((raw, idx) => {
      const { sentiment, sentimentScore, impact, method } = analyzeRuleBased(raw.title, raw.description);
      const relatedTickers = extractTickers(raw.title, raw.description);
      return {
        id: `mock-news-${String(idx + 1).padStart(3, '0')}`,
        title: raw.title,
        summary: raw.description.substring(0, 300),
        url: raw.url,
        source: raw.source,
        category: raw.category,
        publishedAt: raw.pubDate,
        imageUrl: raw.imageUrl,
        sentiment,
        sentimentScore,
        impact,
        sentimentMethod: method,
        relatedTickers,
        dataSource: 'MOCK',
      };
    });
  }

  async getLatestNews(category = 'all', limit = 10) {
    const cat = (category || 'all').toUpperCase();
    let articles = this._articles;

    if (cat !== 'ALL') {
      articles = articles.filter((a) => a.category === cat);
    }

    return articles.slice(0, limit);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createNewsProvider(providerType = 'mock') {
  logger.info(`News Provider instantiated: [${providerType.toUpperCase()}]`);
  return new MockNewsProvider();
}

export const newsProvider = createNewsProvider();
