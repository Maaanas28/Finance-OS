import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  ShieldAlert,
  Cpu,
  BarChart3,
  Newspaper,
  Bot,
  FlaskConical,
  Settings,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip.jsx';

export function Sidebar({ isCollapsed, onToggleCollapse, isMobile, onCloseMobile }) {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { to: '/markets', label: 'Markets', icon: TrendingUp, badge: 'LIVE' },
    { to: '/portfolio', label: 'Portfolio Desk', icon: Briefcase, badge: null },
    { to: '/risk', label: 'Risk Matrix', icon: ShieldAlert, badge: 'VAR' },
    { to: '/simulator', label: 'Monte Carlo', icon: Cpu, badge: 'MC' },
    { to: '/analytics', label: 'Analytics Desk', icon: BarChart3, badge: 'ALPHA' },
    { to: '/news', label: 'News Feed', icon: Newspaper, badge: 'RSS' },
    { to: '/ai-analyst', label: 'AI Analyst', icon: Bot, badge: 'AI' },
    { to: '/strategy-lab', label: 'Strategy Lab', icon: FlaskConical, badge: null },
  ];

  const bottomItems = [
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-40 bg-[#0c1017] border-r border-[#182030] flex flex-col h-full transition-all duration-200 ease-in-out select-none ${
        isMobile ? 'w-64' : isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center px-4 border-b border-[#182030] justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-sm bg-[#162032] border border-[#233148] flex items-center justify-center text-emerald-400 shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="font-mono font-bold text-sm tracking-wider text-white flex items-center gap-1">
                FINANCE <span className="text-emerald-400">OS</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-mono">
                INSTITUTIONAL v1.0
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden md:flex p-1 rounded text-slate-400 hover:text-white hover:bg-[#121824] transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-mono transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-[#141d2d] text-white font-bold border-l-2 border-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#101622]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
              {(!isCollapsed || isMobile) && (
                <span className="flex-1 truncate tracking-wide">{item.label}</span>
              )}
              {(!isCollapsed || isMobile) && item.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-sm bg-[#141d2d] text-emerald-400 border border-[#202d44]">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );

          if (isCollapsed && !isMobile) {
            return (
              <Tooltip key={item.to} text={item.label} position="right">
                {link}
              </Tooltip>
            );
          }

          return link;
        })}
      </div>

      {/* Bottom Configuration Navigation */}
      <div className="p-2 border-t border-[#182030] space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-mono transition-all duration-150 ${
                  isActive
                    ? 'bg-[#141d2d] text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#101622]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {(!isCollapsed || isMobile) && (
                <span className="truncate tracking-wide">{item.label}</span>
              )}
            </NavLink>
          );

          if (isCollapsed && !isMobile) {
            return (
              <Tooltip key={item.to} text={item.label} position="right">
                {link}
              </Tooltip>
            );
          }

          return link;
        })}
      </div>
    </aside>
  );
}
