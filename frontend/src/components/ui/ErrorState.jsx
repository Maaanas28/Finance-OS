import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button.jsx';

export function ErrorState({
  title = 'Service Unavailable',
  message = 'Failed to load telemetry or market stream.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center rounded border border-rose-900/40 bg-rose-950/10 ${className}`}>
      <div className="w-9 h-9 rounded-full bg-rose-950/50 border border-rose-800/50 flex items-center justify-center text-rose-400 mb-2.5">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mb-3">{message}</p>
      {onRetry && (
        <Button size="xs" variant="secondary" onClick={onRetry}>
          Retry Query
        </Button>
      )}
    </div>
  );
}
