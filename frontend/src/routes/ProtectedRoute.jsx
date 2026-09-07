import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AppShell } from '../components/layout/AppShell.jsx';
import { Terminal } from 'lucide-react';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060a10] flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-3 animate-pulse">
          <Terminal className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-400 tracking-wider">
          INITIALIZING TERMINAL KERNEL...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
