import React from 'react';
import { Shield, Sparkles, GraduationCap, Briefcase, Lock, ArrowRight, CheckCircle2, Search, Cpu, FileSearch, HelpCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  setCurrentTab: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setCurrentTab }) => {
  const { quickSwitchUser } = useAuth();

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-10 pb-6 text-center max-w-4xl mx-auto px-4">
        <img src="/sentriai-logo.jpg" alt="SentriAI" className="w-28 h-28 mx-auto mb-6 rounded-2xl object-cover drop-shadow-lg" />
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pastel-lavender-light border border-pastel-lavender-border text-pastel-lavender-text text-xs font-semibold mb-6 shadow-xs">
          <img src="/sentriai-icon.jpg" alt="" className="w-4 h-4 rounded-sm object-cover" />
          <span>SENTRIAI • Your Intelligent Digital Security Companion</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Calm, Intelligent Digital Safety. <br />
          <span className="bg-gradient-to-r from-pastel-lavender-main via-indigo-600 to-pastel-blue-main bg-clip-text text-transparent">
            Built for Students & Workplace Teams.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          SentriAI investigates suspicious emails, scholarship offers, HR alerts, and phishing links. 
          Powered by real tool-calling AI agents, verified digital safety handbooks, and clear, transparent guidance.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setCurrentTab('analyze-message')}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pastel-lavender-main to-indigo-600 text-white font-semibold text-sm shadow-soft hover:shadow-soft-hover transition-all flex items-center gap-2"
          >
            <span>Check Something Suspicious</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTab('register')}
            className="px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-pastel-lavender-main" />
            <span>Explore SentriAI</span>
          </button>
        </div>

        {/* 4-Step Visual Flow */}
        <div className="mt-12 max-w-3xl mx-auto bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
            How SentriAI Protects You
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-pastel-blue-light text-pastel-blue-text flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
              <div>
                <div className="text-xs font-bold text-slate-800">Submit</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Paste text, email, or URL you received.</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-pastel-lavender-light text-pastel-lavender-text flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
              <div>
                <div className="text-xs font-bold text-slate-800">AI Investigates</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Autonomous tools inspect domain & intent.</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-pastel-peach-light text-pastel-peach-text flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
              <div>
                <div className="text-xs font-bold text-slate-800">Understand</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Plain-language explanation & score rubric.</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-pastel-mint-light text-pastel-mint-text flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
              <div>
                <div className="text-xs font-bold text-slate-800">Stay Safe</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Immediate steps to prevent compromise.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Demo Launchers */}
        <div className="mt-8 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft max-w-xl mx-auto text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
            One-Click Instant Demo Profiles
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              onClick={() => quickSwitchUser('student')}
              className="p-2.5 rounded-xl bg-pastel-blue-light/60 hover:bg-pastel-blue-light border border-pastel-blue-border text-pastel-blue-text font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>
            <button
              onClick={() => quickSwitchUser('employee')}
              className="p-2.5 rounded-xl bg-pastel-lavender-light/60 hover:bg-pastel-lavender-light border border-pastel-lavender-border text-pastel-lavender-text font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Briefcase className="w-4 h-4" />
              <span>Employee</span>
            </button>
            <button
              onClick={() => quickSwitchUser('analyst')}
              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>SOC Analyst</span>
            </button>
            <button
              onClick={() => quickSwitchUser('admin')}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-soft p-6 bg-gradient-to-br from-white to-pastel-blue-light/30 border-pastel-blue-border/40">
          <div className="w-10 h-10 rounded-2xl bg-pastel-blue-light text-pastel-blue-text flex items-center justify-center font-bold mb-4">
            <GraduationCap className="w-5 h-5 text-pastel-blue-main" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">Student Digital Safety</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tailored guidance for fake scholarship rewards, bogus internship placement offers, exam fee scams, and university credential harvesting.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-pastel-blue-text">
            <span>₹50,000 Scholarship Lure Ready</span>
          </div>
        </div>

        <div className="card-soft p-6 bg-gradient-to-br from-white to-pastel-lavender-light/30 border-pastel-lavender-border/40">
          <div className="w-10 h-10 rounded-2xl bg-pastel-lavender-light text-pastel-lavender-text flex items-center justify-center font-bold mb-4">
            <Cpu className="w-5 h-5 text-pastel-lavender-main" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">Autonomous Agent Orchestration</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Not a simple chatbot. SentriAI agent dynamically invokes 12 purpose-built tools: domain inspection, message heuristics, threat logs, and RAG retrieval.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-pastel-lavender-text">
            <span>Calm 0–100 Assessment Rubric</span>
          </div>
        </div>

        <div className="card-soft p-6 bg-gradient-to-br from-white to-purple-50/40 border-purple-200/50">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">SOC Analyst Command Center</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Human-in-the-loop oversight. Analysts review agent evidence, inspect tool call traces, evaluate playbooks, and approve containment actions.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-purple-700">
            <span>Simulate Perimeter Defenses</span>
          </div>
        </div>
      </section>

      {/* Trust reassurance banner */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-pastel-mint-main text-xs font-bold uppercase tracking-wider mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Safe & Non-Destructive</span>
            </div>
            <h4 className="text-lg font-bold">Have an urgent suspicious link or message?</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
              Paste it into SentriAI. We safely isolate URLs and check credentials without exposing your accounts or devices.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('analyze-message')}
            className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            Start Safe Inspection
          </button>
        </div>
      </section>

    </div>
  );
};
