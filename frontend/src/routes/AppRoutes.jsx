import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { LandingPage } from '../pages/Landing/LandingPage.jsx';
import { Login } from '../pages/Auth/Login.jsx';
import { Register } from '../pages/Auth/Register.jsx';
import { Dashboard } from '../pages/Dashboard/Dashboard.jsx';
import { MarketsPage } from '../pages/Markets/MarketsPage.jsx';
import { StockDetailPage } from '../pages/Markets/StockDetailPage.jsx';
import { PortfolioDesk } from '../pages/Portfolio/PortfolioDesk.jsx';
import { RiskCenter } from '../pages/Risk/RiskCenter.jsx';
import { MonteCarloDesk } from '../pages/Simulator/MonteCarloDesk.jsx';
import { AnalyticsDesk } from '../pages/Analytics/AnalyticsDesk.jsx';
import { NewsPage } from '../pages/News/NewsPage.jsx';
import { AIAnalystPage } from '../pages/AI/AIAnalystPage.jsx';
import { StrategyLabPage } from '../pages/Strategy/StrategyLabPage.jsx';
import { SettingsPage } from '../pages/Settings/SettingsPage.jsx';

export function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Root Route: Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Authentication Gateways */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Terminal Workspaces */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/markets/:symbol" element={<StockDetailPage />} />
        <Route path="/portfolio" element={<PortfolioDesk />} />
        <Route path="/risk" element={<RiskCenter />} />
        <Route path="/simulator" element={<MonteCarloDesk />} />
        <Route path="/analytics" element={<AnalyticsDesk />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/ai-analyst" element={<AIAnalystPage />} />
        <Route path="/strategy-lab" element={<StrategyLabPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
