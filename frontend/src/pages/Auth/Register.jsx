import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Terminal, Lock, Mail, User, AlertCircle, ArrowLeft } from 'lucide-react';

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

    if (password.length < 8) {
      setError('Passphrase must be at least 8 characters long');
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
    <div className="min-h-screen bg-[#060a10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 terminal-grid selection:bg-blue-600/30 selection:text-blue-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 border border-blue-400/30 mb-4">
          <Terminal className="w-6 h-6" />
        </div>

        <h2 className="font-mono text-2xl font-bold tracking-tight text-white uppercase">
          Enlist Terminal Node
        </h2>
        <p className="mt-1 text-xs font-mono text-slate-400 tracking-wider">
          REGISTER INSTITUTIONAL ANALYST ACCOUNT
        </p>

        <div className="mt-3 flex justify-center">
          <Badge variant="info" size="xs">
            CREDENTIAL PROVISIONING
          </Badge>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#0b111c] py-8 px-6 shadow-2xl border border-[#1a253d] sm:rounded-lg sm:px-8 relative overflow-hidden">
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
                Full Name / Desk Call-sign
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. S. Ramanujan"
                  className="w-full bg-[#080d15] border border-[#1c273f] text-slate-100 placeholder:text-slate-600 text-xs font-mono pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@domain.com"
                  className="w-full bg-[#080d15] border border-[#1c273f] text-slate-100 placeholder:text-slate-600 text-xs font-mono pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Terminal Passphrase
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters with numbers & letters"
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
                Create Terminal Credentials
              </Button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-[#162035] flex items-center justify-center text-xs font-mono">
            <Link
              to="/login"
              className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors text-[11px]"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Existing Analyst? Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
