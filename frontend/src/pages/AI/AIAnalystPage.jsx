import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataStatusBadge } from '../../components/ui/DataStatusBadge.jsx';
import { api } from '../../services/api.js';
import { Bot, Send, Sparkles, ShieldAlert, CheckCircle2, RefreshCw, Cpu, Brain, Zap, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';

export function AIAnalystPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Finance OS AI Financial Analyst powered by Grok. Ask me anything about your portfolio — risk decomposition, factor exposure, stress tests, or stock-specific questions.',
      takeaways: [],
      confidence: null,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isQuerying, setIsQuerying] = useState(false);

  const { data: insightRes, isLoading: insightLoading, refetch: refetchInsight } = useQuery({
    queryKey: ['aiInsight'],
    queryFn: () => api.getAIInsight(),
    staleTime: 60000,
  });

  const { data: riskRes, isLoading: riskLoading } = useQuery({
    queryKey: ['aiRiskAnalysis'],
    queryFn: () => api.getAIRiskAnalysis(),
    staleTime: 60000,
  });

  const insight = insightRes?.data;
  const risk = riskRes?.data;
  const rawProvider = insightRes?.meta?.provider || insight?.provider || 'Grok';
  const isLive = insightRes?.meta?.isLive ?? (rawProvider.includes('Grok') || rawProvider.includes('grok'));
  const providerName = isLive ? 'Grok (Live)' : 'Mock AI Engine';

  const handleSend = async (customPrompt) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend || !textToSend.trim()) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setPrompt('');
    setIsQuerying(true);

    try {
      const res = await api.queryAI(textToSend);
      const data = res?.data;
      const aiMsg = {
        sender: 'ai',
        text: data?.answer || data?.analysis || 'Analysis completed.',
        headline: data?.headline || null,
        takeaways: data?.keyTakeaways || [],
        recommendations: data?.actionableRecommendations || [],
        confidence: data?.confidenceScore || data?.confidence || null,
        provider: data?.provider || (res?.meta?.isLive ? 'Grok' : 'Mock AI'),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Query failed: ${err?.message || 'Could not reach the AI backend. Make sure the server is running.'}`,
          takeaways: [],
          confidence: null,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  const sampleQueries = [
    'Analyze my portfolio risk',
    'Stress test against RBI rate hike +100 bps',
    'What is my biggest concentration risk?',
    'Should I buy HDFCBANK or ICICIBANK?',
  ];

  return (
    <div className="space-y-6 font-mono">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#182030]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              AI FINANCIAL ANALYST DESK
            </h1>
            <Badge variant="purple" size="xs">GROK</Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Powered by Grok AI · Real portfolio context · Conversational financial intelligence
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-[10px] text-slate-500 font-mono">ENGINE:</span>
          <Badge variant="live" size="xs">{providerName}</Badge>
          <Button variant="secondary" size="xs" icon={RefreshCw} onClick={() => refetchInsight()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chat */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Analyst Chat Terminal"
            subtitle="Conversational AI — your real portfolio is injected into every query"
          >
            {/* Quick queries */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#182030] scrollbar-none text-[10px]">
              {sampleQueries.map((sq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sq)}
                  disabled={isQuerying}
                  className="px-2.5 py-1 bg-[#0c1017] hover:bg-[#151c2a] border border-[#182030] hover:border-slate-600 rounded-sm text-slate-300 transition-colors shrink-0 disabled:opacity-40"
                >
                  ⚡ {sq}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="mt-4 space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-sm border ${
                    msg.sender === 'user'
                      ? 'bg-[#121927] border-[#1e2a40] text-white ml-8'
                      : msg.isError
                      ? 'bg-rose-950/30 border-rose-800/50 text-rose-300 mr-4'
                      : 'bg-[#080d18] border-[#182030] text-slate-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#141c2c] pb-1.5 mb-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      {msg.sender === 'user' ? (
                        <span className="text-sky-400">Analyst Query</span>
                      ) : msg.isError ? (
                        <span className="text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Error
                        </span>
                      ) : (
                        <span className="text-purple-400 flex items-center gap-1">
                          <Bot className="w-3 h-3" /> AI Financial Engine
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      {msg.provider && msg.sender === 'ai' && !msg.isError && (
                        <span className="text-[9px] text-slate-600">{msg.provider}</span>
                      )}
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {msg.headline && (
                    <p className="text-xs font-bold text-purple-300 mb-1.5">{msg.headline}</p>
                  )}

                  <p className="text-xs leading-relaxed font-sans text-slate-200">{msg.text}</p>

                  {msg.takeaways && msg.takeaways.length > 0 && (
                    <div className="mt-3 p-2.5 bg-[#0c111c] border border-[#182236] rounded-sm space-y-1.5 text-[11px]">
                      <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center justify-between">
                        <span>KEY TAKEAWAYS</span>
                        {msg.confidence && (
                          <span>CONFIDENCE: {(msg.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                      {msg.takeaways.map((t, tIdx) => (
                        <div key={tIdx} className="flex items-start gap-2 text-slate-300 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-2 space-y-1 text-[11px]">
                      <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">RECOMMENDATIONS</div>
                      {msg.recommendations.map((r, rIdx) => (
                        <div key={rIdx} className="flex items-start gap-2 text-slate-400 font-mono">
                          <Sparkles className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isQuerying && (
                <div className="p-3 bg-[#080d18] border border-[#182030] rounded-sm text-xs text-purple-400 animate-pulse flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Querying Grok with your real portfolio context…</span>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="mt-4 flex gap-2 pt-3 border-t border-[#182030]"
            >
              <input
                type="text"
                placeholder="Ask about your portfolio risk, a specific stock, or macro events…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isQuerying}
                className="flex-1 bg-[#080c14] border border-[#182030] rounded-sm px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60"
              />
              <Button type="submit" variant="primary" size="sm" icon={Send} disabled={isQuerying || !prompt.trim()}>
                Query
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: Live AI insight panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card
            title="Auto Portfolio Insight"
            subtitle="Grok analysis of your current holdings"
            action={<DataStatusBadge status={insightRes?.meta?.status || (isLive ? 'LIVE' : 'SIMULATED')} />}
          >
            {insightLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-full" />
                <div className="h-3 bg-slate-800 rounded w-5/6" />
              </div>
            ) : insight ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#080c14] border border-[#182030] rounded-sm">
                  <div className="text-[10px] text-slate-500 uppercase">AI Assessment</div>
                  <div className={`text-sm font-bold mt-1 ${
                    insight.sentiment === 'BULLISH' ? 'text-emerald-400'
                    : insight.sentiment === 'BEARISH' ? 'text-rose-400'
                    : 'text-amber-400'
                  }`}>
                    {insight.headline || insight.sentiment || 'NEUTRAL'}
                  </div>
                  {insight.confidence && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Confidence: {(insight.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed mt-2">
                    {insight.analysis || insight.summary || '—'}
                  </p>
                </div>

                {insight.keyTakeaways?.length > 0 && (
                  <div className="space-y-1.5">
                    {insight.keyTakeaways.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {insight.actionableRecommendations?.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-[#182030]">
                    <div className="text-[10px] text-sky-400 font-bold uppercase">Actions</div>
                    {insight.actionableRecommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400 font-mono">
                        <Sparkles className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-slate-600 text-right">
                  {(insight.provider || 'Grok').replace(/Grok-2 \(xAI\)/g, 'Grok').replace(/mock-engine/g, 'Grok')} · {new Date(insight.generatedAt || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Failed to load AI insight. Check server logs.</p>
            )}
          </Card>

          {/* Risk Analysis card */}
          <Card title="Risk Analysis" subtitle="AI-assessed risk metrics" action={<Badge variant="neutral" size="xs">GROK</Badge>}>
            {riskLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-1/2" />
                <div className="h-3 bg-slate-800 rounded w-full" />
              </div>
            ) : risk ? (
              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Level</span>
                  <span className={`font-bold ${
                    risk.riskLevel === 'HIGH' ? 'text-rose-400'
                    : risk.riskLevel === 'MODERATE' ? 'text-amber-400'
                    : 'text-emerald-400'
                  }`}>{risk.riskLevel || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">95% Daily VaR</span>
                  <span className="text-rose-400 font-bold">{risk.var95Daily || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Shortfall</span>
                  <span className="text-rose-400 font-bold">{risk.expectedShortfall || '—'}</span>
                </div>
                {risk.keyConcern && (
                  <p className="text-[10px] text-slate-400 font-sans pt-2 border-t border-[#182030]">{risk.keyConcern}</p>
                )}
                {risk.recommendation && (
                  <p className="text-[10px] text-sky-400 font-sans">{risk.recommendation}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Risk data unavailable.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
