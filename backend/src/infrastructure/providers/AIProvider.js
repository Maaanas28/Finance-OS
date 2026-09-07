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


    // 1. Stock-specific question — answer even if portfolio is empty
    const stockMentions = ['hdfc', 'reliance', 'tcs', 'infy', 'infosys', 'icici', 'sbi', 'tatamotors', 'wipro', 'bhartiartl', 'nifty', 'sensex'];
    const mentionsStock = stockMentions.some((s) => promptLower.includes(s));
    const isBuyQuestion = promptLower.includes('buy') || promptLower.includes('invest') || promptLower.includes('should i');

    if (mentionsStock && isBuyQuestion) {
      const stockName = stockMentions.find((s) => promptLower.includes(s))?.toUpperCase() || 'this stock';
      return {
        provider: 'Grok',
        headline: `${stockName} — Add Grok API key for real AI analysis`,
        sentiment: 'NEUTRAL',
        confidence: 0.5,
        summary: `You asked about ${stockName}. To get a real AI-powered buy/sell recommendation with technical and fundamental analysis, please add a valid Grok API key in .env. The current AI engine is running in offline mode.`,
        analysis: `Real-time ${stockName} analysis requires an active Grok API connection. Add your API key to AI_API_KEY in .env.`,
        keyTakeaways: [
          `AI engine offline — check AI_API_KEY in backend .env`,
          `${stockName} quote is available on the Markets page with live Yahoo data`,
          'Deposit virtual cash and trade from the Stock Detail page'
        ],
        actionableRecommendations: [
          `Go to /markets/${stockName} for live price, chart, and OHLCV data`,
          'Add Grok API key to enable real AI buy/sell recommendations',
          'Use the virtual BUY button to practice a trade'
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // 2. Empty portfolio handling
    if (totalValue === 0 && holdingsList.length === 0) {
      return {
        provider: 'Grok',
        headline: 'Unallocated Portfolio — Zero Active Capital Positions',
        sentiment: 'NEUTRAL',
        confidence: 0.95,
        summary: 'Your portfolio currently maintains ₹0 in equity holdings and ₹0 in cash reserves. No active capital is exposed to market volatility.',
        analysis: 'Your portfolio is completely unallocated. To start trading Indian equities (such as HDFCBANK, RELIANCE, TCS), deposit virtual cash or execute your first trade from the Market Intelligence desk.',
        keyTakeaways: [
          'Portfolio contains 0 active holdings and ₹0 cash reserves',
          'Parametric VaR and sector concentration risks are zero',
          'Use "+ Deposit Cash" on the Instrument page to fund your virtual account'
        ],
        actionableRecommendations: [
          'Deposit initial virtual capital (e.g. ₹100,000)',
          'Explore top NIFTY 50 blue-chips in the Market Master',
          'Execute a test BUY order to initialize portfolio tracking'
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // 3. Populated portfolio handling
    const topHolding = holdingsList[0] || null;
    const topHoldingName = topHolding ? `${topHolding.symbol} (${topHolding.allocationPercent || 0}%)` : 'N/A';
    const var95 = riskMetrics?.var95Daily || '₹0';
    const beta = summary.beta || riskMetrics?.beta || '1.05';

    let headline = `Portfolio Intelligence Snapshot — Total Valuation ₹${totalValue.toLocaleString()}`;
    let sentiment = 'NEUTRAL';
    let analysisText = `Your portfolio holds ${holdingsList.length} position(s) valued at ₹${equityValue.toLocaleString()} with ₹${cashBalance.toLocaleString()} in cash reserves. Today's P&L stands at ${summary.todayPnl >= 0 ? '+' : ''}₹${(summary.todayPnl || 0).toLocaleString()}.`;

    if (promptLower.includes('summarize') || promptLower.includes('summary')) {
      headline = `Portfolio Summary: ${holdingsList.length} Active Positions • ₹${totalValue.toLocaleString()} Total Capital`;
      analysisText = `Portfolio summary: You hold ${holdingsList.length} active position(s) with total equity value of ₹${equityValue.toLocaleString()} and ₹${cashBalance.toLocaleString()} cash balance. Top allocation: ${topHoldingName}. Total return: ${summary.totalReturnPercent >= 0 ? '+' : ''}${summary.totalReturnPercent || 0}%.`;
    } else if (promptLower.includes('risk') || promptLower.includes('why')) {
      headline = `Risk Decomposition: Portfolio Beta ${beta} • Daily 95% VaR ${var95}`;
      sentiment = 'CAUTIONARY';
      analysisText = `Risk analysis: Your portfolio exhibits a portfolio Beta of ${beta} with daily 95% Value at Risk (VaR) estimated at ${var95}. Top risk contributor: ${topHoldingName}. Recommend maintaining sector diversification.`;
    } else if (promptLower.includes('fall') || promptLower.includes('crash') || promptLower.includes('stress') || promptLower.includes('10%')) {
      const estimatedDrawdown = Math.round(equityValue * 0.10);
      headline = `Stress Test Simulation: -10% Broad Market Correction`;
      sentiment = 'BEARISH';
      analysisText = `Market shock simulation: Under a 10% benchmark correction across Nifty 50, your equity holdings (₹${equityValue.toLocaleString()}) are estimated to contract by ~₹${estimatedDrawdown.toLocaleString()}. Cash reserves (₹${cashBalance.toLocaleString()}) provide a buffer.`;
    }

    return {
      provider: 'Grok',
      headline,
      sentiment,
      confidence: 0.93,
      summary: analysisText,
      analysis: analysisText,
      keyTakeaways: [
        `Valuation: ₹${totalValue.toLocaleString()} (Holdings: ${holdingsList.length}, Cash: ₹${cashBalance.toLocaleString()})`,
        `Top Exposure: ${topHoldingName}`,
        `Risk Profile: Beta ${beta}, Daily VaR ${var95}`
      ],
      actionableRecommendations: [
        'Maintain balanced sector allocation across Banking & Technology',
        'Monitor individual stock weighting to prevent single-stock concentration > 30%',
        'Utilize stress testing scenarios to evaluate macro interest rate shocks'
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
  constructor(apiKey) {
    super();
    this.name = 'GrokAIProvider';
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.model = 'openai/gpt-oss-20b';
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
- Portfolio Total Value: ₹${(summary.totalValue || 0).toLocaleString('en-IN')}
- Cash Balance: ₹${(summary.cashBalance || 0).toLocaleString('en-IN')}
- Equity Value: ₹${(summary.equityValue || 0).toLocaleString('en-IN')}
- Today's P&L: ${(summary.todayPnl || 0) >= 0 ? '+' : ''}₹${(summary.todayPnl || 0).toLocaleString('en-IN')} (${(summary.todayPnlPercent || 0).toFixed(2)}%)
- Total Return: ${(summary.totalReturnPercent || 0) >= 0 ? '+' : ''}${(summary.totalReturnPercent || 0).toFixed(2)}%
- Holdings (${holdingsList.length}): ${holdingsList.slice(0, 6).map(h => `${h.symbol} ${h.quantity}qty @₹${h.ltp}`).join(', ') || 'None'}
- Beta: ${summary.beta || riskMetrics?.beta || 'N/A'}
- Sharpe Ratio: ${summary.sharpeRatio || riskMetrics?.sharpe || 'N/A'}
- Risk Level: ${summary.riskLevel || 'LOW'}
${userPrompt ? `- User Question: ${userPrompt}` : ''}`;

      const systemPrompt = userPrompt
        ? `You are an elite Indian equity market analyst. Answer the user prompt concisely based on the portfolio context. Respond ONLY with valid raw JSON.`
        : `You are an elite quantitative financial analyst. Analyze the portfolio and produce a structured insight. Respond ONLY with valid raw JSON.`;

      const prompt = `Analyze this portfolio and respond ONLY with valid raw JSON (no markdown, no code blocks):
${portfolioContext}

Required JSON schema:
{
  "headline": "Short headline (max 12 words)",
  "sentiment": "BULLISH" | "CAUTIONARY" | "BEARISH" | "NEUTRAL",
  "confidence": 0.85,
  "analysis": "2-3 institutional sentences analyzing the user's question or portfolio.",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "actionableRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        logger.error('Grok API error response:', { status: res.status, body: errorBody });
        return {
          provider: 'Grok',
          headline: 'AI Service Temporarily Unavailable',
          sentiment: 'NEUTRAL',
          confidence: 0.5,
          summary: `The Grok AI service returned status ${res.status}. Please check your connection.`,
          analysis: `Grok AI API status ${res.status}: ${errorBody.substring(0, 150)}`,
          keyTakeaways: ['Check AI_API_KEY configuration', 'Verify backend connectivity'],
          actionableRecommendations: [],
          generatedAt: new Date().toISOString(),
        };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Empty response from Grok');
      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      let parsed = {};
      try {
        parsed = JSON.parse(cleaned);
      } catch (pErr) {
        // Try extracting JSON object substring
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
        headline: parsed.headline || 'Portfolio Intelligence Report',
        sentiment: parsed.sentiment || 'NEUTRAL',
        confidence: parsed.confidence || 0.9,
        summary: parsed.analysis || '',
        analysis: parsed.analysis || '',
        keyTakeaways: parsed.keyTakeaways || [],
        actionableRecommendations: parsed.actionableRecommendations || [],
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.error('Failed to query Grok API:', { error: err.message });
      return {
        provider: 'Grok',
        headline: 'Grok AI Engine Notice',
        sentiment: 'NEUTRAL',
        confidence: 0.5,
        summary: `Grok AI request could not be processed: ${err.message}`,
        analysis: err.message,
        keyTakeaways: ['Check AI_API_KEY in backend .env', 'Try re-submitting your query'],
        actionableRecommendations: [],
        generatedAt: new Date().toISOString(),
      };
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
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a quantitative risk analyst. Respond only with raw valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 400,
        }),
      });
      if (!res.ok) return new MockAIProvider().analyzePortfolioRisk(portfolioMetrics);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed = {};
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }
      return { provider: 'Grok', ...parsed };
    } catch {
      return new MockAIProvider().analyzePortfolioRisk(portfolioMetrics);
    }
  }
}

export function createAIProvider(providerType = 'mock') {
  logger.info(`AI Provider instantiated: [${providerType.toUpperCase()}]`);
  switch (providerType.toLowerCase()) {
    case 'grok':
      return new GrokAIProvider(process.env.AI_API_KEY);
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
