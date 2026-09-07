import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Sparkles, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { api } from '../../services/api.js';

export function FinanceIntelligence() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['dashboardAIInsight'],
    queryFn: () => api.getAIInsight(),
    staleTime: 60000,
  });

  const insight = res?.data || null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#0d1627] via-[#0f1a30] to-[#0a1120] border border-blue-900/40 rounded-md p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] font-mono">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold tracking-wider text-white uppercase flex items-center gap-2">
                Finance Intelligence
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              </h3>
              <Badge variant="purple" size="xs">
                GROK AI
              </Badge>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Autonomous quantitative portfolio insight & vulnerability detection
            </p>
          </div>
        </div>

        <Badge variant={insight ? 'live' : 'neutral'} size="xs" dot>
          {isLoading ? 'ANALYZING...' : insight ? 'LIVE AI TELEMETRY' : 'OFFLINE'}
        </Badge>
      </div>

      {/* Core Intelligence Finding */}
      <div className="bg-[#080d18]/90 border border-[#1a2742] rounded p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-1 rounded bg-blue-950/60 text-blue-400 mt-0.5 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wide">
              {isLoading ? 'Computing Portfolio Assessment...' : insight?.headline || 'Portfolio Assessment Ready'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {isLoading
                ? 'Gathering factor exposure and portfolio valuation metrics...'
                : insight?.analysis || insight?.summary || 'No active capital detected. Deposit cash or execute a trade to initiate real-time AI risk tracking.'}
            </p>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      {insight?.actionableRecommendations?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          {insight.actionableRecommendations.slice(0, 3).map((rec, idx) => (
            <div key={idx} className="p-2.5 rounded bg-[#090f1d] border border-[#16223b] flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span className="text-slate-300">{rec}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-[#090f1d] border border-[#16223b] flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-slate-300">Maintain zero-risk stance or deposit capital for equity growth.</span>
          </div>
          <div className="p-2.5 rounded bg-[#090f1d] border border-[#16223b] flex items-start gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span className="text-slate-300">Explore NIFTY 50 benchmark indexes on the Markets desk.</span>
          </div>
          <div className="p-2.5 rounded bg-[#090f1d] border border-[#16223b] flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            <span className="text-slate-300">Parametric VaR and sector concentration risks are zero.</span>
          </div>
        </div>
      )}
    </div>
  );
}
