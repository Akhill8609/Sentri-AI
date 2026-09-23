import React, { useState } from 'react';
import { Lock, CheckCircle, AlertCircle, ArrowLeft, RotateCw, Check, X, KeyRound } from 'lucide-react';
import { api } from '../services/api';

interface ResetPasswordPageProps {
  setCurrentTab: (tab: string) => void;
  authFlowData?: { email: string };
  setAuthFlowData?: (data: { email: string }) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  setCurrentTab,
  authFlowData,
}) => {
  const [email, setEmail] = useState(authFlowData?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit recovery OTP.');
      return;
    }
    if (!isPasswordValid) {
      setError('New password does not meet the security requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        setCurrentTab('login');
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The OTP may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 card-soft bg-white">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-tr from-pastel-lavender-main to-pastel-blue-main rounded-2xl flex items-center justify-center mx-auto mb-3 text-white shadow-soft">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Set New Password</h1>
        <p className="text-slate-500 text-xs mt-1">
          Choose a strong, secure password for your SentriAI account.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-pastel-rose-light text-pastel-rose-text border border-pastel-rose-border text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Reset Failed</div>
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

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Account Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            6-Digit Recovery OTP
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter 6-digit code"
            required
            className={`w-full text-center py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition ${
              otp ? 'tracking-[0.5em] text-xl font-mono font-bold' : 'text-xs text-slate-400 placeholder-slate-400 tracking-normal'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition"
            />
          </div>
        </div>

        {/* Password Strength Checklist */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1 text-slate-600">
          <div className="font-semibold text-slate-700 mb-1">Password Requirements:</div>
          <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
            {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
            At least 8 characters
          </div>
          <div className={`flex items-center gap-1.5 ${hasUppercase && hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
            {hasUppercase && hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
            Uppercase & lowercase letters
          </div>
          <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
            {hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
            At least one number (0-9)
          </div>
          <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
            {hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
            At least one special character (!@#$%...)
          </div>
          <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
            {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
            Passwords match
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isPasswordValid || !passwordsMatch}
          className="w-full py-3 rounded-xl bg-pastel-lavender-main hover:bg-pastel-lavender-text text-white font-semibold text-xs shadow-soft transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin" /> Updating Password...
            </span>
          ) : (
            'Reset Password & Sign In'
          )}
        </button>
      </form>

      <div className="mt-5 text-center pt-4 border-t border-slate-100">
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
