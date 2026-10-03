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
  Info,
} from 'lucide-react';

/**
 * Compact Rupee formatter for axis ticks & labels
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
 * Interactive Trajectory Fan Chart Component
 */
function TrajectoryFanChart({ ribbon = [], samples = [], initialValue = 0, horizonDays = 252, targetHurdleVal = 0 }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!ribbon || ribbon.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-slate-500 bg-[#070b13] border border-[#172033] rounded">
        <BarChart2 className="w-8 h-8 mb-2 opacity-50" />
        <span className="font-mono text-xs text-slate-400">No Trajectory Data Available</span>
      </div>
    );
  }

  const W = 800;
  const H = 340;
  const PAD = { top: 24, right: 90, bottom: 45, left: 85 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  // Compute Y bounds safely across P5, P95, initial capital, and hurdle target
  const p5Vals = ribbon.map((r) => r.p5);
  const p95Vals = ribbon.map((r) => r.p95);
  let minY = Math.min(...p5Vals, initialValue);
  let maxY = Math.max(...p95Vals, initialValue, targetHurdleVal || 0);

  const yMargin = Math.abs(maxY - minY) * 0.08 || 1000;
  minY = Math.max(0, minY - yMargin);
  maxY = maxY + yMargin;
  const yRange = maxY - minY || 1;

  const toX = (dayIdx) => PAD.left + (dayIdx / Math.max(1, ribbon.length - 1)) * cW;
  const toY = (val) => PAD.top + cH - ((val - minY) / yRange) * cH;

  // Mapping points
  const p50Points = ribbon.map((r, i) => ({ x: toX(i), y: toY(r.p50), day: r.day, data: r }));
  const p5Points = ribbon.map((r, i) => ({ x: toX(i), y: toY(r.p5) }));
  const p95Points = ribbon.map((r, i) => ({ x: toX(i), y: toY(r.p95) }));
  const p25Points = ribbon.map((r, i) => ({ x: toX(i), y: toY(r.p25) }));
  const p75Points = ribbon.map((r, i) => ({ x: toX(i), y: toY(r.p75) }));

  // Outer band SVG path string (P5 to P95)
  const outerPathD = [
    `M ${p95Points[0].x.toFixed(1)} ${p95Points[0].y.toFixed(1)}`,
    ...p95Points.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    ...p5Points.slice().reverse().map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    'Z',
  ].join(' ');

  // Inner band SVG path string (P25 to P75)
  const innerPathD = [
    `M ${p75Points[0].x.toFixed(1)} ${p75Points[0].y.toFixed(1)}`,
    ...p75Points.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    ...p25Points.slice().reverse().map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    'Z',
  ].join(' ');

  // Median line path string (P50)
  const medianPathD = [
    `M ${p50Points[0].x.toFixed(1)} ${p50Points[0].y.toFixed(1)}`,
    ...p50Points.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
  ].join(' ');

  // Y-axis ticks (5 price levels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const val = minY + yRange * ratio;
    return { y: PAD.top + cH * (1 - ratio), val };
  });

  // X-axis ticks (key session milestones)
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const idx = Math.floor((ribbon.length - 1) * ratio);
    const item = ribbon[idx] || ribbon[0];
    return { x: toX(idx), day: item.day };
  });

  // Telemetry readout for active or hover point
  const activePoint = hoverIdx !== null ? p50Points[hoverIdx] : p50Points[p50Points.length - 1];
  const activeData = activePoint?.data || ribbon[ribbon.length - 1];
  const p50Val = activeData?.p50 || 0;
  const p50Change = initialValue > 0 ? ((p50Val - initialValue) / initialValue) * 100 : 0;

  return (
    <div className="space-y-3 font-mono">
      {/* Telemetry Header Readout */}
      <div className="px-3 py-2 bg-[#06090f] border border-[#162238] rounded flex flex-wrap items-center justify-between text-[11px] gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Selected Session:</span>
          <strong className="text-cyan-300">
            Day {activeData.day} ({activeData.day === 0 ? 'Start' : `~${Math.round(activeData.day / 21)} Months`})
          </strong>
        </div>

        <div className="flex items-center gap-4 text-[10px] flex-wrap">
          <span className="text-slate-400">
            P95 (Bull): <strong className="text-emerald-400">{fmtCompactRupee(activeData.p95)}</strong>
          </span>
          <span className="text-slate-400">
            P75 (Quartile): <strong className="text-emerald-300">{fmtCompactRupee(activeData.p75)}</strong>
          </span>
          <span className="text-slate-400">
            P50 (Median): <strong className="text-cyan-300">{fmtCompactRupee(activeData.p50)}</strong> ({p50Change >= 0 ? '+' : ''}{p50Change.toFixed(1)}%)
          </span>
          <span className="text-slate-400">
            P25 (Quartile): <strong className="text-amber-300">{fmtCompactRupee(activeData.p25)}</strong>
          </span>
          <span className="text-slate-400">
            P5 (Bear): <strong className="text-rose-400">{fmtCompactRupee(activeData.p5)}</strong>
          </span>
        </div>
      </div>

      {/* SVG Trajectory Fan Canvas */}
      <div className="relative bg-[#070b13] border border-[#172033] rounded p-1 overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible cursor-crosshair"
          style={{ height: '340px' }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="mcOuterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="mcInnerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.10" />
            </linearGradient>
            <clipPath id="fanClip">
              <rect x={PAD.left} y={PAD.top} width={cW} height={cH} />
            </clipPath>
          </defs>

          {/* Y-axis grid lines & price tick labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
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

          {/* X-axis grid lines & day tick labels */}
          {xTicks.map((t, i) => (
            <g key={i}>
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

          {/* Initial Capital Baseline Line */}
          {initialValue > 0 && (
            <g>
              <line
                x1={PAD.left}
                y1={toY(initialValue)}
                x2={W - PAD.right}
                y2={toY(initialValue)}
                stroke="#64748b"
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
                Initial Capital ({fmtCompactRupee(initialValue)})
              </text>
            </g>
          )}

          {/* Target Hurdle Return Line */}
          {targetHurdleVal > 0 && (
            <g>
              <line
                x1={PAD.left}
                y1={toY(targetHurdleVal)}
                x2={W - PAD.right}
                y2={toY(targetHurdleVal)}
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <text
                x={W - PAD.right - 8}
                y={toY(targetHurdleVal) - 5}
                fill="#34d399"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="end"
                fontWeight="bold"
              >
                Hurdle Target ({fmtCompactRupee(targetHurdleVal)})
              </text>
            </g>
          )}

          {/* Outer 90% Ribbon Band (P5 - P95) */}
          <path d={outerPathD} fill="url(#mcOuterGrad)" clipPath="url(#fanClip)" />

          {/* Inner 50% Ribbon Band (P25 - P75) */}
          <path d={innerPathD} fill="url(#mcInnerGrad)" clipPath="url(#fanClip)" />

          {/* 15 Representative Sample Stochastic Trajectories */}
          {samples.map((path) => {
            if (!path.points || path.points.length === 0) return null;
            const pts = path.points.map((pt, i) => ({
              x: toX(i),
              y: toY(pt.value),
            }));
            const dStr =
              `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} ` +
              pts.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            return (
              <path
                key={path.id}
                d={dStr}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="0.8"
                strokeOpacity="0.22"
                clipPath="url(#fanClip)"
              />
            );
          })}

          {/* Median P50 Line */}
          <path
            d={medianPathD}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#fanClip)"
          />

          {/* Hover Crosshair & Dot Indicators */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={PAD.top}
                x2={activePoint.x}
                y2={H - PAD.bottom}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={activePoint.x} cy={toY(activeData.p95)} r="3" fill="#34d399" />
              <circle cx={activePoint.x} cy={toY(activeData.p75)} r="3" fill="#6ee7b7" />
              <circle cx={activePoint.x} cy={toY(activeData.p50)} r="4.5" fill="#22d3ee" stroke="#070b13" strokeWidth="1.5" />
              <circle cx={activePoint.x} cy={toY(activeData.p25)} r="3" fill="#fcd34d" />
              <circle cx={activePoint.x} cy={toY(activeData.p5)} r="3" fill="#f87171" />
            </g>
          )}

          {/* Invisible hover hitboxes */}
          {p50Points.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - cW / (p50Points.length * 2)}
              y={PAD.top}
              width={cW / Math.max(1, p50Points.length)}
              height={cH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          ))}
        </svg>
      </div>

      {/* Fan Chart Guide & Legend */}
      <div className="p-3 bg-[#060a12] border border-[#162238] rounded space-y-2 text-[11px]">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded bg-[#22d3ee]" /> Median Outcome (50th Percentile)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-[#06b6d4] opacity-35" /> 50% Likely Range (P25 – P75)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-[#06b6d4] opacity-15" /> 90% Confidence Envelope (P5 – P95)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-400 border-t border-dashed" /> Starting Capital
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 border-t border-dashed" /> Target Hurdle
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#121c2f] grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] text-slate-400">
          <div className="p-2 bg-[#090e1a] border border-[#152035] rounded">
            <strong className="text-cyan-300 block mb-0.5">What is the Fan Chart?</strong>
            Simulates {horizonDays} trading days forward using historical return volatility & drift. Higher fan spread indicates greater market uncertainty.
          </div>
          <div className="p-2 bg-[#090e1a] border border-[#152035] rounded">
            <strong className="text-cyan-300 block mb-0.5">Understanding Confidence Bands</strong>
            50% of all simulated market paths land inside the inner dark cyan band. 90% of all paths land inside the outer light band.
          </div>
          <div className="p-2 bg-[#090e1a] border border-[#152035] rounded">
            <strong className="text-cyan-300 block mb-0.5">Tail Outliers (5% / 95%)</strong>
            The top edge (P95) represents bullish market runs; the bottom edge (P5) represents severe market drawdowns.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Density Histogram Component
 */
function DensityHistogramChart({ histogram = [], initialValue = 0, targetHurdleVal = 0, simulationCount = 1000, outcomes }) {
  const [hoveredBin, setHoveredBin] = useState(null);

  if (!histogram || histogram.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-slate-500 bg-[#070b13] border border-[#172033] rounded font-mono">
        <BarChart2 className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-xs text-slate-400">No Histogram Data Available</span>
      </div>
    );
  }

  const maxCount = Math.max(...histogram.map((b) => b.count), 1);

  // Default displayed bin on telemetry is the modal (peak) bin unless hovered
  const displayBin =
    hoveredBin || histogram.reduce((max, b) => (b.count > max.count ? b : max), histogram[0]);

  return (
    <div className="space-y-3 font-mono">
      {/* Telemetry Header */}
      <div className="px-3 py-2 bg-[#06090f] border border-[#162238] rounded flex flex-wrap items-center justify-between text-[11px] gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Terminal Portfolio Range:</span>
          <strong className="text-white">
            {fmtCompactRupee(displayBin.rangeStart)} – {fmtCompactRupee(displayBin.rangeEnd)}
          </strong>
        </div>

        <div className="flex items-center gap-4 text-[10px] flex-wrap">
          <span className="text-slate-400">
            Path Frequency: <strong className="text-cyan-300">{displayBin.count} paths</strong> ({displayBin.densityPercent}%)
          </span>
          <span className="text-slate-400">
            Outcome Status:{' '}
            <strong
              className={
                displayBin.rangeEnd < initialValue
                  ? 'text-rose-400'
                  : targetHurdleVal > 0 && displayBin.rangeStart >= targetHurdleVal
                  ? 'text-emerald-400'
                  : 'text-cyan-300'
              }
            >
              {displayBin.rangeEnd < initialValue
                ? 'Capital Loss Zone'
                : targetHurdleVal > 0 && displayBin.rangeStart >= targetHurdleVal
                ? 'Target Hurdle Surpassed'
                : 'Capital Gain Zone'}
            </strong>
          </span>
        </div>
      </div>

      {/* Histogram Bars Canvas */}
      <div className="bg-[#070b13] border border-[#172033] rounded p-4 space-y-2 select-none">
        {/* Reference Marker Legend Badges */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 border-b border-[#141d2f] flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80" /> Capital Loss Zone
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/80" /> Positive Gain Zone
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" /> Target Exceeded Zone
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Total Paths: <strong className="text-slate-200">{simulationCount.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Histogram Column Bars */}
        <div className="h-64 flex items-end gap-1.5 pt-6 pb-2 relative">
          {histogram.map((bin) => {
            const isLoss = bin.rangeEnd < initialValue;
            const isExceeded = targetHurdleVal > 0 && bin.rangeStart >= targetHurdleVal;
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
                      ? isHovered ? 'bg-rose-500 shadow-lg shadow-rose-950/50' : 'bg-rose-500/70'
                      : isExceeded
                      ? isHovered ? 'bg-emerald-400 shadow-lg shadow-emerald-950/50' : 'bg-emerald-500/70'
                      : isHovered ? 'bg-cyan-300 shadow-lg shadow-cyan-950/50' : 'bg-cyan-500/70'
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

        {/* Footer Distribution Spectrum Labels */}
        <div className="flex justify-between items-center text-[10px] pt-2 border-t border-[#141d2f]">
          <span className="text-rose-400 font-semibold flex items-center gap-1">
            ◄ Left Tail: Drawdowns & Capital Loss
          </span>
          <span className="text-slate-400">
            Median Terminal Value: <strong className="text-cyan-300">{fmtCompactRupee(outcomes?.medianTerminalValue || 0)}</strong>
          </span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            Right Tail: Bullish Outperformance ►
          </span>
        </div>
      </div>

      {/* Educational Concept Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px]">
        <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded space-y-1">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold uppercase">
            <AlertTriangle className="w-3.5 h-3.5" />
            1. Left Tail (Capital Loss Zone)
          </div>
          <p className="text-slate-300 leading-relaxed">
            Represents simulations where terminal portfolio value falls below your starting investment (<strong>{fmtCompactRupee(initialValue)}</strong>).
            The probability of capital loss is <strong>{outcomes?.probabilityOfLossPercent ?? 0}%</strong>.
          </p>
        </div>

        <div className="p-3 bg-cyan-950/20 border border-cyan-900/30 rounded space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase">
            <Compass className="w-3.5 h-3.5" />
            2. Center Density (Most Likely Outcome)
          </div>
          <p className="text-slate-300 leading-relaxed">
            The peak of the distribution shows where terminal values cluster most densely. Your expected median terminal portfolio NAV is <strong>{fmtCompactRupee(outcomes?.medianTerminalValue || 0)}</strong>.
          </p>
        </div>

        <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase">
            <Target className="w-3.5 h-3.5" />
            3. Right Tail (Target Hurdle)
          </div>
          <p className="text-slate-300 leading-relaxed">
            Outcomes exceeding your hurdle return target of <strong>{fmtCompactRupee(targetHurdleVal)}</strong>.
            You have a <strong>{outcomes?.probabilityExceedingTargetPercent ?? 0}%</strong> chance of surpassing this hurdle.
          </p>
        </div>
      </div>
    </div>
  );
}

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

  const initialValue = p?.initialPortfolioValue ?? 0;
  const targetHurdleVal = initialValue * (1 + Number(targetReturn) / 100);

  return (
    <div className="space-y-6 font-mono text-xs select-none">
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

        {/* Global Actions */}
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
            className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors cursor-pointer ${
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
          <span className="text-[11px] text-slate-300 font-mono">
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
          subvalue={`Hurdle: ${formatCurrency(targetHurdleVal)}`}
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

      {/* Visualization Panel */}
      <div className="bg-[#090e17] border border-[#172033] rounded p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#172033] pb-3">
          <div>
            <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
              {activeView === 'fan'
                ? `STOCHASTIC TRAJECTORY FAN & CONFIDENCE BANDS (${horizonDays} TRADING SESSIONS)`
                : `TERMINAL PORTFOLIO VALUE PROBABILITY DENSITY (${simulationCount} PATHS)`}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Geometric Brownian Motion calibrated to your portfolio's historical volatility & return drift
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('fan')}
              className={`px-3 py-1 rounded text-[11px] font-semibold tracking-wider transition-colors cursor-pointer ${
                activeView === 'fan'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trajectory Fan
            </button>
            <button
              onClick={() => setActiveView('histogram')}
              className={`px-3 py-1 rounded text-[11px] font-semibold tracking-wider transition-colors cursor-pointer ${
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
          <TrajectoryFanChart
            ribbon={ribbon}
            samples={samples}
            initialValue={initialValue}
            horizonDays={horizonDays}
            targetHurdleVal={targetHurdleVal}
          />
        )}

        {/* View 2: Terminal Value Density Histogram */}
        {activeView === 'histogram' && (
          <DensityHistogramChart
            histogram={hist}
            initialValue={initialValue}
            targetHurdleVal={targetHurdleVal}
            simulationCount={simulationCount}
            outcomes={o}
          />
        )}
      </div>
    </div>
  );
}

