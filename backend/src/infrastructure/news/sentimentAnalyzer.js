/**
 * Sentiment Analyzer — Financial NLP Engine
 *
 * Two-layer analysis:
 *   Layer 1: Rule-based keyword scoring (always available, zero cost, zero external calls)
 *   Layer 2: AI enrichment via existing AIProvider (optional — only when configured)
 *
 * Produces: sentiment ('BULLISH' | 'BEARISH' | 'NEUTRAL'), score (0.0–1.0), impact ('HIGH'|'MEDIUM'|'LOW')
 */

import { logger } from '../../utils/logger.js';

// ─── Lexicon ──────────────────────────────────────────────────────────────────

const BULLISH_TERMS = new Set([
  // Earnings & Financials
  'earnings beat', 'profit surge', 'record profit', 'revenue beat', 'beats estimates',
  'strong results', 'better than expected', 'exceeds expectations', 'raises guidance',
  'raised guidance', 'upgrades guidance', 'dividend', 'dividend hike', 'dividend increase',
  'special dividend', 'buyback', 'share buyback', 'stock repurchase', 'bonus shares',
  'rights issue oversubscribed', 'ipo oversubscribed', 'strong demand',
  // Growth & Expansion
  'expansion', 'acquisition', 'merger', 'strategic acquisition', 'order win', 'order book',
  'new contract', 'contract win', 'market share gain', 'capacity expansion', 'capex',
  'joint venture', 'partnership', 'investment', 'upgrade', 'upgraded', 'outperform',
  'buy rating', 'strong buy', 'target price raised', 'price target raised',
  // Macro Positive
  'rate cut', 'interest rate cut', 'stimulus', 'fiscal stimulus', 'repo rate cut',
  'inflation eases', 'inflation drops', 'gdp growth', 'strong gdp', 'fii inflow',
  'foreign inflow', 'dii buying', 'rally', 'surge', 'bullish', 'breakout', 'recovery',
  'rebound', 'bounce back', 'positive outlook', 'optimistic', 'strong earnings',
  'margin expansion', 'ebitda growth', 'net profit rises', 'profit rises', 'jumps',
  'soars', 'all-time high', 'record high', 'trading higher', 'gains',
]);

const BEARISH_TERMS = new Set([
  // Losses & Declines
  'profit warning', 'earnings miss', 'revenue miss', 'misses estimates', 'below expectations',
  'cuts guidance', 'revised lower', 'guidance cut', 'net loss', 'wider loss', 'loss widens',
  'defaults', 'default risk', 'insolvency', 'bankruptcy', 'npa', 'bad loan',
  // Market Pressure
  'downgrade', 'downgraded', 'sell rating', 'underperform', 'reduce rating',
  'target price cut', 'price target reduced', 'margin squeeze', 'margin pressure',
  'cost pressure', 'headwinds', 'challenges', 'slowdown', 'contraction',
  'layoffs', 'job cuts', 'workforce reduction', 'retrenchment',
  // Macro Negative
  'rate hike', 'interest rate hike', 'repo rate hike', 'inflation surge', 'stagflation',
  'recession', 'economic slowdown', 'fii outflow', 'foreign outflow', 'capital flight',
  'sell-off', 'selloff', 'crash', 'plunges', 'tumbles', 'falls sharply', 'decline',
  'correction', 'bear market', 'weakness', 'pressure', 'concerned', 'worry', 'fears',
  'sanctions', 'trade war', 'tariff', 'geopolitical', 'conflict', 'crisis',
  'current account deficit', 'fiscal deficit widens',
]);

const HIGH_IMPACT_TERMS = new Set([
  'rbi', 'federal reserve', 'fed', 'sebi', 'budget', 'monetary policy', 'repo rate',
  'interest rate', 'inflation', 'gdp', 'earnings', 'result', 'quarterly result',
  'acquisition', 'merger', 'ipo', 'fpo', 'bankruptcy', 'default', 'npa', 'rate cut',
  'rate hike', 'stimulus', 'global markets', 'sensex', 'nifty',
]);

const MEDIUM_IMPACT_TERMS = new Set([
  'trade', 'export', 'import', 'production', 'output', 'capacity', 'order', 'contract',
  'partnership', 'launch', 'product', 'sector', 'industry', 'index', 'market', 'stock',
  'share price', 'volume', 'analyst', 'report', 'forecast', 'outlook',
]);

// ─── Core Scoring ─────────────────────────────────────────────────────────────

/**
 * Score a text string against a lexicon set.
 * Title matches carry 3× weight over body matches.
 * @param {string} title
 * @param {string} body
 * @returns {{ bullishScore: number, bearishScore: number, impact: string }}
 */
function scoreText(title = '', body = '') {
  const titleLower = title.toLowerCase();
  const bodyLower = body.toLowerCase();

  let bullishScore = 0;
  let bearishScore = 0;

  for (const term of BULLISH_TERMS) {
    const titleHits = (titleLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const bodyHits = (bodyLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    bullishScore += titleHits * 3 + bodyHits;
  }

  for (const term of BEARISH_TERMS) {
    const titleHits = (titleLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const bodyHits = (bodyLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    bearishScore += titleHits * 3 + bodyHits;
  }

  // Determine impact level
  const combinedText = `${titleLower} ${bodyLower}`;
  let impact = 'LOW';
  for (const term of MEDIUM_IMPACT_TERMS) {
    if (combinedText.includes(term)) { impact = 'MEDIUM'; break; }
  }
  for (const term of HIGH_IMPACT_TERMS) {
    if (combinedText.includes(term)) { impact = 'HIGH'; break; }
  }

  return { bullishScore, bearishScore, impact };
}

/**
 * Classify sentiment and compute confidence score from raw bullish/bearish scores.
 * @param {number} bullishScore
 * @param {number} bearishScore
 * @returns {{ sentiment: string, sentimentScore: number }}
 */
function classify(bullishScore, bearishScore) {
  const total = bullishScore + bearishScore;

  if (total === 0) {
    return { sentiment: 'NEUTRAL', sentimentScore: 0.5 };
  }

  const bullishRatio = bullishScore / total;
  const bearishRatio = bearishScore / total;

  let sentiment;
  let sentimentScore;

  if (bullishRatio >= 0.6) {
    sentiment = 'BULLISH';
    sentimentScore = Math.min(0.95, 0.55 + (bullishRatio - 0.6) * 1.5);
  } else if (bearishRatio >= 0.6) {
    sentiment = 'BEARISH';
    sentimentScore = Math.min(0.95, 0.55 + (bearishRatio - 0.6) * 1.5);
  } else {
    sentiment = 'NEUTRAL';
    sentimentScore = 0.5;
  }

  return { sentiment, sentimentScore: parseFloat(sentimentScore.toFixed(2)) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Rule-based sentiment analysis — always available, zero external calls.
 * @param {string} title
 * @param {string} body
 * @returns {{ sentiment: string, sentimentScore: number, impact: string, method: string }}
 */
export function analyzeRuleBased(title, body = '') {
  try {
    const { bullishScore, bearishScore, impact } = scoreText(title, body);
    const { sentiment, sentimentScore } = classify(bullishScore, bearishScore);

    return {
      sentiment,
      sentimentScore,
      impact,
      method: 'rule-based',
      debug: { bullishScore, bearishScore },
    };
  } catch (err) {
    logger.warn('[SentimentAnalyzer] Rule-based analysis error:', { error: err.message });
    return { sentiment: 'NEUTRAL', sentimentScore: 0.5, impact: 'LOW', method: 'rule-based-fallback' };
  }
}

/**
 * Optional AI enrichment layer. Only called if:
 *   - AI provider is configured and not mock
 *   - Article is HIGH impact
 *   - aiProvider is passed in
 *
 * Falls back to rule-based result on any error — never throws.
 *
 * @param {string} title
 * @param {string} body
 * @param {object} ruleBasedResult - result from analyzeRuleBased()
 * @param {object|null} aiProvider - optional AIProvider instance
 * @returns {Promise<object>}
 */
export async function analyzeWithAI(title, body, ruleBasedResult, aiProvider = null) {
  if (!aiProvider || typeof aiProvider.generateFinancialInsight !== 'function') {
    return { ...ruleBasedResult, method: 'rule-based' };
  }

  // Only spend AI quota on high-impact articles
  if (ruleBasedResult.impact !== 'HIGH') {
    return { ...ruleBasedResult, method: 'rule-based' };
  }

  try {
    const context = {
      newsHeadline: title,
      newsSummary: body.substring(0, 300),
      analysisType: 'news_sentiment',
    };

    // Use a lightweight prompt via generateFinancialInsight
    const aiResult = await aiProvider.generateFinancialInsight(context);

    if (aiResult && aiResult.sentiment) {
      const aiSentiment = aiResult.sentiment.toUpperCase();
      const validSentiments = ['BULLISH', 'BEARISH', 'NEUTRAL', 'CAUTIONARY'];
      const mappedSentiment = aiSentiment === 'CAUTIONARY' ? 'NEUTRAL' : aiSentiment;

      if (validSentiments.includes(aiSentiment)) {
        return {
          sentiment: validSentiments.includes(mappedSentiment) ? mappedSentiment : ruleBasedResult.sentiment,
          sentimentScore: parseFloat((aiResult.confidence || ruleBasedResult.sentimentScore).toFixed(2)),
          impact: ruleBasedResult.impact,
          method: 'ai-enriched',
          aiProvider: aiResult.provider || 'ai',
        };
      }
    }

    return { ...ruleBasedResult, method: 'rule-based' };
  } catch (err) {
    logger.debug('[SentimentAnalyzer] AI enrichment failed, using rule-based result:', { error: err.message });
    return { ...ruleBasedResult, method: 'rule-based' };
  }
}

/**
 * Compute aggregate sentiment summary across a list of articles.
 * @param {object[]} articles - NewsArticle objects with sentiment field
 * @returns {{ bullishPct: number, neutralPct: number, bearishPct: number, overallSentiment: string, score: number, totalArticles: number }}
 */
export function computeAggregateSentiment(articles = []) {
  if (articles.length === 0) {
    return { bullishPct: 0, neutralPct: 100, bearishPct: 0, overallSentiment: 'NEUTRAL', score: 0.5, totalArticles: 0 };
  }

  const counts = { BULLISH: 0, NEUTRAL: 0, BEARISH: 0 };
  for (const article of articles) {
    const s = article.sentiment || 'NEUTRAL';
    counts[s] = (counts[s] || 0) + 1;
  }

  const total = articles.length;
  const bullishPct = Math.round((counts.BULLISH / total) * 100);
  const bearishPct = Math.round((counts.BEARISH / total) * 100);
  const neutralPct = 100 - bullishPct - bearishPct;

  // Weighted score: bullish=1, neutral=0.5, bearish=0
  const score = parseFloat(
    ((counts.BULLISH * 1 + counts.NEUTRAL * 0.5 + counts.BEARISH * 0) / total).toFixed(2)
  );

  let overallSentiment = 'NEUTRAL';
  if (bullishPct > bearishPct + 10) overallSentiment = 'BULLISH';
  else if (bearishPct > bullishPct + 10) overallSentiment = 'BEARISH';

  return {
    bullishPct,
    neutralPct,
    bearishPct,
    overallSentiment,
    score,
    totalArticles: total,
  };
}
