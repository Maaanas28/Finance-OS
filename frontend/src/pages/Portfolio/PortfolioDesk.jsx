import React, { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { TradeModal } from './TradeModal.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  ListFilter,
  History,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

export function PortfolioDesk() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [summary, setSummary] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [allocations, setAllocations] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Tabs: 'holdings' | 'allocations' | 'transactions'
  const [activeTab, setActiveTab] = useState('holdings');

  // Trade Modal State
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [modalPrefills, setModalPrefills] = useState({
    symbol: '',
    type: 'BUY',
  });

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // 1. Get portfolios list
      const pListRes = await api.getPortfolios().catch(() => ({ data: [] }));
      const pList = pListRes?.data || [];
      setPortfolios(pList);

      const targetId = selectedPortfolioId || pList[0]?.id || '';

      // 2. Fetch parallel summary, holdings, allocations, transactions
      const [sumRes, holdRes, allocRes, txRes] = await Promise.all([
        api.getPortfolioSummary(targetId),
        api.getHoldings(targetId),
        api.getAllocations(targetId),
        api.getTransactions(targetId),
      ]);

      setSummary(sumRes?.data || null);
      setHoldings(holdRes?.data || []);
      setAllocations(allocRes?.data || null);
      setTransactions(txRes?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load portfolio telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPortfolioId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleOpenTrade = (type = 'BUY', symbol = '') => {
    setModalPrefills({ type, symbol });
    setTradeModalOpen(true);
  };

  const handleTradeSuccess = () => {
    loadData(true);
  };

  const currentCash = summary?.cashBalance || 0;
  const isElevatedConcentration = allocations?.hasConcentrationRisk;
  const highestSector = allocations?.maxConcentrationSector;

  return (
    <div className="space-y-6">
      {/* Top Header & Portfolio Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#172033]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              PORTFOLIO DESK
            </h1>
            <Badge variant="info" size="xs">
              MARK-TO-MARKET
            </Badge>
            <DataStatusBadge status={summary?.dataStatus ? summary.dataStatus : (loading ? 'CACHED' : 'UNKNOWN')} />
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Dynamic asset valuation, real-time holdings attribution, and order execution
          </p>
        </div>

        {/* Action Controls & Portfolio Selector */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Portfolio Selector */}
          <div className="relative">
            <select
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="bg-[#090e17] border border-[#1e293b] text-white text-xs font-mono rounded px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {portfolios.length > 0 ? (
                portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.currency})
                  </option>
                ))
              ) : (
                <option value="">Primary Portfolio (INR)</option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <Button
            variant="secondary"
            size="xs"
            icon={RefreshCw}
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Syncing...' : 'Sync MTM'}
          </Button>

          <Button
            variant="secondary"
            size="xs"
            icon={Wallet}
            onClick={() => handleOpenTrade('DEPOSIT')}
          >
            Cash Liquidity
          </Button>

          <Button
            variant="primary"
            size="xs"
            icon={Plus}
            onClick={() => handleOpenTrade('BUY')}
          >
            Execute Trade
          </Button>
        </div>
      </div>

      {/* Primary Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Valuation */}
        <MetricCard
          label="Total Portfolio Value"
          value={formatCurrency(summary?.totalValue || 0)}
          subvalue={`Equities: ${formatCurrency(summary?.equityValue || 0)}`}
          badgeText="NAV Active"
          badgeVariant="neutral"
          icon={Wallet}
        />

        {/* Today's P&L */}
        <MetricCard
          label="Today's Session P&L"
          value={formatCurrency(summary?.todayPnl || 0)}
          change={summary?.todayPnl || 0}
          changePercent={summary?.todayPnlPercent || 0}
          status={(summary?.todayPnl || 0) >= 0 ? 'gain' : 'loss'}
          subvalue="Session Mark-to-Market"
        />

        {/* Total Return */}
        <MetricCard
          label="Total Unrealized Return"
          value={formatCurrency(summary?.totalReturn || 0)}
          change={summary?.totalReturn || 0}
          changePercent={summary?.totalReturnPercent || 0}
          status={(summary?.totalReturn || 0) >= 0 ? 'gain' : 'loss'}
          badgeText={`Alpha ${summary?.alpha || '0.0%'}`}
          badgeVariant="gain"
          icon={TrendingUp}
        />

        {/* Cash Balance */}
        <MetricCard
          label="Available Liquidity"
          value={formatCurrency(summary?.cashBalance || 0)}
          subvalue={`${
            summary?.totalValue
              ? ((summary.cashBalance / summary.totalValue) * 100).toFixed(1)
              : '0'
          }% Cash Allocation`}
          badgeText="Settled Cash"
          badgeVariant="neutral"
          icon={ArrowDownLeft}
        />

        {/* Invested Capital */}
        <MetricCard
          label="Invested Capital"
          value={formatCurrency(summary?.investedAmount || 0)}
          subvalue={`Beta: ${summary?.beta !== undefined ? (typeof summary.beta === 'number' ? summary.beta.toFixed(2) : summary.beta) : '0.00'} | Sharpe: ${summary?.sharpeRatio !== undefined ? (typeof summary.sharpeRatio === 'number' ? summary.sharpeRatio.toFixed(2) : summary.sharpeRatio) : '0.00'}`}
          badgeText={summary?.riskLevel || 'LOW'}
          badgeVariant="warn"
          icon={ShieldAlert}
        />
      </div>

      {/* Concentration Risk Alert Banner (Triggered when any sector > 30%) */}
      {isElevatedConcentration && (
        <div className="p-3.5 bg-amber-950/30 border border-amber-500/50 rounded flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-500/20 rounded text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <span className="font-bold text-amber-300 uppercase tracking-wider">
                CONCENTRATION RISK EXPOSURE DETECTED:
              </span>{' '}
              <span className="text-amber-200">
                {highestSector?.name} sector represents {highestSector?.percent}% of total portfolio
                value, exceeding the institutional 30.0% regulatory ceiling.
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setActiveTab('allocations')}
            className="shrink-0 text-amber-300 border-amber-600/40 hover:bg-amber-900/30"
          >
            Inspect Exposure
          </Button>
        </div>
      )}

      {/* Portfolio Workspace Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-[#172033] pt-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`pb-3 px-3 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'holdings'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            Holdings & Valuation ({holdings.length})
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`pb-3 px-3 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'allocations'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Sector & Asset Allocations
            {isElevatedConcentration && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 px-3 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'transactions'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Transaction Audit Ledger ({transactions.length})
          </button>
        </div>
      </div>

      {/* Tab 1: MARK-TO-MARKET HOLDINGS TABLE */}
      {activeTab === 'holdings' && (
        <div className="bg-[#090e17] border border-[#172033] rounded overflow-hidden">
          <div className="p-3 bg-[#0c1322] border-b border-[#172033] flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold tracking-wider uppercase">
              ACTIVE POSITIONS ATTRIBUTION & MARK-TO-MARKET
            </span>
            <span className="text-[11px] text-slate-400">
              Auto-priced via Market Data Engine • Deduplicated in-flight cache
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#172033] bg-[#070b13] text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Asset Symbol</th>
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Avg Cost</th>
                  <th className="py-2.5 px-3 text-right">Last Price (LTP)</th>
                  <th className="py-2.5 px-3 text-right">Market Value</th>
                  <th className="py-2.5 px-3 text-right">Today's P&L</th>
                  <th className="py-2.5 px-3 text-right">Total Unrealized P&L</th>
                  <th className="py-2.5 px-3 text-right">Portfolio Weight</th>
                  <th className="py-2.5 px-3 text-center">Quick Trade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131b2d]">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-slate-500 font-mono">
                      Pricing holdings against live market feeds...
                    </td>
                  </tr>
                ) : holdings.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-slate-500 font-mono">
                      No active equity positions in this portfolio.{' '}
                      <button
                        onClick={() => handleOpenTrade('BUY')}
                        className="text-cyan-400 hover:underline ml-1"
                      >
                        Execute an initial BUY order
                      </button>
                    </td>
                  </tr>
                ) : (
                  holdings.map((h) => {
                    const isGainTotal = (h.totalPnl || 0) >= 0;
                    const isGainToday = (h.todayPnl || 0) >= 0;
                    return (
                      <tr
                        key={h.id || h.symbol}
                        className="hover:bg-[#0c1424] transition-colors group"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white tracking-wide">{h.symbol}</span>
                            <span className="text-[10px] text-slate-500">[{h.exchange}]</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {h.name}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">{h.sector}</td>
                        <td className="py-3 px-3 text-right text-slate-200">
                          {Number(h.quantity).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300">
                          ₹{Number(h.averageBuyPrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-white">
                          ₹{Number(h.ltp).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-100">
                          ₹{Number(h.currentValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-semibold ${
                            isGainToday ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <div>
                            {isGainToday ? '+' : ''}
                            ₹{Number(h.todayPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px]">
                            {isGainToday ? '+' : ''}
                            {Number(h.todayPnlPercent).toFixed(2)}%
                          </div>
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold ${
                            isGainTotal ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <div>
                            {isGainTotal ? '+' : ''}
                            ₹{Number(h.totalPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px]">
                            {isGainTotal ? '+' : ''}
                            {Number(h.totalPnlPercent).toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="text-slate-200 font-semibold">
                            {Number(h.allocationPercent).toFixed(1)}%
                          </div>
                          <div className="w-16 ml-auto bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-cyan-500 h-full rounded-full"
                              style={{ width: `${Math.min(h.allocationPercent, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenTrade('BUY', h.symbol)}
                              className="p-1 px-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-semibold tracking-wider transition-colors"
                              title="Buy more shares"
                            >
                              BUY
                            </button>
                            <button
                              onClick={() => handleOpenTrade('SELL', h.symbol)}
                              className="p-1 px-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[10px] font-semibold tracking-wider transition-colors"
                              title="Sell position"
                            >
                              SELL
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: SECTOR & ASSET ALLOCATIONS */}
      {activeTab === 'allocations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          {/* Sector Concentration */}
          <div className="bg-[#090e17] border border-[#172033] rounded p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#172033] pb-3">
              <span className="font-semibold text-slate-200 uppercase tracking-wider">
                Sector Weightings & Risk Boundaries
              </span>
              <span className="text-[10px] text-slate-400">Ceiling: 30.0%</span>
            </div>

            <div className="space-y-3.5">
              {allocations?.sectors?.map((s) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{s.name}</span>
                      {s.isElevatedRisk && (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold">
                          RISK &gt;30%
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-300 font-bold">
                        ₹{Number(s.value).toLocaleString('en-IN')}
                      </span>
                      <span className="text-slate-400 ml-2 font-mono">({s.percent}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#111827] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.isElevatedRisk ? 'bg-amber-400' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(s.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Allocation Breakdown */}
          <div className="bg-[#090e17] border border-[#172033] rounded p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#172033] pb-3">
              <span className="font-semibold text-slate-200 uppercase tracking-wider">
                Capital Distribution by Asset Class
              </span>
              <span className="text-[10px] text-slate-400">Multi-Asset Ledger</span>
            </div>

            <div className="space-y-3.5">
              {allocations?.assetClasses?.map((a) => (
                <div key={a.type} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-white font-medium">{a.type}</span>
                    <div className="text-right">
                      <span className="text-slate-300 font-bold">
                        ₹{Number(a.value).toLocaleString('en-IN')}
                      </span>
                      <span className="text-slate-400 ml-2 font-mono">({a.percent}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#111827] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        a.type === 'EQUITY'
                          ? 'bg-blue-500'
                          : a.type === 'CASH'
                          ? 'bg-emerald-500'
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(a.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Model Benchmark Alpha Comparison */}
            <div className="mt-6 pt-4 border-t border-[#172033] space-y-2">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Benchmark Risk & Correlation
              </span>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 bg-[#0c1322] border border-[#172033] rounded">
                  <div className="text-[10px] text-slate-400">Benchmark</div>
                  <div className="text-white font-bold text-xs mt-0.5">NIFTY 50</div>
                </div>
                <div className="p-2 bg-[#0c1322] border border-[#172033] rounded">
                  <div className="text-[10px] text-slate-400">Beta vs Nifty</div>
                  <div className="text-cyan-400 font-bold text-xs mt-0.5">{summary?.beta || '1.28'}</div>
                </div>
                <div className="p-2 bg-[#0c1322] border border-[#172033] rounded">
                  <div className="text-[10px] text-slate-400">Excess Alpha</div>
                  <div className="text-emerald-400 font-bold text-xs mt-0.5">
                    {summary?.alpha || '+4.8%'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: TRANSACTION AUDIT LEDGER */}
      {activeTab === 'transactions' && (
        <div className="bg-[#090e17] border border-[#172033] rounded overflow-hidden">
          <div className="p-3 bg-[#0c1322] border-b border-[#172033] flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold tracking-wider uppercase">
              ORDER EXECUTION & LIQUIDITY AUDIT TRAIL
            </span>
            <span className="text-[11px] text-slate-400">
              Deterministic double-entry accounting ledger
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#172033] bg-[#070b13] text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Execution Time</th>
                  <th className="py-2.5 px-3">Order Type</th>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Total Net Amount</th>
                  <th className="py-2.5 px-3 text-right">Realized P&L</th>
                  <th className="py-2.5 px-3">Order Memo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131b2d]">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500 font-mono">
                      No transactions recorded in this ledger yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const isBuy = t.type === 'BUY';
                    const isSell = t.type === 'SELL';
                    const isDeposit = t.type === 'DEPOSIT';
                    const hasRealizedPnl = t.realizedPnl !== null && t.realizedPnl !== undefined;
                    const pnlPositive = (t.realizedPnl || 0) >= 0;

                    return (
                      <tr key={t.id} className="hover:bg-[#0c1424] transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {t.executedAt ? new Date(t.executedAt).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              isBuy
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : isSell
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : isDeposit
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {t.symbol || 'INR CASH'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200">
                          {t.quantity ? Number(t.quantity).toLocaleString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {t.price ? `₹${Number(t.price).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                          ₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-semibold ${
                            !hasRealizedPnl
                              ? 'text-slate-500'
                              : pnlPositive
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {hasRealizedPnl
                            ? `${pnlPositive ? '+' : ''}₹${Number(t.realizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[200px] truncate">
                          {t.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade Execution Modal Dialog */}
      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        portfolioId={selectedPortfolioId}
        currentCash={currentCash}
        holdings={holdings}
        prefilledSymbol={modalPrefills.symbol}
        prefilledType={modalPrefills.type}
        onTradeSuccess={handleTradeSuccess}
      />
    </div>
  );
}
