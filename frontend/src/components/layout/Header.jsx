import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Shield, LogOut, ChevronDown, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { searchFrontendSecurities } from '../../data/securityUniverse.js';

export function Header({ onToggleMobileMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const matched = searchFrontendSecurities(query, 12);
    setResults(matched);
    setIsOpen(true);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/markets/${encodeURIComponent(item.symbol)}`);
  };

  return (
    <header className="h-14 bg-[#0c1017] border-b border-[#182030] px-4 flex items-center justify-between gap-4 select-none z-30">
      {/* Mobile Menu Button + Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800 focus:outline-none"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative w-full" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setIsOpen(true)}
            placeholder="Search 100+ Indian equities e.g. RELIANCE, TCS, INFY, TATAMOTORS..."
            className="w-full bg-[#101520] border border-[#182030] text-xs font-mono text-slate-100 placeholder:text-slate-500 pl-9 pr-10 py-2 rounded-sm focus:outline-none focus:border-slate-600 transition-colors"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#141b28] border border-[#202c40] rounded-sm">
                Ctrl K
              </kbd>
            </div>
          )}

          {/* Autocomplete Dropdown */}
          {isOpen && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[#101520] border border-[#182030] rounded-sm shadow-2xl max-h-72 overflow-y-auto z-50 font-mono">
              <div className="px-3 py-1.5 bg-[#0a0e17] border-b border-[#182030] text-[10px] uppercase text-slate-400 font-bold flex justify-between">
                <span>LOCAL SECURITY MASTER</span>
                <span>{results.length} MATCHES</span>
              </div>
              {results.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => handleSelect(item)}
                  className="px-3 py-2 hover:bg-[#161f30] cursor-pointer flex items-center justify-between border-b border-[#141a27] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{item.symbol}</span>
                    <span className="text-slate-400 text-[11px] truncate max-w-[200px]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 bg-[#162032] px-1.5 py-0.5 rounded border border-[#233148]">
                      {item.sector}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      {item.exchange}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <button
          title="Terminal Alerts"
          className="relative p-2 text-slate-400 hover:text-white hover:bg-[#121824] rounded-sm border border-transparent hover:border-[#182030] transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0c1017]" />
        </button>

        <div className="h-5 w-[1px] bg-[#182030] mx-1" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 pl-2 hover:bg-[#121824] border border-transparent hover:border-[#182030] rounded-sm transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-200 font-mono leading-tight">
                {user?.fullName || 'Analyst'}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 leading-tight uppercase">
                {user?.role || 'QUANT'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#101520] border border-[#182030] rounded-sm shadow-2xl py-1 z-50 font-mono text-xs">
              <div className="px-3 py-2 border-b border-[#182030]">
                <p className="text-slate-200 font-semibold truncate">{user?.fullName || 'Analyst'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'analyst@financeos.internal'}</p>
              </div>
              <div className="px-1 py-1">
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Terminal Session
                </div>
                <div className="px-2 py-1 flex items-center justify-between text-slate-300">
                  <span>Role</span>
                  <span className="text-emerald-400 font-bold">{user?.role || 'USER'}</span>
                </div>
              </div>
              <div className="border-t border-[#182030] pt-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Terminate Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
