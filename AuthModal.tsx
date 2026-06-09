import React, { useState } from 'react';
import { User, Shield, Info, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';

interface AuthModalProps {
  onAuthSuccess: (token: string, user: any) => void;
}

const RANDOM_NAMES = [
  'KarachiBoy123',
  'GulshanKing',
  'DHAUser456',
  'KarachiStar',
  'LuckyFalcon',
  'ChatMaster',
  'KarsazHero',
  'SaddarRider',
  'CliftonBreeze',
  'TariqRoadStar',
  'ChaiShaiLover',
  'BurnesRoadFoodie',
  'NipaLegend',
  'JauharJawan'
];

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerateRandomName = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_NAMES.length);
    const baseName = RANDOM_NAMES[randomIndex];
    const suffix = Math.floor(100 + Math.random() * 900); // 3 digit random
    setUsername(`${baseName}${suffix}`);
    // Clear error
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Username and password are required');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Identity validation failed');
      } else {
        localStorage.setItem('khi_chat_token', data.token);
        localStorage.setItem('khi_chat_user', JSON.stringify(data.user));
        onAuthSuccess(data.token, data.user);
      }
    } catch (e) {
      setErrorMsg('Network error. Is the server online?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative my-6">
      {/* Visual Karachi Background Highlights */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400"></div>

      {/* Brand logo & message */}
      <div className="p-8 text-center bg-slate-950 border-b border-slate-800/65">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 mb-4 text-emerald-400 font-black text-2xl font-mono shadow-inner shadow-emerald-500/5">
          🇵🇰
        </div>
        <h3 className="text-2xl font-black text-slate-100 tracking-wide font-sans">Karachi Public Chat</h3>
        <p className="text-xs text-slate-400/90 mt-1">Saddar, Clifton, Gulshan, Nazimabad — Connect Safely!</p>
      </div>

      {/* Help block explaining the registry flow */}
      <div className="px-8 pt-6">
        <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-350 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 text-indigo-400 mt-0.5" />
          <span>
            <strong>First time here?</strong> Enter any unique username and password to create your account instantly. Otherwise, log in with your existing password!
          </span>
        </div>
      </div>

      {/* Error Feedbacks */}
      <div className="px-8 pt-4">
        {errorMsg && (
          <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-center font-medium animate-pulse" id="auth-err">
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-5" id="login-form">
        <div>
          <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-2" htmlFor="login-username">
            Username
          </label>
          <input
            id="login-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., GulshanKing"
            className="w-full bg-slate-950/85 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
            minLength={3}
          />
          <button
            type="button"
            onClick={handleGenerateRandomName}
            className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 focus:outline-none bg-emerald-500/5 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/10 transition-all"
            id="generate-random-name-btn"
          >
            <Sparkles className="w-3.5 h-3.5 mt-0.5 animate-pulse" />
            <span>Generate Random Name</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-2" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-950/85 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black py-4 px-4 rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center space-x-2 text-sm mt-6 cursor-pointer"
          id="login-submit"
        >
          <span>{loading ? 'Entering Karachi Subnet...' : 'Enter Karachi Public Chat'}</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </button>
      </form>
    </div>
  );
};
