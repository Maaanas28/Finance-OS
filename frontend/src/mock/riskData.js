export const mockRiskSnapshot = {
  volatility: {
    metric: '16.4%',
    title: 'Annualized Volatility',
    badge: 'Elevated',
    status: 'warn',
    detail: 'vs 12.1% benchmark (NIFTY 50)',
    progress: 68,
  },
  beta: {
    metric: '1.28',
    title: 'Portfolio Beta',
    badge: 'Aggressive',
    status: 'warn',
    detail: 'Higher sensitivity to market swings',
    progress: 72,
  },
  sharpe: {
    metric: '1.84',
    title: 'Sharpe Ratio',
    badge: 'High Quality',
    status: 'gain',
    detail: 'Risk-free benchmark at 6.50%',
    progress: 84,
  },
  maxDrawdown: {
    metric: '-14.2%',
    title: 'Max Drawdown (1Y)',
    badge: 'Contained',
    status: 'neutral',
    detail: 'Peak recovery: 32 trading days',
    progress: 42,
  },
};
