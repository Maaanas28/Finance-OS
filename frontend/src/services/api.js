/**
 * Centralized API client for Finance OS
 */

const API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('finance_os_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorInfo = data?.error || {};
    throw new ApiError(
      errorInfo.message || `Request failed with status ${response.status}`,
      response.status,
      errorInfo.code || 'HTTP_ERROR',
      errorInfo.details
    );
  }

  return data;
}

export const api = {
  // Auth
  register: (credentials) => request('/auth/register', { method: 'POST', body: JSON.stringify(credentials) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me', { method: 'GET' }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Market Intelligence Engine
  getQuote: (symbol, exchange) =>
    request(`/market/quote/${encodeURIComponent(symbol)}${exchange ? `?exchange=${encodeURIComponent(exchange)}` : ''}`, { method: 'GET' }),
  getQuotes: (symbols) =>
    request(`/market/quotes${symbols ? `?symbols=${encodeURIComponent(symbols.join(','))}` : ''}`, { method: 'GET' }),
  getTopMovers: () => request('/market/movers', { method: 'GET' }),
  getHistoricalPrices: (symbol, options = {}) => {
    const params = new URLSearchParams();
    if (options.timeframe) params.append('timeframe', options.timeframe);
    if (options.interval) params.append('interval', options.interval);
    if (options.exchange) params.append('exchange', options.exchange);
    return request(`/market/history/${encodeURIComponent(symbol)}?${params.toString()}`, { method: 'GET' });
  },
  getMarketStatus: () => request('/market/status', { method: 'GET' }),
  getMarketHealth: () => request('/market/health', { method: 'GET' }),
  searchSymbols: (query) => request(`/market/search?q=${encodeURIComponent(query)}`, { method: 'GET' }),

  // Portfolio Analytics & Holdings Engine
  getPortfolios: () => request('/portfolio/list', { method: 'GET' }),
  createPortfolio: (data) => request('/portfolio/create', { method: 'POST', body: JSON.stringify(data) }),
  getPortfolioSummary: (portfolioId) =>
    request(`/portfolio/summary${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getHoldings: (portfolioId) =>
    request(`/portfolio/holdings${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getAllocations: (portfolioId) =>
    request(`/portfolio/allocations${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getTransactions: (portfolioId) =>
    request(`/portfolio/transactions${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  executeTransaction: (txData) =>
    request('/portfolio/transactions', { method: 'POST', body: JSON.stringify(txData) }),
  getPortfolioPerformance: (portfolioId, timeframe = '1M') => {
    const params = new URLSearchParams();
    if (portfolioId) params.append('portfolioId', portfolioId);
    if (timeframe) params.append('timeframe', timeframe);
    return request(`/portfolio/performance?${params.toString()}`, { method: 'GET' });
  },

  // Risk Engine & Analytics
  getRiskSnapshot: (portfolioId) =>
    request(`/risk/snapshot${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getRiskMetrics: (portfolioId, riskFreeRate = 0.065) => {
    const params = new URLSearchParams();
    if (portfolioId) params.append('portfolioId', portfolioId);
    if (riskFreeRate !== undefined && riskFreeRate !== null) params.append('riskFreeRate', riskFreeRate);
    return request(`/risk/metrics?${params.toString()}`, { method: 'GET' });
  },
  getCorrelationMatrix: (portfolioId) =>
    request(`/risk/correlation${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getRiskContribution: (portfolioId) =>
    request(`/risk/contribution${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getDrawdownHistory: (portfolioId) =>
    request(`/risk/drawdown-history${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getStressScenarios: () => request('/risk/stress-scenarios', { method: 'GET' }),
  executeStressTest: (data) =>
    request('/risk/stress-test', { method: 'POST', body: JSON.stringify(data) }),

  // Stochastic Monte Carlo Simulator
  runMonteCarlo: (data) =>
    request('/risk/monte-carlo', { method: 'POST', body: JSON.stringify(data) }),

  // Performance Analytics Engine
  getAnalyticsSummary: (portfolioId) =>
    request(`/analytics/summary${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getAnalyticsPerformanceSeries: (portfolioId, timeframe = '1M') => {
    const params = new URLSearchParams();
    if (portfolioId) params.append('portfolioId', portfolioId);
    if (timeframe) params.append('timeframe', timeframe);
    return request(`/analytics/performance-series?${params.toString()}`, { method: 'GET' });
  },
  getAnalyticsAttribution: (portfolioId) =>
    request(`/analytics/attribution${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),
  getAnalyticsRatios: (portfolioId) =>
    request(`/analytics/ratios${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`, { method: 'GET' }),

  // AI Intelligence
  getAIInsight: () => request('/ai/insight', { method: 'GET' }),
  getAIRiskAnalysis: () => request('/ai/risk-analysis', { method: 'GET' }),
  queryAI: (prompt, context) => request('/ai/query', { method: 'POST', body: JSON.stringify({ prompt, context }) }),

  // News Intelligence Engine
  getNews: (params = {}) => request(`/news?${new URLSearchParams(params).toString()}`, { method: 'GET' }),
  getNewsCategories: () => request('/news/categories', { method: 'GET' }),
  getTickerNews: (symbol, limit = 10) => request(`/news/ticker/${encodeURIComponent(symbol)}?limit=${limit}`, { method: 'GET' }),
  getNewsSentiment: () => request('/news/sentiment', { method: 'GET' }),
  getNewsHealth: () => request('/news/health', { method: 'GET' }),

  // Strategy Lab & Quant Backtester
  getStrategyTemplates: () => request('/strategy/templates', { method: 'GET' }),
  runBacktest: (payload) => request('/strategy/backtest', { method: 'POST', body: JSON.stringify(payload) }),
  getStrategyHistory: () => request('/strategy/history', { method: 'GET' }),

  // Health
  getHealth: () => request('/health', { method: 'GET' }),
};
