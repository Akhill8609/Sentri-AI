import React, { useState } from 'react';
import { Globe, Search, RefreshCw, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RiskBreakdownCard } from '../components/incident/RiskBreakdownCard';
import { ActionPlanCard } from '../components/incident/ActionPlanCard';
import { AgentInvestigationCard } from '../components/agent/AgentInvestigationCard';
import { RagSourcesCard } from '../components/rag/RagSourcesCard';

interface AnalyzeUrlProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const AnalyzeUrl: React.FC<AnalyzeUrlProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const { userMode } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const sampleUrls = [
    { title: "Scholarship Phish Link", url: "http://scholarship-claim-portal.xyz/login" },
    { title: "Typosquatted Microsoft 365", url: "https://login-micr0soft-update.net/auth" },
    { title: "Raw IP Banking Scraper", url: "http://185.220.101.5/verify-account" },
    { title: "Legitimate Campus Portal", url: "https://portal.university.edu/student/login" }
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await api.analyzeUrl({
        url,
        user_mode: userMode
      });
      setResult(res);
      if (res.incident_id) {
        setSelectedIncidentId(res.incident_id);
      }
    } catch (err: any) {
      setError(err.message || 'URL inspection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-pastel-mint-light text-pastel-mint-text border border-pastel-mint-border">
            <Globe className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Deep URL & Domain Inspection
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Check Link / URL Safety
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Safely inspect web links without visiting them in your browser. We check typosquatting, deceptive subdomains, suspicious TLDs, and known threat lists.
        </p>
      </div>

      <div className="card-soft p-4 bg-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Quick Test URLs
        </p>
        <div className="flex flex-wrap gap-2">
          {sampleUrls.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setUrl(s.url);
                setResult(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-pastel-mint-light hover:border-pastel-mint-border hover:text-pastel-mint-text border border-slate-200 text-slate-700 text-xs font-medium transition-all text-left font-mono"
            >
              🔗 {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="card-soft p-6 bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              URL to Inspect
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://suspicious-link.xyz/verify-login"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-mint-main/40 focus:border-pastel-mint-main font-mono transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-400">
              Never visit unverified links directly. We simulate sandbox domain reputation checks safely.
            </p>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pastel-mint-main to-emerald-600 text-white font-semibold text-xs shadow-soft hover:shadow-soft-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inspecting URL...</span>
                </>
              ) : (
                <>
                  <span>Inspect Link</span>
                  <Search className="w-3.5 h-3.5" />
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

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inspection Complete</span>
              <h3 className="text-base font-bold text-slate-900">{result.threat_classification.replace(/_/g, ' ')}</h3>
              <p className="text-xs text-slate-500 font-mono">Case: {result.incident_code}</p>
            </div>
            <button
              onClick={() => {
                setSelectedIncidentId(result.incident_id);
                setCurrentTab('incident-details');
              }}
              className="px-4 py-2 rounded-xl bg-pastel-mint-light text-pastel-mint-text border border-pastel-mint-border font-semibold text-xs hover:bg-pastel-mint-border/40 transition-colors flex items-center gap-1.5"
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
