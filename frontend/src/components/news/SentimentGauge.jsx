import React, { useEffect, useRef } from 'react';

/**
 * Animated arc sentiment gauge
 * Shows bullish/neutral/bearish breakdown as a semicircular arc gauge
 */
export function SentimentGauge({ bullishPct = 33, neutralPct = 34, bearishPct = 33, score = 0.5, size = 120 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = size;
    const h = size * 0.65;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h * 0.95;
    const r = w * 0.42;
    const strokeW = w * 0.09;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;
    const totalAngle = Math.PI;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Track background
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Bearish segment (left third)
    const bearishAngle = (bearishPct / 100) * totalAngle;
    if (bearishAngle > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + bearishAngle);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'butt';
      ctx.stroke();
    }

    // Neutral segment (middle)
    const neutralStart = startAngle + bearishAngle;
    const neutralAngle = (neutralPct / 100) * totalAngle;
    if (neutralAngle > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, neutralStart, neutralStart + neutralAngle);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'butt';
      ctx.stroke();
    }

    // Bullish segment (right third)
    const bullishStart = neutralStart + neutralAngle;
    const bullishAngle = (bullishPct / 100) * totalAngle;
    if (bullishAngle > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, bullishStart, bullishStart + bullishAngle);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'butt';
      ctx.stroke();
    }

    // Needle
    const needleAngle = startAngle + score * totalAngle;
    const needleLength = r * 0.8;
    const nx = cx + needleLength * Math.cos(needleAngle);
    const ny = cy + needleLength * Math.sin(needleAngle);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, strokeW * 0.35, 0, 2 * Math.PI);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
  }, [bullishPct, neutralPct, bearishPct, score, size]);

  // Determine overall label
  let overallLabel = 'NEUTRAL';
  let overallColor = 'text-slate-400';
  if (bullishPct > bearishPct + 10) { overallLabel = 'BULLISH'; overallColor = 'text-emerald-400'; }
  else if (bearishPct > bullishPct + 10) { overallLabel = 'BEARISH'; overallColor = 'text-rose-400'; }

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas ref={canvasRef} className="block" />
      <div className={`text-sm font-mono font-bold tracking-wider ${overallColor}`}>
        {overallLabel}
      </div>
      <div className="flex items-center gap-3 text-[10px] font-mono mt-1">
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          {bullishPct}%
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
          {neutralPct}%
        </span>
        <span className="flex items-center gap-1 text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
          {bearishPct}%
        </span>
      </div>
    </div>
  );
}
