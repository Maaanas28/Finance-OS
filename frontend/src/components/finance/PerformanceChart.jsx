import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartContainer } from '../ui/ChartContainer.jsx';
import { DataStatusBadge } from '../ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatNumber } from '../../utils/formatters.js';
import { BarChart2 } from 'lucide-react';

// Format a date string for axis display
function fmtAxisDate(isoStr, timeframe) {
  if (!isoStr) return '';
  if (timeframe === '1D') {
    if (isoStr.includes('T')) {
      return isoStr.substring(11, 16);
    }
    if (isoStr.includes(' ')) {
      const parts = isoStr.split(' ');
      if (parts[1]) return parts[1].substring(0, 5);
    }
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    return isoStr;
  }
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  if (timeframe === '1Y' || timeframe === 'ALL') {
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Format tooltip date more verbosely
function fmtTooltipDate(isoStr, timeframe) {
  if (!isoStr) return '';
  if (timeframe === '1D') {
    if (isoStr.includes('T') || isoStr.includes(' ')) {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}, ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
      }
      return isoStr;
    }
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return isoStr;
  }
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Smart Y-axis tick formatter avoiding duplicate/rounded labels
function formatChartTick(val, range, isMarket) {
  if (!Number.isFinite(val)) return '';
  if (isMarket) {
    if (range < 10) return val.toFixed(2);
    if (range < 100) return val.toFixed(1);
    return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  // Portfolio currency formatting
  if (val >= 1e7) {
    const cr = val / 1e7;
    const decimals = range < 1e6 ? 3 : range < 5e6 ? 2 : 1;
    return `₹${cr.toFixed(decimals)}Cr`;
  }
  if (val >= 1e5) {
    if (range < 50000) {
      return `₹${Math.round(val).toLocaleString('en-IN')}`;
    }
    const l = val / 1e5;
    const decimals = range < 2e5 ? 2 : 1;
    return `₹${l.toFixed(decimals)}L`;
  }
  if (val >= 1e3) {
    if (range < 1000) {
      return `₹${val.toFixed(0)}`;
    }
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  }
  return `₹${val.toFixed(0)}`;
}

/**
 * PerformanceChart Component
 * 
 * High-precision institutional quantitative equity curve chart:
 * 1. Portfolio Mode: Live valuation curve synchronized with trades & mark-to-market.
 * 2. NIFTY 50 Mode: Real benchmark candles from Yahoo Finance.
 * 3. Dynamic axis scales, non-colliding tick formatting, and responsive crosshair.
 */
export function PerformanceChart() {
  const [timeframe, setTimeframe] = useState('1M');
  const [activeSeries, setActiveSeries] = useState('portfolio');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const isMarket = activeSeries === 'nifty';

  // NIFTY 50 historical candles from Yahoo Finance (^NSEI)
  const { data: historyRes, isFetching: niftyFetching, isError: niftyError } = useQuery({
    queryKey: ['marketHistory', 'NIFTY 50', timeframe],
    queryFn: () => api.getHistoricalPrices('NIFTY 50', { timeframe }),
    enabled: isMarket,
    staleTime: 60000,
  });

  // Real user portfolio performance history anchored to user transactions & valuation
  const { data: portfolioRes, isFetching: portFetching, isError: portError } = useQuery({
    queryKey: ['portfolioPerformance', timeframe],
    queryFn: () => api.getPortfolioPerformance(null, timeframe),
    enabled: !isMarket,
    staleTime: 30000,
  });

  const portfolioSeries = portfolioRes?.data?.performance || [];
  const currentValuation = portfolioRes?.data?.currentValuation || 0;

  // Market series from NIFTY candles - actual close prices
  const marketSeries = (historyRes?.data?.candles || []).map((c) => ({
    time: c.timestamp || c.time || c.date || '',
    value: Number(c.close),
  }));

  const rawSeries = isMarket ? marketSeries : portfolioSeries;
  const series = (rawSeries || [])
    .map((d) => ({
      ...d,
      value: Number(d.value ?? d.nav ?? d.price ?? d.equity ?? 0),
    }))
    .filter((d) => Number.isFinite(d.value));

  // Provenance badge
  const isLoading = isMarket ? niftyFetching : portFetching;
  const hasError = isMarket ? niftyError : portError;
  const providerStatus = isMarket
    ? (historyRes?.data?.dataStatus || (isLoading ? 'HISTORICAL' : 'HISTORICAL'))
    : 'HISTORICAL';
  const providerSource = isMarket ? (historyRes?.data?.dataSource || 'yahoo') : 'portfolio';

  const hasData = series.length > 0;

  // ─── SVG chart math ───────────────────────────────────────────────────────
  const values = hasData ? series.map((d) => d.value) : [];
  const minValue = hasData ? Math.min(...values) : 0;
  const maxValue = hasData ? Math.max(...values) : 1;
  const actualRange = maxValue - minValue;
  const yPad = Math.max(actualRange * 0.08, actualRange === 0 ? 100 : 5);
  const yMin = minValue - yPad;
  const yMax = maxValue + yPad;
  const yRange = yMax - yMin || 1;

  const W = 740;
  const H = 250;
  const PAD = { top: 18, right: 85, bottom: 32, left: 16 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const toX = (i) => PAD.left + (i / Math.max(1, series.length - 1)) * cW;
  const toY = (v) => {
    const rawY = PAD.top + cH - ((v - yMin) / yRange) * cH;
    return Number.isFinite(rawY) ? rawY : PAD.top + cH / 2;
  };

  const points = hasData
    ? series.map((d, i) => ({
        ...d,
        x: Number.isFinite(toX(i)) ? toX(i) : PAD.left,
        y: toY(d.value),
        index: i,
      }))
    : [];

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L ${points[0].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`
    : '';

  const isPositiveSeries = points.length > 1 ? points[points.length - 1].value >= points[0].value : true;
  const strokeColor = isPositiveSeries ? '#34d399' : '#f87171';
  const gradFill = isPositiveSeries ? '#34d399' : '#f87171';

  // Display point for header telemetry
  const displayPt = hoveredPoint || (points.length > 0 ? points[points.length - 1] : null);

  // Performance telemetry calculations
  const firstPtVal = points.length > 0 ? points[0].value : 0;
  const targetPtVal = displayPt ? displayPt.value : 0;
  const periodDiff = targetPtVal - firstPtVal;
  const periodDiffPct = firstPtVal > 0 ? (periodDiff / firstPtVal) * 100 : 0;
  const isHoverPositive = periodDiff >= 0;

  // Y-axis labels: 5 evenly-spaced price levels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: PAD.top + cH * (1 - ratio),
    value: yMin + yRange * ratio,
  }));

  // X-axis labels: show 5 evenly spaced ticks across series
  const xTickIndices = [];
  if (points.length <= 5) {
    for (let i = 0; i < points.length; i++) xTickIndices.push(i);
  } else {
    const numTicks = 5;
    for (let k = 0; k < numTicks; k++) {
      const idx = Math.round((k / (numTicks - 1)) * (points.length - 1));
      if (!xTickIndices.includes(idx)) {
        xTickIndices.push(idx);
      }
    }
  }

  // Crosshair mouse movement tracker across SVG
  const handleSvgMouseMove = (e) => {
    if (!points.length) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * W;
    
    let closest = points[0];
    let minDist = Math.abs(points[0].x - mouseX);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = points[i];
      }
    }
    setHoveredPoint(closest);
  };

  return (
    <ChartContainer
      title={isMarket ? 'NIFTY 50 · Historical Price' : 'Portfolio Equity Curve'}
      subtitle={
        isMarket
          ? `Real close prices from Yahoo Finance · ${timeframe} view`
          : 'Your portfolio valuation over time'
      }
      timeframe={timeframe}
      onTimeframeChange={(tf) => { setTimeframe(tf); setHoveredPoint(null); }}
      action={
        <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
          <DataStatusBadge status={providerStatus} source={providerSource} />
          <div className="inline-flex p-0.5 bg-[#080d16] border border-[#1b253b] rounded">
            <button
              onClick={() => { setActiveSeries('portfolio'); setHoveredPoint(null); }}
              className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                !isMarket ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => { setActiveSeries('nifty'); setHoveredPoint(null); }}
              className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                isMarket ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              NIFTY 50
            </button>
          </div>
        </div>
      }
    >
      {/* Hover telemetry header */}
      {hasData && displayPt && (
        <div className="mb-2 px-2.5 py-1.5 bg-[#06090e] border border-[#162238] rounded text-[11px] font-mono flex items-center gap-4 flex-wrap">
          <span className="text-slate-400">
            {hoveredPoint ? 'Hover:' : 'Latest:'} <strong className="text-slate-200">{fmtTooltipDate(displayPt.time, timeframe)}</strong>
          </span>
          <span className="text-slate-400">
            {isMarket ? 'Close:' : 'Valuation:'}{' '}
            <strong className="text-white tabular-nums">
              {isMarket ? formatNumber(displayPt.value) : formatCurrency(displayPt.value)}
            </strong>
          </span>
          <span className={`ml-auto font-semibold tabular-nums text-xs px-2 py-0.5 rounded border ${
            isHoverPositive
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
          }`}>
            {isHoverPositive ? '+' : ''}{periodDiffPct.toFixed(2)}%
            {!isMarket && ` (${isHoverPositive ? '+' : ''}${formatCurrency(periodDiff)})`}
          </span>
        </div>
      )}

      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#080d18] border border-[#162238] rounded">
          <BarChart2 className="w-8 h-8 text-slate-500 mb-3" />
          {isLoading ? (
            <h4 className="text-sm font-mono text-slate-400">Loading chart data…</h4>
          ) : hasError ? (
            <>
              <h4 className="text-sm font-mono font-bold text-rose-400 uppercase">Data Unavailable</h4>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {isMarket ? 'NIFTY 50 history could not be fetched.' : 'Portfolio history unavailable.'}
              </p>
            </>
          ) : isMarket ? (
            <>
              <h4 className="text-sm font-mono font-bold text-slate-200 uppercase">No Chart Data</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm">
                NIFTY 50 historical data could not be loaded for {timeframe}.
              </p>
            </>
          ) : (
            <>
              <h4 className="text-sm font-mono font-bold text-slate-200 uppercase">No Portfolio History</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm">
                Deposit virtual cash and buy stocks to start building your equity curve.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full overflow-visible cursor-crosshair select-none"
            style={{ height: '260px' }}
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradFill} stopOpacity="0.30" />
                <stop offset="75%" stopColor={gradFill} stopOpacity="0.04" />
                <stop offset="100%" stopColor={gradFill} stopOpacity="0.0" />
              </linearGradient>
              <clipPath id="pcClip">
                <rect x={PAD.left} y={PAD.top} width={cW} height={cH} />
              </clipPath>
            </defs>

            {/* Y-axis grid lines + price labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={PAD.left}
                  y1={tick.y}
                  x2={W - PAD.right}
                  y2={tick.y}
                  stroke="#182030"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                />
                <text
                  x={W - PAD.right + 8}
                  y={tick.y + 3.5}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatChartTick(tick.value, yRange, isMarket)}
                </text>
              </g>
            ))}

            {/* Baseline */}
            <line
              x1={PAD.left}
              y1={H - PAD.bottom}
              x2={W - PAD.right}
              y2={H - PAD.bottom}
              stroke="#1c2842"
              strokeWidth="1"
            />

            {/* Area fill */}
            {areaD && (
              <path d={areaD} fill="url(#pcGrad)" clipPath="url(#pcClip)" />
            )}

            {/* Line stroke */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath="url(#pcClip)"
              />
            )}

            {/* Hover crosshair vertical line and point */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={PAD.top}
                  x2={hoveredPoint.x}
                  y2={H - PAD.bottom}
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.7"
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="4.5"
                  fill="#38bdf8"
                  stroke="#080b10"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* X-axis date labels */}
            {xTickIndices.map((i, tickIdx) => {
              const pt = points[i];
              if (!pt) return null;
              const isFirst = tickIdx === 0;
              const isLast = tickIdx === xTickIndices.length - 1;
              const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle';

              return (
                <text
                  key={i}
                  x={pt.x}
                  y={H - 8}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor={textAnchor}
                >
                  {fmtAxisDate(pt.time, timeframe)}
                </text>
              );
            })}
          </svg>

          {/* Footer: range info */}
          <div className="mt-2 pt-2 border-t border-[#151f33] flex items-center justify-between text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span>
                Range Min:{' '}
                <strong className="text-slate-300">
                  {isMarket
                    ? Number(minValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })
                    : formatCurrency(minValue)}
                </strong>
              </span>
              <span>
                Range Max:{' '}
                <strong className="text-slate-300">
                  {isMarket
                    ? Number(maxValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })
                    : formatCurrency(maxValue)}
                </strong>
              </span>
              <span>
                Points:{' '}
                <strong className="text-slate-300">{series.length}</strong>
              </span>
            </div>
            <div className={`flex items-center gap-1.5 ${isMarket ? 'text-blue-400' : 'text-emerald-400'}`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span>{isMarket ? 'Yahoo Finance · Historical' : 'Portfolio Valuation'}</span>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
