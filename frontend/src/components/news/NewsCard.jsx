import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Minus, Clock, Zap } from 'lucide-react';

const SENTIMENT_CONFIG = {
  BULLISH: {
    label: 'Bullish',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    icon: TrendingUp,
  },
  BEARISH: {
    label: 'Bearish',
    bg: 'bg-rose-950/60',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
    icon: TrendingDown,
  },
  NEUTRAL: {
    label: 'Neutral',
    bg: 'bg-slate-800/60',
    border: 'border-slate-600/30',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
    icon: Minus,
  },
};

const IMPACT_CONFIG = {
  HIGH: { label: 'High Impact', bg: 'bg-amber-950/50', text: 'text-amber-400', border: 'border-amber-500/30' },
  MEDIUM: { label: 'Medium', bg: 'bg-blue-950/50', text: 'text-blue-400', border: 'border-blue-500/30' },
  LOW: { label: 'Low', bg: 'bg-slate-800/40', text: 'text-slate-500', border: 'border-slate-600/20' },
};

/**
 * Format relative time (e.g., "14 min ago", "2 hr ago")
 */
function timeAgo(isoDate) {
  if (!isoDate) return '—';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/**
 * Individual news article card
 */
export function NewsCard({ article, isHighlighted = false }) {
  const sentiment = article.sentiment || 'NEUTRAL';
  const impact = article.impact || 'LOW';
  const sentCfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.NEUTRAL;
  const impactCfg = IMPACT_CONFIG[impact] || IMPACT_CONFIG.LOW;
  const SentIcon = sentCfg.icon;

  return (
    <article
      className={`
        group relative flex flex-col gap-3 p-4 rounded-md border transition-all duration-200
        ${isHighlighted
          ? 'bg-[#0d1627]/80 border-blue-800/40 shadow-[0_0_20px_rgba(59,130,246,0.06)]'
          : 'bg-[#080d18]/70 border-[#15202e] hover:border-[#1e3048] hover:bg-[#0a1020]/90'
        }
      `}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0">
            {article.source}
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 shrink-0">
            <Clock className="w-3 h-3" />
            {timeAgo(article.publishedAt)}
          </span>
        </div>

        {/* Category + Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Impact Badge */}
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border uppercase ${impactCfg.bg} ${impactCfg.text} ${impactCfg.border}`}>
            {impact === 'HIGH' && <Zap className="w-2.5 h-2.5 inline mr-0.5" />}
            {impactCfg.label}
          </span>

          {/* Sentiment Badge */}
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border uppercase ${sentCfg.bg} ${sentCfg.text} ${sentCfg.border}`}>
            <SentIcon className="w-2.5 h-2.5" />
            {sentCfg.label}
          </span>
        </div>
      </div>

      {/* Headline */}
      <h3 className="text-sm font-semibold text-slate-100 leading-snug group-hover:text-white transition-colors line-clamp-2 font-sans">
        {article.title}
      </h3>

      {/* Summary */}
      {article.summary && (
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 font-sans">
          {article.summary}
        </p>
      )}

      {/* Footer: Tickers + Link */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Related Tickers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(article.relatedTickers || []).slice(0, 3).map((ticker) => (
            <span
              key={ticker}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-blue-300 bg-blue-950/40 border border-blue-800/30 tracking-wider"
            >
              {ticker}
            </span>
          ))}
          {(!article.relatedTickers || article.relatedTickers.length === 0) && (
            <span className="text-[10px] font-mono text-slate-600">General Market</span>
          )}
        </div>

        {/* External Link */}
        {article.url && article.url.startsWith('http') && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono text-blue-400/70 hover:text-blue-300 transition-colors shrink-0"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Sentiment Score Indicator Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-md overflow-hidden">
        <div
          className={`h-full transition-all ${sentCfg.dot}`}
          style={{ width: `${Math.round((article.sentimentScore || 0.5) * 100)}%`, opacity: 0.5 }}
        />
      </div>
    </article>
  );
}
