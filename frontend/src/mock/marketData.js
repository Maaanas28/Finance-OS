export const mockMarketOverview = [
  { symbol: 'NIFTY 50', name: 'Nifty 50 Index', price: 24852.15, change: 142.30, changePercent: 0.58, currency: 'INR', market: 'NSE' },
  { symbol: 'SENSEX', name: 'BSE Sensex', price: 81387.40, change: 480.20, changePercent: 0.59, currency: 'INR', market: 'BSE' },
  { symbol: 'S&P 500', name: 'S&P 500 Index', price: 5864.67, change: -18.45, changePercent: -0.31, currency: 'USD', market: 'US' },
  { symbol: 'NASDAQ', name: 'Nasdaq Composite', price: 18415.20, change: -82.10, changePercent: -0.44, currency: 'USD', market: 'US' },
  { symbol: 'USD/INR', name: 'US Dollar / Rupee', price: 83.98, change: 0.04, changePercent: 0.05, currency: 'INR', market: 'FOREX' },
  { symbol: 'GOLD', name: 'Gold 1oz Spot', price: 2682.40, change: 12.80, changePercent: 0.48, currency: 'USD', market: 'COMMODITIES' },
];

export const mockTopMovers = {
  gainers: [
    { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2980.50, change: 84.30, changePercent: 2.91, volume: '4.8M', sector: 'Energy' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', price: 4230.00, change: 95.50, changePercent: 2.31, volume: '2.1M', sector: 'Technology' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1675.20, change: 29.80, changePercent: 1.81, volume: '11.4M', sector: 'Financials' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 1640.10, change: 24.60, changePercent: 1.52, volume: '3.6M', sector: 'Telecom' },
  ],
  losers: [
    { symbol: 'INFY', name: 'Infosys Ltd', price: 1845.30, change: -48.20, changePercent: -2.55, volume: '7.2M', sector: 'Technology' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 978.40, change: -21.60, changePercent: -2.16, volume: '8.9M', sector: 'Automotive' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1210.80, change: -18.20, changePercent: -1.48, volume: '6.5M', sector: 'Financials' },
    { symbol: 'WIPRO', name: 'Wipro Limited', price: 524.10, change: -7.50, changePercent: -1.41, volume: '3.1M', sector: 'Technology' },
  ],
};
