import React, { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Activity,
  AlertTriangle,
  RefreshCw,
  Zap,
  Grid,
  BarChart3,
  Layers,
  SlidersHorizontal,
  ChevronDown,
  Percent,
} from 'lucide-react';

export function RiskCenter() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [riskFreeRate, setRiskFreeRate] = useState(0.065); // 6.5% Annualized
  const [metrics, setMetrics] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [contribution, setContribution] = useState(null);
  const [drawdown, setDrawdown] = useState(null);
  const [stressScenarios, setStressScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('scenario-rbi-hike-100');
  const [stressResult, setStressResult] = useState(null);
  const [customShockMode, setCustomShockMode] = useState(false);
  const [customSector, setCustomSector] = useState('Information Technology');
  const [customShockPercent, setCustomShockPercent] = useState(-10);
  const [loading, setLoading] = useState(true);
  const [stressLoading, setStressLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stress'); // 'stress' | 'correlation' | 'contribution' | 'drawdown'

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get portfolios & scenarios
      const [pListRes, scRes] = await Promise.all([
        api.getPortfolios().catch(() => ({ data: [] })),
        api.getStressScenarios().catch(() => ({ data: [] })),
      ]);

      const pList = pListRes?.data || [];
      setPortfolios(pList);
      setStressScenarios(scRes?.data || []);

      const targetId = selectedPortfolioId || pList[0]?.id || '';

      // 2. Fetch parallel risk metrics, correlations, contributions, drawdown
      const [metricsRes, corrRes, contribRes, ddRes] = await Promise.all([
        api.getRiskMetrics(targetId, riskFreeRate),
        api.getCorrelationMatrix(targetId),
        api.getRiskContribution(targetId),
        api.getDrawdownHistory(targetId),
      ]);

      setMetrics(metricsRes?.data || null);
      setCorrelation(corrRes?.data || null);
      setContribution(contribRes?.data || null);
      setDrawdown(ddRes?.data || null);

      // 3. Run default stress test
      const stressRes = await api.executeStressTest({
        portfolioId: targetId,
        scenarioId: selectedScenarioId || 'scenario-rbi-hike-100',
      });
      setStressResult(stressRes?.data || null);
    } catch (err) {
      console.error('Error loading risk telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, riskFreeRate, selectedScenarioId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunStress = async (scenarioId = null, isCustom = false) => {
    setStressLoading(true);
    try {
      const targetId = selectedPortfolioId || '';
      let payload = { portfolioId: targetId };

      if (isCustom) {
        payload.customScenario = {
          name: `Custom Shock: ${customSector} (${customShockPercent > 0 ? '+' : ''}${customShockPercent}%)`,
          category: 'CUSTOM',
          shocks: [
            { target: 'SECTOR', identifier: customSector, shockPercent: Number(customShockPercent) },
          ],
        };
      } else {
        payload.scenarioId = scenarioId || selectedScenarioId;
      }

      const res = await api.executeStressTest(payload);
      setStressResult(res?.data || null);
    } catch (err) {
      console.error('Stress test execution failed:', err);
    } finally {
      setStressLoading(false);
    }
  };

  const m = metrics?.summary;
  const varData = metrics?.valueAtRisk;

  return (
    <div className="space-y-6">
      {/* Top Risk Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#172033]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              RISK ENGINE & STRESS COMMAND CENTER
            </h1>
            <Badge variant="warn" size="xs">
              FACTOR MODEL
            </Badge>
            <DataStatusBadge status={metrics?.dataStatus ? metrics.dataStatus : (loading ? 'CACHED' : 'HISTORICAL')} />
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Parametric & Historical VaR, Tail CVaR, Covariance Matrix, and Systematic Stress Shocks
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Portfolio Switcher */}
          <div className="relative">
            <select
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="bg-[#090e17] border border-[#1e293b] text-white text-xs font-mono rounded px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {portfolios.length > 0 ? (
                portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              ) : (
                <option value="">Primary Portfolio</option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Configurable Risk-Free Rate Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#090e17] border border-[#1e293b] rounded px-2.5 py-1 text-xs font-mono text-slate-300">
            <Percent className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400">Rf:</span>
            <select
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(Number(e.target.value))}
              className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value={0.055}>5.5%</option>
              <option value={0.06}>6.0%</option>
              <option value={0.065}>6.5% (T-Bill)</option>
              <option value={0.07}>7.0%</option>
              <option value={0.075}>7.5%</option>
            </select>
          </div>

          <Button
            variant="secondary"
            size="xs"
            icon={RefreshCw}
            onClick={() => loadData()}
            disabled={loading}
          >
            {loading ? 'Recalculating...' : 'Recalculate Risk'}
          </Button>
        </div>
      </div>

      {/* Primary Quantitative Risk Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Composite Risk Score */}
        <MetricCard
          label="Composite Risk Score"
          value={`${m?.compositeScore !== undefined ? m.compositeScore : 0} / 100`}
          subvalue={`Risk Regime: ${m?.riskLevel || 'CONSERVATIVE'}`}
          badgeText={m?.riskLevel || 'CONSERVATIVE'}
          badgeVariant={m?.compositeScore > 65 ? 'loss' : m?.compositeScore > 40 ? 'warn' : 'gain'}
          icon={ShieldAlert}
        />

        {/* Volatility */}
        <MetricCard
          label="Annualized Volatility"
          value={`${m?.annualizedVolatility !== undefined ? m.annualizedVolatility : '0.0'}%`}
          subvalue={`Benchmark: ${m?.benchmarkVolatility !== undefined ? m.benchmarkVolatility : '0.0'}% (NIFTY)`}
          badgeText="252D Observed"
          badgeVariant="neutral"
          icon={Activity}
        />

        {/* Beta */}
        <MetricCard
          label="Portfolio Beta"
          value={m?.beta !== undefined ? (typeof m.beta === 'number' ? m.beta.toFixed(2) : String(m.beta)) : '0.00'}
          subvalue="vs NIFTY 50 Index"
          badgeText={m?.beta > 1.2 ? 'Aggressive' : 'Defensive'}
          badgeVariant={m?.beta > 1.2 ? 'warn' : 'gain'}
          icon={Zap}
        />

        {/* Sharpe & Sortino */}
        <MetricCard
          label="Sharpe / Sortino"
          value={`${m?.sharpe !== undefined ? (typeof m.sharpe === 'number' ? m.sharpe.toFixed(2) : String(m.sharpe)) : '0.00'} / ${m?.sortino !== undefined ? (typeof m.sortino === 'number' ? m.sortino.toFixed(2) : String(m.sortino)) : '0.00'}`}
          subvalue={`Rf Hurdle: ${(riskFreeRate * 100).toFixed(1)}% p.a.`}
          badgeText="Risk-Adjusted"
          badgeVariant="gain"
          icon={ShieldCheck}
        />

        {/* Max Drawdown */}
        <MetricCard
          label="Maximum Drawdown"
          value={`${m?.maxDrawdown !== undefined ? m.maxDrawdown : '0.0'}%`}
          subvalue={`Peak: ${m?.peakDate || 'Recent'}`}
          badgeText="Underwater"
          badgeVariant="loss"
          icon={TrendingDown}
        />
      </div>

      {/* Value at Risk (VaR) & Tail Risk Cockpit */}
      <div className="bg-[#090e17] border border-[#172033] rounded p-4 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#172033]">
          <div>
            <span className="font-bold text-white uppercase tracking-wider text-xs">
              VALUE AT RISK (VaR) & TAIL EXPECTED SHORTFALL (CVaR)
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              1-Day Holding Horizon • Parametric vs Historical Observations vs Tail Expectations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="xs">
              OBSERVATIONS: {metrics?.observationPeriodDays || 252} SESSIONS
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Historical VaR Card */}
          <div className="p-3.5 bg-[#0a101d] border border-[#19243b] rounded space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold uppercase tracking-wider">
                Historical VaR
              </span>
              <Badge variant="neutral" size="xs">
                Empirical
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">95% Confidence (1D):</span>
                <span className="font-bold text-rose-400">
                  {varData?.historical?.confidence95 ? formatCurrency(varData.historical.confidence95.amount) : formatCurrency(0)} (
                  {varData?.historical?.confidence95 ? varData.historical.confidence95.percent : '0.00'}%)
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">99% Confidence (1D):</span>
                <span className="font-bold text-rose-500">
                  {varData?.historical?.confidence99 ? formatCurrency(varData.historical.confidence99.amount) : formatCurrency(0)} (
                  {varData?.historical?.confidence99 ? varData.historical.confidence99.percent : '0.00'}%)
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 border-t border-[#141d30] pt-2">
              Based on empirical distribution of 252 actual session returns.
            </p>
          </div>

          {/* Parametric VaR Card */}
          <div className="p-3.5 bg-[#0a101d] border border-[#19243b] rounded space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold uppercase tracking-wider">
                Parametric VaR
              </span>
              <Badge variant="neutral" size="xs">
                Variance-Covariance
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">95% Confidence (1D):</span>
                <span className="font-bold text-amber-400">
                  {varData?.parametric?.confidence95 ? formatCurrency(varData.parametric.confidence95.amount) : formatCurrency(0)} (
                  {varData?.parametric?.confidence95 ? varData.parametric.confidence95.percent : '0.00'}%)
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">99% Confidence (1D):</span>
                <span className="font-bold text-amber-500">
                  {varData?.parametric?.confidence99 ? formatCurrency(varData.parametric.confidence99.amount) : formatCurrency(0)} (
                  {varData?.parametric?.confidence99 ? varData.parametric.confidence99.percent : '0.00'}%)
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 border-t border-[#141d30] pt-2">
              Assumes Gaussian return distribution parameterized by daily drift & standard deviation.
            </p>
          </div>

          {/* Conditional VaR (Expected Shortfall) Card */}
          <div className="p-3.5 bg-[#0a101d] border border-[#19243b] rounded space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold uppercase tracking-wider">
                Expected Shortfall (CVaR)
              </span>
              <Badge variant="loss" size="xs">
                Tail Risk
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">CVaR 95% (Tail Mean):</span>
                <span className="font-bold text-rose-400">
                  {varData?.conditionalVaR?.confidence95 ? formatCurrency(varData.conditionalVaR.confidence95.amount) : formatCurrency(0)} (
                  {varData?.conditionalVaR?.confidence95 ? varData.conditionalVaR.confidence95.percent : '0.00'}%)
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">CVaR 99% (Tail Mean):</span>
                <span className="font-bold text-rose-500">
                  {varData?.conditionalVaR?.confidence99 ? formatCurrency(varData.conditionalVaR.confidence99.amount) : formatCurrency(0)} (
                  {varData?.conditionalVaR?.confidence99 ? varData.conditionalVaR.confidence99.percent : '0.00'}%)
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 border-t border-[#141d30] pt-2">
              Average expected portfolio loss strictly conditional on exceeding the VaR boundary.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#172033] pt-2">
        <button
          onClick={() => setActiveTab('stress')}
          className={`pb-3 px-3 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'stress'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Macro Factor Stress Testing
        </button>
        <button
          onClick={() => setActiveTab('correlation')}
          className={`pb-3 px-3 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'correlation'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-4 h-4" />
          Asset Correlation Heatmap
        </button>
        <button
          onClick={() => setActiveTab('contribution')}
          className={`pb-3 px-3 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'contribution'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Component Risk Contribution (MCR)
        </button>
        <button
          onClick={() => setActiveTab('drawdown')}
          className={`pb-3 px-3 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'drawdown'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Historical Underwater Drawdown
        </button>
      </div>

      {/* Tab 1: MACRO & FACTOR STRESS TESTING */}
      {activeTab === 'stress' && (
        <div className="space-y-4 font-mono text-xs">
          {/* Stress Scenario Control Bar */}
          <div className="p-4 bg-[#090e17] border border-[#172033] rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-slate-300 font-semibold uppercase tracking-wider text-xs">
                Stress Scenario:
              </span>
              {!customShockMode ? (
                <div className="relative">
                  <select
                    value={selectedScenarioId}
                    onChange={(e) => {
                      setSelectedScenarioId(e.target.value);
                      handleRunStress(e.target.value, false);
                    }}
                    className="bg-[#0e1626] border border-[#1e293b] text-white text-xs font-mono rounded px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {stressScenarios.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        [{sc.category}] {sc.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={customSector}
                    onChange={(e) => setCustomSector(e.target.value)}
                    className="bg-[#0e1626] border border-[#1e293b] text-white text-xs font-mono rounded px-2 py-1"
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Energy">Energy</option>
                    <option value="Automobile">Automobile</option>
                    <option value="FMCG">FMCG</option>
                  </select>
                  <span className="text-slate-400">Shock:</span>
                  <input
                    type="number"
                    value={customShockPercent}
                    onChange={(e) => setCustomShockPercent(Number(e.target.value))}
                    className="w-20 bg-[#0e1626] border border-[#1e293b] text-white px-2 py-1 rounded"
                  />
                  <span className="text-slate-400">%</span>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => handleRunStress(null, true)}
                    disabled={stressLoading}
                  >
                    Apply Shock
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setCustomShockMode(!customShockMode)}
              >
                {customShockMode ? 'Switch to Predefined' : 'Configure Custom Shock'}
              </Button>
            </div>
          </div>

          {/* Scenario Overview Card */}
          {stressResult && (
            <div className="p-4 bg-[#0a101d] border border-[#19243b] rounded space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#141d30] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {stressResult.scenario.name}
                    </span>
                    <Badge variant="warn" size="xs">
                      {stressResult.scenario.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {stressResult.scenario.description || 'Systematic factor shock evaluation.'}
                  </p>
                </div>

                {/* Net Portfolio Shock Results */}
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Pre-Shock Value</div>
                    <div className="text-white font-bold text-xs mt-0.5">
                      {formatCurrency(stressResult.summary.currentPortfolioValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Post-Shock Value</div>
                    <div className="text-white font-bold text-xs mt-0.5">
                      {formatCurrency(stressResult.summary.postShockPortfolioValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Net Impact</div>
                    <div
                      className={`font-bold text-sm mt-0.5 ${
                        stressResult.summary.portfolioImpactAmount >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {stressResult.summary.portfolioImpactAmount >= 0 ? '+' : ''}
                      {formatCurrency(stressResult.summary.portfolioImpactAmount)} (
                      {stressResult.summary.portfolioImpactPercent}%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Position Impact Table */}
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#172033] bg-[#070b13] text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="py-2 px-3">Asset Symbol</th>
                      <th className="py-2 px-3">Sector</th>
                      <th className="py-2 px-3 text-right">Pre-Shock Value</th>
                      <th className="py-2 px-3 text-right">Shock Applied</th>
                      <th className="py-2 px-3 text-right">P&L Impact</th>
                      <th className="py-2 px-3 text-right">Post-Shock Value</th>
                      <th className="py-2 px-3">Sensitivity Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#131b2d]">
                    {stressResult.positionImpacts.map((pos) => {
                      const isGain = pos.pnlImpact >= 0;
                      return (
                        <tr key={pos.id || pos.symbol} className="hover:bg-[#0c1424] transition-colors">
                          <td className="py-2.5 px-3 font-bold text-white">{pos.symbol}</td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">{pos.sector}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {formatCurrency(pos.currentValue)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-semibold ${
                              isGain ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {pos.shockPercent > 0 ? '+' : ''}
                            {pos.shockPercent}%
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              isGain ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {pos.pnlImpact > 0 ? '+' : ''}
                            {formatCurrency(pos.pnlImpact)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-white">
                            {formatCurrency(pos.shockedValue)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {pos.appliedRule}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: ASSET CORRELATION HEATMAP */}
      {activeTab === 'correlation' && (
        <div className="bg-[#090e17] border border-[#172033] rounded p-4 font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#172033] pb-3">
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-xs">
                PAIRWISE ASSET CORRELATION MATRIX
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pearson correlation coefficients computed across 252 synchronized daily trading sessions
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> High +1.0
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-slate-700 rounded-xs" /> Neutral 0.0
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs" /> Inverse -1.0
              </span>
            </div>
          </div>

          {correlation && correlation.symbols && correlation.symbols.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-2 border border-[#172033] bg-[#0c1322] text-slate-400 text-left">
                      TICKER
                    </th>
                    {correlation.symbols.map((sym) => (
                      <th
                        key={sym}
                        className="p-2 border border-[#172033] bg-[#0c1322] text-white font-bold text-[11px]"
                      >
                        {sym}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlation.symbols.map((rowSym, rIdx) => (
                    <tr key={rowSym}>
                      <td className="p-2 border border-[#172033] bg-[#0c1322] font-bold text-white text-left">
                        {rowSym}
                      </td>
                      {correlation.symbols.map((colSym, cIdx) => {
                        const val = correlation.matrix[rIdx]?.[cIdx] ?? 0;
                        const isDiag = rIdx === cIdx;
                        let cellBg = 'bg-[#0f172a]';
                        let cellTextColor = 'text-slate-300';

                        if (isDiag) {
                          cellBg = 'bg-cyan-950/60';
                          cellTextColor = 'text-cyan-300 font-bold';
                        } else if (val > 0.5) {
                          cellBg = 'bg-emerald-950/50';
                          cellTextColor = 'text-emerald-300 font-semibold';
                        } else if (val < -0.2) {
                          cellBg = 'bg-rose-950/50';
                          cellTextColor = 'text-rose-300 font-semibold';
                        }

                        return (
                          <td
                            key={`${rowSym}-${colSym}`}
                            className={`p-2 border border-[#172033] transition-colors hover:brightness-125 ${cellBg} ${cellTextColor}`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              {loading ? 'Computing correlation matrix...' : 'No active equity positions available for pair-wise correlation matrix.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: COMPONENT RISK CONTRIBUTION */}
      {activeTab === 'contribution' && (
        <div className="bg-[#090e17] border border-[#172033] rounded p-4 font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#172033] pb-3">
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-xs">
                PORTFOLIO RISK DECOMPOSITION & MARGINAL VOLATILITY (MCR)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Comparison of asset capital weighting vs percentage contribution to portfolio variance
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {contribution?.positions && contribution.positions.length > 0 ? (
              contribution.positions.map((pos) => {
                const isExcessRisk = pos.riskContributionPercent > pos.capitalWeightPercent;
                return (
                  <div
                    key={pos.symbol}
                    className="p-3 bg-[#0a101d] border border-[#172033] rounded space-y-2 hover:border-[#223352] transition-colors"
                  >
                    <div className="flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-white text-xs">{pos.symbol}</span>
                        <span className="text-slate-400 text-[10px] ml-2">{pos.name}</span>
                        <span className="text-[10px] text-slate-500 ml-2">[{pos.sector}]</span>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="text-slate-400 text-[10px]">Capital Weight: </span>
                          <span className="text-slate-200 font-semibold">{pos.capitalWeightPercent}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Risk Contrib: </span>
                          <span
                            className={`font-bold ${
                              isExcessRisk ? 'text-amber-400' : 'text-cyan-400'
                            }`}
                          >
                            {pos.riskContributionPercent}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Vol: </span>
                          <span className="text-white font-semibold">{pos.annualizedVolatility}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Dual comparison meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Capital: {pos.capitalWeightPercent}%</span>
                        <span>Risk: {pos.riskContributionPercent}%</span>
                      </div>
                      <div className="w-full bg-[#111827] h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-blue-500 h-full opacity-60"
                          style={{ width: `${Math.min(pos.capitalWeightPercent, 100)}%` }}
                          title={`Capital Weight: ${pos.capitalWeightPercent}%`}
                        />
                        <div
                          className={`h-full ${isExcessRisk ? 'bg-amber-400' : 'bg-cyan-400'}`}
                          style={{
                            width: `${Math.min(
                              Math.abs(pos.riskContributionPercent - pos.capitalWeightPercent),
                              100
                            )}%`,
                          }}
                          title={`Risk Contribution: ${pos.riskContributionPercent}%`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-500">
                {loading ? 'Decomposing component risk contribution...' : 'No active equity positions for risk contribution analysis.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: UNDERWATER DRAWDOWN HISTORY */}
      {activeTab === 'drawdown' && (
        <div className="bg-[#090e17] border border-[#172033] rounded p-4 font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#172033] pb-3">
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-xs">
                HISTORICAL UNDERWATER DRAWDOWN CURVE (252 SESSIONS)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Daily peak-to-trough equity decline percentage relative to highest high
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px]">Maximum Peak Drawdown: </span>
              <span className="font-bold text-rose-400 text-sm">
                {drawdown?.maxDrawdown !== undefined ? drawdown.maxDrawdown : '0.0'}%
              </span>
            </div>
          </div>

          {/* Simple SVG Drawdown Underwater Chart */}
          <div className="h-64 w-full relative bg-[#070b13] border border-[#172033] rounded p-2 flex items-end">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
              <defs>
                <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Zero line */}
              <line x1="0" y1="10" x2="500" y2="10" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

              {/* Underwater Area */}
              {drawdown?.series && drawdown.series.length > 0 && (
                <>
                  <path
                    d={`M 0 10 ${drawdown.series
                      .map((pt, idx) => {
                        const x = (idx / (drawdown.series.length - 1)) * 500;
                        // Map 0% to y=10, and -25% to y=95
                        const y = 10 + (Math.abs(pt.drawdown) / 25) * 85;
                        return `L ${x} ${Math.min(95, y)}`;
                      })
                      .join(' ')} L 500 10 Z`}
                    fill="url(#drawdownGradient)"
                  />
                  <path
                    d={`M 0 10 ${drawdown.series
                      .map((pt, idx) => {
                        const x = (idx / (drawdown.series.length - 1)) * 500;
                        const y = 10 + (Math.abs(pt.drawdown) / 25) * 85;
                        return `L ${x} ${Math.min(95, y)}`;
                      })
                      .join(' ')}`}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </svg>
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 pt-1">
            <span>252 Sessions Ago</span>
            <span>Peak: {drawdown?.peakDate || 'Recent'}</span>
            <span>Current Session</span>
          </div>
        </div>
      )}
    </div>
  );
}
