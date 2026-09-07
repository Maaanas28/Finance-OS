import React, { useState } from 'react';
import { MarketStatusBar } from './MarketStatusBar.jsx';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';

export function AppShell({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen bg-[#080b10] text-slate-100 flex flex-col font-sans overflow-hidden selection:bg-blue-600/30 selection:text-blue-200">
      {/* Real-time Institutional Market Status Ribbon */}
      <MarketStatusBar />

      {/* Main Terminal Shell Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <div className="hidden md:block shrink-0 h-full">
          <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            isMobile={false}
          />
        </div>

        {/* Mobile Navigation Drawer Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/75 md:hidden backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <Sidebar
                isCollapsed={false}
                isMobile={true}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

          <main className="flex-1 overflow-y-auto bg-[#080b10] terminal-grid p-4 md:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
