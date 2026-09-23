import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Clock,
  Cpu,
  BookOpen,
  CheckSquare,
  FileText,
  AlertTriangle,
  Send,
  CheckCircle,
  XCircle,
  Lock,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RiskBadge, SeverityBadge, StatusBadge } from '../components/common/Badges';
import { RiskBreakdownCard } from '../components/incident/RiskBreakdownCard';
import { ActionPlanCard } from '../components/incident/ActionPlanCard';
import { AgentInvestigationCard } from '../components/agent/AgentInvestigationCard';
import { RagSourcesCard } from '../components/rag/RagSourcesCard';
import { IncidentTimeline } from '../components/incident/IncidentTimeline';

interface IncidentDetailsProps {
  incidentId: string;
  setCurrentTab: (tab: string) => void;
}

export const IncidentDetails: React.FC<IncidentDetailsProps> = ({ incidentId, setCurrentTab }) => {
  const { user } = useAuth();
  const isSocOrAdmin = user?.role === 'SOC_ANALYST' || user?.role === 'ADMIN';

  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');

  // Analyst action state
  const [newNote, setNewNote] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await api.getIncidentDetail(incidentId);
      setIncident(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load incident detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) {
      fetchDetail();
    }
  }, [incidentId]);

  const handleUpdateStatus = async (newStatus: string) => {
    setIsSubmittingAction(true);
    setActionSuccess(null);
    try {
      await api.updateIncidentStatus(incident.id, newStatus, `Analyst updated status to ${newStatus}`);
      setActionSuccess(`Status successfully updated to ${newStatus}`);
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingAction(true);
    try {
      await api.addIncidentNote(incident.id, newNote);
      setNewNote('');
      setActionSuccess('Internal analyst note added to incident.');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleExecuteAction = async (actionType: string) => {
    setIsSubmittingAction(true);
    setActionSuccess(null);
    try {
      const res = await api.executeAnalystAction(incident.id, actionType);
      setActionSuccess(res.message);
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Action execution failed');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="card-soft p-12 text-center text-slate-500 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin text-pastel-lavender-main mx-auto mb-2" />
        <span>Loading incident inspector...</span>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="card-soft p-8 text-center text-xs">
        <AlertTriangle className="w-8 h-8 text-pastel-rose-text mx-auto mb-2" />
        <p className="text-slate-800 font-semibold">{error || "Incident not found."}</p>
        <button
          onClick={() => setCurrentTab('my-incidents')}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold"
        >
          Back to Incidents
        </button>
      </div>
    );
  }

  const studentTabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'evidence', label: 'Evidence & Risk Rubric', icon: Shield },
    { id: 'investigation', label: 'AI Agent Investigation', icon: Cpu },
    { id: 'knowledge', label: 'Knowledge Used (RAG)', icon: BookOpen },
    { id: 'actions', label: 'What Should I Do Now?', icon: CheckSquare },
    { id: 'timeline', label: 'Timeline Events', icon: Clock }
  ];

  const socTabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'investigation', label: 'AI Agent Investigation', icon: Cpu },
    { id: 'evidence', label: 'Evidence & Risk Rubric', icon: Shield },
    { id: 'analyst', label: 'Analyst Controls', icon: UserCheck },
    { id: 'knowledge', label: 'Knowledge Used (RAG)', icon: BookOpen },
    { id: 'timeline', label: 'Timeline Events', icon: Clock },
    { id: 'actions', label: 'What Should I Do Now?', icon: CheckSquare }
  ];

  const tabs = isSocOrAdmin ? socTabs : studentTabs;

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab(isSocOrAdmin ? 'incident-queue' : 'my-incidents')}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-pastel-lavender-text bg-pastel-lavender-light px-2.5 py-0.5 rounded-full border border-pastel-lavender-border">
                {incident.incident_id}
              </span>
              <StatusBadge status={incident.status} />
              <SeverityBadge severity={incident.severity} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{incident.title}</h1>
          </div>
        </div>

        <RiskBadge score={incident.risk_score} size="lg" />
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="card-soft p-6">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-4 text-slate-400">
              Submitted Communication Content
            </h3>
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
              {incident.submitted_content}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-soft p-6">
              <h3 className="font-bold text-slate-900 text-sm mb-2">AI Threat Summary</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{incident.ai_summary || "Automated triage executed."}</p>
            </div>
            <div className="card-soft p-6">
              <h3 className="font-bold text-slate-900 text-sm mb-2">AI Protective Recommendation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{incident.ai_recommendation || "Follow institutional guidance."}</p>
            </div>
          </div>

          <ActionPlanCard actions={incident.recommendations || []} />
        </div>
      )}

      {/* Tab 2: Evidence */}
      {activeSubTab === 'evidence' && (
        <div className="space-y-6">
          <RiskBreakdownCard
            score={incident.risk_score}
            severity={incident.severity}
            confidence={incident.confidence}
            breakdown={incident.risk_breakdown || []}
          />

          <div className="card-soft p-6">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Extracted Threat Indicators</h3>
            {incident.indicators?.length === 0 ? (
              <p className="text-xs text-slate-500">No discrete IOC indicators logged.</p>
            ) : (
              <div className="space-y-2">
                {incident.indicators.map((ind: any) => (
                  <div key={ind.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{ind.value}</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">{ind.description}</p>
                    </div>
                    <SeverityBadge severity={ind.severity} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: AI Investigation */}
      {activeSubTab === 'investigation' && (
        <AgentInvestigationCard
          summary={incident.ai_summary}
          conclusion={incident.ai_recommendation}
          modelUsed={incident.ai_investigation?.model_used}
          executionTimeMs={incident.ai_investigation?.execution_time_ms}
          toolCalls={incident.tool_calls || []}
        />
      )}

      {/* Tab 4: Knowledge Used */}
      {activeSubTab === 'knowledge' && (
        <RagSourcesCard sources={incident.ai_investigation?.rag_sources || []} />
      )}

      {/* Tab 5: Actions */}
      {activeSubTab === 'actions' && (
        <ActionPlanCard actions={incident.recommendations || []} />
      )}

      {/* Tab 6: Timeline */}
      {activeSubTab === 'timeline' && (
        <IncidentTimeline events={incident.timeline || []} />
      )}

      {/* Tab 7: Analyst Controls (SOC / Admin only) */}
      {activeSubTab === 'analyst' && isSocOrAdmin && (
        <div className="space-y-6">
          
          {/* Status Actions */}
          <div className="card-soft p-6 bg-white">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-400 mb-3">
              SOC Incident Triage Decision
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleUpdateStatus('ESCALATED')}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors"
              >
                🚨 Escalate Incident
              </button>
              <button
                onClick={() => handleUpdateStatus('RESOLVED')}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              >
                ✓ Resolve / Contain Threat
              </button>
              <button
                onClick={() => handleUpdateStatus('FALSE_POSITIVE')}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Dismiss as False Positive
              </button>
            </div>
          </div>

          {/* Human in the Loop Defensive Simulation */}
          <div className="card-soft p-6 bg-gradient-to-br from-white to-purple-50/30 border-purple-200/50">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Defensive Containment Actions (Human-in-the-Loop)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Simulate perimeter mitigations across gateway proxies and identity providers
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <button
                onClick={() => handleExecuteAction('SIMULATE_BLOCK')}
                disabled={isSubmittingAction}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-300 font-semibold text-slate-800 text-left transition-all shadow-2xs"
              >
                🛡️ Simulate Domain Block
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">Blacklist host at DNS/Perimeter proxy</div>
              </button>
              <button
                onClick={() => handleExecuteAction('REVOKE_SESSION')}
                disabled={isSubmittingAction}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-300 font-semibold text-slate-800 text-left transition-all shadow-2xs"
              >
                🔑 Simulate Token Revocation
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">Force terminate victim browser sessions</div>
              </button>
              <button
                onClick={() => handleExecuteAction('PASSWORD_RESET')}
                disabled={isSubmittingAction}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-300 font-semibold text-slate-800 text-left transition-all shadow-2xs"
              >
                🔒 Simulate Password Reset
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">Force credential invalidation on next login</div>
              </button>
            </div>
          </div>

          {/* Analyst Notes */}
          <div className="card-soft p-6">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Internal Analyst Case Notes</h3>
            
            <form onSubmit={handleAddNote} className="mb-6 space-y-3">
              <textarea
                rows={2}
                required
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add investigation findings, domain whois notes, or containment rationale..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 font-sans"
              />
              <button
                type="submit"
                disabled={isSubmittingAction || !newNote.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-700 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Analyst Note</span>
              </button>
            </form>

            <div className="space-y-3">
              {(!incident.analyst_notes || incident.analyst_notes.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No notes added yet.</p>
              ) : (
                incident.analyst_notes.map((note: any) => (
                  <div key={note.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-purple-700">{note.author_name}</span>
                      {note.created_at && <span>{new Date(note.created_at).toLocaleString()}</span>}
                    </div>
                    <p className="text-slate-800 leading-relaxed">{note.note_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
