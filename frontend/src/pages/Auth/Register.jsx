import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { LogoIcon } from '../../components/ui/LogoIcon.jsx';
import { Lock, Mail, User, AlertCircle, ArrowLeft } from 'lucide-react';

export function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register({ fullName, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#09090b] text-neutral-300 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ fontFamily: "'JetBrains Mono', monospace", WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center mb-8">
        <LogoIcon className="w-8 h-8 mx-auto mb-4 opacity-80" />
        <a href="/" className="text-sm font-semibold text-white tracking-tight">finance os</a>
        <p className="mt-1 text-[10px] text-neutral-600 uppercase tracking-widest">register institutional analyst account</p>
      </div>

      {/* Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="border border-neutral-800/60 rounded-lg bg-[#0a0a0c] px-6 py-8 relative overflow-hidden">

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-neutral-700/40" />

          <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-6">create account</p>

          {error && (
            <div className="mb-5 p-3 rounded border border-neutral-800/60 bg-neutral-900/60 text-neutral-400 text-[11px] flex items-start gap-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500/70 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-700" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. S. Ramanujan"
                  className="w-full bg-[#09090b] border border-neutral-800/60 text-neutral-200 placeholder:text-neutral-700 text-xs pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-700" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@domain.com"
                  className="w-full bg-[#09090b] border border-neutral-800/60 text-neutral-200 placeholder:text-neutral-700 text-xs pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-700" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-[#09090b] border border-neutral-800/60 text-neutral-200 placeholder:text-neutral-700 text-xs pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-neutral-100 text-neutral-900 text-xs font-medium rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'creating account...' : 'create account'}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-neutral-800/60 flex items-center justify-center text-[11px]">
            <Link
              to="/login"
              className="text-neutral-600 hover:text-neutral-300 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>existing analyst? sign in</span>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-neutral-700 uppercase tracking-widest">
          finance os &copy; 2026
        </p>
      </div>
    </div>
  );
}
