import React, { useState } from 'react';

export function Tooltip({ text, children, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && text && (
        <div
          className={`absolute z-50 whitespace-nowrap bg-[#0b101a] border border-[#22314e] text-slate-200 text-[11px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none ${positionStyles[position]}`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
