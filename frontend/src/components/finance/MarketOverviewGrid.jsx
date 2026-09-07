import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card.jsx';
import { DataStatusBadge } from '../ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatNumber, formatPercent } from '../../utils/formatters.js';

const BENCHMARK_PLACEHOLDERS = [
  { symbol: 'NIFTY 50', price: null, change: null, changePercent: null, exchange: 'NSE', dataStatus: 'HISTORICAL', dataSource: 'yahoo' },
  { symbol: 'SENSEX', price: null, change: null, changePercent: null, exchange: 'BSE', dataStatus: 'HISTORICAL', dataSource: 'yahoo' },
  { symbol: 'S&P 500', price: null, change: null, changePercent: null, exchange: 'INDEX', dataStatus: 'HISTORICAL', dataSource: 'yahoo' },
  { symbol: 'NASDAQ', price: null, change: null, changePercent: null, exchange: 'INDEX', dataStatus: 'HISTORICAL', dataSource: 'yahoo' },
  { symbol: 'USD/INR', price: null, change: null, changePercent: null, exchange: 'FX', dataStatus: 'HISTORICAL', dataSource: 'yahoo' },
  { symbol: 'GOLD', price: null, change: null, changePercent: null, exchange: 'COMMODITY', dataStatus: 'HISTORICAL', dataSource: 'yahoo' },
];

export function MarketOverviewGrid() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['marketOverviewGrid'],
    queryFn: () => api.getQuotes(['NIFTY 50', 'SENSEX', 'S&P 500', 'NASDAQ', 'USD/INR', 'GOLD']),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const liveItems = res?.data && Array.isArray(res.data) && res.data.length > 0 ? res.data : null;
  const items = liveItems || BENCHMARK_PLACEHOLDERS;

  // Only read status from real API data, not from placeholder defaults
  const currentStatus = liveItems?.[0]?.dataStatus || (isLoading ? 'HISTORICAL' : 'HISTORICAL');
  const currentSource = liveItems?.[0]?.dataSource || 'yahoo';

  return (
    <Card
      title="Global Benchmark & Currency Watch"
      subtitle="Macro indexes, exchange rates and commodities"
      action={<DataStatusBadge status={currentStatus} source={currentSource} />}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => {
          const isGain = (item.change || 0) >= 0;
          return (
            <div
              key={item.symbol}
              className="p-2.5 bg-[#090e17] border border-[#172033] hover:border-[#223352] rounded transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold font-mono text-slate-200 truncate">
                  {item.symbol}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.exchange || item.market || 'INDEX'}
                </span>
              </div>

              <div className="text-sm font-bold font-mono text-white tabular-nums my-0.5">
                {item.price !== null && item.price !== undefined ? formatNumber(item.price) : '—'}
              </div>

              <div className="flex items-center justify-between gap-1 text-[11px] font-mono tabular-nums pt-1 border-t border-[#131b2c]">
                <span className={isGain ? 'text-emerald-400' : 'text-rose-400'}>
                  {item.changePercent !== null && item.changePercent !== undefined ? formatPercent(item.changePercent) : '—'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {item.change !== null && item.change !== undefined ? `${isGain ? '+' : ''}${item.change}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
