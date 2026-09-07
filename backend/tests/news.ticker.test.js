/**
 * Unit Tests: PortfolioTickerLinker
 *
 * Tests ticker entity extraction from article text.
 * Zero external calls.
 */

import { describe, it, expect } from 'vitest';
import { extractTickers, computeTrendingTickers } from '../src/infrastructure/news/portfolioTickerLinker.js';

describe('PortfolioTickerLinker — extractTickers()', () => {
  it('extracts HDFCBANK from "HDFC Bank" mention', () => {
    const tickers = extractTickers('HDFC Bank beats Q2 earnings estimate', '');
    expect(tickers).toContain('HDFCBANK');
  });

  it('extracts TCS from company name alias', () => {
    const tickers = extractTickers('Tata Consultancy Services wins $850M contract', '');
    expect(tickers).toContain('TCS');
  });

  it('extracts RELIANCE from "ril" acronym in body', () => {
    const tickers = extractTickers('Energy sector update', 'RIL reported strong refining margins this quarter.');
    expect(tickers).toContain('RELIANCE');
  });

  it('extracts SBIN from "State Bank of India" mention', () => {
    const tickers = extractTickers('State Bank of India reports NPA decline', '');
    expect(tickers).toContain('SBIN');
  });

  it('extracts INFY from "Infosys" mention', () => {
    const tickers = extractTickers('Infosys cuts FY25 guidance', '');
    expect(tickers).toContain('INFY');
  });

  it('extracts ADANIENT from "Adani" mention', () => {
    const tickers = extractTickers('Adani Enterprises faces new scrutiny', '');
    expect(tickers).toContain('ADANIENT');
  });

  it('returns max 3 tickers', () => {
    const tickers = extractTickers(
      'HDFC Bank, TCS, and Infosys lead Nifty gains today',
      'Kotak Mahindra and Reliance also in focus.'
    );
    expect(tickers.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array for unrelated text', () => {
    const tickers = extractTickers('Weather report: Heavy rain expected in Mumbai', 'No financial stocks mentioned.');
    expect(tickers).toHaveLength(0);
  });

  it('handles empty strings gracefully', () => {
    expect(() => extractTickers('', '')).not.toThrow();
    expect(extractTickers('', '')).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const upper = extractTickers('HDFC BANK Q2 RESULTS', '');
    const lower = extractTickers('hdfc bank q2 results', '');
    expect(upper).toContain('HDFCBANK');
    expect(lower).toContain('HDFCBANK');
  });
});

describe('PortfolioTickerLinker — computeTrendingTickers()', () => {
  it('counts mentions across articles', () => {
    const articles = [
      { relatedTickers: ['HDFCBANK', 'TCS'] },
      { relatedTickers: ['HDFCBANK', 'INFY'] },
      { relatedTickers: ['TCS'] },
    ];
    const trending = computeTrendingTickers(articles);
    const hdfcEntry = trending.find((t) => t.symbol === 'HDFCBANK');
    const tcsEntry = trending.find((t) => t.symbol === 'TCS');
    expect(hdfcEntry?.mentions).toBe(2);
    expect(tcsEntry?.mentions).toBe(2);
  });

  it('sorts by mention count descending', () => {
    const articles = [
      { relatedTickers: ['TCS', 'INFY'] },
      { relatedTickers: ['TCS'] },
      { relatedTickers: ['HDFCBANK'] },
    ];
    const trending = computeTrendingTickers(articles);
    expect(trending[0].symbol).toBe('TCS');
    expect(trending[0].mentions).toBe(2);
  });

  it('returns empty array for empty input', () => {
    expect(computeTrendingTickers([])).toHaveLength(0);
  });

  it('returns max 10 tickers', () => {
    const articles = Array.from({ length: 20 }, (_, i) => ({
      relatedTickers: [`TICKER${i}`, `TICKER${i + 1}`],
    }));
    const trending = computeTrendingTickers(articles);
    expect(trending.length).toBeLessThanOrEqual(10);
  });
});
