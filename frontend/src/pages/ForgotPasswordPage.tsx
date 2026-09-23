import React, { useState } from 'react';
import { Mail, ShieldCheck, ArrowLeft, RotateCw, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

interface ForgotPasswordPageProps {
  setCurrentTab: (tab: string) => void;
  authFlowData?: { email: string };
  setAuthFlowData?: (data: { email: string }) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  setCurrentTab,
  authFlowData,
  setAuthFlowData,
}) => {
  const [email, setEmail] = useState(authFlowData?.email || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.forgotPassword({ email: email.trim() });
      setSuccess('If an account exists with this email, a 6-digit recovery code has been sent. Redirecting...');
      if (setAuthFlowData) {
        setAuthFlowData({ email: email.trim() });
      }
      setTimeout(() => {
        setCurrentTab('reset-password');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset code.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 card-soft bg-white">
      {/* Header */}
      <div className="text-center mb-8">
        <img src="/sentriai-icon.jpg" alt="SentriAI" className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-soft object-cover" />
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Reset Password</h1>
        <p className="text-slate-500 text-xs mt-1">
          Enter your account email to receive a secure 6-digit recovery OTP.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-pastel-rose-light text-pastel-rose-text border border-pastel-rose-border text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Request Failed</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-5 p-3 rounded-xl bg-pastel-mint-light text-pastel-mint-text border border-pastel-mint-border text-xs flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Reset Code Sent!</div>
            <div>{success}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Registered Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              required
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-pastel-lavender-main hover:bg-pastel-lavender-text text-white font-semibold text-xs shadow-soft transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin" /> Dispatching Reset OTP...
            </span>
          ) : (
            'Send Password Reset Code'
          )}
        </button>
      </form>

      <div className="mt-6 text-center pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setCurrentTab('login')}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>
      </div>
    </div>
  );
};
