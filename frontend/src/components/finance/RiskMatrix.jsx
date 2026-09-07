import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { api } from '../../services/api.js';

export function RiskMatrix() {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    async function fetchSnapshot() {
      try {
        const res = await api.getRiskSnapshot();
        if (res?.data) {
          setSnapshot(res.data);
        }
      } catch {
        // Preserved clean snapshot state
      }
    }
    fetchSnapshot();
  }, []);

  const s = snapshot;

  const metrics = [
    {
      title: 'Annualized Volatility',
      metric: s?.volatility?.value || '0.0%',
      status: s?.volatility?.status === 'ELEVATED' ? 'warn' : 'gain',
      badge: s?.volatility?.status || 'LOW',
      progress: s?.volatility?.value ? 68 : 0,
      detail: s?.volatility?.benchmark || 'Benchmarked to NIFTY 50',
    },
    {
      title: 'Portfolio Beta',
      metric: s?.beta?.value !== undefined ? String(s.beta.value) : '0.00',
      status: Number(s?.beta?.value || 0) > 1.2 ? 'warn' : 'gain',
      badge: s?.beta?.status || 'NEUTRAL',
      progress: s?.beta?.value ? 74 : 0,
      detail: s?.beta?.description || 'Sensitivity to market index',
    },
    {
      title: 'Sharpe Ratio',
      metric: s?.sharpe?.value !== undefined ? String(s.sharpe.value) : '0.00',
      status: 'gain',
      badge: s?.sharpe?.status || 'OPTIMAL',
      progress: s?.sharpe?.value ? 82 : 0,
      detail: s?.sharpe?.description || 'Risk-adjusted return ratio',
    },
    {
      title: 'Maximum Drawdown',
      metric: s?.maxDrawdown?.value || '0.0%',
      status: 'loss',
      badge: s?.maxDrawdown?.status || 'CONTROLLED',
      progress: s?.maxDrawdown?.value ? 45 : 0,
      detail: s?.maxDrawdown?.peakDate ? `Peak: ${s.maxDrawdown.peakDate}` : 'Historical peak-to-trough decline',
    },
  ];

  return (
    <Card
      title="Risk Intelligence Snapshot"
      subtitle="Factor exposures, sensitivity & drawdown limits"
      action={
        <Badge
          variant={s?.riskLevel === 'HIGH' ? 'loss' : s?.riskLevel === 'MODERATE' ? 'warn' : 'gain'}
          size="xs"
          dot
        >
          {s ? `Regime: ${s.riskLevel} (${s.compositeScore}/100)` : 'Overall: High Risk'}
        </Badge>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((item) => (
          <div
            key={item.title}
            className="p-3 bg-[#0a0f18] border border-[#172236] rounded hover:border-[#223352] transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                  {item.title}
                </span>
                <Badge variant={item.status} size="xs">
                  {item.badge}
                </Badge>
              </div>
              <div className="text-xl font-bold font-mono text-white tabular-nums my-1">
                {item.metric}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-[#131c2e]">
              {/* Visual meter bar */}
              <div className="w-full bg-[#151f33] h-1.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full ${
                    item.status === 'gain'
                      ? 'bg-emerald-500'
                      : item.status === 'warn'
                      ? 'bg-amber-500'
                      : item.status === 'loss'
                      ? 'bg-rose-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {item.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
