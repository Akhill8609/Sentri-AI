import React from 'react';
import { Shield, GraduationCap, Briefcase, UserCheck, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, userMode, setUserMode, logout, quickSwitchUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pastel-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
          <img src="/sentriai-icon.jpg" alt="SentriAI" className="w-10 h-10 rounded-xl shadow-soft object-cover" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-pastel-text tracking-tight">SentriAI</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border">
                AI Companion
              </span>
            </div>
            <p className="text-xs text-pastel-muted hidden sm:block">Your Intelligent Digital Security Companion</p>
          </div>
        </div>

        {/* Center / Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 shadow-inner">
            <button
              onClick={() => setUserMode('STUDENT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                userMode === 'STUDENT'
                  ? 'bg-white text-pastel-blue-text shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Mode</span>
            </button>
            <button
              onClick={() => setUserMode('EMPLOYEE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                userMode === 'EMPLOYEE'
                  ? 'bg-white text-pastel-lavender-text shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Employee Mode</span>
            </button>
          </div>

          <button
            onClick={() => setCurrentTab('ai-assistant')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border hover:bg-pastel-lavender-border/40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-pastel-lavender-main" />
            <span>Ask Security AI</span>
          </button>
        </div>

        {/* User / Profile Controls */}
        <div className="relative">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-pastel-mint-light border border-pastel-mint-border text-pastel-mint-text flex items-center justify-center font-semibold text-xs">
                  {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-none">{user.full_name}</div>
                  <div className="text-[10px] text-pastel-muted capitalize">{user.role.toLowerCase().replace('_', ' ')}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 top-full w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-pastel-mint-light text-pastel-mint-text border border-pastel-mint-border">
                      {user.role}
                    </span>
                  </div>

                  {/* Fast Demo Role Switcher */}
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Fast Demo Switcher</p>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <button
                        onClick={() => { quickSwitchUser('student'); setShowUserMenu(false); }}
                        className="text-left px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700"
                      >
                        🎓 Student
                      </button>
                      <button
                        onClick={() => { quickSwitchUser('employee'); setShowUserMenu(false); }}
                        className="text-left px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700"
                      >
                        💼 Employee
                      </button>
                      <button
                        onClick={() => { quickSwitchUser('analyst'); setShowUserMenu(false); }}
                        className="text-left px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700"
                      >
                        🛡️ SOC Analyst
                      </button>
                      <button
                        onClick={() => { quickSwitchUser('admin'); setShowUserMenu(false); }}
                        className="text-left px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700"
                      >
                        ⚙️ Admin
                      </button>
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => { logout(); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-pastel-rose-text rounded-xl hover:bg-pastel-rose-light transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTab('login')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg"
              >
                Log In
              </button>
              <button
                onClick={() => setCurrentTab('register')}
                className="px-4 py-1.5 text-xs font-semibold bg-pastel-lavender-main text-white rounded-xl shadow-sm hover:bg-pastel-lavender-text transition-colors"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
