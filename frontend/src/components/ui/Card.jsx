import React from 'react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerBorder = true,
  hoverEffect = false,
  ...props
}) {
  return (
    <div
      className={`bg-[#0d131f] border border-[#1b253b] rounded-md transition-all duration-200 ${
        hoverEffect ? 'hover:border-[#283753] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]' : ''
      } ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div
          className={`px-4 py-3.5 flex items-center justify-between gap-3 ${
            headerBorder ? 'border-b border-[#172033]' : ''
          }`}
        >
          <div>
            {title && (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
