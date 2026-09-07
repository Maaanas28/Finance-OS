import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Terminal, Lock, Mail, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('rahul@financeos.demo');
    setPassword('Demo@123');
  };

  return (
    <div className="min-h-screen bg-[#060a10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 terminal-grid selection:bg-blue-600/30 selection:text-blue-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Terminal Emblem */}
        <div className="mx-auto w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 border border-blue-400/30 mb-4">
          <Terminal className="w-6 h-6" />
        </div>

        <h2 className="font-mono text-2xl font-bold tracking-tight text-white uppercase">
          Finance <span className="text-blue-500">OS</span>
        </h2>
        <p className="mt-1 text-xs font-mono text-slate-400 tracking-wider">
          INSTITUTIONAL QUANTITATIVE TERMINAL
        </p>

        <div className="mt-3 flex justify-center">
          <Badge variant="info" size="xs">
            SECURE ACCESS GATEWAY
          </Badge>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#0b111c] py-8 px-6 shadow-2xl border border-[#1a253d] sm:rounded-lg sm:px-8 relative overflow-hidden">
          {/* Subtle top accent highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          {error && (
            <div className="mb-5 p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Terminal Identifier (Email)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@financeos.internal"
                  className="w-full bg-[#080d15] border border-[#1c273f] text-slate-100 placeholder:text-slate-600 text-xs font-mono pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Passphrase
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#080d15] border border-[#1c273f] text-slate-100 placeholder:text-slate-600 text-xs font-mono pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full font-mono text-xs uppercase tracking-wider"
              >
                Authenticate Terminal Session
              </Button>
            </div>
          </form>

          {/* Quick Demo Autofill helper */}
          <div className="mt-5 pt-4 border-t border-[#162035] flex items-center justify-between text-xs font-mono">
            <button
              type="button"
              onClick={handleDemoFill}
              className="text-blue-400 hover:text-blue-300 underline cursor-pointer text-[11px]"
            >
              Fill Demo Analyst Credentials
            </button>
            <Link
              to="/register"
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors text-[11px]"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Institutional footer disclaimer */}
        <p className="mt-6 text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Finance OS &copy; 2026 Institutional Financial Technologies
        </p>
      </div>
    </div>
  );
}
