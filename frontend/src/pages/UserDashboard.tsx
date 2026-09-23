import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Mail,
  Globe,
  MessageSquare,
  FileCheck,
  Bot,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  Sparkles,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RiskBadge, StatusBadge } from '../components/common/Badges';

interface UserDashboardProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const { user, userMode } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.getUserDashboard();
        setData(res);
      } catch (e) {
        console.error("Dashboard error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [userMode]);

  const isStudent = userMode === 'STUDENT';

  return (
    <div className="space-y-8 pb-12">
      
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-pastel-lavender-light/80 via-white to-pastel-blue-light/60 border border-pastel-lavender-border/50 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isStudent
                ? 'bg-pastel-blue-light text-pastel-blue-text border-pastel-blue-border'
                : 'bg-pastel-lavender-light text-pastel-lavender-text border-pastel-lavender-border'
            }`}>
              {isStudent ? <GraduationCap className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
              <span>{isStudent ? 'Student Security Experience' : 'Enterprise Employee Experience'}</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">Auto-Triage Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Good morning 👋, {user?.full_name || 'Defender'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
            {isStudent
              ? "You're protected with AI-assisted security guidance against scholarship scams, deceptive internships, and university credential theft."
              : "You're protected with AI-assisted security guidance against spoofed HR notices, IT impersonations, and credential phishing."}
          </p>
        </div>

        {/* Posture Score Pill */}
        <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl border border-pastel-mint-border flex items-center justify-center overflow-hidden">
            <img src="/sentriai-icon.jpg" alt="SentriAI" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Security Posture</div>
            <div className="text-base font-bold text-slate-900">{data?.security_posture?.replace('_', ' ') || 'HEALTHY'}</div>
            <div className="text-[11px] text-pastel-mint-text font-medium">✓ Protected with SentriAI</div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-soft p-5 bg-white">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Submissions</div>
          <div className="text-2xl font-bold text-slate-900">{data?.total_submissions ?? 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Analyzed by AI agent</p>
        </div>
        <div className="card-soft p-5 bg-white">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Active Incidents</div>
          <div className="text-2xl font-bold text-pastel-peach-text">{data?.active_incidents ?? 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Under triage / pending</p>
        </div>
        <div className="card-soft p-5 bg-white">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Resolved Incidents</div>
          <div className="text-2xl font-bold text-pastel-mint-text">{data?.resolved_incidents ?? 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Safely mitigated</p>
        </div>
        <div className="card-soft p-5 bg-white">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Avg Risk Index</div>
          <div className="text-2xl font-bold text-slate-900">{data?.average_risk_score ?? 10}<span className="text-xs font-normal text-slate-400">/100</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Campus baseline</p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Quick Security Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => setCurrentTab('analyze-email')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-pastel-blue-border hover:bg-pastel-blue-light/30 transition-all flex flex-col items-center text-center gap-2 shadow-xs group"
          >
            <div className="w-10 h-10 rounded-xl bg-pastel-blue-light text-pastel-blue-text flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Analyze Email</span>
          </button>

          <button
            onClick={() => setCurrentTab('analyze-url')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-pastel-mint-border hover:bg-pastel-mint-light/30 transition-all flex flex-col items-center text-center gap-2 shadow-xs group"
          >
            <div className="w-10 h-10 rounded-xl bg-pastel-mint-light text-pastel-mint-text flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Check Link</span>
          </button>

          <button
            onClick={() => setCurrentTab('analyze-message')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-pastel-lavender-border hover:bg-pastel-lavender-light/30 transition-all flex flex-col items-center text-center gap-2 shadow-xs group"
          >
            <div className="w-10 h-10 rounded-xl bg-pastel-lavender-light text-pastel-lavender-text flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Analyze Message</span>
          </button>

          <button
            onClick={() => setCurrentTab('analyze-file')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-pastel-peach-border hover:bg-pastel-peach-light/30 transition-all flex flex-col items-center text-center gap-2 shadow-xs group"
          >
            <div className="w-10 h-10 rounded-xl bg-pastel-peach-light text-pastel-peach-text flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Check File</span>
          </button>

          <button
            onClick={() => setCurrentTab('emergency')}
            className="p-4 rounded-2xl bg-pastel-rose-light/50 border border-pastel-rose-border hover:bg-pastel-rose-light transition-all flex flex-col items-center text-center gap-2 shadow-xs group"
          >
            <div className="w-10 h-10 rounded-xl bg-pastel-rose-light text-pastel-rose-text flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-pastel-rose-text">I Clicked a Link!</span>
          </button>

          <button
            onClick={() => setCurrentTab('ai-assistant')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all flex flex-col items-center text-center gap-2 shadow-xs group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Ask Security AI</span>
          </button>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="card-soft p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Your Recent Security Analyses</h3>
            <p className="text-xs text-slate-500">Track the findings, explainable risks, and recommendations of your reports</p>
          </div>
          <button
            onClick={() => setCurrentTab('my-incidents')}
            className="text-xs font-semibold text-pastel-lavender-text hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {(!data?.recent_submissions || data.recent_submissions.length === 0) ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Sparkles className="w-8 h-8 text-pastel-lavender-main mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-700">No security incidents analyzed yet.</p>
              <p className="text-slate-400 mt-1">Submit a suspicious email, message, or URL above to start an agent investigation.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3 font-semibold">Incident Code</th>
                  <th className="pb-3 font-semibold">Title / Description</th>
                  <th className="pb-3 font-semibold">Threat Type</th>
                  <th className="pb-3 font-semibold">Risk Score</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent_submissions.map((inc: any) => (
                  <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-mono font-bold text-pastel-lavender-text">
                      {inc.incident_id}
                    </td>
                    <td className="py-3.5 max-w-xs truncate text-slate-800 font-medium">
                      {inc.title}
                    </td>
                    <td className="py-3.5 text-slate-600">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {inc.threat_category?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <RiskBadge score={inc.risk_score} size="sm" />
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedIncidentId(inc.id);
                          setCurrentTab('incident-details');
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-pastel-lavender-light hover:text-pastel-lavender-text font-semibold text-slate-600 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
