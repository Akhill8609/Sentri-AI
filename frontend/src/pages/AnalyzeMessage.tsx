import React, { useState } from 'react';
import { MessageSquare, Sparkles, Send, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RiskBreakdownCard } from '../components/incident/RiskBreakdownCard';
import { ActionPlanCard } from '../components/incident/ActionPlanCard';
import { AgentInvestigationCard } from '../components/agent/AgentInvestigationCard';
import { RagSourcesCard } from '../components/rag/RagSourcesCard';

interface AnalyzeMessageProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const AnalyzeMessage: React.FC<AnalyzeMessageProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const { userMode } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Quick Demo Pills
  const sampleScenarios = [
    {
      title: "₹50,000 Scholarship Phishing (Primary Demo)",
      text: "Congratulations! You have been selected for a ₹50,000 scholarship. Claim your scholarship by logging into this link: http://scholarship-portal.xyz/login within 24 hours."
    },
    {
      title: "Fake Internship / Job Placement Offer",
      text: "Dear Student, your profile has been shortlisted for a Google Partner Remote Internship ($800/mo). Confirm your acceptance and verify your student ID here: http://intern-placement-verify.top/auth immediately."
    },
    {
      title: "Exam Results Withheld Urgent SMS",
      text: "University Registrar Alert: Your semester grades have been withheld due to an administrative fee dispute. Pay ₹1,500 now at http://univ-fees-portal.tk/pay or your enrollment will be cancelled."
    }
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await api.analyzeMessage({
        content,
        user_mode: userMode
      });
      setResult(res);
      if (res.incident_id) {
        setSelectedIncidentId(res.incident_id);
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border">
            <MessageSquare className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            SMS / Chat / Messaging Inspection
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Analyze Suspicious Message
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Paste any SMS, WhatsApp, Discord, or chat message. Our AI agent will extract links, analyze urgency tactics, retrieve RAG security playbooks, and calculate an explainable risk score.
        </p>
      </div>

      {/* Preset Scenario Pills */}
      <div className="card-soft p-4 bg-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          1-Click Realistic Demo Scenarios
        </p>
        <div className="flex flex-wrap gap-2">
          {sampleScenarios.map((sc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setContent(sc.text);
                setResult(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-pastel-lavender-light hover:border-pastel-lavender-border hover:text-pastel-lavender-text border border-slate-200 text-slate-700 text-xs font-medium transition-all text-left"
            >
              ⚡ {sc.title}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="card-soft p-6 bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Message Text or Notification Content
            </label>
            <textarea
              rows={5}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the suspicious message here (e.g. Congratulations! You won a ₹50,000 scholarship...)"
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main/40 focus:border-pastel-lavender-main font-sans leading-relaxed transition-all resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-400">
              Safe & confidential. AI agent isolates links and runs non-destructive inspections.
            </p>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pastel-lavender-main to-indigo-600 text-white font-semibold text-xs shadow-soft hover:shadow-soft-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Agent Investigating...</span>
                </>
              ) : (
                <>
                  <span>Run AI SOC Investigation</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-pastel-rose-light text-pastel-rose-text border border-pastel-rose-border text-xs">
          {error}
        </div>
      )}

      {/* Investigation Results */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Header Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Investigation Complete</span>
              <h3 className="text-base font-bold text-slate-900">{result.threat_classification.replace(/_/g, ' ')}</h3>
              <p className="text-xs text-slate-500 font-mono">Case: {result.incident_code}</p>
            </div>
            <button
              onClick={() => {
                setSelectedIncidentId(result.incident_id);
                setCurrentTab('incident-details');
              }}
              className="px-4 py-2 rounded-xl bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border font-semibold text-xs hover:bg-pastel-lavender-border/40 transition-colors flex items-center gap-1.5"
            >
              <span>View in SOC Inspector</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. Risk Breakdown Card */}
          <RiskBreakdownCard
            score={result.risk_score}
            severity={result.severity}
            confidence={result.confidence}
            breakdown={result.risk_breakdown || []}
          />

          {/* 2. Prominent "What Should I Do Now?" Action Plan */}
          <ActionPlanCard
            actions={result.recommended_actions || []}
          />

          {/* 3. Autonomous Agent Investigation Trace */}
          <AgentInvestigationCard
            summary={result.agent_summary}
            conclusion={result.final_conclusion}
            toolCalls={result.tool_call_traces || []}
          />

          {/* 4. RAG Knowledge Attribution */}
          <RagSourcesCard
            sources={result.rag_sources || []}
          />

        </div>
      )}

    </div>
  );
};
