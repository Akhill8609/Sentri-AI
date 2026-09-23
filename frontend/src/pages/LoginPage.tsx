import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  setCurrentTab: (tab: string) => void;
  setAuthFlowData?: (data: { email: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ setCurrentTab, setAuthFlowData }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnverified(false);
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      setCurrentTab('dashboard');
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      if (msg.toLowerCase().includes('verifi')) {
        setIsUnverified(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
    setIsUnverified(false);
  };

  const handleGoToVerify = () => {
    if (setAuthFlowData) {
      setAuthFlowData({ email: email.trim() });
    }
    setCurrentTab('verify-email');
  };

  const handleGoToForgot = () => {
    if (setAuthFlowData && email.trim()) {
      setAuthFlowData({ email: email.trim() });
    }
    setCurrentTab('forgot-password');
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 card-soft bg-white">
      <div className="text-center mb-8">
        <img src="/sentriai-icon.jpg" alt="SentriAI" className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-soft object-cover" />
        <h2 className="text-2xl font-bold text-slate-900">Sign in to SentriAI</h2>
        <p className="text-xs text-slate-500 mt-1">Your Intelligent Digital Security Companion</p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-pastel-rose-light text-pastel-rose-text border border-pastel-rose-border text-xs flex flex-col gap-2">
          <span>{error}</span>
          {isUnverified && (
            <button
              type="button"
              onClick={handleGoToVerify}
              className="self-start px-2.5 py-1 bg-pastel-rose-border/40 hover:bg-pastel-rose-border text-pastel-rose-text font-bold rounded-lg transition text-[11px]"
            >
              Verify OTP Now →
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@organization.edu"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">Password</label>
            <button
              type="button"
              onClick={handleGoToForgot}
              className="text-[11px] text-pastel-lavender-text hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-pastel-lavender-main hover:bg-pastel-lavender-text text-white font-semibold text-xs shadow-soft transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          {isLoading ? <span>Authenticating...</span> : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* 1-Click Fast Demo Fill */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-[10px] uppercase font-bold text-slate-400 text-center mb-3 tracking-wider">
          One-Click Demo Credentials
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => handleQuickLogin('student@university.edu', 'Password123!')}
            className="p-2 rounded-xl bg-pastel-blue-light text-pastel-blue-text font-medium border border-pastel-blue-border hover:bg-pastel-blue-border/40 text-left transition-colors"
          >
            🎓 Student User
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('employee@company.com', 'Password123!')}
            className="p-2 rounded-xl bg-pastel-lavender-light text-pastel-lavender-text font-medium border border-pastel-lavender-border hover:bg-pastel-lavender-border/40 text-left transition-colors"
          >
            💼 Employee User
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('analyst@sentriai.io', 'Password123!')}
            className="p-2 rounded-xl bg-purple-50 text-purple-700 font-medium border border-purple-200 hover:bg-purple-100 text-left transition-colors"
          >
            🛡️ SOC Analyst
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@sentriai.io', 'Password123!')}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200 hover:bg-slate-200 text-left transition-colors"
          >
            ⚙️ SOC Admin
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <button
          onClick={() => setCurrentTab('register')}
          className="text-pastel-lavender-text font-semibold hover:underline"
        >
          Create account
        </button>
      </div>
    </div>
  );
};
