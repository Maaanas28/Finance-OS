import React from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Layers, Terminal, Sparkles, Clock, CheckCircle2 } from 'lucide-react';

export function PlaceholderModule({
  title,
  code,
  description,
  plannedFeatures = [],
  architectureLayer = 'DATA / PROVIDERS',
  icon: Icon = Layers,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#172033]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#111929] border border-[#1f2d47] flex items-center justify-center text-blue-400 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
                {title}
              </h1>
              <Badge variant="purple" size="xs">
                {code}
              </Badge>
              <Badge variant="neutral" size="xs">
                PHASE 2 READY
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Architecture Layer:</span>
          <Badge variant="info" size="xs">
            {architectureLayer}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Module Status"
          subtitle="Engine foundation & abstractions"
          className="md:col-span-2"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              The contract interface, routing pipeline, and database schema mappings for{' '}
              <strong className="text-blue-400">{title}</strong> are established in the Finance OS
              foundation. Real backend services and quantitative algorithms can be plugged in without
              modifying the core architecture.
            </p>

            <div className="border border-[#172236] rounded bg-[#090e18] p-4">
              <h4 className="text-xs font-mono font-bold text-slate-200 uppercase mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Planned Roadmap & Capabilities
              </h4>
              <ul className="space-y-2">
                {plannedFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs font-mono text-slate-400">
                    <span className="text-blue-400 select-none">▸</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card title="Interface Contracts" subtitle="Backend decoupled abstractions">
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#0a0f19] border border-[#162136] rounded">
              <div className="text-slate-400 text-[10px] uppercase font-bold">API Route Mounted</div>
              <div className="text-blue-400 mt-1 font-semibold">/api/v1/{code.toLowerCase()}</div>
            </div>
            <div className="p-3 bg-[#0a0f19] border border-[#162136] rounded">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Provider Driver</div>
              <div className="text-emerald-400 mt-1 font-semibold">Decoupled Adapter Pattern</div>
            </div>
            <div className="p-3 bg-[#0a0f19] border border-[#162136] rounded">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Storage State</div>
              <div className="text-amber-400 mt-1 font-semibold">Prisma / PostgreSQL Ready</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
