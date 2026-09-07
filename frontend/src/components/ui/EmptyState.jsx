import React from 'react';
import { Database } from 'lucide-react';
import { Button } from './Button.jsx';

export function EmptyState({
  icon: Icon = Database,
  title = 'No Data Available',
  description = 'There are currently no records to display.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded border border-dashed border-[#1b253b] bg-[#0b101a]/50 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-[#151e2e] flex items-center justify-center text-slate-400 mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-200 font-mono mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
