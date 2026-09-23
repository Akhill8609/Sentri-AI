import React, { useState } from 'react';
import { Shield, User, Mail, Lock, ArrowRight, GraduationCap, Briefcase, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RegisterPageProps {
  setCurrentTab: (tab: string) => void;
  setAuthFlowData?: (data: { email: string }) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ setCurrentTab, setAuthFlowData }) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [userMode, setUserMode] = useState('STUDENT');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Password does not meet the security criteria.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        full_name: fullName,
        email,
        password,
        confirm_password: confirmPassword,
        role,
        user_mode: userMode
      });

      if (setAuthFlowData) {
        setAuthFlowData({ email });
      }

      // If already verified or immediate token, go to dashboard, otherwise go to verify-email
      if (res.is_verified || res.access_token) {
        setCurrentTab('dashboard');
      } else {
        setCurrentTab('verify-email');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 card-soft bg-white">
      <div className="text-center mb-6">
        <img src="/sentriai-icon.jpg" alt="SentriAI" className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-soft object-cover" />
        <h2 className="text-2xl font-bold text-slate-900">Create your Account</h2>
        <p className="text-xs text-slate-500 mt-1">Join SentriAI — Your Intelligent Digital Security Companion</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-pastel-rose-light text-pastel-rose-text border border-pastel-rose-border text-xs">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Rivera"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@university.edu"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition-all"
            />
          </div>
        </div>

        {/* Live Password Strength Checklist */}
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

        {/* Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUserMode('STUDENT')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                userMode === 'STUDENT'
                  ? 'bg-pastel-blue-light border-pastel-blue-border text-pastel-blue-text font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => setUserMode('EMPLOYEE')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                userMode === 'EMPLOYEE'
                  ? 'bg-pastel-lavender-light border-pastel-lavender-border text-pastel-lavender-text font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Employee</span>
            </button>
          </div>
        </div>

        {/* Role Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Role Permission</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main transition-all bg-white"
          >
            <option value="USER">Standard User (Student / Employee)</option>
            <option value="SOC_ANALYST">SOC Analyst (Incident Triage & Investigation)</option>
            <option value="ADMIN">System Administrator (Full Controls & KB)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isPasswordValid || !passwordsMatch}
          className="w-full py-3 rounded-xl bg-pastel-lavender-main hover:bg-pastel-lavender-text text-white font-semibold text-xs shadow-soft transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          {isLoading ? <span>Sending Verification OTP...</span> : (
            <>
              <span>Create Account & Verify OTP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Already have an account?{' '}
        <button
          onClick={() => setCurrentTab('login')}
          className="text-pastel-lavender-text font-semibold hover:underline"
        >
          Sign in
        </button>
      </div>
    </div>
  );
};
