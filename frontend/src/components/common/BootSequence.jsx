import React, { useState, useEffect } from 'react';
import { Terminal, ShieldCheck } from 'lucide-react';

const BOOT_STEPS = [
  { text: '> Initializing Finance OS...', isHeader: true, delay: 150 },
  { text: '✓ Loading market intelligence', delay: 350 },
  { text: '✓ Connecting to portfolio engine', delay: 550 },
  { text: '✓ Initializing risk analytics', delay: 750 },
  { text: '✓ Loading VaR & CVaR models', delay: 950 },
  { text: '✓ Initializing Monte Carlo engine', delay: 1150 },
  { text: '✓ Loading strategy backtesting', delay: 1350 },
  { text: '✓ Connecting to market data', delay: 1550 },
  { text: '✓ System ready', delay: 1800, isDone: true },
];

export function BootSequence() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Schedule each log step
    const timers = BOOT_STEPS.map((step, index) => {
      return setTimeout(() => {
        setVisibleCount(index + 1);
      }, step.delay);
    });

    // Schedule fade-out after final step
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 2200);

    // Completely remove component from DOM after fade transition completes
    const dismissTimer = setTimeout(() => {
      setIsDismissed(true);
    }, 2600);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  if (isDismissed) return null;

  const progressPercent = Math.min(100, Math.round((visibleCount / BOOT_STEPS.length) * 100));

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#080b10] terminal-grid px-4 transition-opacity duration-400 ease-out select-none ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Container Box */}
      <div className="w-full max-w-lg bg-[#0d121c]/90 border border-slate-800/90 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Top Terminal Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a0e17] border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block" />
            <span className="ml-2 text-[11px] font-mono text-slate-400 tracking-wider">
              FINANCE-OS // SYSTEM BOOT
            </span>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-400/80" />
        </div>

        {/* System Header Info */}
        <div className="p-5 pb-3 border-b border-slate-800/50">
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold font-mono tracking-wider text-slate-100 uppercase">
                FINANCE OS
              </h1>
              <p className="text-xs text-slate-400 font-sans tracking-wide">
                Financial Intelligence &amp; Risk Analytics Platform
              </p>
            </div>
          </div>
        </div>

        {/* Log Lines Area */}
        <div className="p-5 min-h-[220px] font-mono text-xs space-y-2 text-slate-300">
          {BOOT_STEPS.slice(0, visibleCount).map((step, idx) => {
            const isLatest = idx === visibleCount - 1;
            const isPrompt = step.isHeader;
            const isDone = step.isDone;

            return (
              <div
                key={idx}
                className="flex items-center space-x-2 animate-fadeIn transition-all duration-150"
              >
                <span
                  className={
                    isDone
                      ? 'text-emerald-400 font-bold'
                      : isPrompt
                      ? 'text-blue-400 font-bold'
                      : 'text-emerald-400/90 font-medium'
                  }
                >
                  {step.text}
                </span>

                {isLatest && !isDone && (
                  <span className="w-1.5 h-3.5 bg-blue-400 animate-pulse inline-block align-middle" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Progress Indicator */}
        <div className="w-full bg-[#0a0e17] px-5 py-2.5 border-t border-slate-800/60 flex items-center justify-between">
          <div className="w-full bg-slate-800/60 h-1.5 rounded-full overflow-hidden mr-4">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-slate-400 min-w-[36px] text-right">
            {progressPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
