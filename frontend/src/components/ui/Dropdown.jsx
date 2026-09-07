import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export function Dropdown({
  label,
  options = [],
  value,
  onChange,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2 px-3 py-1.5 bg-[#0d131f] border border-[#1b253b] hover:border-[#283753] text-xs font-mono text-slate-200 rounded cursor-pointer transition-colors"
      >
        <span>{selectedOption ? selectedOption.label : label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 min-w-[140px] bg-[#0d131f] border border-[#23304b] rounded shadow-xl py-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors flex items-center justify-between ${
                option.value === value
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : 'text-slate-300 hover:bg-[#151f33] hover:text-white'
              }`}
            >
              <span>{option.label}</span>
              {option.badge && (
                <span className="text-[10px] text-slate-400 ml-2">{option.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
