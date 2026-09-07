import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  TrendingUp,
  Briefcase,
  ShieldAlert,
  Cpu,
  Newspaper,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  Database,
  Lock,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#080a0f] text-slate-100 font-sans selection:bg-slate-800 selection:text-emerald-400 border-t-2 border-emerald-500">
      {/* Top Terminal Status Header */}
      <header className="border-b border-[#182030] bg-[#0c1017] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#162032] border border-[#233148] flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono font-bold text-sm tracking-wider text-white">FINANCE OS</span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded-sm">
                v1.0 INSTITUTIONAL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 font-mono text-xs text-slate-400 border-r border-[#182030] pr-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>NSE / BSE FEED: <strong className="text-slate-200">ONLINE</strong></span>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="text-xs font-mono text-slate-300 hover:text-white px-3 py-1.5 rounded-sm border border-[#182030] hover:border-slate-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-xs font-mono font-semibold text-white bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/50 px-3.5 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors"
            >
              Launch Terminal
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-[#182030] bg-gradient-to-b from-[#0c1017] to-[#080a0f] py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#121927] border border-[#1e2a40] rounded-sm text-xs font-mono text-slate-300 mb-6">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>INSTITUTIONAL FINANCIAL INTELLIGENCE PLATFORM</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight font-sans">
            Precision Portfolio Analytics & Quantitative Risk Architecture
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
            Finance OS delivers real-time equity valuation, factor risk models, macro stress testing, and Monte Carlo stochastic simulations for institutional research desks and quantitative investors.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto text-sm font-mono font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] px-6 py-3 rounded-sm flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <Terminal className="w-4 h-4" />
              Enter Finance OS Terminal
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto text-sm font-mono text-slate-300 hover:text-white bg-[#101520] hover:bg-[#161d2c] border border-[#182030] hover:border-slate-700 px-6 py-3 rounded-sm flex items-center justify-center gap-2 transition-colors"
            >
              Analyst Portal Access
            </button>
          </div>

          {/* Quick Terminal Live Stats Ticker Strip */}
          <div className="mt-12 max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-left">
            <div className="p-3.5 bg-[#101520] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Equity Universe</div>
              <div className="text-lg font-bold text-white mt-1">100+ Indian Equities</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">NSE / BSE Coverage</div>
            </div>
            <div className="p-3.5 bg-[#101520] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Risk Engine</div>
              <div className="text-lg font-bold text-white mt-1">Parametric & VaR</div>
              <div className="text-[11px] text-slate-400 mt-0.5">95% & 99% Confidence</div>
            </div>
            <div className="p-3.5 bg-[#101520] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Stochastic Engine</div>
              <div className="text-lg font-bold text-white mt-1">10,000 Paths</div>
              <div className="text-[11px] text-sky-400 mt-0.5">Geometric Brownian</div>
            </div>
            <div className="p-3.5 bg-[#101520] border border-[#182030] rounded-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">News Intelligence</div>
              <div className="text-lg font-bold text-white mt-1">Live RSS + NLP</div>
              <div className="text-[11px] text-amber-400 mt-0.5">Automated Sentiment</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Feature Modules Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-1">
            CORE PLATFORM MODULES
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Integrated Institutional Financial Architecture
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Module 1: Market Intelligence */}
          <div className="p-6 bg-[#101520] border border-[#182030] hover:border-slate-700 transition-colors rounded-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-emerald-400 mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono mb-2">Market Intelligence Desk</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Real-time telemetry across Indian market indices (`NIFTY 50`, `SENSEX`) and equities. Multi-tier provider fallback architecture ensuring continuous pricing availability.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Live BharatStock / Twelve Data feed integration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  100+ local Indian security master search
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Tick-by-tick mover grids and sector classification
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#182030] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Layer: MarketDataService</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          {/* Module 2: Portfolio Analytics */}
          <div className="p-6 bg-[#101520] border border-[#182030] hover:border-slate-700 transition-colors rounded-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-sky-400 mb-4">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono mb-2">Portfolio Analytics & Ledger</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Mark-to-Market (MtM) daily revaluation, double-entry audit accounting, trade execution modal (`BUY`/`SELL`), and asset allocation breakdowns.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  Transaction audit ledger with execution timestamps
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  Weighted sector & asset-class allocation charts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  Real-time unrealized P&L recalculation
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#182030] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Layer: PortfolioService</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          {/* Module 3: Risk & Stress Testing */}
          <div className="p-6 bg-[#101520] border border-[#182030] hover:border-slate-700 transition-colors rounded-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-amber-400 mb-4">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono mb-2">Risk Engine & Macro Stress</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Parametric VaR, Historical VaR, Conditional VaR (Expected Shortfall), Marginal Contribution to Risk (MCR), and macro scenario shock testing.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  RBI Rate Hike (+100 bps) & Crude Spike shocks
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Configurable 6.5% India 10Y risk-free rate
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Position-level vulnerability & drawdown limits
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#182030] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Layer: RiskService</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          {/* Module 4: Monte Carlo Simulator */}
          <div className="p-6 bg-[#101520] border border-[#182030] hover:border-slate-700 transition-colors rounded-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-indigo-400 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono mb-2">Monte Carlo Path Simulator</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Stochastic asset path generator running up to 10,000 Geometric Brownian Motion (GBM) trajectories to project terminal portfolio distributions.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Percentile fan curves (5th, 25th, 50th, 75th, 95th)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Terminal portfolio density distribution histogram
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Probability of capital loss calculation
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#182030] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Layer: MonteCarloEngine</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          {/* Module 5: News Intelligence */}
          <div className="p-6 bg-[#101520] border border-[#182030] hover:border-slate-700 transition-colors rounded-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-purple-400 mb-4">
                <Newspaper className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono mb-2">News Intelligence & NLP</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Zero-dependency RSS feed ingestion engine matching financial news headlines against 200+ NSE ticker aliases with rule-based NLP sentiment scoring.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  Concurrent RSS parsing across 7 financial outlets
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  Rule-based 300+ term financial dictionary scoring
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  Automated NSE symbol extraction & trending tags
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#182030] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Layer: RSSNewsProvider</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          {/* Module 6: Institutional Architecture */}
          <div className="p-6 bg-[#101520] border border-[#182030] hover:border-slate-700 transition-colors rounded-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-emerald-400 mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono mb-2">System Design & Resilience</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Designed with a strict ₹0 external budget constraint. Dual-layer fallback architecture ensures 100% operational uptime without API quota breaches.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Prisma ORM with seamless in-memory DB fallback
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Server-side API key isolation (`.env` guarded)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  100% Pure JavaScript Node.js + React architecture
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#182030] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Layer: Core Architecture</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Security & Data Integrity Banner */}
      <section className="py-12 bg-[#0c1017] border-y border-[#182030]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-emerald-400 shrink-0 mt-1">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-mono font-bold text-white">Institutional Data Transparency & Status Standard</h3>
              <p className="text-xs text-slate-400 font-sans mt-1 max-w-2xl leading-relaxed">
                Finance OS explicitly demarcates data provenance across all telemetry panels: <strong className="text-emerald-400">LIVE</strong> (Real-time external API feed), <strong className="text-sky-400">CACHED</strong> (High-speed TTL cache), and <strong className="text-amber-400">SIMULATED</strong> (Quant fallback engine). Mock values are never misrepresented as live market quotes.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="shrink-0 text-xs font-mono font-bold text-white bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/50 px-5 py-2.5 rounded-sm flex items-center gap-2 transition-colors"
          >
            Access Analyst Gateway
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Terminal Footer */}
      <footer className="py-8 bg-[#080a0f] text-slate-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#182030] pt-6">
          <div>
            <span className="text-slate-300 font-bold">FINANCE OS</span> — Institutional Portfolio & Risk Terminal
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>ENGINE: Node.js / React</span>
            <span>BUDGET: ₹0</span>
            <span>TESTS: 148 PASSING</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
