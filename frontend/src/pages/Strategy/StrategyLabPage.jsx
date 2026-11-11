import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import {
  Play,
  TrendingUp,
  TrendingDown,
  Layers,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';

export function StrategyLabPage() {
  // --- Core Beginner-Friendly Inputs (Only 4 inputs) ---
  const [strategyId, setStrategyId] = useState('mean_reversion');
  const [symbol, setSymbol] = useState('RELIANCE');
  const [initialInvestment, setInitialInvestment] = useState(100000);
  const [period, setPeriod] = useState('1Y');

  // --- UI States ---
  const [backtestResult, setBacktestResult] = useState(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('equity'); // 'equity' | 'signals'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // 3 Resume Strategies
  const strategies = [
    {
      id: 'mean_reversion',
      name: 'RSI Mean Reversion',
      tag: 'Wilder RSI (14, 30/70)',
      description: 'Buys when the 14-day RSI drops below 30 (oversold) and sells when it exceeds 70 (overbought). Capitalizes on price corrections.',
      defaultSymbol: 'RELIANCE',
      color: 'emerald',
    },
    {
      id: 'momentum_ema',
      name: 'EMA Crossover',
      tag: '20-Day / 50-Day EMA',
      description: 'Goes long when the 20-day EMA crosses above the 50-day EMA (Golden Cross) and exits on Death Cross. Rides medium-term trend momentum.',
      defaultSymbol: 'NIFTY 50',
      color: 'cyan',
    },
    {
      id: 'macd_momentum',
      name: 'MACD Crossover',
      tag: 'MACD (12, 26, 9)',
      description: 'Enters when the MACD line crosses above the 9-day signal line with positive expansion. Exits when momentum wanes.',
      defaultSymbol: 'TCS',
      color: 'purple',
    },
  ];

  const popularSymbols = ['RELIANCE', 'TCS', 'NIFTY 50', 'NVDA', 'AAPL', 'MSFT', 'HDFCBANK', 'INFY'];
  const periods = [
    { id: '1M', label: '1 Month' },
    { id: '3M', label: '3 Months' },
    { id: '6M', label: '6 Months' },
    { id: '1Y', label: '1 Year' },
    { id: '2Y', label: '2 Years' },
  ];

  const runBacktest = async (override = {}) => {
    setIsBacktesting(true);
    setErrorMsg(null);
    setHoveredPoint(null);

    const activeStrat = override.strategyId || strategyId;
    const activeSymbol = (override.symbol || symbol || 'RELIANCE').trim().toUpperCase();
    const activeCapital = Number(override.initialInvestment !== undefined ? override.initialInvestment : initialInvestment) || 100000;
    const activePeriod = override.period || period;

    try {
      // Backend automatically applies standard sensible parameters internally:
      // RSI: 14 period, 30 oversold, 70 overbought
      // EMA: 20-day & 50-day crossover
      // MACD: 12, 26, 9
      // Slippage: 0.10%, Commission: 0.05%
      const res = await api.runBacktest({
        strategyId: activeStrat,
        symbol: activeSymbol,
        initialCapital: activeCapital,
        timeframe: activePeriod,
        slippagePercent: 0.1,
        commissionPercent: 0.05,
      });

      setBacktestResult(res?.data || null);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to execute backtest. Please check ticker symbol or connectivity.');
      setBacktestResult(null);
    } finally {
      setIsBacktesting(false);
    }
  };

  // Run initial backtest on mount
  useEffect(() => {
    runBacktest();
  }, []);

  const summary = backtestResult?.summary;
  const trades = backtestResult?.trades || [];
  const equityCurve = backtestResult?.equityCurve || [];
  const priceSeries = backtestResult?.priceSeries || [];
  const meta = backtestResult?.meta || {};

  // --- SVG Chart Calculations ---
  const equityChartData = useMemo(() => {
    if (!equityCurve || equityCurve.length < 2) return null;

    let minVal = Infinity;
    let maxVal = -Infinity;

    equityCurve.forEach((pt) => {
      if (pt.equity < minVal) minVal = pt.equity;
      if (pt.equity > maxVal) maxVal = pt.equity;
      if (pt.benchmarkEquity < minVal) minVal = pt.benchmarkEquity;
      if (pt.benchmarkEquity > maxVal) maxVal = pt.benchmarkEquity;
    });

    const padding = (maxVal - minVal) * 0.08 || 1000;
    const yMin = Math.max(0, minVal - padding);
    const yMax = maxVal + padding;
    const yRange = yMax - yMin || 1;

    const width = 800;
    const height = 260;

    const mapX = (index) => (index / (equityCurve.length - 1)) * width;
    const mapY = (val) => height - ((val - yMin) / yRange) * (height - 24) - 12;

    const stratPoints = equityCurve.map((pt, i) => `${mapX(i)},${mapY(pt.equity)}`).join(' ');
    const benchPoints = equityCurve.map((pt, i) => `${mapX(i)},${mapY(pt.benchmarkEquity)}`).join(' ');

    const stratArea = `${stratPoints} ${mapX(equityCurve.length - 1)},${height} 0,${height}`;

    return {
      width,
      height,
      yMin,
      yMax,
      stratPoints,
      benchPoints,
      stratArea,
      mapX,
      mapY,
    };
  }, [equityCurve]);

  const signalChartData = useMemo(() => {
    const series = priceSeries.length > 0 ? priceSeries : equityCurve;
    if (!series || series.length < 2) return null;

    let minP = Infinity;
    let maxP = -Infinity;

    series.forEach((pt) => {
      const p = pt.close || pt.price || 0;
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    });

    const padding = (maxP - minP) * 0.10 || 10;
    const yMin = Math.max(0, minP - padding);
    const yMax = maxP + padding;
    const yRange = yMax - yMin || 1;

    const width = 800;
    const height = 260;

    const mapX = (index) => (index / (series.length - 1)) * width;
    const mapY = (val) => height - ((val - yMin) / yRange) * (height - 24) - 12;

    const pricePoints = series.map((pt, i) => `${mapX(i)},${mapY(pt.close || pt.price || 0)}`).join(' ');

    // Match executed trades with dates
    const tradeMarkers = trades.map((t) => {
      const idx = series.findIndex((pt) => pt.date === t.date);
      if (idx === -1) return null;
      return {
        ...t,
        x: mapX(idx),
        y: mapY(t.price),
        index: idx,
      };
    }).filter(Boolean);

    return {
      width,
      height,
      yMin,
      yMax,
      pricePoints,
      tradeMarkers,
      series,
      mapX,
      mapY,
    };
  }, [priceSeries, equityCurve, trades]);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#182030]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              STRATEGY LAB
            </h1>
            <Badge variant="purple" size="xs">
              QUANTITATIVE BACKTESTER
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Backtest institutional quantitative strategies with zero look-ahead bias and realistic trade execution
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <DataStatusBadge status={meta.dataStatus || 'HISTORICAL'} />
          <Button
            variant="primary"
            size="xs"
            icon={Play}
            onClick={() => runBacktest()}
            disabled={isBacktesting}
          >
            {isBacktesting ? 'Running Backtest...' : 'Run Backtest'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-sm text-xs text-rose-300 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
        </div>
      )}

      {/* 1. Strategy Selection Cards (RSI, EMA, MACD) */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>1. Select Strategy</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {strategies.map((strat) => {
            const isSelected = strategyId === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => {
                  setStrategyId(strat.id);
                  if (strat.defaultSymbol && !symbol) setSymbol(strat.defaultSymbol);
                  runBacktest({ strategyId: strat.id });
                }}
                className={`p-3.5 rounded-sm border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#121a2a] border-purple-500 shadow-md shadow-purple-950/30 ring-1 ring-purple-500/40 text-white'
                    : 'bg-[#090d16] border-[#182030] hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm tracking-wide">{strat.name}</span>
                  <Badge variant={isSelected ? 'purple' : 'neutral'} size="xs">
                    {strat.tag}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 font-sans mt-2 leading-relaxed">
                  {strat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Minimal Input Controls: Stock Ticker, Initial Investment, Backtest Period */}
      <Card title="2. Simulation Parameters" subtitle="Specify your target asset, initial capital, and backtest timeframe">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stock Ticker */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Stock Ticker
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE, NVDA, TCS"
              className="w-full bg-[#070b13] border border-[#1b253b] rounded-sm px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
            />
            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1 scrollbar-none">
              <span className="text-[9px] text-slate-500">Quick:</span>
              {popularSymbols.slice(0, 6).map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    setSymbol(sym);
                    runBacktest({ symbol: sym });
                  }}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    symbol === sym
                      ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                      : 'bg-[#0b101c] border-[#182030] hover:border-slate-600 text-slate-400'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Investment */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
              <span>Initial Investment</span>
              <span className="text-slate-500">Default: ₹100,000</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-bold">₹</span>
              <input
                type="number"
                min="1000"
                step="5000"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(Number(e.target.value))}
                className="w-full bg-[#070b13] border border-[#1b253b] rounded-sm pl-7 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 pt-0.5">
              Available virtual capital allocated to strategy
            </p>
          </div>

          {/* Backtesting Period */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Backtesting Period
            </label>
            <div className="grid grid-cols-5 gap-1 pt-0.5">
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPeriod(p.id);
                    runBacktest({ period: p.id });
                  }}
                  className={`py-2 text-center text-xs font-bold rounded-sm border transition-colors ${
                    period === p.id
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-[#070b13] border-[#1b253b] hover:border-slate-600 text-slate-300'
                  }`}
                >
                  {p.id}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 pt-0.5">
              Historical candle lookback duration
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Primary Results Display: 6 Key Metric Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            3. Backtest Performance Summary ({symbol})
          </span>
          {summary && (
            <span className="text-[10px] text-slate-500">
              Period: {summary.startDate} → {summary.endDate} ({summary.totalCandles} Candles)
            </span>
          )}
        </div>

        {summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Initial Investment */}
            <div className="p-3 bg-[#080d18] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Initial Capital</div>
              <div className="text-base font-bold text-white mt-1">
                {formatCurrency(summary.initialCapital)}
              </div>
              <div className="text-[9px] text-slate-500 mt-1">Starting Allocation</div>
            </div>

            {/* Final Portfolio Value */}
            <div className="p-3 bg-[#080d18] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Ending Capital</div>
              <div className="text-base font-bold text-white mt-1">
                {formatCurrency(summary.finalCapital)}
              </div>
              <div className={`text-[9px] font-bold mt-1 ${summary.finalCapital >= summary.initialCapital ? 'text-emerald-400' : 'text-rose-400'}`}>
                {summary.finalCapital >= summary.initialCapital ? 'Net Gain' : 'Net Loss'}
              </div>
            </div>

            {/* Total Return */}
            <div className="p-3 bg-[#080d18] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Total Return</div>
              <div className={`text-base font-bold mt-1 flex items-center gap-1 ${summary.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {summary.totalReturnPercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{summary.totalReturnPercent >= 0 ? '+' : ''}{summary.totalReturnPercent.toFixed(2)}%</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1">CAGR: {summary.cagrPercent}%</div>
            </div>

            {/* Maximum Drawdown */}
            <div className="p-3 bg-[#080d18] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Max Drawdown</div>
              <div className="text-base font-bold text-rose-400 mt-1">
                -{summary.maxDrawdownPercent.toFixed(2)}%
              </div>
              <div className="text-[9px] text-slate-500 mt-1">Peak-to-Trough Risk</div>
            </div>

            {/* Win Rate */}
            <div className="p-3 bg-[#080d18] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Win Rate</div>
              <div className="text-base font-bold text-sky-400 mt-1">
                {summary.winRatePercent !== null && summary.winRatePercent !== undefined
                  ? `${Number(summary.winRatePercent).toFixed(1)}%`
                  : 'N/A'}
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                {summary.winningTrades}W / {summary.losingTrades}L
              </div>
            </div>

            {/* Number of Trades */}
            <div className="p-3 bg-[#080d18] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Total Trades</div>
              <div className="text-base font-bold text-purple-300 mt-1">
                {summary.totalTrades} Executed
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                {summary.completedTrades !== undefined ? `${summary.completedTrades} Completed` : 'Friction Applied'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[#080d18] border border-[#182030] rounded-sm text-center text-slate-500">
            {isBacktesting ? 'Computing quantitative metrics...' : 'No simulation run yet. Click "Run Backtest" above.'}
          </div>
        )}
      </div>

      {/* 4. Strategy Charts: Strategy vs Buy & Hold + Buy/Sell Signals */}
      {summary && (
        <Card
          title={
            <div className="flex items-center gap-3">
              <span className="text-white font-bold uppercase text-xs">
                {activeChartTab === 'equity' ? 'Strategy vs Buy & Hold Performance' : 'Buy & Sell Signal Execution Chart'}
              </span>
              <div className="flex items-center bg-[#070b13] border border-[#1b253b] rounded-sm p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveChartTab('equity')}
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${
                    activeChartTab === 'equity'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  NAV Comparison
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('signals')}
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${
                    activeChartTab === 'signals'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Buy / Sell Signals
                </button>
              </div>
            </div>
          }
          subtitle={
            activeChartTab === 'equity'
              ? `Daily mark-to-market comparison: ${summary.totalReturnPercent >= 0 ? '+' : ''}${summary.totalReturnPercent}% Strategy vs Buy & Hold benchmark`
              : `Historical price trajectory for ${symbol} with entry and exit execution triggers`
          }
          action={
            <div className="flex items-center gap-3 text-[10px]">
              {activeChartTab === 'equity' ? (
                <>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-3 h-1 bg-emerald-400 rounded-sm" /> Strategy NAV
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <span className="w-3 h-1 bg-cyan-400 rounded-sm" /> Buy & Hold
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <span className="w-3 h-0.5 bg-slate-300 rounded-sm" /> Price
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span>▲</span> Buy Entry
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <span>▼</span> Sell Exit
                  </span>
                </>
              )}
            </div>
          }
        >
          {/* Chart Canvas */}
          <div className="h-72 w-full relative bg-[#060911] border border-[#151d2e] rounded-sm p-3">
            {activeChartTab === 'equity' && equityChartData && (
              <svg
                viewBox={`0 0 ${equityChartData.width} ${equityChartData.height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1={equityChartData.height / 4} x2={equityChartData.width} y2={equityChartData.height / 4} stroke="#1b253b" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1={equityChartData.height / 2} x2={equityChartData.width} y2={equityChartData.height / 2} stroke="#1b253b" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1={(equityChartData.height * 3) / 4} x2={equityChartData.width} y2={(equityChartData.height * 3) / 4} stroke="#1b253b" strokeWidth="0.8" strokeDasharray="3 3" />

                {/* Strategy Area fill */}
                <polygon points={equityChartData.stratArea} fill="url(#stratGrad)" />

                {/* Buy & Hold Benchmark Path */}
                <polyline
                  points={equityChartData.benchPoints}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.8"
                  strokeOpacity="0.75"
                />

                {/* Strategy NAV Path */}
                <polyline
                  points={equityChartData.stratPoints}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.4"
                />
              </svg>
            )}

            {activeChartTab === 'signals' && signalChartData && (
              <svg
                viewBox={`0 0 ${signalChartData.width} ${signalChartData.height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Grid Lines */}
                <line x1="0" y1={signalChartData.height / 4} x2={signalChartData.width} y2={signalChartData.height / 4} stroke="#1b253b" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1={signalChartData.height / 2} x2={signalChartData.width} y2={signalChartData.height / 2} stroke="#1b253b" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1={(signalChartData.height * 3) / 4} x2={signalChartData.width} y2={(signalChartData.height * 3) / 4} stroke="#1b253b" strokeWidth="0.8" strokeDasharray="3 3" />

                {/* Closing Price Path */}
                <polyline
                  points={signalChartData.pricePoints}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.8"
                />

                {/* Buy / Sell Markers */}
                {signalChartData.tradeMarkers.map((m, idx) => (
                  <g key={idx} transform={`translate(${m.x}, ${m.y})`}>
                    {m.type === 'BUY_ENTRY' ? (
                      <>
                        <circle r="5" fill="#10b981" fillOpacity="0.3" />
                        <circle r="3" fill="#34d399" />
                        <text
                          y="-9"
                          textAnchor="middle"
                          fill="#34d399"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          BUY @ {formatCurrency(m.price)}
                        </text>
                      </>
                    ) : (
                      <>
                        <circle r="5" fill="#f43f5e" fillOpacity="0.3" />
                        <circle r="3" fill="#fb7185" />
                        <text
                          y="18"
                          textAnchor="middle"
                          fill="#fb7185"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          SELL @ {formatCurrency(m.price)}
                        </text>
                      </>
                    )}
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Chart Axis Bounds & Outperformance Pill */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-[#151d2e] mt-2">
            <span>Start: {summary.startDate}</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                Strategy Final NAV: <strong className="text-white">{formatCurrency(summary.finalCapital)}</strong>
              </span>
              <Badge variant={summary.totalReturnPercent >= 0 ? 'gain' : 'loss'} size="xs">
                {summary.totalReturnPercent >= 0 ? 'PROFITABLE' : 'DRAWDOWN'}
              </Badge>
            </div>
            <span>End: {summary.endDate}</span>
          </div>
        </Card>
      )}

      {/* 5. Simple Trade History Table */}
      <Card
        title={`Executed Trade Ledger (${trades.length} Actions)`}
        subtitle="Chronological audit of entry and exit executions under zero look-ahead bias"
      >
        {trades.length > 0 ? (
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-[#080d18] border-b border-[#182030] text-slate-500 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Shares</th>
                  <th className="py-2.5 px-3 text-right">Net Value</th>
                  <th className="py-2.5 px-3 text-right">Realized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141b28]">
                {trades.slice().reverse().map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#101726] transition-colors">
                    <td className="py-2.5 px-3 text-slate-400">{t.date}</td>
                    <td className="py-2.5 px-3 font-bold">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                        t.type === 'BUY_ENTRY'
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                          : 'bg-rose-950/50 text-rose-400 border border-rose-800/40'
                      }`}>
                        {t.type === 'BUY_ENTRY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.type === 'BUY_ENTRY' ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{formatCurrency(t.price)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{t.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{formatCurrency(t.cost)}</td>
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      t.type === 'BUY_ENTRY'
                        ? 'text-slate-500'
                        : t.pnl >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {t.type === 'BUY_ENTRY' ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        `${t.pnl >= 0 ? '+' : ''}${formatCurrency(t.pnl)} (${t.pnlPercent >= 0 ? '+' : ''}${t.pnlPercent}%)`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 bg-[#070b13] border border-[#162034] rounded-sm text-center space-y-2">
            <Info className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-300 font-bold">No Trade Triggers in Selected Period</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Under the {strategies.find((s) => s.id === strategyId)?.name} rules, price did not cross the entry threshold for {symbol} during this timeframe. Try expanding the timeframe or testing another asset.
            </p>
          </div>
        )}
      </Card>

      {/* 6. Expandable Advanced Metrics Section */}
      <div className="border border-[#182030] rounded-sm overflow-hidden bg-[#080d18]">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 bg-[#0a101d] hover:bg-[#0e172a] text-slate-300 text-xs font-bold flex items-center justify-between transition-colors font-mono"
        >
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>ADVANCED QUANTITATIVE METRICS & EXECUTION MODEL</span>
            <Badge variant="neutral" size="xs">
              {showAdvanced ? 'COLLAPSE' : 'EXPAND'}
            </Badge>
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAdvanced && summary && (
          <div className="p-4 space-y-4 border-t border-[#182030] text-xs">
            {/* Advanced Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#060911] border border-[#162034] rounded-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Sharpe Ratio</div>
                <div className="text-base font-bold text-white mt-1">
                  {summary.sharpeRatio !== null && summary.sharpeRatio !== undefined
                    ? Number(summary.sharpeRatio).toFixed(2)
                    : 'N/A'}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">Rf: 6.5% Annualized</div>
              </div>

              <div className="p-3 bg-[#060911] border border-[#162034] rounded-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold">CAGR</div>
                <div className="text-base font-bold text-purple-300 mt-1">
                  {summary.cagrPercent !== null && summary.cagrPercent !== undefined ? `${summary.cagrPercent}%` : 'N/A'}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">Compound Annual Growth</div>
              </div>

              <div className="p-3 bg-[#060911] border border-[#162034] rounded-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Profit Factor</div>
                <div className="text-base font-bold text-sky-400 mt-1">
                  {summary.profitFactor !== null && summary.profitFactor !== undefined
                    ? Number(summary.profitFactor).toFixed(2)
                    : 'N/A'}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">Gross Profit / Gross Loss</div>
              </div>

              <div className="p-3 bg-[#060911] border border-[#162034] rounded-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Alpha / Beta</div>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  {summary.alphaPercent > 0 ? '+' : ''}{summary.alphaPercent}% / {summary.beta}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">vs Benchmark Sensitivity</div>
              </div>
            </div>

            {/* Internal Assumptions & Interview Talking Points */}
            <div className="p-3.5 bg-[#070b13] border border-[#162034] rounded-sm space-y-2 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Internal Execution Model & Quantitative Integrity</span>
              </div>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-200">Zero Look-Ahead Bias:</strong> Signals are evaluated strictly at the candle <code className="text-purple-300">Close[T]</code>. Orders execute at next-candle <code className="text-purple-300">Open[T+1]</code>.
                </li>
                <li>
                  <strong className="text-slate-200">Transaction Friction:</strong> Standard <code className="text-purple-300">0.10% Slippage</code> and <code className="text-purple-300">0.05% Brokerage Commission</code> are automatically deducted on both entry and exit.
                </li>
                <li>
                  <strong className="text-slate-200">Default Strategy Parameters:</strong> RSI uses Wilder's 14-period smoothing (30/70 thresholds); EMA applies 20-day / 50-day exponential multipliers; MACD utilizes standard 12/26/9 signal lines.
                </li>
                <li>
                  <strong className="text-slate-200">Real Market Candles:</strong> Market data is pulled from genuine historical daily candles via Yahoo Finance / TwelveData.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
