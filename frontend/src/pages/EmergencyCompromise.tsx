import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, RefreshCw, ArrowRight, CheckCircle2, Lock, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RiskBreakdownCard } from '../components/incident/RiskBreakdownCard';
import { ActionPlanCard } from '../components/incident/ActionPlanCard';
import { AgentInvestigationCard } from '../components/agent/AgentInvestigationCard';
import { RagSourcesCard } from '../components/rag/RagSourcesCard';

interface EmergencyCompromiseProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const EmergencyCompromise: React.FC<EmergencyCompromiseProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const { userMode } = useAuth();
  const [scenarioText, setScenarioText] = useState("I clicked a suspicious link from an urgent message and entered my student/corporate password.");
  const [clickedLink, setClickedLink] = useState(true);
  const [credentialsEntered, setCredentialsEntered] = useState(true);
  const [downloadedFile, setDownloadedFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setError(null);
    setLoading(true);
    setResult(null);

    const description = (
      `${scenarioText}\n` +
      `User Actions Reported: Clicked Link=${clickedLink}, Entered Password=${credentialsEntered}, Downloaded File=${downloadedFile}`
    );

    try {
      const res = await api.reportCompromise({
        scenario: description,
        credentials_entered: credentialsEntered,
        clicked_link: clickedLink,
        user_mode: userMode
      });
      setResult(res);
      if (res.incident_id) {
        setSelectedIncidentId(res.incident_id);
      }
    } catch (err: any) {
      setError(err.message || 'Emergency response initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      
      <div className="p-6 rounded-3xl bg-gradient-to-r from-pastel-rose-light via-white to-pastel-peach-light border border-pastel-rose-border shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-pastel-rose-light text-pastel-rose-text border border-pastel-rose-border">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
            Emergency Incident Escalation
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Account Compromise Emergency Triage
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
          If you clicked a deceptive link, entered your password, or authorized an unsolicited prompt, our AI Agent activates the Emergency Response Playbook and notifies the SOC immediately.
        </p>
      </div>

      {/* Triage Form */}
      <div className="card-soft p-6 bg-white">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              What happened? (Describe briefly or use the default)
            </label>
            <textarea
              rows={3}
              required
              value={scenarioText}
              onChange={(e) => setScenarioText(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 font-sans leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Select What You Did:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                clickedLink ? 'bg-rose-50/70 border-rose-200 text-rose-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={clickedLink}
                  onChange={(e) => setClickedLink(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>I opened / clicked the link</span>
              </label>

              <label className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                credentialsEntered ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={credentialsEntered}
                  onChange={(e) => setCredentialsEntered(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>⚠️ I entered my password / OTP</span>
              </label>

              <label className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                downloadedFile ? 'bg-rose-50/70 border-rose-200 text-rose-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={downloadedFile}
                  onChange={(e) => setDownloadedFile(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>A file was downloaded</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Prioritized high-severity emergency routing.</span>
            </span>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Agent Activating Playbooks...</span>
                </>
              ) : (
                <>
                  <span>Trigger Immediate Containment</span>
                  <ArrowRight className="w-4 h-4" />
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

      {/* Emergency Results */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-rose-600">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                🚨 Emergency Escalated to SOC Analyst
              </span>
              <h3 className="text-base font-bold text-slate-900">{result.threat_classification.replace(/_/g, ' ')}</h3>
              <p className="text-xs text-slate-500 font-mono">Case: {result.incident_code} (Status: {result.status})</p>
            </div>
            <button
              onClick={() => {
                setSelectedIncidentId(result.incident_id);
                setCurrentTab('incident-details');
              }}
              className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs hover:bg-rose-100 transition-colors flex items-center gap-1.5"
            >
              <span>Inspect in SOC Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Plan is TOP priority for compromise */}
          <ActionPlanCard
            title="CRITICAL: Do These Steps Right Now!"
            subtitle="Follow these 4 immediate containment steps to stop active account takeover"
            actions={result.recommended_actions || []}
          />

          <RiskBreakdownCard
            score={result.risk_score}
            severity={result.severity}
            confidence={result.confidence}
            breakdown={result.risk_breakdown || []}
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
