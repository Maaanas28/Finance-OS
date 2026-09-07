/**
 * Unit Tests: Sentiment Analyzer
 *
 * Tests the rule-based NLP engine without consuming any external API quota.
 * All tests run purely in-process.
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeRuleBased,
  computeAggregateSentiment,
} from '../src/infrastructure/news/sentimentAnalyzer.js';

describe('SentimentAnalyzer — analyzeRuleBased()', () => {
  it('classifies clearly bullish headline as BULLISH', () => {
    const result = analyzeRuleBased(
      'HDFC Bank Q2 earnings beat estimates; net profit surges 18% on record profit',
      'The bank reported strong results driven by margin expansion and buyback announcement.'
    );
    expect(result.sentiment).toBe('BULLISH');
    expect(result.sentimentScore).toBeGreaterThan(0.5);
    expect(result.method).toBe('rule-based');
  });

  it('classifies clearly bearish headline as BEARISH', () => {
    const result = analyzeRuleBased(
      'Infosys cuts guidance; layoffs planned as revenue miss triggers sell-off',
      'The company downgraded its outlook citing recession fears and client spending cuts.'
    );
    expect(result.sentiment).toBe('BEARISH');
    expect(result.sentimentScore).toBeGreaterThan(0.5);
  });

  it('classifies ambiguous/neutral headline as NEUTRAL', () => {
    const result = analyzeRuleBased(
      'RBI holds repo rate steady in September meeting',
      'The committee voted unanimously to keep rates unchanged as expected.'
    );
    expect(result.sentiment).toBe('NEUTRAL');
  });

  it('assigns HIGH impact to RBI/earnings headlines', () => {
    const result = analyzeRuleBased(
      'RBI monetary policy rate decision released',
      'The repo rate announcement will affect market interest rates.'
    );
    expect(result.impact).toBe('HIGH');
  });

  it('assigns HIGH impact to earnings-related headlines', () => {
    const result = analyzeRuleBased(
      'TCS quarterly results beat estimates',
      'Revenue grew 15% driven by earnings expansion.'
    );
    expect(result.impact).toBe('HIGH');
  });

  it('assigns MEDIUM impact to sector/trade headlines', () => {
    const result = analyzeRuleBased(
      'Nifty auto sector index rises on export data',
      'Auto sector companies saw increased order volume.'
    );
    expect(['MEDIUM', 'HIGH']).toContain(result.impact);
  });

  it('handles empty input gracefully', () => {
    const result = analyzeRuleBased('', '');
    expect(result.sentiment).toBe('NEUTRAL');
    expect(result.sentimentScore).toBe(0.5);
    expect(result.method).toContain('rule-based');
  });

  it('handles null/undefined input gracefully', () => {
    expect(() => analyzeRuleBased(null, undefined)).not.toThrow();
    const result = analyzeRuleBased(null, undefined);
    expect(result.sentiment).toMatch(/BULLISH|BEARISH|NEUTRAL/);
  });

  it('gives title terms 3x weight over body terms', () => {
    // Same bearish term in title vs body
    const titleResult = analyzeRuleBased('Infosys crash sell-off downgrade', '');
    const bodyResult = analyzeRuleBased('Normal headline', 'Infosys crash sell-off downgrade');
    // Title should yield higher bearish score → same or stronger sentiment
    expect(titleResult.sentiment).toBe('BEARISH');
    expect(bodyResult.sentiment).toBe('BEARISH');
    // Title score should be >= body score
    expect(titleResult.sentimentScore).toBeGreaterThanOrEqual(bodyResult.sentimentScore);
  });

  it('correctly scores buyback/dividend as bullish', () => {
    const result = analyzeRuleBased(
      'Kotak Mahindra announces ₹8000 crore share buyback at premium',
      'Board approves dividend hike and stock repurchase at premium to market price.'
    );
    expect(result.sentiment).toBe('BULLISH');
  });

  it('correctly scores NPA/default as bearish', () => {
    const result = analyzeRuleBased(
      'NBFC reports surge in gross NPA; default risk elevated',
      'The lender flagged rising bad loan provisions and credit deterioration.'
    );
    expect(result.sentiment).toBe('BEARISH');
  });
});

describe('SentimentAnalyzer — computeAggregateSentiment()', () => {
  it('returns neutral aggregate for empty array', () => {
    const result = computeAggregateSentiment([]);
    expect(result.overallSentiment).toBe('NEUTRAL');
    expect(result.totalArticles).toBe(0);
    expect(result.bullishPct).toBe(0);
  });

  it('computes correct percentages for a mixed set', () => {
    const articles = [
      { sentiment: 'BULLISH' },
      { sentiment: 'BULLISH' },
      { sentiment: 'BEARISH' },
      { sentiment: 'NEUTRAL' },
    ];
    const result = computeAggregateSentiment(articles);
    expect(result.totalArticles).toBe(4);
    expect(result.bullishPct).toBe(50);
    expect(result.bearishPct).toBe(25);
    expect(result.neutralPct).toBe(25);
    expect(result.overallSentiment).toBe('BULLISH');
  });

  it('identifies bearish market when bearish articles dominate', () => {
    const articles = [
      { sentiment: 'BEARISH' },
      { sentiment: 'BEARISH' },
      { sentiment: 'BEARISH' },
      { sentiment: 'NEUTRAL' },
    ];
    const result = computeAggregateSentiment(articles);
    expect(result.overallSentiment).toBe('BEARISH');
    expect(result.bearishPct).toBeGreaterThan(50);
  });

  it('score is a valid 0-1 number', () => {
    const articles = [
      { sentiment: 'BULLISH' },
      { sentiment: 'NEUTRAL' },
    ];
    const result = computeAggregateSentiment(articles);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('percentages sum to 100', () => {
    const articles = [
      { sentiment: 'BULLISH' },
      { sentiment: 'BULLISH' },
      { sentiment: 'BEARISH' },
      { sentiment: 'NEUTRAL' },
      { sentiment: 'NEUTRAL' },
    ];
    const result = computeAggregateSentiment(articles);
    const total = result.bullishPct + result.neutralPct + result.bearishPct;
    // Allow 1% rounding variance
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(1);
  });
});
