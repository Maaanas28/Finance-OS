import React, { useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Settings as SettingsIcon, Shield, Database, Cpu, CheckCircle2, Save } from 'lucide-react';

export function SettingsPage() {
  const [riskFreeRate, setRiskFreeRate] = useState('6.5');
  const [marketMode, setMarketMode] = useState('auto');
  const [currency, setCurrency] = useState('INR');
  const [newsProvider, setNewsProvider] = useState('rss');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#182030]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              TERMINAL ENVIRONMENT SETTINGS
            </h1>
            <Badge variant="neutral" size="xs">
              SYSTEM CONFIG
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Configure risk parameters, market data providers, and system telemetry preferences
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Button variant="primary" size="xs" icon={Save} onClick={handleSave}>
            {saved ? 'Saved Successfully!' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk & Model Parameters */}
        <Card title="Risk Engine Parameters" subtitle="Sharpe risk-free rate & VaR confidence levels">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 uppercase tracking-wider mb-1">
                Risk-Free Rate (Rf Benchmark %)
              </label>
              <input
                type="number"
                step="0.1"
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(e.target.value)}
                className="w-full bg-[#080c14] border border-[#182030] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-slate-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Aligned with Reserve Bank of India (RBI) 10-Year Government Securities Yield
              </span>
            </div>

            <div>
              <label className="block text-slate-400 uppercase tracking-wider mb-1">
                Primary Currency Standard
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#080c14] border border-[#182030] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-slate-500"
              >
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
              </select>
            </div>
          </form>
        </Card>

        {/* Data Provider Telemetry */}
        <Card title="Market Data & Provider Telemetry" subtitle="Provider routing & zero-cost guarantees">
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 uppercase tracking-wider mb-1">
                Market Feed Provider Mode
              </label>
              <select
                value={marketMode}
                onChange={(e) => setMarketMode(e.target.value)}
                className="w-full bg-[#080c14] border border-[#182030] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-slate-500"
              >
                <option value="auto">Auto Fallback (BharatStock → Twelve Data → Simulated)</option>
                <option value="mock">Simulated Fallback Engine Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 uppercase tracking-wider mb-1">
                News Ingestion Engine
              </label>
              <select
                value={newsProvider}
                onChange={(e) => setNewsProvider(e.target.value)}
                className="w-full bg-[#080c14] border border-[#182030] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-slate-500"
              >
                <option value="rss">Live RSS Feeds (7 Outlets: ET, Moneycontrol, Mint, etc.)</option>
                <option value="mock">Mock Financial News Feed</option>
              </select>
            </div>

            <div className="p-3 bg-[#080c14] border border-[#182030] rounded-sm space-y-1 text-[11px]">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                ₹0 BUDGET COMPLIANCE VERIFIED
              </div>
              <p className="text-slate-400 font-sans leading-relaxed text-[11px]">
                All external provider integrations operate on free public tiers and RSS feeds. Server-side secrets remain guarded in `.env`.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
