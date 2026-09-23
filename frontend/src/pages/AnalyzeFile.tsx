import React, { useState } from 'react';
import { FileCheck, Upload, RefreshCw, ArrowRight, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RiskBreakdownCard } from '../components/incident/RiskBreakdownCard';
import { ActionPlanCard } from '../components/incident/ActionPlanCard';
import { AgentInvestigationCard } from '../components/agent/AgentInvestigationCard';
import { RagSourcesCard } from '../components/rag/RagSourcesCard';

interface AnalyzeFileProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const AnalyzeFile: React.FC<AnalyzeFileProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const { userMode } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleSimulateRiskyFile = () => {
    const mockFile = new File(["MZ9000... simulated executable payload"], "Resume_Internship_Offer_2026.scr", { type: "application/x-msdownload" });
    setFile(mockFile);
    setNotes("Received as an unsolicited email attachment claiming to be a scholarship acceptance form.");
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError(null);
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('notes', notes);
    formData.append('user_mode', userMode);

    try {
      const res = await api.analyzeFile(formData);
      setResult(res);
      if (res.incident_id) {
        setSelectedIncidentId(res.incident_id);
      }
    } catch (err: any) {
      setError(err.message || 'File analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-pastel-peach-light text-pastel-peach-text border border-pastel-peach-border">
            <FileCheck className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            AI-Assisted Suspicious File Assessment
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Analyze Suspicious File / Attachment
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Perform non-destructive static heuristics on suspicious files. We never execute uploaded binaries.
        </p>
      </div>

      <div className="card-soft p-4 bg-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Quick Demo File Scenario
        </p>
        <button
          type="button"
          onClick={handleSimulateRiskyFile}
          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-pastel-peach-light hover:border-pastel-peach-border hover:text-pastel-peach-text border border-slate-200 text-slate-700 text-xs font-medium transition-all text-left"
        >
          📁 Simulate Suspicious Resume (.scr executable script attachment)
        </button>
      </div>

      <div className="card-soft p-6 bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 hover:border-pastel-peach-border rounded-2xl p-6 text-center transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-700">
              {file ? (
                <span className="text-pastel-lavender-text font-bold font-mono">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              ) : (
                <span>Drag & drop file or click to select</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Accepts documents, archives, images, or suspect files</p>
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="mt-3 inline-block px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Choose File
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Context Notes (Where did you get this file?)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Attached to an unsolicited job recruitment email asking me to extract and run it."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-peach-main/40 focus:border-pastel-peach-main transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-400">
              Safety notice: Uploaded content is analyzed via safe metadata and byte heuristics only.
            </p>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pastel-peach-main to-amber-600 text-white font-semibold text-xs shadow-soft hover:shadow-soft-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inspecting File...</span>
                </>
              ) : (
                <>
                  <span>Run File Assessment</span>
                  <FileCheck className="w-3.5 h-3.5" />
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assessment Complete</span>
              <h3 className="text-base font-bold text-slate-900">{result.threat_classification.replace(/_/g, ' ')}</h3>
              <p className="text-xs text-slate-500 font-mono">Case: {result.incident_code}</p>
            </div>
            <button
              onClick={() => {
                setSelectedIncidentId(result.incident_id);
                setCurrentTab('incident-details');
              }}
              className="px-4 py-2 rounded-xl bg-pastel-peach-light text-pastel-peach-text border border-pastel-peach-border font-semibold text-xs hover:bg-pastel-peach-border/40 transition-colors flex items-center gap-1.5"
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
