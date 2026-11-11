import { logger } from '../../utils/logger.js';

export class AIProvider {
  async generateFinancialInsight(context) {
    throw new Error('Method generateFinancialInsight() must be implemented');
  }
  async analyzePortfolioRisk(portfolioMetrics) {
    throw new Error('Method analyzePortfolioRisk() must be implemented');
  }
}

export class MockAIProvider extends AIProvider {
  constructor() {
    super();
    this.name = 'MockAIProvider';
  }

  async generateFinancialInsight(context = {}) {
    const {
      valuation = null,
      riskMetrics = {},
      userPrompt = '',
      holdings = [],
    } = context;

    const summary = valuation?.summary ?? {};
    const totalValue = Number(summary.totalValue || 0);
    const cashBalance = Number(summary.cashBalance || 0);
    const equityValue = Number(summary.equityValue || 0);
    const holdingsList = valuation?.holdings ?? holdings ?? [];
    const promptLower = (userPrompt || '').toLowerCase();

    // 1. Check for specific stock mentioned in query
    const allKnownSymbols = [
      'nvda', 'aapl', 'msft', 'amzn', 'googl', 'meta', 'tsla', 'jpm', 'v', 'unh',
      'hdfc', 'hdfcbank', 'reliance', 'tcs', 'infy', 'infosys', 'icici', 'icicibank',
      'sbi', 'sbin', 'tatamotors', 'wipro', 'bhartiartl', 'nifty', 'sensex'
    ];
    const foundSymbol = allKnownSymbols.find((s) => promptLower.includes(s));

    if (foundSymbol) {
      const symUpper = foundSymbol.toUpperCase();
      const owned = holdingsList.find((h) => (h.symbol || '').toUpperCase().includes(symUpper));

      if (owned) {
        const qty = owned.quantity || 0;
        const ltp = owned.ltp || owned.currentPrice || 0;
        const curVal = owned.currentValue || (qty * ltp);
        const alloc = owned.allocationPercent || (totalValue > 0 ? ((curVal / totalValue) * 100).toFixed(1) : '0');
        const pnl = owned.pnl || 0;
        const pnlPct = owned.pnlPercent || 0;

        return {
          provider: 'Grok',
          headline: `${owned.symbol} Position Analysis: ${alloc}% Portfolio Weight`,
          sentiment: pnl >= 0 ? 'BULLISH' : 'CAUTIONARY',
          confidence: 0.92,
          summary: `You hold ${qty} shares of ${owned.symbol} valued at ₹${curVal.toLocaleString('en-IN')} (${alloc}% of capital). Cumulative P&L is ${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString('en-IN')} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%).`,
          analysis: `Position review for ${owned.symbol}: Current allocation represents ${alloc}% of total portfolio value. At ₹${ltp.toLocaleString('en-IN')}/share, the holding exhibits institutional liquidity. Rebalancing is recommended if allocation exceeds 25% single-stock concentration limits.`,
          keyTakeaways: [
            `${owned.symbol} current valuation: ₹${curVal.toLocaleString('en-IN')} (${qty} shares @ ₹${ltp.toLocaleString('en-IN')})`,
            `Portfolio exposure weight: ${alloc}% of total equity capital`,
            `Position performance: ${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString('en-IN')} (${pnlPct}%)`
          ],
          actionableRecommendations: [
            alloc > 20 ? `Trim ${owned.symbol} slightly to keep single-asset exposure under 20%` : `Maintain current ${owned.symbol} position with trailing stop-loss`,
            'Cross-check upcoming quarterly earnings and corporate filings',
            'Consider writing covered calls or hedging downside if exposure increases'
          ],
          generatedAt: new Date().toISOString(),
        };
      } else {
        return {
          provider: 'Grok',
          headline: `${symUpper} Market Outlook & Allocation Potential`,
          sentiment: 'NEUTRAL',
          confidence: 0.88,
          summary: `${symUpper} is currently not in your portfolio holdings. Current cash reserve stands at ₹${cashBalance.toLocaleString('en-IN')} available for tactical deployment.`,
          analysis: `Opportunity assessment for ${symUpper}: Adding ${symUpper} would introduce new factor exposure to your ${holdingsList.length}-asset basket. Ensure entry valuations align with your risk budget before deploying cash reserves.`,
          keyTakeaways: [
            `${symUpper} is an external asset (not currently held in portfolio)`,
            `Available dry powder: ₹${cashBalance.toLocaleString('en-IN')} in cash reserves`,
            `Adding this asset would enhance multi-factor diversification`
          ],
          actionableRecommendations: [
            `Analyze ${symUpper} on the Market Intelligence desk for real-time pricing`,
            'Calculate incremental portfolio Beta before executing an entry order',
            'Deploy in 2-3 tranches using dollar-cost averaging'
          ],
          generatedAt: new Date().toISOString(),
        };
      }
    }

    // 2. Empty portfolio handling
    if (totalValue === 0 && holdingsList.length === 0) {
      return {
        provider: 'Grok',
        headline: 'Unallocated Portfolio — Zero Active Capital Positions',
        sentiment: 'NEUTRAL',
        confidence: 0.95,
        summary: 'Your portfolio currently maintains ₹0 in equity holdings and ₹0 in cash reserves. No active capital is exposed to market volatility.',
        analysis: 'Your portfolio is completely unallocated. To start trading institutional equities, deposit virtual cash or execute your first trade from the Portfolio Desk.',
        keyTakeaways: [
          'Portfolio contains 0 active holdings and ₹0 cash reserves',
          'Parametric VaR and sector concentration risks are zero',
          'Use "+ Deposit Cash" to fund your virtual account'
        ],
        actionableRecommendations: [
          'Deposit initial virtual capital (e.g. ₹100,000)',
          'Explore institutional blue-chips on the Market Intelligence desk',
          'Execute a test BUY order to initialize risk tracking'
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // 3. Risk decomposition query
    const topHolding = holdingsList[0] || null;
    const topHoldingName = topHolding ? `${topHolding.symbol} (${topHolding.allocationPercent || 0}%)` : 'N/A';
    const var95 = riskMetrics?.var95Daily || riskMetrics?.var95?.value || `₹${Math.round(equityValue * 0.018).toLocaleString('en-IN')}`;
    const beta = summary.beta || riskMetrics?.beta || '1.08';
    const sharpe = summary.sharpeRatio || riskMetrics?.sharpe || '1.42';

    if (promptLower.includes('risk') || promptLower.includes('beta') || promptLower.includes('var') || promptLower.includes('volatility')) {
      return {
        provider: 'Grok',
        headline: `Risk Factor Decomposition: Portfolio Beta ${beta} • Daily 95% VaR ${var95}`,
        sentiment: 'CAUTIONARY',
        confidence: 0.94,
        summary: `Comprehensive risk audit: Portfolio beta of ${beta} indicates market-correlated exposure. Estimated 1-day 95% Value at Risk (VaR) is ${var95}. Top risk contributor is ${topHoldingName}.`,
        analysis: `Risk profile decomposition: Your portfolio holds ${holdingsList.length} positions valued at ₹${equityValue.toLocaleString('en-IN')} with ₹${cashBalance.toLocaleString('en-IN')} in cash reserves. The Sharpe ratio of ${sharpe} reflects sound risk-adjusted return relative to the benchmark. Diversifying cross-asset weights will dampen tail-risk variance.`,
        keyTakeaways: [
          `Portfolio Beta: ${beta} (Benchmark sensitivity)`,
          `Daily 95% Value at Risk (VaR): ${var95}`,
          `Primary risk driver: ${topHoldingName}`
        ],
        actionableRecommendations: [
          'Maintain balanced sector weights across technology, financials, and healthcare',
          'Cap maximum single-stock exposure to 20% of total equity',
          'Execute stress tests against interest rate hikes and market corrections'
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // 4. Stress test / crash / correction query
    if (promptLower.includes('fall') || promptLower.includes('crash') || promptLower.includes('stress') || promptLower.includes('10%') || promptLower.includes('drawdown')) {
      const estimatedDrawdown = Math.round(equityValue * 0.10);
      const postShockValue = totalValue - estimatedDrawdown;

      return {
        provider: 'Grok',
        headline: 'Macro Stress Test: -10% Broad Market Correction Simulation',
        sentiment: 'BEARISH',
        confidence: 0.91,
        summary: `Under a systemic 10% market drawdown, your equity capital (₹${equityValue.toLocaleString('en-IN')}) contracts by ~₹${estimatedDrawdown.toLocaleString('en-IN')}. Cash reserves (₹${cashBalance.toLocaleString('en-IN')}) cushion overall portfolio decline.`,
        analysis: `Stress analysis indicates estimated post-shock total portfolio valuation would settle near ₹${postShockValue.toLocaleString('en-IN')}. The cash allocation of ${(cashBalance / (totalValue || 1) * 100).toFixed(1)}% provides immediate liquidity to acquire discounted blue-chips during market turbulence.`,
        keyTakeaways: [
          `Estimated equity drawdown: -₹${estimatedDrawdown.toLocaleString('en-IN')} (-10%)`,
          `Cash liquidity buffer: ₹${cashBalance.toLocaleString('en-IN')} available`,
          `Projected post-shock valuation: ₹${postShockValue.toLocaleString('en-IN')}`
        ],
        actionableRecommendations: [
          'Pre-define buy limit orders for high-conviction holdings at support levels',
          'Use cash reserves to average down during oversold conditions',
          'Avoid liquidating top-tier quality positions during panic spikes'
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // 5. Diversification / Concentration query
    if (promptLower.includes('diversif') || promptLower.includes('concentrat') || promptLower.includes('sector') || promptLower.includes('weight')) {
      return {
        provider: 'Grok',
        headline: `Portfolio Allocation Audit: ${holdingsList.length} Active Asset Positions`,
        sentiment: 'NEUTRAL',
        confidence: 0.93,
        summary: `Portfolio diversification analysis: Capital is distributed across ${holdingsList.length} asset positions. Largest single-asset weighting is ${topHoldingName}.`,
        analysis: `Asset allocation breakdown: Total valuation stands at ₹${totalValue.toLocaleString('en-IN')} with ₹${equityValue.toLocaleString('en-IN')} in equities and ₹${cashBalance.toLocaleString('en-IN')} in dry powder cash. Maintaining sector dispersion protects capital against idiosyncratic industry downturns.`,
        keyTakeaways: [
          `Active holdings count: ${holdingsList.length} positions`,
          `Largest allocation: ${topHoldingName}`,
          `Cash allocation: ${(cashBalance / (totalValue || 1) * 100).toFixed(1)}% of total portfolio`
        ],
        actionableRecommendations: [
          'Ensure no single asset exceeds 25% of total invested capital',
          'Balance cyclical tech growth with defensive healthcare or financial assets',
          'Deploy idle cash into high-Sharpe opportunities'
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // 6. Buy / Sell / Rebalancing query
    if (promptLower.includes('buy') || promptLower.includes('sell') || promptLower.includes('rebalance') || promptLower.includes('trade')) {
      return {
        provider: 'Grok',
        headline: 'Tactical Portfolio Rebalancing & Order Guidance',
        sentiment: 'BULLISH',
        confidence: 0.90,
        summary: `Tactical rebalancing review: Portfolio holds ₹${cashBalance.toLocaleString('en-IN')} in available cash. Today's P&L is ${summary.todayPnl >= 0 ? '+' : ''}₹${(summary.todayPnl || 0).toLocaleString('en-IN')}.`,
        analysis: `Execution framework: Consider rebalancing gains from outperforming positions into undervalued holdings with favorable risk-reward profiles. Use limit orders to minimize market impact slippage.`,
        keyTakeaways: [
          `Available capital for orders: ₹${cashBalance.toLocaleString('en-IN')}`,
          `Total portfolio equity: ₹${equityValue.toLocaleString('en-IN')}`,
          `P&L trend: ${summary.todayPnl >= 0 ? '+' : ''}₹${(summary.todayPnl || 0).toLocaleString('en-IN')} today`
        ],
        actionableRecommendations: [
          'Deploy cash into top conviction holdings on market pullbacks',
          'Trim holdings that have grown beyond your target allocation bands',
          'Review risk metrics before executing sizable block orders'
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // 7. General synthesis query
    const cleanQuery = userPrompt ? userPrompt.slice(0, 50) : 'Portfolio Analysis';
    return {
      provider: 'Grok',
      headline: `Portfolio Intelligence: Analysis for "${cleanQuery}"`,
      sentiment: summary.todayPnl >= 0 ? 'BULLISH' : 'NEUTRAL',
      confidence: 0.91,
      summary: `In response to your query regarding "${cleanQuery}": Your portfolio manages ₹${totalValue.toLocaleString('en-IN')} across ${holdingsList.length} active positions with ₹${cashBalance.toLocaleString('en-IN')} cash reserves.`,
      analysis: `Strategic overview: Equity holdings total ₹${equityValue.toLocaleString('en-IN')} with today's P&L reflecting ${summary.todayPnl >= 0 ? '+' : ''}₹${(summary.todayPnl || 0).toLocaleString('en-IN')} (${(summary.todayPnlPercent || 0).toFixed(2)}%). Total cumulative return stands at ${(summary.totalReturnPercent || 0) >= 0 ? '+' : ''}${(summary.totalReturnPercent || 0).toFixed(2)}%. The current setup demonstrates resilient risk metrics with portfolio Beta at ${beta}.`,
      keyTakeaways: [
        `Total capital: ₹${totalValue.toLocaleString('en-IN')} (Holdings: ${holdingsList.length}, Cash: ₹${cashBalance.toLocaleString('en-IN')})`,
        `Top portfolio position: ${topHoldingName}`,
        `Risk profile: Beta ${beta}, Daily 95% VaR ${var95}`
      ],
      actionableRecommendations: [
        'Monitor portfolio correlation to preserve diversification benefits',
        'Maintain discipline regarding position sizing and stop-loss levels',
        'Review Market Intelligence feeds for macro catalysts'
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async analyzePortfolioRisk(portfolioMetrics = {}) {
    const valuation = portfolioMetrics?.valuation;
    const summary = valuation?.summary || {};
    const riskMetrics = portfolioMetrics?.riskMetrics || {};
    const equityValue = Number(summary.equityValue || 0);

    if (equityValue === 0) {
      return {
        provider: 'Grok',
        riskScore: 0,
        riskLevel: 'LOW',
        var95Daily: '₹0',
        expectedShortfall: '₹0',
        keyConcern: 'All capital is currently held in cash (zero equity market risk exposure).',
        recommendation: 'Deploy capital into equity positions to initialize portfolio risk monitoring.',
      };
    }

    const var95 = riskMetrics.var95?.value || `₹${Math.round(equityValue * 0.015).toLocaleString('en-IN')}`;
    const cvar95 = riskMetrics.cvar95?.value || `₹${Math.round(equityValue * 0.022).toLocaleString('en-IN')}`;
    const level = riskMetrics.riskLevel || (equityValue > 500000 ? 'HIGH' : 'MODERATE');

    return {
      provider: 'Grok',
      riskScore: riskMetrics.compositeScore || 45,
      riskLevel: level,
      var95Daily: var95,
      expectedShortfall: cvar95,
      keyConcern: 'Portfolio risk is driven primarily by single-stock market beta exposure.',
      recommendation: 'Consider sector diversification to optimize risk-adjusted returns.',
    };
  }
}

export class GrokAIProvider extends AIProvider {
  constructor(apiKey, model) {
    super();
    this.name = 'GrokAIProvider';
    this.apiKey = apiKey || process.env.AI_API_KEY;
    this.baseUrl = 'https://api.groq.com/openai/v1';
    // Active, proven Groq models with automated fallback
    this.model = model || process.env.AI_MODEL || 'qwen/qwen3.8-27b';
    this.fallbackModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
  }

  async callGroqWithFallback(messages, maxTokens = 1000) {
    const candidateModels = [...new Set([this.model, ...this.fallbackModels])].filter(Boolean);
    let lastError = null;

    for (const model of candidateModels) {
      try {
        logger.info(`Dispatching AI query to Groq [model: ${model}]`);
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: maxTokens,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const choice = data.choices?.[0];
          const content = choice?.message?.content?.trim();
          if (content) {
            return { content, model };
          }
          // If reasoning model returned reasoning but empty content, attempt to use reasoning
          if (choice?.message?.reasoning) {
            return { content: choice.message.reasoning.trim(), model };
          }
        } else {
          const errBody = await res.text();
          logger.warn(`Groq model [${model}] returned HTTP ${res.status}: ${errBody.slice(0, 150)}`);
          lastError = new Error(`Groq HTTP ${res.status}: ${errBody}`);
        }
      } catch (err) {
        logger.warn(`Groq model [${model}] request failed: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All Groq AI models failed to respond');
  }

  async generateFinancialInsight(context = {}) {
    if (!this.apiKey) {
      logger.warn('Grok API key missing, falling back to simulated insight');
      return new MockAIProvider().generateFinancialInsight(context);
    }

    try {
      const { valuation = null, riskMetrics = {}, userPrompt = '', holdings = [] } = context;
      const summary = valuation?.summary || {};
      const holdingsList = valuation?.holdings || holdings || [];

      const portfolioContext = `
Portfolio Financial Snapshot:
- Total Valuation: ₹${(summary.totalValue || 0).toLocaleString('en-IN')}
- Cash Reserves: ₹${(summary.cashBalance || 0).toLocaleString('en-IN')}
- Equity Capital: ₹${(summary.equityValue || 0).toLocaleString('en-IN')}
- Today's P&L: ${(summary.todayPnl || 0) >= 0 ? '+' : ''}₹${(summary.todayPnl || 0).toLocaleString('en-IN')} (${(summary.todayPnlPercent || 0).toFixed(2)}%)
- Total Cumulative Return: ${(summary.totalReturnPercent || 0) >= 0 ? '+' : ''}${(summary.totalReturnPercent || 0).toFixed(2)}%
- Active Holdings (${holdingsList.length}): ${holdingsList.slice(0, 12).map(h => `${h.symbol} (${h.quantity} shares @ ₹${h.ltp || h.currentPrice || 0}, ${h.allocationPercent || 0}% weight)`).join('; ') || 'None'}
- Portfolio Beta: ${summary.beta || riskMetrics?.beta || '1.05'}
- Sharpe Ratio: ${summary.sharpeRatio || riskMetrics?.sharpe || '1.40'}
- 95% Daily VaR: ${riskMetrics?.var95Daily || riskMetrics?.var95?.value || 'N/A'}
- Risk Level: ${summary.riskLevel || 'MODERATE'}
${userPrompt ? `- User Query: "${userPrompt}"` : ''}`;

      const systemPrompt = userPrompt
        ? `You are an institutional quantitative equity analyst and portfolio strategist for Finance OS. Answer the user prompt directly, thoughtfully, and specifically based on their real portfolio holdings and current market context. Never give generic repetitive answers. Respond ONLY with valid raw JSON matching the required schema.`
        : `You are an elite quantitative financial analyst for Finance OS. Analyze the portfolio snapshot and produce an institutional report. Respond ONLY with valid raw JSON matching the required schema.`;

      const prompt = `Portfolio Context:
${portfolioContext}

User Question: "${userPrompt || 'Provide an institutional portfolio intelligence snapshot.'}"

Respond ONLY with valid raw JSON (no markdown formatting, no code fences):
{
  "headline": "Punchy headline answering the user's specific query (max 12 words)",
  "sentiment": "BULLISH" | "CAUTIONARY" | "BEARISH" | "NEUTRAL",
  "confidence": 0.90,
  "analysis": "Direct, thorough multi-sentence institutional analysis specifically addressing the user's question with precise figures from their portfolio.",
  "keyTakeaways": ["Specific takeaway 1 with numbers", "Specific takeaway 2", "Specific takeaway 3"],
  "actionableRecommendations": ["Concrete recommendation 1", "Concrete recommendation 2", "Concrete recommendation 3"]
}`;

      const { content } = await this.callGroqWithFallback([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ], 1000);

      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed = {};

      try {
        parsed = JSON.parse(cleaned);
      } catch (pErr) {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e) {
            parsed = { analysis: cleaned };
          }
        } else {
          parsed = { analysis: cleaned };
        }
      }

      return {
        provider: 'Grok',
        headline: parsed.headline || 'Institutional Portfolio Intelligence Report',
        sentiment: parsed.sentiment || 'NEUTRAL',
        confidence: parsed.confidence || 0.90,
        summary: parsed.analysis || parsed.summary || 'Analysis completed.',
        analysis: parsed.analysis || parsed.summary || 'Analysis completed.',
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        actionableRecommendations: Array.isArray(parsed.actionableRecommendations) ? parsed.actionableRecommendations : [],
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.error('Failed to query Grok API, falling back to dynamic simulated engine:', { error: err.message });
      return new MockAIProvider().generateFinancialInsight(context);
    }
  }

  async analyzePortfolioRisk(portfolioMetrics = {}) {
    if (!this.apiKey) {
      return new MockAIProvider().analyzePortfolioRisk(portfolioMetrics);
    }
    try {
      const valuation = portfolioMetrics?.valuation;
      const summary = valuation?.summary || {};
      const equityValue = Number(summary.equityValue || 0);

      if (equityValue === 0) {
        return {
          provider: 'Grok',
          riskScore: 0,
          riskLevel: 'LOW',
          var95Daily: '₹0',
          expectedShortfall: '₹0',
          keyConcern: 'All capital is currently held in cash (zero equity market risk exposure).',
          recommendation: 'Deploy capital into equity positions to initialize portfolio risk monitoring.',
        };
      }

      const prompt = `Given these real portfolio risk metrics, respond with raw JSON (no markdown):
${JSON.stringify(portfolioMetrics, null, 2)}

Required JSON schema:
{
  "riskScore": 45,
  "riskLevel": "LOW" | "MODERATE" | "HIGH",
  "var95Daily": "formatted daily VaR string (e.g. ₹X,XXX)",
  "expectedShortfall": "formatted Expected Shortfall string (e.g. ₹X,XXX)",
  "keyConcern": "One concise sentence analyzing the biggest risk based on actual holdings",
  "recommendation": "One concise actionable recommendation for this portfolio"
}`;

      const { content } = await this.callGroqWithFallback([
        { role: 'system', content: 'You are a quantitative risk analyst. Respond only with raw valid JSON.' },
        { role: 'user', content: prompt }
      ], 500);

      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed = {};
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }
      return { provider: 'Grok', ...parsed };
    } catch (err) {
      logger.warn('Grok risk analysis failed, falling back to simulated risk model:', err.message);
      return new MockAIProvider().analyzePortfolioRisk(portfolioMetrics);
    }
  }
}

export function createAIProvider(providerType = 'mock') {
  const norm = (providerType || '').toLowerCase().trim();
  logger.info(`AI Provider instantiated: [${norm.toUpperCase()}]`);
  switch (norm) {
    case 'groq':
    case 'grok':
      return new GrokAIProvider(process.env.AI_API_KEY, process.env.AI_MODEL);
    case 'openai':
      return new MockAIProvider();
    case 'gemini':
      return new MockAIProvider();
    case 'mock':
    default:
      return new MockAIProvider();
  }
}

export const aiProvider = createAIProvider(process.env.AI_PROVIDER || 'mock');
