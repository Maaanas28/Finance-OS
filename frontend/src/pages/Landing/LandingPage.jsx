import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LogoIcon } from '../../components/ui/LogoIcon.jsx';
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
  Lock,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-300" style={{ fontFamily: "'JetBrains Mono', monospace", WebkitFontSmoothing: 'antialiased' }}>

      {/* Header */}
      <header className="border-b border-neutral-800/60 sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <LogoIcon className="w-6 h-6" />
              <span className="text-sm font-semibold text-white tracking-tight">finance os</span>
              <span className="hidden sm:inline-block text-[10px] text-neutral-600">v1.0</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-neutral-600 mr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
                <span>NSE / BSE</span>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5 border border-neutral-800 hover:border-neutral-700 rounded transition-colors"
              >
                sign in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="text-xs font-medium text-neutral-900 bg-neutral-100 hover:bg-white px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-colors"
              >
                get started
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">

        <section className="pt-16 sm:pt-24 pb-14">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-4">institutional financial intelligence</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white leading-snug mb-5 max-w-2xl">
            Precision portfolio analytics &amp;<br />quantitative risk architecture.
          </h1>
          <p className="text-sm text-neutral-500 max-w-xl mb-8 leading-relaxed">
            Real-time equity valuation, factor risk models, macro stress testing,
            and Monte Carlo stochastic simulations for institutional research desks
            and quantitative investors.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center px-4 py-2 bg-neutral-100 text-neutral-900 text-xs font-medium rounded hover:bg-white transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 mr-1.5" />
              launch terminal
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-4 py-2 border border-neutral-800 text-xs font-medium rounded text-neutral-400 hover:text-neutral-300 hover:border-neutral-700 transition-colors"
            >
              analyst portal
            </button>
          </div>

          {/* Stats strip */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-neutral-800/60 rounded-lg p-4 bg-[#0a0a0c]">
              <div className="text-[10px] text-neutral-600 uppercase tracking-widest mb-2">Equity Universe</div>
              <div className="text-lg font-semibold text-white">100+</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">Indian equities</div>
            </div>
            <div className="border border-neutral-800/60 rounded-lg p-4 bg-[#0a0a0c]">
              <div className="text-[10px] text-neutral-600 uppercase tracking-widest mb-2">Risk Engine</div>
              <div className="text-lg font-semibold text-white">VaR / CVaR</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">95% &amp; 99% confidence</div>
            </div>
            <div className="border border-neutral-800/60 rounded-lg p-4 bg-[#0a0a0c]">
              <div className="text-[10px] text-neutral-600 uppercase tracking-widest mb-2">Monte Carlo</div>
              <div className="text-lg font-semibold text-white">10,000</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">GBM paths</div>
            </div>
            <div className="border border-neutral-800/60 rounded-lg p-4 bg-[#0a0a0c]">
              <div className="text-[10px] text-neutral-600 uppercase tracking-widest mb-2">News Intelligence</div>
              <div className="text-lg font-semibold text-white">Live NLP</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">automated sentiment</div>
            </div>
          </div>
        </section>

        {/* Core modules */}
        <section className="pb-14">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-5">core platform modules</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

            <div className="border border-neutral-800/60 rounded-lg p-5 bg-[#0a0a0c] hover:border-neutral-700 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-500/80" />
                <h3 className="text-xs font-medium text-white">Market Intelligence Desk</h3>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">
                Real-time telemetry across NSE/BSE indices and equities. Multi-tier provider fallback ensuring continuous pricing.
              </p>
              <ul className="space-y-1.5 text-[11px] text-neutral-500">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />BharatStock / Twelve Data feed</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />100+ local security master search</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Mover grids &amp; sector classification</li>
              </ul>
            </div>

            <div className="border border-neutral-800/60 rounded-lg p-5 bg-[#0a0a0c] hover:border-neutral-700 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-neutral-400" />
                <h3 className="text-xs font-medium text-white">Portfolio Analytics &amp; Ledger</h3>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">
                MtM daily revaluation, double-entry audit accounting, trade execution modal, and asset allocation breakdowns.
              </p>
              <ul className="space-y-1.5 text-[11px] text-neutral-500">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Transaction audit ledger</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Weighted sector allocation charts</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Real-time unrealized P&amp;L</li>
              </ul>
            </div>

            <div className="border border-neutral-800/60 rounded-lg p-5 bg-[#0a0a0c] hover:border-neutral-700 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-neutral-400" />
                <h3 className="text-xs font-medium text-white">Risk Engine &amp; Macro Stress</h3>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">
                Parametric VaR, Historical VaR, Conditional VaR (Expected Shortfall), MCR, and macro scenario shock testing.
              </p>
              <ul className="space-y-1.5 text-[11px] text-neutral-500">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />RBI Rate Hike &amp; Crude Spike shocks</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />6.5% India 10Y risk-free rate</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Position vulnerability &amp; drawdown limits</li>
              </ul>
            </div>

            <div className="border border-neutral-800/60 rounded-lg p-5 bg-[#0a0a0c] hover:border-neutral-700 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-neutral-400" />
                <h3 className="text-xs font-medium text-white">Monte Carlo Path Simulator</h3>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">
                Stochastic asset path generator running up to 10,000 GBM trajectories to project terminal portfolio distributions.
              </p>
              <ul className="space-y-1.5 text-[11px] text-neutral-500">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Percentile fan curves (5th–95th)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Terminal density distribution histogram</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Probability of capital loss calculation</li>
              </ul>
            </div>

            <div className="border border-neutral-800/60 rounded-lg p-5 bg-[#0a0a0c] hover:border-neutral-700 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper className="w-4 h-4 text-neutral-400" />
                <h3 className="text-xs font-medium text-white">News Intelligence &amp; NLP</h3>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">
                RSS feed ingestion engine matching financial headlines against 200+ NSE ticker aliases with rule-based NLP sentiment.
              </p>
              <ul className="space-y-1.5 text-[11px] text-neutral-500">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Concurrent parsing across 7 outlets</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />300+ term financial dictionary</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />NSE symbol extraction &amp; trending tags</li>
              </ul>
            </div>

            <div className="border border-neutral-800/60 rounded-lg p-5 bg-[#0a0a0c] hover:border-neutral-700 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-neutral-400" />
                <h3 className="text-xs font-medium text-white">System Design &amp; Resilience</h3>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">
                Dual-layer fallback architecture for 100% operational uptime. Designed with strict ₹0 external budget constraint.
              </p>
              <ul className="space-y-1.5 text-[11px] text-neutral-500">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Prisma ORM with in-memory DB fallback</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Server-side API key isolation</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-neutral-700 shrink-0" />Pure Node.js + React architecture</li>
              </ul>
            </div>

          </div>
        </section>

        {/* Data transparency banner */}
        <section className="pb-20">
          <div className="border border-neutral-800/60 rounded-lg p-5 bg-[#0a0a0c]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-medium text-white mb-1">Data Transparency Standard</h3>
                  <p className="text-[11px] text-neutral-600 leading-relaxed max-w-2xl">
                    Finance OS demarcates data provenance across all telemetry panels:&nbsp;
                    <span className="text-emerald-500/80">LIVE</span> (real-time API),&nbsp;
                    <span className="text-neutral-400">CACHED</span> (TTL cache), and&nbsp;
                    <span className="text-neutral-500">SIMULATED</span> (quant fallback). Mock values are never misrepresented as live quotes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="shrink-0 inline-flex items-center px-4 py-2 border border-neutral-800 text-xs font-medium rounded text-neutral-400 hover:text-neutral-300 hover:border-neutral-700 transition-colors"
              >
                access gateway
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/40 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-neutral-700">
          <span>finance os &copy; 2026</span>
          <div className="flex items-center gap-4">
            <span>engine: node.js / react</span>
            <span>budget: ₹0</span>
            <span>tests: 148 passing</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
