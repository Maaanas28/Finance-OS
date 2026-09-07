import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import { FlaskConical, Play, RefreshCw, TrendingUp, ShieldAlert, BarChart3, CheckCircle2, AlertTriangle, Layers, Calendar, DollarSign } from 'lucide-react';

export function StrategyLabPage() {
  const [selectedStrategy, setSelectedStrategy] = useState('mean_reversion');
  const [symbol, setSymbol] = useState('RELIANCE');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [timeframe, setTimeframe] = useState('1Y');
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [fastEma, setFastEma] = useState(20);
  const [slowEma, setSlowEma] = useState(50);

  const [backtestResult, setBacktestResult] = useState(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch Strategy Templates
  const { data: templatesRes } = useQuery({
    queryKey: ['strategyTemplates'],
    queryFn: () => api.getStrategyTemplates(),
    staleTime: 300000,
  });

  const templates = templatesRes?.data || [
    {
      id: 'mean_reversion',
      name: 'RSI Mean Reversion',
      category: 'MEAN_REVERSION',
      description: 'Executes BUY when 14-day RSI drops below oversold threshold (30) and SELL when RSI exceeds 70.',
      defaultSymbol: 'RELIANCE',
    },
    {
      id: 'momentum_ema',
      name: '20/50 EMA Trend Crossover',
      category: 'MOMENTUM',
      description: 'Captures trend momentum by going long when 20 EMA crosses above 50 EMA on daily timeframe.',
      defaultSymbol: 'NIFTY 50',
    },
    {
      id: 'macd_momentum',
      name: 'MACD Signal Line Crossover',
      category: 'MOMENTUM',
      description: 'Enters long positions when MACD line crosses above 9-day signal line with positive histogram expansion.',
      defaultSymbol: 'TCS',
    },
  ];

  const handleRunBacktest = async (overrideParams = {}) => {
    setIsBacktesting(true);
    setErrorMsg(null);

    const stratId = overrideParams.strategyId || selectedStrategy;
    const targetSymbol = overrideParams.symbol || symbol;

    const payload = {
      strategyId: stratId,
      symbol: targetSymbol,
      initialCapital: Number(initialCapital) || 100000,
      timeframe,
      slippagePercent: 0.1,
      commissionPercent: 0.05,
      params: {
        rsiPeriod: Number(rsiPeriod),
        fastEma: Number(fastEma),
        slowEma: Number(slowEma),
        oversoldThreshold: 30,
        overboughtThreshold: 70,
      },
    };

    try {
      const res = await api.runBacktest(payload);
      setBacktestResult(res?.data || null);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to execute backtest simulation. Check symbol or market provider.');
      setBacktestResult(null);
    } finally {
      setIsBacktesting(false);
    }
  };

  // Auto-run initial backtest on load
  useEffect(() => {
    handleRunBacktest();
  }, []);

  const summary = backtestResult?.summary;
  const trades = backtestResult?.trades || [];
  const meta = backtestResult?.meta || {};

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#182030]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              STRATEGY LAB & QUANT BACKTESTER
            </h1>
            <Badge variant="purple" size="xs">
              VECTORIZED QUANT ENGINE
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Algorithmic strategy development, zero look-ahead bias execution, and realistic transaction cost simulation
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <DataStatusBadge status={meta.dataStatus || 'HISTORICAL'} />
          <Button
            variant="primary"
            size="xs"
            icon={Play}
            onClick={() => handleRunBacktest()}
            disabled={isBacktesting}
          >
            {isBacktesting ? 'Running Quant Engine...' : 'Execute Backtest'}
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

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config Panel & Strategy Library */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Quantitative Strategy Library" subtitle="Select strategy template to backtest">
            <div className="space-y-2 text-xs">
              {templates.map((strat) => (
                <div
                  key={strat.id}
                  onClick={() => {
                    setSelectedStrategy(strat.id);
                    if (strat.defaultSymbol) setSymbol(strat.defaultSymbol);
                    handleRunBacktest({ strategyId: strat.id, symbol: strat.defaultSymbol || symbol });
                  }}
                  className={`p-3 rounded-sm border cursor-pointer transition-colors ${
                    selectedStrategy === strat.id
                      ? 'bg-[#141d2d] border-purple-500/60 text-white'
                      : 'bg-[#0c1017] border-[#182030] hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{strat.name}</span>
                    <Badge variant={strat.category === 'MEAN_REVERSION' ? 'blue' : 'emerald'} size="xs">
                      {strat.category || 'QUANT'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-1.5 leading-relaxed">
                    {strat.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Strategy Parameters Controls */}
          <Card title="Backtest Parameters" subtitle="Configure initial capital, timeframe & rules">
            <form onSubmit={(e) => { e.preventDefault(); handleRunBacktest(); }} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold">Target Instrument Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[#080c14] border border-[#182030] rounded-sm px-2.5 py-1.5 text-xs text-white font-mono mt-1 focus:outline-none focus:border-purple-500"
                  placeholder="e.g. RELIANCE, NIFTY 50, TCS"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Initial Capital (₹)</label>
                  <input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full bg-[#080c14] border border-[#182030] rounded-sm px-2 py-1.5 text-xs text-white font-mono mt-1 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-[#080c14] border border-[#182030] rounded-sm px-2 py-1.5 text-xs text-white font-mono mt-1 focus:outline-none focus:border-purple-500"
                  >
                    <option value="1Y">1 Year (Daily)</option>
                    <option value="6M">6 Months (Daily)</option>
                    <option value="2Y">2 Years (Daily)</option>
                  </select>
                </div>
              </div>

              {selectedStrategy === 'mean_reversion' && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">RSI Lookback Period</label>
                  <input
                    type="number"
                    value={rsiPeriod}
                    onChange={(e) => setRsiPeriod(Number(e.target.value))}
                    className="w-full bg-[#080c14] border border-[#182030] rounded-sm px-2 py-1.5 text-xs text-white font-mono mt-1 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {selectedStrategy === 'momentum_ema' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Fast EMA</label>
                    <input
                      type="number"
                      value={fastEma}
                      onChange={(e) => setFastEma(Number(e.target.value))}
                      className="w-full bg-[#080c14] border border-[#182030] rounded-sm px-2 py-1.5 text-xs text-white font-mono mt-1 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Slow EMA</label>
                    <input
                      type="number"
                      value={slowEma}
                      onChange={(e) => setSlowEma(Number(e.target.value))}
                      className="w-full bg-[#080c14] border border-[#182030] rounded-sm px-2 py-1.5 text-xs text-white font-mono mt-1 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <Button type="submit" variant="secondary" size="xs" icon={RefreshCw} disabled={isBacktesting} className="w-full mt-2">
                Re-Run Simulation
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Real Backtest Results & Trade Ledger */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Backtest Performance & Quantitative Risk Metrics"
            subtitle={`Target: ${symbol} (${meta.providerName || 'Yahoo Finance'} Data · ${summary?.totalCandles || 0} Candles)`}
            action={
              <Badge variant={summary?.totalReturnPercent >= 0 ? 'gain' : 'loss'} size="xs">
                {summary?.totalReturnPercent >= 0 ? 'STRATEGY PROFITABLE' : 'STRATEGY DRAWDOWN'}
              </Badge>
            }
          >
            {isBacktesting ? (
              <div className="space-y-4 py-8 animate-pulse">
                <div className="h-12 bg-slate-800 rounded w-full" />
                <div className="h-32 bg-slate-800 rounded w-full" />
              </div>
            ) : summary ? (
              <div className="space-y-4 font-mono text-xs">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#080c14] border border-[#182030] rounded-sm">
                    <div className="text-[10px] text-slate-500 uppercase">Total Return</div>
                    <div className={`text-lg font-bold mt-0.5 ${summary.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {summary.totalReturnPercent >= 0 ? '+' : ''}{summary.totalReturnPercent.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">CAGR: {summary.cagrPercent}%</div>
                  </div>

                  <div className="p-3 bg-[#080c14] border border-[#182030] rounded-sm">
                    <div className="text-[10px] text-slate-500 uppercase">Sharpe Ratio</div>
                    <div className="text-lg font-bold text-white mt-0.5">{summary.sharpeRatio.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Risk-Free: 6.5%</div>
                  </div>

                  <div className="p-3 bg-[#080c14] border border-[#182030] rounded-sm">
                    <div className="text-[10px] text-slate-500 uppercase">Max Drawdown</div>
                    <div className="text-lg font-bold text-rose-400 mt-0.5">-{summary.maxDrawdownPercent.toFixed(2)}%</div>
                    <div className="text-[10px] text-slate-500 mt-1">Peak-to-Trough</div>
                  </div>

                  <div className="p-3 bg-[#080c14] border border-[#182030] rounded-sm">
                    <div className="text-[10px] text-slate-500 uppercase">Win Rate</div>
                    <div className="text-lg font-bold text-sky-400 mt-0.5">{summary.winRatePercent}%</div>
                    <div className="text-[10px] text-slate-500 mt-1">Profit Factor: {summary.profitFactor}</div>
                  </div>
                </div>

                {/* Additional Risk Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 bg-[#080d18] border border-[#182030] rounded-sm">
                  <div>
                    <span className="text-slate-500">Initial Capital:</span>{' '}
                    <span className="text-slate-200 font-bold">{formatCurrency(summary.initialCapital)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Final Equity:</span>{' '}
                    <span className="text-white font-bold">{formatCurrency(summary.finalCapital)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Trades:</span>{' '}
                    <span className="text-slate-200 font-bold">{summary.totalTrades} ({summary.winningTrades}W / {summary.losingTrades}L)</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Alpha / Beta:</span>{' '}
                    <span className="text-purple-400 font-bold">{summary.alphaPercent > 0 ? '+' : ''}{summary.alphaPercent}% / {summary.beta}</span>
                  </div>
                </div>

                {/* Data Provenance & Execution Disclaimer */}
                <div className="p-2.5 bg-[#090e18] border border-[#162034] rounded-sm text-[10px] text-slate-400 space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>DATA PROVENANCE & EXECUTION MODEL</span>
                    <span className="text-sky-400">{meta.providerName || 'Yahoo Finance'} ({summary.startDate} → {summary.endDate})</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Execution Mode: Next-session Open price (Zero Look-Ahead Bias) · Friction: 0.10% Slippage + 0.05% Commission per trade.
                  </p>
                </div>

                {/* Executed Signals Table */}
                <div className="space-y-2 pt-2 border-t border-[#182030]">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                    <span>Executed Signals Audit Log ({trades.length} Trades)</span>
                    <span className="text-[10px] text-slate-500">Chronological Orders</span>
                  </div>

                  {trades.length > 0 ? (
                    <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="sticky top-0 bg-[#080d18] border-b border-[#182030] text-slate-500 text-[10px] uppercase">
                          <tr>
                            <th className="py-2 px-2">Date</th>
                            <th className="py-2 px-2">Signal</th>
                            <th className="py-2 px-2 text-right">Price</th>
                            <th className="py-2 px-2 text-right">Qty</th>
                            <th className="py-2 px-2 text-right">Net Value</th>
                            <th className="py-2 px-2 text-right">Realized P&L</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141b28]">
                          {trades.slice().reverse().map((t, idx) => (
                            <tr key={idx} className="hover:bg-[#121927]">
                              <td className="py-2 px-2 text-slate-400">{t.date}</td>
                              <td className="py-2 px-2 font-bold">
                                <span className={t.type === 'BUY_ENTRY' ? 'text-emerald-400' : 'text-rose-400'}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right text-slate-300">{formatCurrency(t.price)}</td>
                              <td className="py-2 px-2 text-right text-slate-400">{t.quantity}</td>
                              <td className="py-2 px-2 text-right text-slate-300">{formatCurrency(t.cost)}</td>
                              <td className={`py-2 px-2 text-right font-bold ${
                                t.type === 'BUY_ENTRY' ? 'text-slate-500'
                                : t.pnl >= 0 ? 'text-emerald-400'
                                : 'text-rose-400'
                              }`}>
                                {t.type === 'BUY_ENTRY' ? '—' : `${t.pnl >= 0 ? '+' : ''}${formatCurrency(t.pnl)} (${t.pnlPercent >= 0 ? '+' : ''}${t.pnlPercent}%)`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 bg-[#080c14] border border-[#182030] rounded-sm text-center text-xs text-slate-500">
                      No buy/sell trade triggers were generated for {symbol} under the selected strategy rules in this timeframe. Try adjusting indicator thresholds or selecting another instrument.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">No backtest output available.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
