import React from 'react';

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) {
  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 font-medium tracking-wider',
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantStyles = {
    neutral: 'bg-[#141b27] text-slate-300 border border-[#1e293b]',
    gain: 'bg-[#062419] text-emerald-400 border border-[#0d5c3a]',
    loss: 'bg-[#2a0e14] text-rose-400 border border-[#6b1d28]',
    warn: 'bg-[#291a03] text-amber-400 border border-[#6e4606]',
    info: 'bg-[#091b2e] text-sky-400 border border-[#144368]',
    purple: 'bg-[#1d122b] text-purple-300 border border-[#432766]',
    
    // Explicit Data Status Variants
    live: 'bg-[#052e16] text-emerald-400 border border-[#10b981]/40 font-mono font-bold',
    historical: 'bg-[#0f172a] text-slate-300 border border-[#334155] font-mono',
    cached: 'bg-[#082f49] text-sky-300 border border-[#0284c7]/40 font-mono',
    simulated: 'bg-[#451a03] text-amber-400 border border-[#f59e0b]/40 font-mono font-bold',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    gain: 'bg-emerald-400',
    loss: 'bg-rose-400',
    warn: 'bg-amber-400',
    info: 'bg-sky-400',
    purple: 'bg-purple-400',
    live: 'bg-emerald-400 animate-pulse',
    historical: 'bg-slate-400',
    cached: 'bg-sky-400',
    simulated: 'bg-amber-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm uppercase tracking-wide font-mono ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
