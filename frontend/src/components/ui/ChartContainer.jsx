import React from 'react';
import { Tabs } from './Tabs.jsx';

export function ChartContainer({
  title,
  subtitle,
  timeframe,
  onTimeframeChange,
  timeframeOptions = [
    { id: '1D', label: '1D' },
    { id: '1W', label: '1W' },
    { id: '1M', label: '1M' },
    { id: '1Y', label: '1Y' },
    { id: 'ALL', label: 'ALL' },
  ],
  action,
  children,
  className = '',
}) {
  return (
    <div className={`bg-[#0d131f] border border-[#1b253b] rounded-md overflow-hidden flex flex-col ${className}`}>
      {/* Chart Header */}
      <div className="px-4 py-3 border-b border-[#172033] flex flex-wrap items-center justify-between gap-3 bg-[#0a0f18]/60">
        <div>
          {title && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              {title}
            </h3>
          )}
          {subtitle && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {timeframe && onTimeframeChange && (
            <Tabs
              tabs={timeframeOptions}
              activeTab={timeframe}
              onChange={onTimeframeChange}
            />
          )}
          {action}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="p-4 flex-1 relative min-h-[300px]">
        {children}
      </div>
    </div>
  );
}
