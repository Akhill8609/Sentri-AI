import React, { useState } from 'react';
import { Mail, Send, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RiskBreakdownCard } from '../components/incident/RiskBreakdownCard';
import { ActionPlanCard } from '../components/incident/ActionPlanCard';
import { AgentInvestigationCard } from '../components/agent/AgentInvestigationCard';
import { RagSourcesCard } from '../components/rag/RagSourcesCard';

interface AnalyzeEmailProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const AnalyzeEmail: React.FC<AnalyzeEmailProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const { userMode } = useAuth();
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Demo Scenarios
  const sampleEmails = [
    {
      title: "Company Account Disabled Today (Demo Scenario 2)",
      sender: "IT Helpdesk <it-support@freemail-alerts.com>",
      subject: "Action Required: Your company account will be disabled today",
      body: "Your organizational Microsoft account is scheduled for immediate suspension due to security non-compliance. Verify your password immediately at https://login-company-portal.top/auth to retain access."
    },
    {
      title: "Fake HR Annual Policy & Bonus Sign-Off",
      sender: "HR Operations <hr-update@global-corporate-docs.xyz>",
      subject: "Mandatory: Review your revised compensation & leave policy",
      body: "Please log into the HR portal to sign off on your annual performance increment and revised leave policy: https://portal-hr-documents.xyz/login. Failure to sign by 5 PM will delay bonus payroll."
    },
    {
      title: "University Tuition Fee Due Urgency",
      sender: "Finance Office <accounts@univ-billing-urgent.site>",
      subject: "FINAL NOTICE: Semester balance overdue",
      body: "Your student registration will be voided unless outstanding dues are cleared within 12 hours. Pay online securely: http://univ-pay-verify.tk/student-login."
    }
  ];

  const handleSelectScenario = (sc: typeof sampleEmails[0]) => {
    setSender(sc.sender);
    setSubject(sc.subject);
    setBody(sc.body);
    setResult(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!body.trim()) return;

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await api.analyzeEmail({
        sender: sender || "Unknown Sender",
        subject: subject || "No Subject",
        body,
        user_mode: userMode
      });
      setResult(res);
      if (res.incident_id) {
        setSelectedIncidentId(res.incident_id);
      }
    } catch (err: any) {
      setError(err.message || 'Email analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-pastel-blue-light text-pastel-blue-text border border-pastel-blue-border">
            <Mail className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Email Security Triage
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Analyze Suspicious Email
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Inspect sender reputation, domain spoofing, subject urgency, and links. The AI agent cross-references corporate playbooks and scores the risk.
        </p>
      </div>

      {/* Preset Scenario Pills */}
      <div className="card-soft p-4 bg-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          1-Click Realistic Email Scenarios
        </p>
        <div className="flex flex-wrap gap-2">
          {sampleEmails.map((sc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectScenario(sc)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-pastel-blue-light hover:border-pastel-blue-border hover:text-pastel-blue-text border border-slate-200 text-slate-700 text-xs font-medium transition-all text-left"
            >
              📧 {sc.title}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="card-soft p-6 bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                From / Sender Address
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="IT Support <it-support@freemail-alerts.com>"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-blue-main/40 focus:border-pastel-blue-main transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Action Required: Your company account will be disabled today"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-blue-main/40 focus:border-pastel-blue-main transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Body Content
            </label>
            <textarea
              rows={6}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste the full email text here..."
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-blue-main/40 focus:border-pastel-blue-main font-sans leading-relaxed transition-all resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-400">
              Safe analysis. We do not trigger tracking pixels or render dangerous HTML elements.
            </p>
            <button
              type="submit"
              disabled={loading || !body.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pastel-blue-main to-indigo-600 text-white font-semibold text-xs shadow-soft hover:shadow-soft-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inspecting Email...</span>
                </>
              ) : (
                <>
                  <span>Run Email Analysis</span>
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

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
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
              className="px-4 py-2 rounded-xl bg-pastel-blue-light text-pastel-blue-text border border-pastel-blue-border font-semibold text-xs hover:bg-pastel-blue-border/40 transition-colors flex items-center gap-1.5"
            >
              <span>View in SOC Inspector</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <RiskBreakdownCard
            score={result.risk_score}
            severity={result.severity}
            confidence={result.confidence}
            breakdown={result.risk_breakdown || []}
          />

          <ActionPlanCard
            actions={result.recommended_actions || []}
          />

          <AgentInvestigationCard
            summary={result.agent_summary}
            conclusion={result.final_conclusion}
            toolCalls={result.tool_call_traces || []}
          />

          <RagSourcesCard
            sources={result.rag_sources || []}
          />

        </div>
      )}

    </div>
  );
};
