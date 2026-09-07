import React from 'react';

/**
 * Compact ticker badge chip with hover tooltip showing full company name
 */
export function TickerChip({ symbol, mentions = null, onClick = null }) {
  return (
    <button
      onClick={onClick}
      title={`Filter by ${symbol}`}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider
        border border-blue-800/40 bg-blue-950/30 text-blue-300
        hover:bg-blue-900/40 hover:border-blue-600/50 hover:text-blue-200
        transition-all duration-150 cursor-pointer
      `}
    >
      {symbol}
      {mentions !== null && (
        <span className="text-[9px] text-blue-400/60 font-normal">
          ×{mentions}
        </span>
      )}
    </button>
  );
}
