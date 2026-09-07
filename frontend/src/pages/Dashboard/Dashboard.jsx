import React, { useState, useEffect } from 'react';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PerformanceChart } from '../../components/finance/PerformanceChart.jsx';
import { MarketOverviewGrid } from '../../components/finance/MarketOverviewGrid.jsx';
import { TopMovers } from '../../components/finance/TopMovers.jsx';
import { RiskMatrix } from '../../components/finance/RiskMatrix.jsx';
import { FinanceIntelligence } from '../../components/finance/FinanceIntelligence.jsx';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import { api } from '../../services/api.js';
import { RefreshCw, Download, ShieldAlert, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';

export function Dashboard() {
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    investedAmount: 0,
    todayPnl: 0,
    todayPnlPercent: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    riskLevel: 'LOW',
    alpha: '0.0%',
    beta: 0,
    sharpe: 0,
  });
  const [syncing, setSyncing] = useState(false);

  const fetchSummary = async () => {
    setSyncing(true);
    try {
      const res = await api.getPortfolioSummary();
      if (res?.data) {
        setPortfolioData({
          totalValue: res.data.totalValue || 0,
          investedAmount: res.data.investedAmount || 0,
          todayPnl: res.data.todayPnl || 0,
          todayPnlPercent: res.data.todayPnlPercent || 0,
          totalReturn: res.data.totalReturn || 0,
          totalReturnPercent: res.data.totalReturnPercent || 0,
          riskLevel: res.data.riskLevel || 'LOW',
          alpha: res.data.alpha || '0.0%',
          beta: res.data.beta !== undefined ? res.data.beta : 0,
          sharpe: res.data.sharpeRatio !== undefined ? res.data.sharpeRatio : 0,
        });
      }
    } catch {
      // Clean state preserved
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 3000);
    return () => clearInterval(interval);
  }, []);

  const p = portfolioData;

  return (
    <div className="space-y-6">
      {/* Dashboard Top Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#172033]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">
              FINANCIAL COMMAND CENTER
            </h1>
            <Badge variant="info" size="xs">
              PORTFOLIO DESK
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time equity valuation, macroeconomic factor exposures, and risk analytics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="xs"
            icon={RefreshCw}
            onClick={fetchSummary}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Feed'}
          </Button>
          <Button variant="secondary" size="xs" icon={Download}>
            Export Telemetry
          </Button>
        </div>
      </div>

      {/* Primary Financial Overview Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <MetricCard
          label="Portfolio Value"
          value={formatCurrency(p.totalValue)}
          subvalue={`Invested: ${formatCurrency(p.investedAmount)}`}
          badgeText="Active"
          badgeVariant="neutral"
          icon={Wallet}
        />

        {/* Today's P&L */}
        <MetricCard
          label="Today's P&L"
          value={formatCurrency(p.todayPnl)}
          change={p.todayPnl}
          changePercent={p.todayPnlPercent}
          status={p.todayPnl > 0 ? 'gain' : p.todayPnl < 0 ? 'loss' : 'neutral'}
          subvalue="Session Net"
        />

        {/* Total Return */}
        <MetricCard
          label="Total Return"
          value={formatPercent(p.totalReturnPercent)}
          subvalue={`Net Alpha: ${p.alpha}`}
          change={p.totalReturn}
          changePercent={p.totalReturnPercent}
          status={p.totalReturnPercent > 0 ? 'gain' : p.totalReturnPercent < 0 ? 'loss' : 'neutral'}
          badgeText="All Time"
          badgeVariant={p.totalReturnPercent > 0 ? 'gain' : p.totalReturnPercent < 0 ? 'loss' : 'neutral'}
          icon={TrendingUp}
        />

        {/* Portfolio Risk */}
        <MetricCard
          label="Composite Risk"
          value={p.riskLevel}
          subvalue={`Beta: ${p.beta} | Sharpe: ${p.sharpe}`}
          status={p.riskLevel === 'HIGH' ? 'loss' : p.riskLevel === 'MODERATE' ? 'warn' : 'gain'}
          badgeText={p.riskLevel === 'HIGH' ? 'High Risk' : p.riskLevel === 'MODERATE' ? 'Moderate Exposure' : 'Low Risk'}
          badgeVariant={p.riskLevel === 'HIGH' ? 'loss' : p.riskLevel === 'MODERATE' ? 'warn' : 'gain'}
          icon={ShieldAlert}
        />
      </div>

      {/* Global Market Overview Ticker Grid */}
      <MarketOverviewGrid />

      {/* Main Analysis Grid: Chart + Top Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-1">
          <TopMovers />
        </div>
      </div>

      {/* Risk Snapshot Section */}
      <RiskMatrix />

      {/* AI Financial Analyst Intelligence Section */}
      <FinanceIntelligence />
    </div>
  );
}
