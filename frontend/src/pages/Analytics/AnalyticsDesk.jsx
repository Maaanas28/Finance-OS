import React, { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import {
  BarChart3,
  TrendingUp,
  Activity,
  ShieldCheck,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  PieChart,
  Grid,
  Award,
  Layers,
  Zap,
} from 'lucide-react';

export function AnalyticsDesk() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [timeframe, setTimeframe] = useState('1M'); // '1M' | '3M' | '6M' | '1Y'
  const [summary, setSummary] = useState(null);
  const [performanceSeries, setPerformanceSeries] = useState(null);
  const [attribution, setAttribution] = useState(null);
  const [ratios, setRatios] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user portfolios
      const pRes = await api.getPortfolios().catch(() => ({ data: [] }));
      const pList = pRes?.data || [];
      setPortfolios(pList);

      const targetId = selectedPortfolioId || pList[0]?.id || '';

      // Parallel data fetching for analytics telemetry
      const [sumRes, seriesRes, attrRes, ratioRes] = await Promise.all([
        api.getAnalyticsSummary(targetId),
        api.getAnalyticsPerformanceSeries(targetId, timeframe),
        api.getAnalyticsAttribution(targetId),
        api.getAnalyticsRatios(targetId),
      ]);

      setSummary(sumRes?.data || null);
      setPerformanceSeries(seriesRes?.data || null);
      setAttribution(attrRes?.data || null);
      setRatios(ratioRes?.data || null);
    } catch (err) {
      console.error('Error loading analytics telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const v = summary?.valuation;
  const r = summary?.ratios;
  const t = summary?.tradingStatistics;
  const series = performanceSeries?.series || [];
  const sectorAlloc = attribution?.sectorAllocations || [];
  const posAttribution = attribution?.positionAttributions || [];

  // SVG Chart coordinate mapper
  let minRet = 0;
  let maxRet = 0;
  if (series.length > 0) {
    const allRet = series.flatMap((s) => [s.portfolioReturnPercent, s.benchmarkReturnPercent]);
    minRet = Math.min(...allRet, -1);
    maxRet = Math.max(...allRet, 1);
  }

  const mapY = (val) => {
    if (maxRet === minRet) return 50;
    const norm = (val - minRet) / (maxRet - minRet);
    return Math.max(10, Math.min(90, 90 - norm * 80));
  };

  const zeroY = mapY(0);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#172033]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">
              PERFORMANCE & ATTRIBUTION ANALYTICS
            </h1>
            <Badge variant="info" size="xs">
              ALPHA DESK
            </Badge>
            <DataStatusBadge status={summary?.dataStatus ? summary.dataStatus : (loading ? 'CACHED' : 'HISTORICAL')} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Time-Weighted Performance, Risk Ratios, Sector Attribution, and Realized P&L Statistics
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Portfolio Switcher */}
          <div className="relative">
            <select
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="bg-[#090e17] border border-[#1e293b] text-white text-xs font-mono rounded px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {portfolios.length > 0 ? (
                portfolios.map((pItem) => (
                  <option key={pItem.id} value={pItem.id}>
                    {pItem.name}
                  </option>
                ))
              ) : (
                <option value="">Primary Portfolio</option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-[#090e17] border border-[#1e293b] rounded p-0.5">
            {['1M', '3M', '6M', '1Y'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                  timeframe === tf ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="xs"
            icon={RefreshCw}
            onClick={() => loadData()}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Telemetry'}
          </Button>
        </div>
      </div>

      {/* KPI Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Portfolio Value */}
        <MetricCard
          label="Total Portfolio Value"
          value={formatCurrency(v?.totalValue || 0)}
          subvalue={`Cash: ${formatCurrency(v?.cashBalance || 0)}`}
          badgeText="Live Balance"
          badgeVariant="neutral"
          icon={BarChart3}
        />

        {/* Total P&L Return */}
        <MetricCard
          label="Unrealized P&L Return"
          value={`${(v?.unrealizedPnL || 0) >= 0 ? '+' : ''}${formatCurrency(v?.unrealizedPnL || 0)}`}
          subvalue={`Return: ${(v?.unrealizedPnLPercent || 0) >= 0 ? '+' : ''}${v?.unrealizedPnLPercent || '0.00'}%`}
          badgeText={v?.unrealizedPnL >= 0 ? 'Gain' : 'Loss'}
          badgeVariant={v?.unrealizedPnL >= 0 ? 'gain' : 'loss'}
          icon={TrendingUp}
        />

        {/* Sharpe & Sortino */}
        <MetricCard
          label="Sharpe / Sortino Ratio"
          value={`${r?.sharpe !== undefined ? (typeof r.sharpe === 'number' ? r.sharpe.toFixed(2) : String(r.sharpe)) : '0.00'} / ${r?.sortino !== undefined ? (typeof r.sortino === 'number' ? r.sortino.toFixed(2) : String(r.sortino)) : '0.00'}`}
          subvalue={`Risk-Free Hurdle: 6.5%`}
          badgeText="Risk Adjusted"
          badgeVariant="gain"
          icon={ShieldCheck}
        />

        {/* Volatility & Beta */}
        <MetricCard
          label="Annual Volatility / Beta"
          value={`${r?.annualizedVolatility !== undefined ? r.annualizedVolatility : '0.0'}% / ${r?.beta !== undefined ? (typeof r.beta === 'number' ? r.beta.toFixed(2) : String(r.beta)) : '0.00'}`}
          subvalue={`Benchmark Vol: ${r?.benchmarkVolatility !== undefined ? r.benchmarkVolatility : '0.0'}%`}
          badgeText="Sensitivity"
          badgeVariant="neutral"
          icon={Activity}
        />

        {/* Maximum Drawdown */}
        <MetricCard
          label="Maximum Peak Drawdown"
          value={`${r?.maxDrawdown !== undefined ? r.maxDrawdown : '0.0'}%`}
          subvalue={`Alpha: ${(r?.alpha || 0) >= 0 ? '+' : ''}${r?.alpha || '0.0'}%`}
          badgeText="Underwater"
          badgeVariant="loss"
          icon={TrendingDown}
        />
      </div>

      {/* Primary Visual Row: Performance Curve & Sector Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main SVG Performance Curve */}
        <div className="lg:col-span-2 bg-[#090e17] border border-[#172033] rounded p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-[#172033] pb-2">
            <div>
              <span className="font-bold text-white uppercase text-xs">
                CUMULATIVE PERFORMANCE vs {summary?.portfolio?.benchmarkSymbol || 'NIFTY 50'} ({timeframe})
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Time-weighted daily percentage return comparison
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-emerald-400" /> Portfolio
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-cyan-400 opacity-60" /> {summary?.portfolio?.benchmarkSymbol || 'NIFTY 50'}
              </span>
            </div>
          </div>

          <div className="h-64 w-full relative bg-[#070b13] border border-[#172033] rounded p-2 flex items-end">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
              <line x1="0" y1={zeroY} x2="500" y2={zeroY} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

              {series.length > 1 && (
                <>
                  {/* Benchmark Path */}
                  <path
                    d={`M 0 ${mapY(series[0].benchmarkReturnPercent)} ${series
                      .map((pt, i) => `L ${(i / (series.length - 1)) * 500} ${mapY(pt.benchmarkReturnPercent)}`)
                      .join(' ')}`}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />

                  {/* Portfolio Path */}
                  <path
                    d={`M 0 ${mapY(series[0].portfolioReturnPercent)} ${series
                      .map((pt, i) => `L ${(i / (series.length - 1)) * 500} ${mapY(pt.portfolioReturnPercent)}`)
                      .join(' ')}`}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2"
                  />
                </>
              )}
            </svg>
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 pt-1">
            <span>{series[0]?.date || 'Start'}</span>
            <span>Current NAV: {formatCurrency(v?.totalValue || 0)}</span>
            <span>{series[series.length - 1]?.date || 'End'}</span>
          </div>
        </div>

        {/* Sector Allocation Breakdown */}
        <div className="bg-[#090e17] border border-[#172033] rounded p-4 space-y-3 flex flex-col justify-between">
          <div className="border-b border-[#172033] pb-2">
            <span className="font-bold text-white uppercase text-xs">SECTOR & ASSET CONCENTRATION</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Percentage allocation by sector & cash reserves
            </p>
          </div>

          <div className="space-y-2.5 flex-1 py-1">
            {sectorAlloc.length > 0 ? (
              sectorAlloc.map((sec) => (
                <div key={sec.sector} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 font-semibold">{sec.sector}</span>
                    <span className="text-white font-bold">{sec.percentage}%</span>
                  </div>
                  <div className="w-full bg-[#101726] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(sec.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500">
                No active asset positions for sector breakdown.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#141d30] text-[10px] text-slate-400 flex justify-between">
            <span>Cash: {formatCurrency(v?.cashBalance || 0)}</span>
            <span>Equity: {formatCurrency(v?.equityValue || 0)}</span>
          </div>
        </div>
      </div>

      {/* Quantitative Indicators & Position Performance Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Indicators Table */}
        <div className="bg-[#090e17] border border-[#172033] rounded p-4 space-y-3">
          <div className="border-b border-[#172033] pb-2">
            <span className="font-bold text-white uppercase text-xs">QUANTITATIVE RISK & RETURN RATIOS</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Statistical indicator scorecard</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#172033] text-slate-400 uppercase text-[10px]">
                  <th className="py-2 px-1">Metric</th>
                  <th className="py-2 px-1 text-right">Value</th>
                  <th className="py-2 px-1 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131b2d]">
                {ratios?.metrics?.map((m) => (
                  <tr key={m.key} className="hover:bg-[#0c1424]">
                    <td className="py-2 px-1 text-slate-300">{m.label}</td>
                    <td className="py-2 px-1 text-right font-bold text-white">{m.value}</td>
                    <td className="py-2 px-1 text-right">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#101726] text-cyan-300 border border-[#1e2a40]">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Position Attribution Table */}
        <div className="lg:col-span-2 bg-[#090e17] border border-[#172033] rounded p-4 space-y-3">
          <div className="border-b border-[#172033] pb-2">
            <span className="font-bold text-white uppercase text-xs">POSITION PERFORMANCE ATTRIBUTION</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Holding-level contribution to total unrealized P&L</p>
          </div>

          <div className="overflow-x-auto">
            {posAttribution.length > 0 ? (
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#172033] bg-[#070b13] text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Sector</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Avg Cost</th>
                    <th className="py-2 px-3 text-right">LTP</th>
                    <th className="py-2 px-3 text-right">Market Value</th>
                    <th className="py-2 px-3 text-right">Weight</th>
                    <th className="py-2 px-3 text-right">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#131b2d]">
                  {posAttribution.map((pos) => {
                    const isGain = pos.unrealizedPnL >= 0;
                    return (
                      <tr key={pos.symbol} className="hover:bg-[#0c1424]">
                        <td className="py-2.5 px-3 font-bold text-white">{pos.symbol}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{pos.sector}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{pos.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">₹{pos.averageBuyPrice}</td>
                        <td className="py-2.5 px-3 text-right text-white font-semibold">₹{pos.ltp}</td>
                        <td className="py-2.5 px-3 text-right text-slate-200">{formatCurrency(pos.currentValue)}</td>
                        <td className="py-2.5 px-3 text-right text-cyan-400 font-semibold">{pos.weightPercent}%</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isGain ? '+' : ''}{formatCurrency(pos.unrealizedPnL)} ({isGain ? '+' : ''}{pos.unrealizedPnLPercent}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500">
                No active holdings for position attribution analysis.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
