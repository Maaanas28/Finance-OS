import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({
  type = 'info', // 'success' | 'error' | 'info' | 'warn'
  message,
  onClose,
  className = '',
}) {
  const configs = {
    success: {
      bg: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    error: {
      bg: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
      icon: AlertCircle,
      iconColor: 'text-rose-400',
    },
    warn: {
      bg: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
      icon: AlertCircle,
      iconColor: 'text-amber-400',
    },
    info: {
      bg: 'bg-blue-950/90 border-blue-500/40 text-blue-200',
      icon: Info,
      iconColor: 'text-blue-400',
    },
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded border shadow-lg font-mono text-xs ${config.bg} ${className}`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${config.iconColor}`} />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
