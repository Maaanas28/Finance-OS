import React, { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import {
  Cpu,
  Play,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Compass,
  BarChart2,
  Calendar,
  Layers,
  ChevronDown,
  Target,
  Percent,
} from 'lucide-react';

export function MonteCarloDesk() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [simulationCount, setSimulationCount] = useState(1000);
  const [horizonDays, setHorizonDays] = useState(252);
  const [targetReturn, setTargetReturn] = useState(12); // 12% Hurdle
  const [useDeterministicSeed, setUseDeterministicSeed] = useState(true);
  const [simulationResult, setSimulationResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeView, setActiveView] = useState('fan'); // 'fan' | 'histogram'

  const runSimulation = useCallback(
    async (portfolioId = selectedPortfolioId) => {
      setRunning(true);
      try {
        const payload = {
          portfolioId: portfolioId || '',
          simulationCount: Number(simulationCount),
          horizonDays: Number(horizonDays),
          targetReturn: Number(targetReturn) / 100,
          seed: useDeterministicSeed ? 42 : undefined,
        };

        const res = await api.runMonteCarlo(payload);
        if (res?.data) {
          setSimulationResult(res.data);
        }
      } catch (err) {
        console.error('Monte Carlo simulation failed:', err);
      } finally {
        setRunning(false);
      }
    },
    [selectedPortfolioId, simulationCount, horizonDays, targetReturn, useDeterministicSeed]
  );

  useEffect(() => {
    async function init() {
      const pRes = await api.getPortfolios().catch(() => ({ data: [] }));
      const pList = pRes?.data || [];
      setPortfolios(pList);
      const firstId = pList[0]?.id || '';
      setSelectedPortfolioId(firstId);
      runSimulation(firstId);
    }
    init();
  }, []);

  const p = simulationResult?.parameters;
  const o = simulationResult?.outcomes;
  const ribbon = simulationResult?.trajectoryPercentiles || [];
  const samples = simulationResult?.sampleTrajectories || [];
  const hist = simulationResult?.terminalHistogram || [];

  // Compute SVG chart bounds safely
  const initialValue = p?.initialPortfolioValue ?? 0;
  let minY = initialValue * 0.5;
  let maxY = initialValue * 1.8;

  if (ribbon.length > 0) {
    const allP5 = ribbon.map((r) => r.p5);
    const allP95 = ribbon.map((r) => r.p95);
    minY = Math.min(...allP5) * 0.95;
    maxY = Math.max(...allP95) * 1.05;
  }

  const mapY = (val) => {
    if (maxY === minY || (minY === 0 && maxY === 0)) return 50;
    const normalized = (val - minY) / (maxY - minY);
    return Math.max(10, Math.min(90, 90 - normalized * 80));
  };

  const initialValY = mapY(initialValue);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#172033]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">
              MONTE CARLO STOCHASTIC SIMULATOR
            </h1>
            <Badge variant="info" size="xs">
              GBM ENGINE
            </Badge>
            <DataStatusBadge status="SIMULATED" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Geometric Brownian Motion path generation, forward return distributions, and tail percentile forecasting
          </p>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          {/* Portfolio Switcher */}
          <div className="relative">
            <select
              value={selectedPortfolioId}
              onChange={(e) => {
                setSelectedPortfolioId(e.target.value);
                runSimulation(e.target.value);
              }}
              className="bg-[#090e17] border border-[#1e293b] text-white text-xs font-mono rounded px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {portfolios.length > 0 ? (
                portfolios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              ) : (
                <option value="">Primary Portfolio</option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <Button
            variant="primary"
            size="xs"
            icon={running ? RotateCcw : Play}
            onClick={() => runSimulation()}
            disabled={running}
          >
            {running ? 'Simulating...' : 'Run Simulation'}
          </Button>
        </div>
      </div>

      {/* Simulation Configuration Bar */}
      <div className="p-3 bg-[#090e17] border border-[#172033] rounded grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        {/* Paths */}
        <div>
          <label className="block text-[10px] text-slate-400 uppercase mb-1">
            Path Count
          </label>
          <select
            value={simulationCount}
            onChange={(e) => setSimulationCount(Number(e.target.value))}
            className="w-full bg-[#0c1322] border border-[#1e293b] text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value={500}>500 Stochastic Paths</option>
            <option value={1000}>1,000 Stochastic Paths (Default)</option>
            <option value={2500}>2,500 Stochastic Paths</option>
            <option value={5000}>5,000 High-Precision Paths</option>
          </select>
        </div>

        {/* Horizon */}
        <div>
          <label className="block text-[10px] text-slate-400 uppercase mb-1">
            Time Horizon
          </label>
          <select
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
            className="w-full bg-[#0c1322] border border-[#1e293b] text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value={30}>30 Trading Days (~1 Month)</option>
            <option value={63}>63 Trading Days (~1 Quarter)</option>
            <option value={126}>126 Trading Days (~6 Months)</option>
            <option value={252}>252 Trading Days (1 Year)</option>
            <option value={504}>504 Trading Days (2 Years)</option>
          </select>
        </div>

        {/* Hurdle Rate */}
        <div>
          <label className="block text-[10px] text-slate-400 uppercase mb-1">
            Hurdle Target Return
          </label>
          <div className="flex items-center bg-[#0c1322] border border-[#1e293b] rounded px-2.5 py-1.5">
            <input
              type="number"
              value={targetReturn}
              onChange={(e) => setTargetReturn(Number(e.target.value))}
              className="w-full bg-transparent text-white focus:outline-none"
            />
            <span className="text-slate-400 text-xs">%</span>
          </div>
        </div>

        {/* Seed Reproducibility */}
        <div>
          <label className="block text-[10px] text-slate-400 uppercase mb-1">
            RNG Reproducibility
          </label>
          <button
            type="button"
            onClick={() => setUseDeterministicSeed(!useDeterministicSeed)}
            className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors ${
              useDeterministicSeed
                ? 'bg-cyan-950/40 border-cyan-600/50 text-cyan-300'
                : 'bg-[#0c1322] border-[#1e293b] text-slate-400'
            }`}
          >
            {useDeterministicSeed ? 'Deterministic Seed (42)' : 'Random Entropy'}
          </button>
        </div>

        {/* Drift & Volatility summary */}
        <div className="text-right">
          <span className="text-[10px] text-slate-500 block uppercase">Fitted Parameters</span>
          <span className="text-[11px] text-slate-300">
            Drift: {p?.annualizedDrift !== undefined ? p.annualizedDrift : '0.0'}% | Vol: {p?.annualizedVolatility !== undefined ? p.annualizedVolatility : '0.0'}%
          </span>
        </div>
      </div>

      {/* Outcome Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Expected Terminal Value */}
        <MetricCard
          label="Expected Terminal Value"
          value={formatCurrency(o?.expectedTerminalValue || 0)}
          subvalue={`Expected Return: ${o?.expectedReturnPercent !== undefined ? `${o.expectedReturnPercent >= 0 ? '+' : ''}${o.expectedReturnPercent}` : '0.0'}%`}
          badgeText="Mean Outcome"
          badgeVariant="gain"
          icon={TrendingUp}
        />

        {/* Median (50th) */}
        <MetricCard
          label="Median Terminal NAV"
          value={formatCurrency(o?.medianTerminalValue || 0)}
          subvalue={`50th Percentile Case`}
          badgeText="Balanced"
          badgeVariant="neutral"
          icon={Compass}
        />

        {/* Probability of Loss */}
        <MetricCard
          label="Probability of Capital Loss"
          value={`${o?.probabilityOfLossPercent !== undefined ? o.probabilityOfLossPercent : '0.0'}%`}
          subvalue={`P(Terminal < Initial NAV)`}
          badgeText={Number(o?.probabilityOfLossPercent) > 25 ? 'Elevated' : 'Controlled'}
          badgeVariant={Number(o?.probabilityOfLossPercent) > 25 ? 'loss' : 'warn'}
          icon={AlertTriangle}
        />

        {/* Hurdle Exceedance Probability */}
        <MetricCard
          label={`P(Return ≥ ${targetReturn}%)`}
          value={`${o?.probabilityExceedingTargetPercent !== undefined ? o.probabilityExceedingTargetPercent : '0.0'}%`}
          subvalue={`Hurdle: ${formatCurrency(p ? p.initialPortfolioValue * (1 + targetReturn / 100) : 0)}`}
          badgeText="Target Hurdle"
          badgeVariant="gain"
          icon={Target}
        />

        {/* Tail Worst 5% */}
        <MetricCard
          label="5th Percentile Tail Risk"
          value={formatCurrency(o?.percentile5TerminalValue || 0)}
          subvalue={`95% Confidence Floor`}
          badgeText="Worst 5%"
          badgeVariant="loss"
          icon={Cpu}
        />
      </div>

      {/* Visualization Panel: Trajectory Ribbon vs Terminal Histogram */}
      <div className="bg-[#090e17] border border-[#172033] rounded p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#172033] pb-3">
          <div>
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              {activeView === 'fan'
                ? `STOCHASTIC TRAJECTORY FAN & CONFIDENCE BANDS (${horizonDays} TRADING SESSIONS)`
                : `TERMINAL PORTFOLIO VALUE PROBABILITY DENSITY (${simulationCount} PATHS)`}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Geometric Brownian Motion with parameter drift and volatility calibrated to 252-day history
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('fan')}
              className={`px-3 py-1 rounded text-[11px] font-semibold tracking-wider transition-colors ${
                activeView === 'fan'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trajectory Fan
            </button>
            <button
              onClick={() => setActiveView('histogram')}
              className={`px-3 py-1 rounded text-[11px] font-semibold tracking-wider transition-colors ${
                activeView === 'histogram'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Density Histogram
            </button>
          </div>
        </div>

        {/* View 1: SVG Trajectory Fan Chart */}
        {activeView === 'fan' && (
          <div className="space-y-2">
            <div className="h-80 w-full relative bg-[#070b13] border border-[#172033] rounded p-3 flex items-end">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                <defs>
                  {/* Outer 90% Confidence Ribbon (P5 - P95) */}
                  <linearGradient id="p5p95Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.04" />
                  </linearGradient>

                  {/* Inner 50% Confidence Ribbon (P25 - P75) */}
                  <linearGradient id="p25p75Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.10" />
                  </linearGradient>
                </defs>

                {/* Baseline Initial Portfolio Value */}
                <line
                  x1="0"
                  y1={initialValY}
                  x2="500"
                  y2={initialValY}
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Outer Band: P5 to P95 */}
                {ribbon.length > 1 && (
                  <path
                    d={`M 0 ${mapY(ribbon[0].p95)} ${ribbon
                      .map((pt, i) => `L ${(i / (ribbon.length - 1)) * 500} ${mapY(pt.p95)}`)
                      .join(' ')} ${ribbon
                      .slice()
                      .reverse()
                      .map((pt, i) => `L ${((ribbon.length - 1 - i) / (ribbon.length - 1)) * 500} ${mapY(pt.p5)}`)
                      .join(' ')} Z`}
                    fill="url(#p5p95Gradient)"
                  />
                )}

                {/* Inner Band: P25 to P75 */}
                {ribbon.length > 1 && (
                  <path
                    d={`M 0 ${mapY(ribbon[0].p75)} ${ribbon
                      .map((pt, i) => `L ${(i / (ribbon.length - 1)) * 500} ${mapY(pt.p75)}`)
                      .join(' ')} ${ribbon
                      .slice()
                      .reverse()
                      .map((pt, i) => `L ${((ribbon.length - 1 - i) / (ribbon.length - 1)) * 500} ${mapY(pt.p25)}`)
                      .join(' ')} Z`}
                    fill="url(#p25p75Gradient)"
                  />
                )}

                {/* Representative stochastic sample paths */}
                {samples.map((path) => (
                  <path
                    key={path.id}
                    d={`M 0 ${mapY(path.points[0].value)} ${path.points
                      .map((pt, i) => `L ${(i / (path.points.length - 1)) * 500} ${mapY(pt.value)}`)
                      .join(' ')}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeOpacity="0.25"
                  />
                ))}

                {/* Median Line (P50) */}
                {ribbon.length > 1 && (
                  <path
                    d={`M 0 ${mapY(ribbon[0].p50)} ${ribbon
                      .map((pt, i) => `L ${(i / (ribbon.length - 1)) * 500} ${mapY(pt.p50)}`)
                      .join(' ')}`}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                  />
                )}
              </svg>
            </div>

            {/* Trajectory Legend */}
            <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#22d3ee]" /> Median (50th Percentile)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-[#06b6d4] opacity-25" /> 50% Confidence (P25 - P75)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-[#06b6d4] opacity-10" /> 90% Confidence (P5 - P95)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-slate-500" /> Initial Capital
                </span>
              </div>
              <div className="text-slate-500">
                Horizon: {horizonDays} Sessions • Upper P95: ₹{Math.round(o?.percentile95TerminalValue || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}

        {/* View 2: Terminal Value Density Histogram */}
        {activeView === 'histogram' && (
          <div className="space-y-4">
            <div className="grid grid-cols-15 gap-1 h-64 items-end bg-[#070b13] border border-[#172033] rounded p-3">
              {hist.map((bin) => {
                const isLoss = bin.rangeEnd < (p?.initialPortfolioValue || 0);
                return (
                  <div key={bin.binIndex} className="flex flex-col items-center h-full justify-end group">
                    <div
                      className={`w-full rounded-t transition-all ${
                        isLoss ? 'bg-rose-500/60 hover:bg-rose-500' : 'bg-cyan-500/60 hover:bg-cyan-400'
                      }`}
                      style={{ height: `${Math.max(4, (bin.densityPercent / 20) * 100)}%` }}
                    />
                    <span className="text-[8px] text-slate-500 truncate w-full text-center mt-1">
                      {bin.densityPercent}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span className="text-rose-400">Tail Left: Worst-case outcomes & capital loss</span>
              <span className="text-slate-300 font-bold">Terminal Value Spectrum</span>
              <span className="text-emerald-400">Tail Right: Bullish alpha upside</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
