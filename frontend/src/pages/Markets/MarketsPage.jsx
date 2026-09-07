import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { MarketOverviewGrid } from '../../components/finance/MarketOverviewGrid.jsx';
import { TopMovers } from '../../components/finance/TopMovers.jsx';
import { api } from '../../services/api.js';
import { FRONTEND_SECURITY_UNIVERSE, searchFrontendSecurities } from '../../data/securityUniverse.js';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import { TrendingUp, TrendingDown, Search, BarChart2, Layers, Filter } from 'lucide-react';

export function MarketsPage() {
  const navigate = useNavigate();
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('HDFCBANK');

  const { data: quoteRes, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', selectedSymbol],
    queryFn: () => api.getQuote(selectedSymbol, 'NSE'),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const quote = quoteRes?.data || null;

  const sectors = ['ALL', 'Financials', 'Technology', 'Automotive', 'Energy', 'Healthcare', 'FMCG', 'Metals', 'Industrials'];

  const filteredSecurities = FRONTEND_SECURITY_UNIVERSE.filter((s) => {
    const matchesSector = selectedSector === 'ALL' || s.sector === selectedSector;
    const matchesQuery =
      !searchQuery ||
      s.symbol.toUpperCase().includes(searchQuery.toUpperCase()) ||
      s.name.toUpperCase().includes(searchQuery.toUpperCase());
    return matchesSector && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#182030]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              MARKET INTELLIGENCE DESK
            </h1>
            <Badge variant="live" size="xs">
              LIVE TELEMETRY
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time equity quotes, sector depth, and 100+ Indian security universe search
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="xs">
            {FRONTEND_SECURITY_UNIVERSE.length} SECURITIES INDEXED
          </Badge>
        </div>
      </div>

      {/* Global Indices Banner */}
      <MarketOverviewGrid />

      {/* Main Market Intelligence Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Security Master Directory & Sector Filter */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Equity Security Master & Sector Filter"
            subtitle="Search 100+ Indian stocks across NSE/BSE"
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter stocks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-[#080d18] border border-[#16243a] rounded text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500 w-44"
                  />
                </div>
              </div>
            }
          >
            {/* Sector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#182030] scrollbar-none font-mono text-[11px]">
              {sectors.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec)}
                  className={`px-2.5 py-1 rounded-sm uppercase tracking-wider shrink-0 transition-colors ${
                    selectedSector === sec
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 bg-[#0c1017]'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            {/* Securities Directory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3 max-h-[420px] overflow-y-auto font-mono text-xs pr-1">
              {filteredSecurities.map((sec) => (
                <div
                  key={sec.symbol}
                  onClick={() => {
                    setSelectedSymbol(sec.symbol);
                    navigate(`/markets/${encodeURIComponent(sec.symbol)}`);
                  }}
                  className={`p-2.5 rounded-sm border cursor-pointer transition-colors flex flex-col justify-between ${
                    selectedSymbol === sec.symbol
                      ? 'bg-[#141d2d] border-emerald-500/60 text-white'
                      : 'bg-[#0c1017] border-[#182030] hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{sec.symbol}</span>
                    <span className="text-[9px] text-slate-400 px-1 bg-[#141c2b] border border-[#1e2a40] rounded-sm">
                      {sec.exchange}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-1">{sec.name}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1 border-t border-[#141b28]">
                    <span>{sec.sector}</span>
                    <span className="text-emerald-400 font-bold">INSPECT & TRADE →</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Movers Component */}
          <TopMovers />
        </div>

        {/* Right Column: Detailed Security Telemetry Inspector */}
        <div className="lg:col-span-1 space-y-4 font-mono">
          <Card
            title={`Instrument Telemetry: ${selectedSymbol}`}
            subtitle="Live Quote & Order Depth"
            action={<DataStatusBadge status={quote?.dataStatus || 'HISTORICAL'} source={quote?.dataSource || 'yahoo'} />}
          >
            <div className="space-y-4 text-xs">
              {/* Primary Quote Display */}
              <div className="p-4 bg-[#080c14] border border-[#182030] rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase text-[10px]">LAST TRADED PRICE (LTP)</span>
                  <Badge variant="live" size="xs">
                    {quote?.exchange || 'NSE'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {quote?.price !== null && quote?.price !== undefined ? formatCurrency(quote.price) : '—'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center font-bold ${
                      (quote?.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(quote?.change || 0) >= 0 ? '+' : ''}
                    {quote?.change !== null && quote?.change !== undefined ? formatCurrency(quote.change) : '—'} ({quote?.changePercent !== null && quote?.changePercent !== undefined ? formatPercent(quote.changePercent) : '—'})
                  </span>
                </div>
              </div>

              {/* OHLC Matrix */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-[#0c1017] border border-[#182030] rounded-sm">
                  <div className="text-slate-500 text-[10px]">OPEN</div>
                  <div className="text-slate-200 font-bold mt-0.5">{quote?.open !== null && quote?.open !== undefined ? formatCurrency(quote.open) : '—'}</div>
                </div>
                <div className="p-2.5 bg-[#0c1017] border border-[#182030] rounded-sm">
                  <div className="text-slate-500 text-[10px]">PREV CLOSE</div>
                  <div className="text-slate-200 font-bold mt-0.5">{quote?.previousClose !== null && quote?.previousClose !== undefined ? formatCurrency(quote.previousClose) : '—'}</div>
                </div>
                <div className="p-2.5 bg-[#0c1017] border border-[#182030] rounded-sm">
                  <div className="text-slate-500 text-[10px]">DAY HIGH</div>
                  <div className="text-emerald-400 font-bold mt-0.5">{quote?.high !== null && quote?.high !== undefined ? formatCurrency(quote.high) : '—'}</div>
                </div>
                <div className="p-2.5 bg-[#0c1017] border border-[#182030] rounded-sm">
                  <div className="text-slate-500 text-[10px]">DAY LOW</div>
                  <div className="text-rose-400 font-bold mt-0.5">{quote?.low !== null && quote?.low !== undefined ? formatCurrency(quote.low) : '—'}</div>
                </div>
              </div>

              {/* Key Instrument Metadata */}
              <div className="p-3 bg-[#0c1017] border border-[#182030] rounded-sm space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sector</span>
                  <span className="text-slate-200">{quote?.sector || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Volume</span>
                  <span className="text-slate-200">{quote?.volume ? Number(quote.volume).toLocaleString('en-IN') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Asset Class</span>
                  <span className="text-slate-200">EQUITY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Currency</span>
                  <span className="text-slate-200">INR (₹)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
