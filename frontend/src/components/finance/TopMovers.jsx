import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card.jsx';
import { Tabs } from '../ui/Tabs.jsx';
import { DataStatusBadge } from '../ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export function TopMovers() {
  const [tab, setTab] = useState('gainers');

  const { data: res, isLoading } = useQuery({
    queryKey: ['marketMovers'],
    queryFn: () => api.getTopMovers(),
    refetchInterval: 5000,
    staleTime: 0,
  });

  const moversData = res?.data || null;
  const items = moversData?.[tab] || [];
  const currentStatus = moversData?.dataStatus || 'HISTORICAL';
  const currentSource = moversData?.dataSource || 'yahoo';

  return (
    <Card
      title="Market Movers"
      subtitle="Institutional volume leaders & price action"
      action={
        <div className="flex items-center gap-2">
          {moversData && <DataStatusBadge status={currentStatus} source={currentSource} />}
          <Tabs
            tabs={[
              { id: 'gainers', label: 'Top Gainers' },
              { id: 'losers', label: 'Top Losers' },
            ]}
            activeTab={tab}
            onChange={setTab}
          />
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="py-12 px-4 text-center font-mono text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-slate-500" />
          <span>{isLoading ? 'Fetching live market movers...' : 'MARKET DATA UNAVAILABLE'}</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#172033] text-slate-400 text-[11px] uppercase">
                <th className="py-2 px-1">Instrument</th>
                <th className="py-2 px-2 text-right">LTP</th>
                <th className="py-2 px-2 text-right">Change</th>
                <th className="py-2 px-2 text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131b2c]">
              {items.map((stock) => {
                const isGain = (stock.change || 0) >= 0;
                return (
                  <tr key={stock.symbol} className="hover:bg-[#131d2e] transition-colors">
                    <td className="py-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${isGain ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'}`}>
                          {isGain ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200">{stock.symbol}</div>
                          <div className="text-[10px] text-slate-400">{stock.sector || stock.exchange || 'EQUITY'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-slate-200 tabular-nums">
                      {stock.price !== null ? formatCurrency(stock.price) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      <span className={`inline-block font-semibold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.changePercent !== null ? formatPercent(stock.changePercent) : '—'}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {stock.change !== null && stock.change !== undefined ? `${isGain ? '+' : ''}${Number(stock.change).toFixed(2)}` : ''}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-400 tabular-nums">
                      {stock.volume || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
