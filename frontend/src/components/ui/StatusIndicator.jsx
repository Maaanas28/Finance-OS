import React from 'react';

export function StatusIndicator({
  status = 'active', // 'active' | 'closed' | 'warning' | 'offline'
  label,
  pulse = true,
  className = '',
}) {
  const configs = {
    active: {
      dot: 'bg-emerald-500',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.7)]',
      text: 'text-emerald-400',
      defaultLabel: 'Live Stream Active',
    },
    closed: {
      dot: 'bg-slate-400',
      glow: '',
      text: 'text-slate-400',
      defaultLabel: 'Market Closed',
    },
    warning: {
      dot: 'bg-amber-500',
      glow: 'shadow-[0_0_8px_rgba(245,158,11,0.7)]',
      text: 'text-amber-400',
      defaultLabel: 'Elevated Latency',
    },
    offline: {
      dot: 'bg-rose-500',
      glow: 'shadow-[0_0_8px_rgba(244,63,94,0.7)]',
      text: 'text-rose-400',
      defaultLabel: 'Offline',
    },
  };

  const current = configs[status] || configs.active;

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider ${className}`}>
      <span className="relative flex h-2 w-2">
        {pulse && status === 'active' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot} ${current.glow}`} />
      </span>
      <span className={current.text}>{label || current.defaultLabel}</span>
    </div>
  );
}
