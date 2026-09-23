import React, { useEffect, useState } from 'react';
import { ListTodo, ArrowRight, ShieldCheck, RefreshCw, Clock } from 'lucide-react';
import { api } from '../services/api';
import { RiskBadge, StatusBadge } from '../components/common/Badges';

interface MyIncidentsProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const MyIncidents: React.FC<MyIncidentsProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyIncidents = async () => {
      try {
        const data = await api.getMyIncidents();
        setIncidents(data);
      } catch (e) {
        console.error("Error fetching my incidents:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMyIncidents();
  }, []);

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border">
              <ListTodo className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Personal Threat Reports
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">My Reported Incidents</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            History of all communications analyzed and registered by SentriAI
          </p>
        </div>
        <button
          onClick={() => setCurrentTab('analyze-message')}
          className="px-4 py-2 rounded-xl bg-pastel-lavender-main text-white text-xs font-semibold hover:bg-pastel-lavender-text transition-colors self-start sm:self-auto"
        >
          + Submit New Threat
        </button>
      </div>

      {loading ? (
        <div className="card-soft p-12 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-pastel-lavender-main mx-auto mb-2" />
          <span>Loading your incidents...</span>
        </div>
      ) : incidents.length === 0 ? (
        <div className="card-soft p-12 text-center text-slate-500 text-xs">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-800 mb-1">No reported incidents</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-4">
            You haven't submitted any suspicious emails or messages yet. If you encounter something unusual, submit it for instant AI triage.
          </p>
          <button
            onClick={() => setCurrentTab('analyze-message')}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
          >
            Analyze First Message
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => {
                setSelectedIncidentId(inc.id);
                setCurrentTab('incident-details');
              }}
              className="card-soft p-5 bg-white hover:border-pastel-lavender-border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-pastel-lavender-text bg-pastel-lavender-light px-2 py-0.5 rounded">
                    {inc.incident_id}
                  </span>
                  <StatusBadge status={inc.status} />
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {inc.incident_type}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{inc.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Threat: <strong className="text-slate-600 font-medium">{inc.threat_category?.replace(/_/g, ' ')}</strong></span>
                  {inc.created_at && (
                    <span>Logged: {new Date(inc.created_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0">
                <RiskBadge score={inc.risk_score} size="md" />
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
