import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, ShieldAlert, ArrowLeft, RotateCw, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface VerifyEmailPageProps {
  setCurrentTab: (tab: string) => void;
  authFlowData?: { email: string };
  setAuthFlowData?: (data: { email: string }) => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  setCurrentTab,
  authFlowData,
  setAuthFlowData,
}) => {
  const { verifyOtp } = useAuth();

  const [email, setEmail] = useState(authFlowData?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Expiry countdown: 5 minutes = 300 seconds
  const [timeLeft, setTimeLeft] = useState(300);
  // Resend cooldown: 60 seconds
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const cdTimer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(cdTimer);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await verifyOtp(email.trim(), otp.trim());
      setSuccess('Account verified successfully! Welcome to SentriAI.');
      setTimeout(() => {
        setCurrentTab('dashboard');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    setIsResending(true);
    setError('');
    try {
      await api.resendOtp({ email: email.trim() });
      setSuccess('A fresh 6-digit verification code has been dispatched to your email.');
      setResendCooldown(60);
      setTimeLeft(300);
    } catch (err: any) {
      setError(err.message || 'Verification email could not be sent. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 card-soft bg-white">
      {/* Header Branding */}
      <div className="text-center mb-8">
        <img src="/sentriai-icon.jpg" alt="SentriAI" className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-soft object-cover" />
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Verify Your Account</h1>
        <p className="text-slate-500 text-xs mt-1">
          SentriAI secures your digital identity with verified email credentials.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-pastel-rose-light text-pastel-rose-text border border-pastel-rose-border text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Verification Failed</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-5 p-3 rounded-xl bg-pastel-mint-light text-pastel-mint-text border border-pastel-mint-border text-xs flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Success!</div>
            <div>{success}</div>
          </div>
        </div>
      )}

      <div className="mb-5 p-3 rounded-xl bg-pastel-blue-light/60 text-pastel-blue-text border border-pastel-blue-border text-xs flex items-center gap-2.5">
        <Mail className="w-4 h-4 flex-shrink-0 text-pastel-blue-main" />
        <span>Verification code sent to your email. Please check your inbox.</span>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              required
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              6-Digit Security OTP
            </label>
            <span className={`text-[11px] font-medium ${timeLeft < 60 ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
              Expires in: {formatTime(timeLeft)}
            </span>
          </div>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter 6-digit code"
            required
            className={`w-full text-center py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition bg-slate-50 ${
              otp ? 'tracking-[0.5em] text-2xl font-mono font-bold' : 'text-xs text-slate-400 placeholder-slate-400 tracking-normal'
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || timeLeft === 0}
          className="w-full py-3 rounded-xl bg-pastel-lavender-main hover:bg-pastel-lavender-text text-white font-semibold text-xs shadow-soft transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
            </span>
          ) : (
            'Activate & Enter SentriAI'
          )}
        </button>
      </form>

      {/* Resend OTP Section */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">Didn't receive the email?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          className="inline-flex items-center gap-1 font-semibold text-pastel-lavender-text hover:underline disabled:text-slate-400 transition"
        >
          <RotateCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
        </button>
      </div>

      <div className="mt-4 text-center">
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
