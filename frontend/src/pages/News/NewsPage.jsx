import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api.js';
import { NewsCard } from '../../components/news/NewsCard.jsx';
import { SentimentGauge } from '../../components/news/SentimentGauge.jsx';
import { TickerChip } from '../../components/news/TickerChip.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import {
  Newspaper, RefreshCw, Search, X, TrendingUp, TrendingDown, Minus,
  Zap, Radio, Brain, BarChart2, AlertTriangle,
} from 'lucide-react';

// ─── Category tab config ─────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'ALL', label: 'All News' },
  { id: 'MARKETS', label: 'Markets' },
  { id: 'EQUITIES', label: 'Equities' },
  { id: 'MACRO', label: 'Macro' },
  { id: 'ECONOMY', label: 'Economy' },
  { id: 'GLOBAL', label: 'Global' },
];

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div className="bg-[#080d18]/70 border border-[#15202e] rounded-md p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-2.5 w-32 bg-slate-800 rounded" />
        <div className="h-4 w-24 bg-slate-800 rounded" />
      </div>
      <div className="h-4 w-full bg-slate-800 rounded" />
      <div className="h-4 w-4/5 bg-slate-800 rounded" />
      <div className="h-3 w-3/4 bg-slate-800/60 rounded" />
      <div className="h-3 w-2/3 bg-slate-800/60 rounded" />
      <div className="flex gap-2">
        <div className="h-4 w-16 bg-slate-800/40 rounded" />
        <div className="h-4 w-16 bg-slate-800/40 rounded" />
      </div>
    </div>
  );
}

// ─── Sidebar components ───────────────────────────────────────────────────────

function SentimentPanel({ sentimentData, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-24 w-full bg-slate-800/40 rounded-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-3 bg-slate-800/40 rounded" />)}
        </div>
      </div>
    );
  }

  const { bullishPct = 33, neutralPct = 34, bearishPct = 33, score = 0.5 } = sentimentData || {};

  return (
    <div className="space-y-4">
      <SentimentGauge
        bullishPct={bullishPct}
        neutralPct={neutralPct}
        bearishPct={bearishPct}
        score={score}
        size={160}
      />
      {/* Breakdown bars */}
      <div className="space-y-2">
        {[
          { label: 'Bullish', pct: bullishPct, color: 'bg-emerald-500', text: 'text-emerald-400' },
          { label: 'Neutral', pct: neutralPct, color: 'bg-slate-500', text: 'text-slate-400' },
          { label: 'Bearish', pct: bearishPct, color: 'bg-rose-500', text: 'text-rose-400' },
        ].map(({ label, pct, color, text }) => (
          <div key={label} className="flex items-center gap-2 text-[11px] font-mono">
            <span className={`w-14 shrink-0 ${text}`}>{label}</span>
            <div className="flex-1 bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full ${color} transition-all duration-700 rounded-full`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`w-8 text-right ${text}`}>{pct}%</span>
          </div>
        ))}
      </div>
      <div className="text-center">
        <span className="text-[10px] font-mono text-slate-500">
          Based on {sentimentData?.totalArticles || 0} articles · Rule-based NLP
        </span>
      </div>
    </div>
  );
}

function TrendingTickersPanel({ tickers = [], onTickerClick }) {
  if (!tickers || tickers.length === 0) {
    return <p className="text-[11px] text-slate-500 font-mono">No trending tickers yet</p>;
  }

  const maxMentions = tickers[0]?.mentions || 1;

  return (
    <div className="space-y-2">
      {tickers.slice(0, 8).map(({ symbol, mentions }, idx) => (
        <button
          key={symbol}
          onClick={() => onTickerClick(symbol)}
          className="w-full flex items-center gap-2 p-2 rounded hover:bg-[#0e1a2e] transition-colors group text-left"
        >
          <span className="text-[10px] font-mono text-slate-600 w-4">#{idx + 1}</span>
          <span className="font-mono font-bold text-xs text-blue-300 group-hover:text-blue-200 w-24 shrink-0">
            {symbol}
          </span>
          <div className="flex-1 bg-slate-800/40 rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-blue-600/60 rounded-full transition-all duration-500"
              style={{ width: `${(mentions / maxMentions) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{mentions}×</span>
        </button>
      ))}
    </div>
  );
}

function HighImpactPanel({ articles = [] }) {
  if (!articles || articles.length === 0) {
    return <p className="text-[11px] text-slate-500 font-mono">No high-impact alerts</p>;
  }

  return (
    <div className="space-y-2">
      {articles.slice(0, 5).map((article) => {
        const sentColor = article.sentiment === 'BULLISH'
          ? 'text-emerald-400'
          : article.sentiment === 'BEARISH'
            ? 'text-rose-400'
            : 'text-slate-400';
        return (
          <div key={article.id} className="flex items-start gap-2 p-2 rounded bg-[#080d18]/60 border border-[#13203a]">
            <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-200 font-sans leading-snug line-clamp-2">
                {article.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-mono font-bold ${sentColor}`}>
                  {article.sentiment}
                </span>
                <span className="text-[10px] text-slate-600">
                  {article.source}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main News Page ───────────────────────────────────────────────────────────

export function NewsPage() {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [tickerFilter, setTickerFilter] = useState('');
  const [tickerInput, setTickerInput] = useState('');
  const [page, setPage] = useState(1);

  // News feed query
  const {
    data: newsResponse,
    isLoading: newsLoading,
    isFetching: newsFetching,
    refetch: refetchNews,
  } = useQuery({
    queryKey: ['news', activeCategory, tickerFilter, page],
    queryFn: () => api.getNews({
      category: activeCategory,
      ...(tickerFilter ? { ticker: tickerFilter } : {}),
      limit: 25,
      page,
    }),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 4 * 60 * 1000,
  });

  // Market sentiment query
  const { data: sentimentResponse, isLoading: sentimentLoading } = useQuery({
    queryKey: ['news-sentiment'],
    queryFn: () => api.getNewsSentiment(),
    refetchInterval: 3 * 60 * 1000,
    staleTime: 2.5 * 60 * 1000,
  });

  const articles = newsResponse?.data?.articles || [];
  const total = newsResponse?.data?.total || 0;
  const dataSource = newsResponse?.data?.dataSource || newsResponse?.meta?.dataSource || 'MOCK';
  const sentimentData = sentimentResponse?.data;
  const trendingTickers = sentimentData?.trendingTickers || [];
  const highImpactArticles = sentimentData?.highImpactArticles || [];

  const handleCategoryChange = useCallback((cat) => {
    setActiveCategory(cat);
    setPage(1);
  }, []);

  const handleTickerFilter = useCallback((ticker) => {
    setTickerFilter(ticker);
    setTickerInput(ticker);
    setPage(1);
  }, []);

  const clearTickerFilter = useCallback(() => {
    setTickerFilter('');
    setTickerInput('');
    setPage(1);
  }, []);

  const handleTickerInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const val = tickerInput.trim().toUpperCase();
      if (val) handleTickerFilter(val);
      else clearTickerFilter();
    }
    if (e.key === 'Escape') clearTickerFilter();
  };

  // Map dataSource to DataStatusBadge format
  const badgeStatus = dataSource === 'RSS_LIVE' ? 'LIVE' : dataSource === 'CACHED' ? 'STALE' : 'SIMULATED';
  const badgeSource = dataSource === 'RSS_LIVE' ? 'RSS Feeds' : dataSource === 'CACHED' ? 'cached' : 'mock';

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#172033]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              Financial News Intelligence
            </h1>
            <Badge variant="info" size="xs">LIVE FEEDS</Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time market wire feeds with rule-based NLP sentiment scoring
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <DataStatusBadge status={badgeStatus} source={badgeSource} />
          <button
            onClick={() => { refetchNews(); }}
            disabled={newsFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-slate-300 hover:text-white bg-[#0e1a2e] border border-[#1e3048] hover:border-[#2a4060] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${newsFetching ? 'animate-spin' : ''}`} />
            {newsFetching ? 'Refreshing...' : 'Refresh Feed'}
          </button>
        </div>
      </div>

      {/* Sentiment Command Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Market Sentiment',
            value: sentimentData?.overallSentiment || '—',
            subvalue: sentimentData ? `Score: ${(sentimentData.score * 100).toFixed(0)}/100` : '—',
            icon: BarChart2,
            color: sentimentData?.overallSentiment === 'BULLISH'
              ? 'text-emerald-400'
              : sentimentData?.overallSentiment === 'BEARISH'
                ? 'text-rose-400'
                : 'text-slate-400',
          },
          {
            label: 'Articles Analyzed',
            value: sentimentData?.totalArticles || '—',
            subvalue: 'Today\'s feed',
            icon: Newspaper,
            color: 'text-blue-400',
          },
          {
            label: 'High Impact',
            value: highImpactArticles.length || '—',
            subvalue: 'Active alerts',
            icon: Zap,
            color: 'text-amber-400',
          },
          {
            label: 'Data Source',
            value: dataSource === 'RSS_LIVE' ? 'LIVE RSS' : dataSource === 'CACHED' ? 'CACHED' : 'SIMULATED',
            subvalue: `${newsResponse?.data?.articles?.length || 0} articles loaded`,
            icon: Radio,
            color: dataSource === 'RSS_LIVE' ? 'text-emerald-400' : 'text-slate-400',
          },
        ].map(({ label, value, subvalue, icon: Icon, color }) => (
          <div key={label} className="bg-[#080d18]/70 border border-[#15202e] rounded-md p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-base font-mono font-bold ${color}`}>{value}</div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">{subvalue}</div>
          </div>
        ))}
      </div>

      {/* Main Content: Feed + Sidebar */}
      <div className="flex gap-5 items-start">
        {/* ── Left: News Feed (65%) ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Category Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`
                    px-3 py-1 rounded text-[11px] font-mono font-bold tracking-wider transition-all
                    ${activeCategory === cat.id
                      ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300'
                      : 'bg-[#0a1020] border border-[#16243a] text-slate-500 hover:text-slate-300 hover:border-[#1e3048]'
                    }
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Ticker Search */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={handleTickerInputKeyDown}
                  placeholder="Filter by ticker…"
                  className="pl-7 pr-7 py-1.5 bg-[#080d18] border border-[#16243a] rounded text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-600/50 w-40"
                />
                {tickerInput && (
                  <button
                    onClick={clearTickerFilter}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Indicator */}
          {tickerFilter && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">Filtered by ticker:</span>
              <TickerChip symbol={tickerFilter} onClick={clearTickerFilter} />
              <span className="text-slate-600 text-[10px]">(Click to clear)</span>
            </div>
          )}

          {/* Article Feed */}
          <div className="space-y-3">
            {newsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <ArticleSkeleton key={i} />)
            ) : articles.length === 0 ? (
              <div className="bg-[#080d18]/70 border border-[#15202e] rounded-md p-8 text-center">
                <Newspaper className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-mono text-slate-500">
                  {tickerFilter
                    ? `No articles found mentioning ${tickerFilter}`
                    : 'No articles available in this category'
                  }
                </p>
                {tickerFilter && (
                  <button onClick={clearTickerFilter} className="mt-3 text-xs font-mono text-blue-400 hover:text-blue-300">
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
              articles.map((article, idx) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  isHighlighted={idx === 0 && article.impact === 'HIGH'}
                />
              ))
            )}

            {/* Pagination / Load More */}
            {!newsLoading && articles.length > 0 && total > page * 25 && (
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={newsFetching}
                className="w-full py-2.5 text-xs font-mono text-slate-400 hover:text-white bg-[#080d18] border border-[#15202e] hover:border-[#1e3048] rounded-md transition-all disabled:opacity-50"
              >
                {newsFetching ? 'Loading…' : `Load More Articles (${total - page * 25} remaining)`}
              </button>
            )}

            {/* Data Source Notice */}
            {!newsLoading && articles.length > 0 && (
              <div className="text-center py-2">
                <span className="text-[10px] font-mono text-slate-600">
                  {dataSource === 'MOCK'
                    ? '⚠ Displaying simulated news — RSS feeds temporarily unavailable'
                    : `✓ Live RSS feed · Sentiment: Rule-based NLP · ${articles.length} articles`
                  }
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Intelligence Sidebar (35%) ── */}
        <div className="w-72 shrink-0 space-y-4 hidden lg:block">
          {/* Sentiment Gauge Panel */}
          <div className="bg-[#080d18]/70 border border-[#15202e] rounded-md p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Market Sentiment
              </h3>
            </div>
            <SentimentPanel sentimentData={sentimentData} isLoading={sentimentLoading} />
          </div>

          {/* Trending Tickers */}
          <div className="bg-[#080d18]/70 border border-[#15202e] rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Trending Tickers
              </h3>
            </div>
            <TrendingTickersPanel
              tickers={trendingTickers}
              onTickerClick={handleTickerFilter}
            />
          </div>

          {/* High Impact Alerts */}
          <div className="bg-[#080d18]/70 border border-[#15202e] rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                High Impact Alerts
              </h3>
            </div>
            <HighImpactPanel articles={highImpactArticles} />
          </div>

          {/* NLP Engine Status */}
          <div className="bg-[#080d18]/70 border border-[#15202e] rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Intelligence Engine
              </h3>
            </div>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sentiment NLP</span>
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">AI Enrichment</span>
                <span className="text-slate-500">DISABLED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Method</span>
                <span className="text-blue-400">Rule-based</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lexicon Terms</span>
                <span className="text-slate-300">300+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ticker Dict.</span>
                <span className="text-slate-300">200+ symbols</span>
              </div>
              <div className="mt-2 pt-2 border-t border-[#15202e] text-[10px] text-slate-600 leading-relaxed">
                Sentiment scored locally. No user data or portfolio details sent externally.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
