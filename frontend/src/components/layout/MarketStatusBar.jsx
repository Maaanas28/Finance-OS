import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatusIndicator } from '../ui/StatusIndicator.jsx';
import { DataStatusBadge } from '../ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatNumber, formatPercent } from '../../utils/formatters.js';

export function MarketStatusBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Query market venue status (refetched every 5s)
  const { data: statusRes } = useQuery({
    queryKey: ['marketStatus'],
    queryFn: () => api.getMarketStatus(),
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Query ticker quotes (refetched every 3s for live terminal tick action)
  const { data: quotesRes } = useQuery({
    queryKey: ['marketQuotesStrip'],
    queryFn: () => api.getQuotes(['NIFTY 50', 'SENSEX', 'S&P 500', 'NASDAQ', 'USD/INR', 'GOLD']),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const quotes = quotesRes?.data && Array.isArray(quotesRes.data) ? quotesRes.data : [];

  const nseStatus = statusRes?.data?.venues?.NSE?.status === 'OPEN' ? 'active' : 'closed';
  const nseLabel = statusRes?.data?.venues?.NSE?.status === 'OPEN' ? 'NSE / BSE Open' : 'NSE / BSE Closed';

  const overallStatus = quotes[0]?.dataStatus || 'SIMULATED';
  const overallSource = quotes[0]?.dataSource || 'mock';

  return (
    <header className="h-8 bg-[#06090e] border-b border-[#141b2a] px-3 flex items-center justify-between text-xs font-mono text-slate-300 select-none z-30">
      {/* Market Status & Clock */}
      <div className="flex items-center gap-4 shrink-0">
        <StatusIndicator
          status={nseStatus}
          label={nseLabel}
          pulse={nseStatus === 'active'}
        />
        <span className="hidden sm:inline-block text-slate-500">|</span>
        <span className="hidden sm:inline-block text-slate-400 tabular-nums">
          IST {formattedTime}
        </span>
      </div>

      {/* Mini Ticker Ribbon */}
      <div className="hidden md:flex items-center gap-5 overflow-x-hidden text-[11px] tabular-nums">
        {quotes.slice(0, 5).map((item) => {
          const isGain = (item.change || 0) >= 0;
          return (
            <div key={item.symbol} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-semibold text-slate-400">{item.symbol}</span>
              <span className="text-slate-200 font-mono font-medium">
                {item.price !== null ? formatNumber(item.price) : '—'}
              </span>
              <span className={`text-[10px] font-medium ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                {item.changePercent !== null ? formatPercent(item.changePercent) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live Data Freshness Badge */}
      <div className="flex items-center gap-2">
        <DataStatusBadge status={overallStatus} source={overallSource} />
      </div>
    </header>
  );
}
