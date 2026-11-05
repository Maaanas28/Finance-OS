import React, { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '../../components/ui/MetricCard.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import {
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Compass,
  BarChart2,
  Calendar,
  Layers,
  ChevronDown,
  Info,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  PieChart,
} from 'lucide-react';

/**
 * Compact Rupee formatter for SVG axis ticks & chart labels
 */
function fmtCompactRupee(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

/**
 * Chart 1: Monte Carlo Simulation Paths Chart (~20 visual paths)
 * Renders actual multi-asset correlated simulation paths for the portfolio.
 */
function SimulationPathsChart({
  sampleTrajectories = [],
  trajectoryPercentiles = [],
  initialValue = 0,
  horizonDays = 252,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!sampleTrajectories || sampleTrajectories.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-slate-500 bg-[#070b13] border border-[#172033] rounded">
        <BarChart2 className="w-8 h-8 mb-2 opacity-50 text-cyan-400" />
        <span className="font-mono text-xs text-slate-400">No Simulation Paths Available</span>
      </div>
    );
  }

  const W = 840;
  const H = 360;
  const PAD = { top: 24, right: 90, bottom: 45, left: 85 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  // Compute Y bounds across all sample paths and percentile curves
  const allPathValues = [];
  sampleTrajectories.forEach((path) => {
    path.points.forEach((pt) => allPathValues.push(pt.value));
  });
  trajectoryPercentiles.forEach((r) => {
    allPathValues.push(r.p5, r.p95);
  });
  if (initialValue > 0) allPathValues.push(initialValue);

  let minY = Math.min(...allPathValues);
  let maxY = Math.max(...allPathValues);
  const yMargin = Math.max(100, Math.abs(maxY - minY) * 0.08);
  minY = Math.max(0, minY - yMargin);
  maxY = maxY + yMargin;
  const yRange = maxY - minY || 1;

  const totalSteps = Math.max(1, (trajectoryPercentiles.length || sampleTrajectories[0].points.length) - 1);
  const toX = (stepIdx) => PAD.left + (stepIdx / totalSteps) * cW;
  const toY = (val) => PAD.top + cH - ((val - minY) / yRange) * cH;

  // Y-axis ticks (5 price levels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const val = minY + yRange * ratio;
    return { y: PAD.top + cH * (1 - ratio), val };
  });

  // X-axis ticks (key session milestones)
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const idx = Math.floor(totalSteps * ratio);
    const day = trajectoryPercentiles[idx]?.day ?? Math.round((idx / totalSteps) * horizonDays);
    return { x: toX(idx), day };
  });

  // Active hover data readout
  const activeIdx = hoverIdx !== null ? hoverIdx : totalSteps;
  const activePercentile = trajectoryPercentiles[activeIdx] || trajectoryPercentiles[totalSteps] || {};
  const activeDay = activePercentile.day ?? Math.round((activeIdx / totalSteps) * horizonDays);

  return (
    <div className="space-y-3 font-mono">
      {/* Telemetry Bar */}
      <div className="px-3.5 py-2.5 bg-[#06090f] border border-[#162238] rounded flex flex-wrap items-center justify-between text-[11px] gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Selected Horizon:</span>
          <strong className="text-cyan-300">
            Day {activeDay} ({activeDay === 0 ? 'Day 0 (Start)' : `~${Math.round(activeDay / 21)} Months`})
          </strong>
        </div>

        <div className="flex items-center gap-4 text-[10px] flex-wrap">
          <span className="text-slate-400">
            95th %ile (Bull): <strong className="text-emerald-400">{fmtCompactRupee(activePercentile.p95)}</strong>
          </span>
          <span className="text-slate-400">
            Median (50th %ile): <strong className="text-cyan-300">{fmtCompactRupee(activePercentile.p50)}</strong>
          </span>
          <span className="text-slate-400">
            5th %ile (Bear): <strong className="text-rose-400">{fmtCompactRupee(activePercentile.p5)}</strong>
          </span>
          <span className="text-slate-400">
            Initial Capital: <strong className="text-slate-200">{fmtCompactRupee(initialValue)}</strong>
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative bg-[#070b13] border border-[#172033] rounded p-1 overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible cursor-crosshair"
          style={{ height: '360px' }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Y-axis grid lines & tick labels */}
          {yTicks.map((t, i) => (
            <g key={`y-${i}`}>
              <line
                x1={PAD.left}
                y1={t.y}
                x2={W - PAD.right}
                y2={t.y}
                stroke="#172238"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 8}
                y={t.y + 3.5}
                fill="#64748b"
                fontSize="9.5"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="end"
              >
                {fmtCompactRupee(t.val)}
              </text>
              <text
                x={W - PAD.right + 8}
                y={t.y + 3.5}
                fill="#475569"
                fontSize="9.5"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="start"
              >
                {fmtCompactRupee(t.val)}
              </text>
            </g>
          ))}

          {/* X-axis grid lines & tick labels */}
          {xTicks.map((t, i) => (
            <g key={`x-${i}`}>
              <line
                x1={t.x}
                y1={PAD.top}
                x2={t.x}
                y2={H - PAD.bottom}
                stroke="#172238"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <text
                x={t.x}
                y={H - PAD.bottom + 18}
                fill="#64748b"
                fontSize="9.5"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {t.day === 0 ? 'Day 0' : `Day ${t.day}`}
              </text>
            </g>
          ))}

          {/* Initial Value Baseline */}
          {initialValue > 0 && (
            <g>
              <line
                x1={PAD.left}
                y1={toY(initialValue)}
                x2={W - PAD.right}
                y2={toY(initialValue)}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="5 4"
              />
              <text
                x={PAD.left + 8}
                y={toY(initialValue) - 5}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                Initial Portfolio NAV ({fmtCompactRupee(initialValue)})
              </text>
            </g>
          )}

          {/* 20 Sample Paths from Simulation Engine */}
          {sampleTrajectories.map((path, pathIdx) => {
            const d = path.points
              .map((pt, sIdx) => `${sIdx === 0 ? 'M' : 'L'} ${toX(sIdx).toFixed(1)} ${toY(pt.value).toFixed(1)}`)
              .join(' ');
            return (
              <path
                key={path.id || pathIdx}
                d={d}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="0.9"
                strokeOpacity="0.28"
                className="hover:stroke-opacity-80 transition-opacity"
              />
            );
          })}

          {/* 5th Percentile Floor Curve (P5 - Pessimistic) */}
          {trajectoryPercentiles.length > 0 && (
            <path
              d={trajectoryPercentiles
                .map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(r.p5).toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.8"
              strokeDasharray="4 3"
            />
          )}

          {/* 95th Percentile Ceiling Curve (P95 - Optimistic) */}
          {trajectoryPercentiles.length > 0 && (
            <path
              d={trajectoryPercentiles
                .map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(r.p95).toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.8"
              strokeDasharray="4 3"
            />
          )}

          {/* Median Curve (P50 - Central Outcome) */}
          {trajectoryPercentiles.length > 0 && (
            <path
              d={trajectoryPercentiles
                .map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(r.p50).toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.5"
            />
          )}

          {/* Hover Crosshair & Anchor */}
          {hoverIdx !== null && (
            <g>
              <line
                x1={toX(hoverIdx)}
                y1={PAD.top}
                x2={toX(hoverIdx)}
                y2={H - PAD.bottom}
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {activePercentile.p50 !== undefined && (
                <circle
                  cx={toX(hoverIdx)}
                  cy={toY(activePercentile.p50)}
                  r="4"
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}

          {/* Interactive Mouse Capture Columns */}
          {Array.from({ length: totalSteps + 1 }).map((_, i) => (
            <rect
              key={`mouse-${i}`}
              x={toX(i) - cW / totalSteps / 2}
              y={PAD.top}
              width={cW / totalSteps}
              height={cH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIdx(i)}
            />
          ))}
        </svg>
      </div>

      {/* Chart Legend */}
      <div className="p-3 bg-[#060a12] border border-[#162238] rounded flex flex-wrap items-center justify-between gap-3 text-[10px]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-0.5 bg-[#38bdf8] opacity-60" /> 20 Portfolio Simulation Paths
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-1 rounded bg-[#22d3ee]" /> Median (50th Percentile)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-0.5 bg-[#10b981] border-t border-dashed" /> 95th %ile Ceiling
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-0.5 bg-[#f43f5e] border-t border-dashed" /> 5th %ile Floor
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-0.5 bg-slate-400 border-t border-dashed" /> Initial Portfolio NAV Baseline
          </span>
        </div>
        <span className="text-slate-500 font-mono">
          Model: Correlated Multi-Asset GBM (Δt = 1/252)
        </span>
      </div>
    </div>
  );
}

/**
 * Chart 2: Ending Portfolio Value Distribution Histogram
 * Visualizes the terminal portfolio values across all simulated paths.
 */
function DistributionHistogramChart({
  histogram = [],
  initialValue = 0,
  simulationCount = 1000,
  outcomes = {},
}) {
  const [hoveredBin, setHoveredBin] = useState(null);

  if (!histogram || histogram.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-slate-500 bg-[#070b13] border border-[#172033] rounded font-mono">
        <BarChart2 className="w-8 h-8 mb-2 opacity-50 text-cyan-400" />
        <span className="text-xs text-slate-400">No Histogram Data Available</span>
      </div>
    );
  }

  const maxCount = Math.max(...histogram.map((b) => b.count), 1);
  const displayBin = hoveredBin || histogram.reduce((max, b) => (b.count > max.count ? b : max), histogram[0]);

  const p5 = outcomes?.percentile5TerminalValue || 0;
  const p50 = outcomes?.medianTerminalValue || 0;
  const p95 = outcomes?.percentile95TerminalValue || 0;

  return (
    <div className="space-y-3 font-mono">
      {/* Telemetry Header */}
      <div className="px-3.5 py-2.5 bg-[#06090f] border border-[#162238] rounded flex flex-wrap items-center justify-between text-[11px] gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Selected Value Range:</span>
          <strong className="text-white">
            {fmtCompactRupee(displayBin.rangeStart)} – {fmtCompactRupee(displayBin.rangeEnd)}
          </strong>
        </div>

        <div className="flex items-center gap-4 text-[10px] flex-wrap">
          <span className="text-slate-400">
            Frequency: <strong className="text-cyan-300">{displayBin.count} paths</strong> ({displayBin.densityPercent}%)
          </span>
          <span className="text-slate-400">
            Zone:{' '}
            <strong className={displayBin.rangeEnd < initialValue ? 'text-rose-400' : 'text-emerald-400'}>
              {displayBin.rangeEnd < initialValue ? 'Capital Loss Zone (< Initial NAV)' : 'Capital Gain Zone (≥ Initial NAV)'}
            </strong>
          </span>
        </div>
      </div>

      {/* Histogram Chart Container */}
      <div className="bg-[#070b13] border border-[#172033] rounded p-4 space-y-3 select-none">
        {/* Reference Marker Legend Badges */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 border-b border-[#141d2f] flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80" /> Capital Loss Zone
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" /> Capital Gain Zone
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Total Simulated Paths: <strong className="text-slate-200">{simulationCount.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Histogram Columns */}
        <div className="h-64 flex items-end gap-1.5 pt-6 pb-2 relative">
          {histogram.map((bin) => {
            const isLoss = bin.rangeEnd < initialValue;
            const heightPct = Math.max(6, (bin.count / maxCount) * 88);
            const isHovered = hoveredBin?.binIndex === bin.binIndex;

            return (
              <div
                key={bin.binIndex}
                className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                onMouseEnter={() => setHoveredBin(bin)}
                onMouseLeave={() => setHoveredBin(null)}
              >
                {/* Bar Percent Label */}
                <span
                  className={`text-[9px] mb-1 font-semibold transition-all ${
                    isHovered ? 'text-white scale-110' : 'text-slate-400'
                  }`}
                >
                  {bin.densityPercent}%
                </span>

                {/* Histogram Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-200 ${
                    isLoss
                      ? isHovered
                        ? 'bg-rose-500 shadow-lg shadow-rose-950/50'
                        : 'bg-rose-500/70'
                      : isHovered
                      ? 'bg-emerald-400 shadow-lg shadow-emerald-950/50'
                      : 'bg-emerald-500/70'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />

                {/* Bin Range Price Label */}
                <div className="mt-2 text-[9px] text-slate-400 truncate w-full text-center tracking-tighter">
                  {fmtCompactRupee(bin.rangeStart)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Benchmark Reference Milestones Bar */}
        <div className="pt-3 border-t border-[#141d2f] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          <div className="p-2 bg-[#090e18] border border-[#16233b] rounded">
            <span className="text-slate-400 block text-[9px] uppercase">Initial Portfolio NAV</span>
            <strong className="text-slate-200">{fmtCompactRupee(initialValue)}</strong>
          </div>
          <div className="p-2 bg-rose-950/20 border border-rose-900/30 rounded">
            <span className="text-rose-400 block text-[9px] uppercase">5th %ile Floor (P₅)</span>
            <strong className="text-rose-300">{fmtCompactRupee(p5)}</strong>
          </div>
          <div className="p-2 bg-cyan-950/20 border border-cyan-900/30 rounded">
            <span className="text-cyan-400 block text-[9px] uppercase">Median NAV (P₅₀)</span>
            <strong className="text-cyan-300">{fmtCompactRupee(p50)}</strong>
          </div>
          <div className="p-2 bg-emerald-950/20 border border-emerald-900/30 rounded">
            <span className="text-emerald-400 block text-[9px] uppercase">95th %ile Ceiling (P₉₅)</span>
            <strong className="text-emerald-300">{fmtCompactRupee(p95)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Holdings Breakdown Table
 * Shows which actual portfolio stocks and cash reserves are being simulated.
 */
function HoldingsBreakdownTable({ holdings = [] }) {
  if (!holdings || holdings.length === 0) {
    return (
      <div className="p-4 bg-[#090e17] border border-[#172033] rounded text-center text-slate-500 font-mono text-xs">
        No active holdings currently simulated.
      </div>
    );
  }

  return (
    <div className="bg-[#090e17] border border-[#172033] rounded p-4 space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#172033] pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-bold text-xs uppercase tracking-wider">
            Simulated Portfolio Holdings Breakdown
          </span>
        </div>
        <span className="text-slate-400 text-[11px]">
          {holdings.length} {holdings.length === 1 ? 'Position' : 'Positions'} Simulated
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="text-slate-400 border-b border-[#172033] uppercase text-[10px] tracking-wider">
              <th className="py-2 px-3">Ticker / Asset</th>
              <th className="py-2 px-3 text-right">Quantity</th>
              <th className="py-2 px-3 text-right">Market Price</th>
              <th className="py-2 px-3 text-right">Position Value</th>
              <th className="py-2 px-3 text-right">Weight</th>
              <th className="py-2 px-3 text-right">Expected Return (μ)</th>
              <th className="py-2 px-3 text-right">Volatility (σ)</th>
              <th className="py-2 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#131b2e]">
            {holdings.map((h) => {
              const isCash = h.symbol.includes('CASH');
              return (
                <tr key={h.id || h.symbol} className="hover:bg-[#0c1424] transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{h.symbol}</span>
                      {h.exchange && (
                        <span className="text-[9px] px-1 py-0.2 bg-[#162238] text-slate-400 rounded">
                          {h.exchange}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[160px] sm:max-w-xs">
                      {h.name}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                    {isCash ? '—' : Number(h.quantity).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                    {isCash ? '—' : formatCurrency(h.currentPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-cyan-300">
                    {formatCurrency(h.currentValue)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {h.portfolioWeightPercent}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">
                    {isCash ? '0.0%' : `${h.expectedReturnPercent >= 0 ? '+' : ''}${h.expectedReturnPercent}%`}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-300">
                    {isCash ? '0.0%' : `${h.volatilityPercent}%`}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {h.isFallback ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/50"
                        title={h.fallbackReason}
                      >
                        Benchmark Proxy
                      </span>
                    ) : isCash ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        Cash Buffer
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                        Live Calibrated
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Educational Section: "How Your Portfolio is Simulated"
 * Beginner-friendly explanation of the multi-asset correlated GBM model.
 */
function ExplainerPanel() {
  return (
    <div className="bg-[#090e17] border border-[#172033] rounded p-5 space-y-5 font-mono text-xs">
      <div className="flex items-center gap-2 border-b border-[#172033] pb-3">
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-bold tracking-tight text-white uppercase">
          How Your Portfolio is Simulated
        </h2>
      </div>

      {/* 6 Step Sequential Process */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="p-3 bg-[#0c1322] border border-[#172033] rounded space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-600 flex items-center justify-center text-[10px]">1</span>
            Actual Holdings Extraction
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            We automatically pull your live holdings (tickers, share quantities, latest market prices) and cash reserves directly from Portfolio Desk.
          </p>
        </div>

        <div className="p-3 bg-[#0c1322] border border-[#172033] rounded space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-600 flex items-center justify-center text-[10px]">2</span>
            Historical Calibration
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Up to 5 years of daily prices from Yahoo Finance are fetched per stock. Daily returns are date-aligned across all holdings to build an empirical covariance matrix — capturing real observed volatilities and correlations.
          </p>
        </div>

        <div className="p-3 bg-[#0c1322] border border-[#172033] rounded space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-600 flex items-center justify-center text-[10px]">3</span>
            Cross-Stock Correlation
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            We build an empirical N×N daily covariance matrix Σ from date-aligned historical returns. Cholesky decomposition (L×Lᵀ = Σ) gives correlated shocks Z = L×ε so stock movements reflect real observed co-movements.
          </p>
        </div>

        <div className="p-3 bg-[#0c1322] border border-[#172033] rounded space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-600 flex items-center justify-center text-[10px]">4</span>
            Correlated Daily Stepping
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Using daily Geometric Brownian Motion (Δt = 1/252), each stock's price advances day by day according to its drift and correlated market shocks.
          </p>
        </div>

        <div className="p-3 bg-[#0c1322] border border-[#172033] rounded space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-600 flex items-center justify-center text-[10px]">5</span>
            Portfolio NAV Summation
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            At every daily step, your portfolio value is computed by multiplying simulated stock prices by your exact share quantities: V(t) = ∑ [q_i × S_i(t)] + Cash.
          </p>
        </div>

        <div className="p-3 bg-[#0c1322] border border-[#172033] rounded space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-600 flex items-center justify-center text-[10px]">6</span>
            Outcome Distribution
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            After generating hundreds or thousands of complete portfolio futures, we compute percentiles (5th, 50th, 95th) and the exact probability of loss.
          </p>
        </div>
      </div>

      {/* Practical Intuition Example Box */}
      <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded space-y-2">
        <span className="text-cyan-300 font-bold text-xs uppercase flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          Why Portfolio-Aware Simulation Matters
        </span>
        <p className="text-slate-200 text-xs leading-relaxed">
          Unlike generic calculators that use one arbitrary return number, this simulator models your <strong>actual portfolio composition</strong>. If you hold low-correlation stocks (such as IT and FMCG), the simulator naturally accounts for diversification benefits — leading to lower portfolio volatility and more resilient downside outcomes.
        </p>
      </div>

      {/* Mathematical Model Formula Breakdown */}
      <div className="p-4 bg-[#070b13] border border-[#172033] rounded space-y-3">
        <span className="text-slate-400 font-bold text-xs uppercase block">
          The Mathematical Formulation
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-[#04070e] border border-[#1a253d] rounded">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">Individual Stock Price Evolution</span>
            <code className="text-cyan-300 text-xs sm:text-sm font-bold tracking-wider">
              S_i(t + Δt) = S_i(t) × exp[(μ_i − 0.5σ_i²)Δt + σ_i√Δt × Z_i]
            </code>
          </div>
          <div className="p-3 bg-[#04070e] border border-[#1a253d] rounded">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">Combined Portfolio Value</span>
            <code className="text-cyan-300 text-xs sm:text-sm font-bold tracking-wider">
              V(t) = ∑ [ q_i × S_i(t) ] + Cash Reserves
            </code>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-300 pt-1">
          <div className="p-2 bg-[#0a101d] rounded border border-[#162238]">
            <strong className="text-cyan-400 block font-mono">q_i & S_i(t)</strong>
            <span>Your exact quantity held and simulated stock price</span>
          </div>
          <div className="p-2 bg-[#0a101d] rounded border border-[#162238]">
            <strong className="text-cyan-400 block font-mono">μ_i & σ_i</strong>
            <span>Annualized return and volatility estimated per holding</span>
          </div>
          <div className="p-2 bg-[#0a101d] rounded border border-[#162238]">
            <strong className="text-cyan-400 block font-mono">Z = L × ε</strong>
            <span>Correlated shocks: Z = L×ε, L×Lᵀ = Σ (empirical daily covariance)</span>
          </div>
          <div className="p-2 bg-[#0a101d] rounded border border-[#162238]">
            <strong className="text-cyan-400 block font-mono">Δt = 1/252</strong>
            <span>Daily step in standard Indian trading year</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Monte Carlo Desk Page Component
 */
export function MonteCarloDesk() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');

  // Simulation Controls (Horizon, Paths & Historical Years)
  const [horizonDays, setHorizonDays] = useState(252); // Default: 1 Year (252 trading days)
  const [simulationCount, setSimulationCount] = useState(1000); // Default: 1,000 paths
  const [historicalYears, setHistoricalYears] = useState(3); // Default: 3 years of history

  // Simulation execution state
  const [simulationResult, setSimulationResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('paths'); // 'paths' | 'distribution'

  // Run simulation handler
  const executeSimulation = useCallback(
    async (portfolioId = selectedPortfolioId, overrides = {}) => {
      setRunning(true);
      try {
        const payload = {
          portfolioId: portfolioId || null,
          simulationCount: overrides.simulationCount ?? Number(simulationCount),
          horizonDays: overrides.horizonDays ?? Number(horizonDays),
          historicalYears: overrides.historicalYears ?? Number(historicalYears),
        };

        const res = await api.runMonteCarlo(payload);
        if (res?.data) {
          setSimulationResult(res.data);
        }
      } catch (err) {
        console.error('Failed to run Monte Carlo simulation:', err);
      } finally {
        setRunning(false);
      }
    },
    [selectedPortfolioId, simulationCount, horizonDays, historicalYears]
  );

  // Initial load: Fetch portfolios and run first simulation with portfolio estimates
  useEffect(() => {
    async function loadInitial() {
      try {
        const pRes = await api.getPortfolios().catch(() => ({ data: [] }));
        const pList = pRes?.data || [];
        setPortfolios(pList);
        const firstId = pList[0]?.id || '';
        setSelectedPortfolioId(firstId);

        await executeSimulation(firstId);
      } catch (err) {
        console.error('Failed to initialize Monte Carlo desk:', err);
      }
    }
    loadInitial();
  }, []);

  const p = simulationResult?.parameters;
  const o = simulationResult?.outcomes;
  const holdingsBreakdown = simulationResult?.holdingsBreakdown || [];
  const sampleTrajectories = simulationResult?.sampleTrajectories || [];
  const trajectoryPercentiles = simulationResult?.trajectoryPercentiles || [];
  const terminalHistogram = simulationResult?.terminalHistogram || [];
  const initialValue = p?.initialPortfolioValue || 0;

  // Horizon options
  const horizonOptions = [
    { label: '1 Month', days: 21 },
    { label: '3 Months', days: 63 },
    { label: '6 Months', days: 126 },
    { label: '1 Year', days: 252 },
  ];

  // Simulation count options
  const simCountOptions = [100, 500, 1000, 5000];

  // Historical years options
  const histYearOptions = [
    { label: '1Y', years: 1 },
    { label: '3Y', years: 3 },
    { label: '5Y', years: 5 },
  ];

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#172033]">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">
              PORTFOLIO MONTE CARLO SIMULATOR
            </h1>
            <Badge variant="info" size="xs">
              HOLDINGS-AWARE GBM
            </Badge>
            <DataStatusBadge status={p?.isUsingFallback ? 'ESTIMATED' : 'LIVE'} />
            {p?.dataSource && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 font-mono">
                {p.dataSource}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulates your actual portfolio holdings using empirical covariance calibrated from {p?.historicalYears ?? historicalYears}Y of historical daily prices and Cholesky-correlated GBM
          </p>
        </div>

        {/* Portfolio Selection & Run Button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedPortfolioId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedPortfolioId(newId);
                executeSimulation(newId);
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
            onClick={() => executeSimulation()}
            disabled={running}
          >
            {running ? 'Simulating...' : 'Run Simulation'}
          </Button>
        </div>
      </div>

      {/* Fallback Warning Notice Banner */}
      {p?.isUsingFallback && (
        <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded flex items-start gap-2.5 text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-semibold uppercase block mb-0.5">Benchmark Fallback Notice:</span>
            {p?.fallbackNotice ||
              'One or more portfolio holdings had insufficient historical daily prices (< 5 days). Standard Indian benchmark parameters (12% return, 15% volatility) were used as transparent proxies for those assets.'}
          </div>
        </div>
      )}

      {/* Portfolio Telemetry & Parameters Strip */}
      <div className="p-4 bg-[#090e17] border border-[#172033] rounded space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#152033] pb-2.5">
          <span className="text-white font-bold text-xs uppercase tracking-wider">
            Portfolio Holdings & Simulation Parameters
          </span>
          <span className="text-[11px] text-cyan-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Synchronized with Portfolio Desk
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Initial Portfolio Value */}
          <div className="p-3 bg-[#0c1322] border border-[#1e293b] rounded">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold mb-1">
              Initial Portfolio Value (NAV)
            </span>
            <div className="text-lg font-bold text-white tabular-nums">
              {formatCurrency(initialValue)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Calculated from {p?.holdingsCount ?? 0} holdings + {formatCurrency(p?.cashBalance ?? 0)} cash
            </span>
            {p?.alignedTradingDays > 0 && (
              <span className="text-[9px] text-indigo-400 mt-0.5 block">
                {p.alignedTradingDays} aligned trading days used
              </span>
            )}
          </div>

          {/* Card 2: Effective Expected Return */}
          <div className="p-3 bg-[#0c1322] border border-[#1e293b] rounded">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold mb-1">
              Effective Portfolio Return (μ)
            </span>
            <div className="text-lg font-bold text-emerald-400 tabular-nums">
              {p?.effectivePortfolioReturnPercent !== undefined
                ? `${p.effectivePortfolioReturnPercent >= 0 ? '+' : ''}${p.effectivePortfolioReturnPercent}%`
                : '—'}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Weighted annual drift across holdings
            </span>
            {p?.effectivePortfolioVolatilityPercent !== undefined && (
              <span className="text-[9px] text-amber-400 mt-0.5 block">
                σ = {p.effectivePortfolioVolatilityPercent}% portfolio vol
              </span>
            )}
          </div>

          {/* Card 3: Investment Horizon Selector */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1 font-semibold">
              Investment Horizon
            </label>
            <div className="grid grid-cols-2 gap-1">
              {horizonOptions.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => {
                    setHorizonDays(opt.days);
                    executeSimulation(selectedPortfolioId, { horizonDays: opt.days });
                  }}
                  className={`px-2 py-1.5 rounded text-[10px] font-semibold tracking-tight transition-colors cursor-pointer text-center ${
                    horizonDays === opt.days
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-[#0c1322] border border-[#1e293b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 block">{horizonDays} trading sessions</span>
          </div>

          {/* Card 4: Number of Simulations */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1 font-semibold">
              Simulation Paths
            </label>
            <div className="grid grid-cols-2 gap-1">
              {simCountOptions.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setSimulationCount(count);
                    executeSimulation(selectedPortfolioId, { simulationCount: count });
                  }}
                  className={`px-2 py-1.5 rounded text-[10px] font-semibold tracking-tight transition-colors cursor-pointer text-center ${
                    simulationCount === count
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-[#0c1322] border border-[#1e293b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {count.toLocaleString()}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 block">Stochastic trajectories</span>
          </div>
        </div>

        {/* Historical Data Window Selector */}
        <div className="pt-3 border-t border-[#152033]">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1 font-semibold">
                Historical Data Window
              </label>
              <div className="flex items-center gap-1.5">
                {[{ label: '1Y', years: 1 }, { label: '3Y', years: 3 }, { label: '5Y', years: 5 }].map((opt) => (
                  <button
                    key={opt.years}
                    type="button"
                    onClick={() => {
                      setHistoricalYears(opt.years);
                      executeSimulation(selectedPortfolioId, { historicalYears: opt.years });
                    }}
                    className={`px-3 py-1 rounded text-[10px] font-semibold tracking-tight transition-colors cursor-pointer ${
                      historicalYears === opt.years
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                        : 'bg-[#0c1322] border border-[#1e293b] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-3">
              Years of daily price history used to calibrate empirical return, volatility, and cross-asset covariance
            </span>
            {p?.dataSource && (
              <span className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                {p.dataSource}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Simulation Outputs Strip (Exact 6 Core Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Metric A: Median Ending Portfolio Value */}
        <MetricCard
          label="Median Ending Value (P₅₀)"
          value={formatCurrency(o?.medianTerminalValue || 0)}
          subvalue="50th percentile central portfolio outcome"
          badgeText="Median Outcome"
          badgeVariant="neutral"
          icon={Compass}
        />

        {/* Metric B: Probability of Loss */}
        <MetricCard
          label="Probability of Loss"
          value={`${o?.probabilityOfLossPercent !== undefined ? o.probabilityOfLossPercent : '0.0'}%`}
          subvalue="Simulations ending below initial portfolio NAV"
          badgeText={Number(o?.probabilityOfLossPercent) > 25 ? 'High Risk' : 'Low Risk'}
          badgeVariant={Number(o?.probabilityOfLossPercent) > 25 ? 'loss' : 'gain'}
          icon={AlertTriangle}
        />

        {/* Metric C: 5th Percentile Outcome */}
        <MetricCard
          label="5th Percentile Outcome (P₅)"
          value={formatCurrency(o?.percentile5TerminalValue || 0)}
          subvalue="Pessimistic bear scenario (~5% fall below this floor)"
          badgeText="Worst 5% Floor"
          badgeVariant="loss"
          icon={TrendingDown}
        />

        {/* Metric D: 95th Percentile Outcome */}
        <MetricCard
          label="95th Percentile Outcome (P₉₅)"
          value={formatCurrency(o?.percentile95TerminalValue || 0)}
          subvalue="Optimistic bull scenario (~5% exceed this ceiling)"
          badgeText="Best 5% Ceiling"
          badgeVariant="gain"
          icon={TrendingUp}
        />

        {/* Metric E: Expected Ending Portfolio Value */}
        <MetricCard
          label="Expected Ending Value (Mean)"
          value={formatCurrency(o?.expectedTerminalValue || 0)}
          subvalue={`Arithmetic average across all ${simulationCount.toLocaleString()} paths`}
          badgeText="Mean Average"
          badgeVariant="neutral"
          icon={Layers}
        />

        {/* Metric F: Potential Gain / Loss */}
        <MetricCard
          label="Potential Gain / Loss"
          value={`${o?.potentialGainLoss >= 0 ? '+' : ''}${formatCurrency(o?.potentialGainLoss || 0)}`}
          subvalue={`${o?.potentialGainLossPercent >= 0 ? '+' : ''}${o?.potentialGainLossPercent ?? 0}% from initial portfolio NAV`}
          badgeText={o?.potentialGainLoss >= 0 ? 'Projected Gain' : 'Projected Loss'}
          badgeVariant={o?.potentialGainLoss >= 0 ? 'gain' : 'loss'}
          icon={TrendingUp}
        />
      </div>

      {/* 4. Visualization Panel (Two Simple Charts) */}
      <div className="bg-[#090e17] border border-[#172033] rounded p-4 space-y-4">
        {/* Visual View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#172033] pb-3">
          <div>
            <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
              {activeTab === 'paths'
                ? `CHART 1: ACTUAL PORTFOLIO SIMULATION PATHS (${horizonDays} TRADING DAYS)`
                : `CHART 2: ENDING PORTFOLIO VALUE DISTRIBUTION (${simulationCount.toLocaleString()} PATHS)`}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeTab === 'paths'
                ? 'Showing 20 representative portfolio NAV paths generated from actual multi-asset correlated GBM simulation'
                : 'Frequency histogram of all simulated ending portfolio values showing loss zone vs gain zone'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('paths')}
              className={`px-3 py-1.5 rounded text-[11px] font-semibold tracking-wider transition-colors cursor-pointer ${
                activeTab === 'paths'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Chart 1: Simulation Paths
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-3 py-1.5 rounded text-[11px] font-semibold tracking-wider transition-colors cursor-pointer ${
                activeTab === 'distribution'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Chart 2: Ending Distribution
            </button>
          </div>
        </div>

        {/* Tab 1: 20 Simulation Paths */}
        {activeTab === 'paths' && (
          <SimulationPathsChart
            sampleTrajectories={sampleTrajectories}
            trajectoryPercentiles={trajectoryPercentiles}
            initialValue={initialValue}
            horizonDays={horizonDays}
          />
        )}

        {/* Tab 2: Ending Value Distribution Histogram */}
        {activeTab === 'distribution' && (
          <DistributionHistogramChart
            histogram={terminalHistogram}
            initialValue={initialValue}
            simulationCount={simulationCount}
            outcomes={o}
          />
        )}
      </div>

      {/* 5. Holdings Breakdown Table */}
      <HoldingsBreakdownTable holdings={holdingsBreakdown} />

      {/* 6. Beginner-Friendly Explanation Panel */}
      <ExplainerPanel />
    </div>
  );
}
