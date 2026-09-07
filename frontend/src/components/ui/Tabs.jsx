import React from 'react';

export function Tabs({
  tabs,
  activeTab,
  onChange,
  size = 'sm',
  className = '',
}) {
  return (
    <div className={`inline-flex items-center p-0.5 bg-[#090e17] border border-[#1b253b] rounded ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-sm transition-all duration-150 cursor-pointer select-none ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
