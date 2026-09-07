import React from 'react';

export function DataStatusBadge({ status = 'SIMULATED', source, className = '' }) {
  const configs = {
    LIVE: {
      label: 'LIVE',
      icon: '●',
      classes: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
      dotClass: 'bg-emerald-400 animate-ping',
    },
    DELAYED: {
      label: 'DELAYED',
      icon: '◷',
      classes: 'bg-blue-950/80 text-blue-400 border-blue-500/40',
    },
    EOD: {
      label: 'EOD',
      icon: '◷',
      classes: 'bg-[#152238] text-sky-400 border-sky-600/30',
    },
    HISTORICAL: {
      label: 'HISTORICAL',
      icon: '◷',
      classes: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    },
    SIMULATED: {
      label: 'SIMULATED',
      icon: '◇',
      classes: 'bg-amber-950/80 text-amber-400 border-amber-500/40',
    },
    STALE: {
      label: 'STALE SNAPSHOT',
      icon: '⚠',
      classes: 'bg-rose-950/80 text-rose-400 border-rose-500/40 animate-pulse',
    },
    UNAVAILABLE: {
      label: 'UNAVAILABLE',
      icon: '✕',
      classes: 'bg-red-950/80 text-red-400 border-red-500/40',
    },
  };

  const current = configs[status.toUpperCase()] || configs.SIMULATED;

  return (
    <span
      title={source ? `Source: ${source.toUpperCase()} | Status: ${current.label}` : `Status: ${current.label}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border select-none font-bold ${current.classes} ${className}`}
    >
      <span className="text-[9px]">{current.icon}</span>
      <span>{current.label}</span>
      {source && (
        <span className="text-[9px] opacity-80 border-l border-current/30 pl-1 ml-0.5 font-normal">
          {source}
        </span>
      )}
    </span>
  );
}
