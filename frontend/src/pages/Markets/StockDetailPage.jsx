import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  MinusCircle,
  PlusCircle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Newspaper,
  Zap,
} from 'lucide-react';

export function StockDetailPage() {
  const { symbol: urlSymbol } = useParams();
  const symbol = (urlSymbol || 'RELIANCE').toUpperCase();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [timeframe, setTimeframe] = useState('1M');
  const [tradeType, setTradeType] = useState('BUY');
  const [quantity, setQuantity] = useState(10);
  const [depositAmount, setDepositAmount] = useState(100000);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [tradeMessage, setTradeMessage] = useState(null);

  // 1. Fetch Quote Telemetry
  const { data: quoteRes, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => api.getQuote(symbol, 'NSE'),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const quote = quoteRes?.data || null;

  // 2. Fetch Historical Price Chart
  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['history', symbol, timeframe],
    queryFn: () => api.getHistoricalPrices(symbol, { timeframe, exchange: 'NSE' }),
  });

  const candles = historyRes?.data?.candles || [];

  // 3. Fetch User Portfolio Summary & Holdings
  const { data: summaryRes } = useQuery({
    queryKey: ['portfolioSummary'],
    queryFn: () => api.getPortfolioSummary(),
  });

  const { data: holdingsRes } = useQuery({
    queryKey: ['portfolioHoldings'],
    queryFn: () => api.getHoldings(),
  });

  const portfolioSummary = summaryRes?.data || { cashBalance: 0, totalValue: 0 };
  const userHoldings = holdingsRes?.data || [];
  const currentHolding = userHoldings.find((h) => h.symbol.toUpperCase() === symbol);

  // 4. Trade Execution Mutation
  const tradeMutation = useMutation({
    mutationFn: (txData) => api.executeTransaction(txData),
    onSuccess: (res) => {
      setTradeMessage({
        type: 'success',
        text: `Successfully executed ${tradeType} for ${quantity} shares of ${symbol}!`,
      });
      queryClient.invalidateQueries({ queryKey: ['portfolioSummary'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioHoldings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['riskSnapshot'] });
    },
    onError: (err) => {
      setTradeMessage({
        type: 'error',
        text: err.message || 'Trade execution failed. Please verify cash balance and position size.',
      });
    },
  });

  // 5. Deposit Mutation
  const depositMutation = useMutation({
    mutationFn: (amt) =>
      api.executeTransaction({
        type: 'DEPOSIT',
        amount: amt,
        notes: 'Virtual cash deposit via instrument desk',
      }),
    onSuccess: () => {
      setShowDepositModal(false);
      setTradeMessage({
        type: 'success',
        text: `Deposited ₹${depositAmount.toLocaleString()} virtual cash into portfolio!`,
      });
      queryClient.invalidateQueries({ queryKey: ['portfolioSummary'] });
    },
    onError: (err) => {
      setTradeMessage({ type: 'error', text: err.message || 'Deposit failed.' });
    },
  });

  const ltp = quote ? Number(quote.price || 0) : 0;
  const tradeValue = Math.round(quantity * ltp * 100) / 100;
  const fees = 20.0;
  const totalCost = tradeType === 'BUY' ? tradeValue + fees : tradeValue - fees;
  const availableCash = Number(portfolioSummary.cashBalance || 0);
  const ownedQty = Number(currentHolding?.quantity || 0);

  const handleTradeSubmit = (e) => {
    e.preventDefault();
    setTradeMessage(null);

    if (ltp <= 0) {
      setTradeMessage({ type: 'error', text: 'Market quote unavailable for order execution.' });
      return;
    }

    if (quantity <= 0) {
      setTradeMessage({ type: 'error', text: 'Please enter a positive quantity' });
      return;
    }

    if (tradeType === 'BUY' && totalCost > availableCash) {
      setTradeMessage({
        type: 'error',
        text: `Insufficient cash balance. Required: ₹${totalCost.toLocaleString()}, Available: ₹${availableCash.toLocaleString()}`,
      });
      return;
    }

    if (tradeType === 'SELL' && ownedQty < quantity) {
      setTradeMessage({
        type: 'error',
        text: `Cannot SELL ${quantity} shares. You currently hold ${ownedQty} shares.`,
      });
      return;
    }

    tradeMutation.mutate({
      type: tradeType,
      symbol,
      exchange: quote?.exchange || 'NSE',
      quantity,
      price: ltp,
      fees,
      notes: `${tradeType} order executed from instrument desk`,
    });
  };

  const [hoveredCandle, setHoveredCandle] = useState(null);

  // Render SVG Candle / Line Chart with OHLCV Tooltip & Price Scale
  const renderChart = () => {
    if (candles.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
          Loading chart telemetry for {symbol}...
        </div>
      );
    }

    const prices = candles.map((c) => Number(c.close));
    const minPx = Math.min(...prices);
    const maxPx = Math.max(...prices);
    const rangePx = maxPx - minPx || 1;

    const width = 700;
    const height = 240;
    const padding = { top: 20, right: 65, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const pointsList = candles.map((c, index) => {
      const x = padding.left + (index / Math.max(1, candles.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((Number(c.close) - minPx) / rangePx) * chartHeight;
      return { ...c, x, y, index };
    });

    const pointsStr = pointsList.map((p) => `${p.x},${p.y}`).join(' ');

    const isPositive = prices[prices.length - 1] >= prices[0];
    const strokeColor = isPositive ? '#34d399' : '#f87171';
    const fillColor = isPositive ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)';

    const displayCandle = hoveredCandle || pointsList[pointsList.length - 1];

    const formatDate = (isoStr) => {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      return timeframe === '1D'
        ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
        : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    return (
      <div className="relative w-full space-y-2">
        {/* Interactive Hover Telemetry Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#06090e] border border-[#162238] rounded text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Date: <strong className="text-slate-200">{formatDate(displayCandle.timestamp)}</strong></span>
            <span>Open: <strong className="text-slate-200">{formatCurrency(displayCandle.open)}</strong></span>
            <span>High: <strong className="text-emerald-400">{formatCurrency(displayCandle.high)}</strong></span>
            <span>Low: <strong className="text-rose-400">{formatCurrency(displayCandle.low)}</strong></span>
            <span>Close: <strong className="text-white">{formatCurrency(displayCandle.close)}</strong></span>
          </div>
          {displayCandle.volume ? (
            <span className="text-slate-400">Vol: <strong className="text-slate-300">{(displayCandle.volume / 1000).toFixed(1)}k</strong></span>
          ) : null}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-60 overflow-visible cursor-crosshair select-none"
          onMouseLeave={() => setHoveredCandle(null)}
        >
          {/* Grid lines & Y-Axis ₹ price labels */}
          {[0, 0.5, 1].map((ratio, i) => {
            const yVal = padding.top + chartHeight * (1 - ratio);
            const priceLabel = minPx + rangePx * ratio;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={yVal}
                  x2={width - padding.right}
                  y2={yVal}
                  stroke="#182030"
                  strokeDasharray="3 3"
                />
                <text
                  x={width - padding.right + 8}
                  y={yVal + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatCurrency(priceLabel)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <polygon
            points={`${padding.left},${height - padding.bottom} ${pointsStr} ${width - padding.right},${height - padding.bottom}`}
            fill={fillColor}
          />

          {/* Line Path */}
          <polyline
            points={pointsStr}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair on hover */}
          {hoveredCandle && (
            <g>
              <line
                x1={hoveredCandle.x}
                y1={padding.top}
                x2={hoveredCandle.x}
                y2={height - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredCandle.x}
                cy={hoveredCandle.y}
                r="4.5"
                fill="#38bdf8"
                stroke="#080b10"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Hover trigger zones */}
          {pointsList.map((pt) => (
            <rect
              key={pt.index}
              x={pt.x - chartWidth / (pointsList.length * 2)}
              y={padding.top}
              width={chartWidth / pointsList.length}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredCandle(pt)}
            />
          ))}

          {/* X Axis Date Labels */}
          {pointsList.map((pt, i) => {
            if (i === 0 || i === Math.floor(pointsList.length / 2) || i === pointsList.length - 1) {
              return (
                <text
                  key={i}
                  x={pt.x}
                  y={height - 8}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle"
                >
                  {formatDate(pt.timestamp)}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#182030]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/markets')}
            className="p-2 bg-[#0c1017] border border-[#182030] hover:border-slate-700 text-slate-400 hover:text-white rounded-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{quote?.name || symbol}</h1>
              <span className="text-xs text-slate-400 bg-[#141c2b] px-2 py-0.5 border border-[#1e2a40] rounded-sm font-bold">
                {symbol} • {quote?.exchange || 'NSE'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-0.5">
              <span>Sector: <strong className="text-slate-200">{quote?.sector || 'Equities'}</strong></span>
              <span>•</span>
              <span>Asset Class: <strong className="text-slate-200">EQUITY</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DataStatusBadge status={quote?.dataStatus || 'HISTORICAL'} source={quote?.dataSource || 'yahoo'} />
          <button
            onClick={() => setShowDepositModal(true)}
            className="px-3 py-1.5 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 rounded-sm font-bold flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + Deposit Cash
          </button>
        </div>
      </div>

      {/* Primary Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Telemetry & Historical Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* LTP & Price Action Banner */}
          <Card className="p-5 bg-[#080d18] border border-[#182030]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-slate-500 uppercase text-[10px]">LAST TRADED PRICE</span>
                <div className="text-3xl font-bold text-white tracking-tight mt-0.5">
                  {quote?.price !== null && quote?.price !== undefined ? formatCurrency(quote.price) : (candles.length > 0 ? formatCurrency(candles[candles.length - 1].close) : '—')}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center font-bold text-sm ${
                      (quote?.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(quote?.change || 0) >= 0 ? '+' : ''}
                    {quote?.change !== null && quote?.change !== undefined ? formatCurrency(quote.change) : '—'} ({quote?.changePercent !== null && quote?.changePercent !== undefined ? formatPercent(quote.changePercent) : '—'})
                  </span>
                  {quote?.previousClose && (
                    <span className="text-[10px] text-slate-500">vs Prev Close ({formatCurrency(quote.previousClose)})</span>
                  )}
                </div>
              </div>

              {/* OHLC Metric Grid */}
              <div className="grid grid-cols-4 gap-3 font-mono text-[11px]">
                <div className="p-2 bg-[#0c1017] border border-[#182030] rounded-sm text-center">
                  <div className="text-slate-500 text-[9px]">OPEN</div>
                  <div className="text-slate-200 font-bold">{quote?.open !== null && quote?.open !== undefined ? formatCurrency(quote.open) : '—'}</div>
                </div>
                <div className="p-2 bg-[#0c1017] border border-[#182030] rounded-sm text-center">
                  <div className="text-slate-500 text-[9px]">HIGH</div>
                  <div className="text-emerald-400 font-bold">{quote?.high !== null && quote?.high !== undefined ? formatCurrency(quote.high) : '—'}</div>
                </div>
                <div className="p-2 bg-[#0c1017] border border-[#182030] rounded-sm text-center">
                  <div className="text-slate-500 text-[9px]">LOW</div>
                  <div className="text-rose-400 font-bold">{quote?.low !== null && quote?.low !== undefined ? formatCurrency(quote.low) : '—'}</div>
                </div>
                <div className="p-2 bg-[#0c1017] border border-[#182030] rounded-sm text-center">
                  <div className="text-slate-500 text-[9px]">VOLUME</div>
                  <div className="text-slate-200 font-bold">{quote?.volume ? Number(quote.volume).toLocaleString('en-IN') : '—'}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Interactive Chart Desk */}
          <Card
            title={`Historical Price Action: ${symbol}`}
            subtitle="Historical OHLCV terminal chart"
            action={
              <div className="flex items-center gap-1 font-mono text-[11px]">
                {['1D', '1W', '1M', '1Y'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-sm uppercase tracking-wider font-bold transition-colors ${
                      timeframe === tf
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                        : 'text-slate-400 hover:text-white bg-[#0c1017] border border-[#182030]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            }
          >
            <div className="p-2">
              {renderChart()}
            </div>
          </Card>
        </div>

        {/* Right Column: Order Execution Desk & Position Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Trade Execution Card */}
          <Card title="Virtual Trade Execution Desk" subtitle="Instant order matching & P&L updates">
            <div className="space-y-4">
              {/* BUY / SELL Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#080d18] border border-[#182030] rounded-sm">
                <button
                  type="button"
                  onClick={() => setTradeType('BUY')}
                  className={`py-2 rounded-sm font-bold uppercase transition-colors ${
                    tradeType === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  BUY {symbol}
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType('SELL')}
                  className={`py-2 rounded-sm font-bold uppercase transition-colors ${
                    tradeType === 'SELL'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SELL {symbol}
                </button>
              </div>

              {/* Balance & Position Badges */}
              <div className="p-3 bg-[#080c14] border border-[#182030] rounded-sm space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Cash</span>
                  <strong className="text-emerald-400">{formatCurrency(availableCash)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Position</span>
                  <strong className="text-white">
                    {ownedQty > 0 ? `${ownedQty} shares (${formatCurrency(ownedQty * ltp)})` : 'None'}
                  </strong>
                </div>
              </div>

              {/* Order Form */}
              <form onSubmit={handleTradeSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">
                    Order Quantity (Shares)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#080d18] border border-[#16243a] rounded-sm p-2 text-white font-bold font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="p-3 bg-[#0c1017] border border-[#182030] rounded-sm space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Execution Price</span>
                    <span className="text-slate-200">{formatCurrency(ltp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Value</span>
                    <span className="text-slate-200">{formatCurrency(tradeValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Brokerage & STT</span>
                    <span className="text-slate-200">₹20.00</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#182030] font-bold text-xs">
                    <span className="text-slate-300">Net Estimated Cost</span>
                    <span className={tradeType === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </div>

                {tradeMessage && (
                  <div
                    className={`p-3 rounded-sm border flex items-start gap-2 text-[11px] ${
                      tradeMessage.type === 'success'
                        ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/50 border-rose-800 text-rose-300'
                    }`}
                  >
                    {tradeMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span>{tradeMessage.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={tradeMutation.isPending}
                  className={`w-full py-2.5 rounded-sm font-bold uppercase transition-colors text-white ${
                    tradeType === 'BUY'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {tradeMutation.isPending
                    ? 'EXECUTING TRADE...'
                    : `${tradeType} ${quantity} ${symbol} @ ${formatCurrency(ltp)}`}
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>

      {/* Deposit Virtual Cash Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101520] border border-[#182030] rounded-sm max-w-md w-full p-6 space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-[#182030] pb-3">
              <h3 className="text-base font-bold text-white">DEPOSIT VIRTUAL CAPITAL</h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Inject simulated cash balance into your Finance OS portfolio to execute trades.
            </p>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase mb-1">
                Deposit Amount (INR ₹)
              </label>
              <input
                type="number"
                step="10000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full bg-[#080d18] border border-[#16243a] rounded-sm p-2 text-white font-bold text-sm focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="px-4 py-2 bg-[#0c1017] border border-[#182030] text-slate-300 hover:text-white rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => depositMutation.mutate(depositAmount)}
                disabled={depositMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-sm"
              >
                {depositMutation.isPending ? 'DEPOSITING...' : `Confirm Deposit ₹${depositAmount.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
