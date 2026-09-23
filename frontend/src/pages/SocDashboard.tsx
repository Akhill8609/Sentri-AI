import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Clock, Cpu, ArrowRight, RefreshCw, BarChart2 } from 'lucide-react';
import { api } from '../services/api';
import { RiskBadge, StatusBadge } from '../components/common/Badges';

interface SocDashboardProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const SocDashboard: React.FC<SocDashboardProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSocData = async () => {
    try {
      setLoading(true);
      const res = await api.getSocDashboard();
      setData(res);
    } catch (e) {
      console.error("SOC error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocData();
  }, []);

  if (loading) {
    return (
      <div className="card-soft p-12 text-center text-slate-500 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
        <span>Loading SOC Command Center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Security Operations Centre
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            SOC Analyst Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time threat monitoring, automated agentic triage, and human-in-the-loop oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('incident-queue')}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-soft transition-colors flex items-center gap-1.5"
          >
            <span>Open Incident Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card-soft p-4 bg-white">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Incidents</div>
          <div className="text-2xl font-bold text-slate-900">{data?.total_incidents ?? 0}</div>
        </div>
        <div className="card-soft p-4 bg-white border-l-4 border-l-rose-500">
          <div className="text-[10px] uppercase font-bold text-rose-600 mb-1">Critical</div>
          <div className="text-2xl font-bold text-rose-600">{data?.critical_incidents ?? 0}</div>
        </div>
        <div className="card-soft p-4 bg-white border-l-4 border-l-amber-500">
          <div className="text-[10px] uppercase font-bold text-amber-600 mb-1">High Risk</div>
          <div className="text-2xl font-bold text-amber-600">{data?.high_risk_incidents ?? 0}</div>
        </div>
        <div className="card-soft p-4 bg-white border-l-4 border-l-purple-500">
          <div className="text-[10px] uppercase font-bold text-purple-600 mb-1">Escalated</div>
          <div className="text-2xl font-bold text-purple-700">{data?.escalated_incidents ?? 0}</div>
        </div>
        <div className="card-soft p-4 bg-white border-l-4 border-l-blue-500">
          <div className="text-[10px] uppercase font-bold text-blue-600 mb-1">Pending Review</div>
          <div className="text-2xl font-bold text-blue-600">{data?.pending_review ?? 0}</div>
        </div>
        <div className="card-soft p-4 bg-white border-l-4 border-l-emerald-500">
          <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Resolved</div>
          <div className="text-2xl font-bold text-emerald-600">{data?.resolved_incidents ?? 0}</div>
        </div>
      </div>

      {/* Two Column Section: Threat Distribution & AI Agent Engine Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Threat Distribution */}
        <div className="lg:col-span-2 card-soft p-6 bg-white">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Threat Category Breakdown</h3>
              <p className="text-xs text-slate-400">Distribution of attacks triaged campus-wide</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {(!data?.threat_distribution || data.threat_distribution.length === 0) ? (
              <p className="text-xs text-slate-400">No threat distribution telemetry available.</p>
            ) : (
              data.threat_distribution.map((cat: any, idx: number) => {
                const total = data.total_incidents || 1;
                const pct = Math.round((cat.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                      <span className="text-slate-500 font-mono">{cat.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Agent Engine Telemetry */}
        <div className="card-soft p-6 bg-gradient-to-br from-purple-50/50 via-white to-pastel-lavender-light/30 border-purple-200/50">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">AI Agent Performance</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Triage Latency</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {data?.ai_investigation_stats?.avg_investigation_time_ms || 1150} ms
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Automated Coverage</span>
              <span className="text-lg font-bold text-emerald-600 font-mono">100% of Submissions</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Engine Health</span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-600 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>OPERATIONAL</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Incident Queue Table */}
      <div className="card-soft p-6 bg-white">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Priority Incidents Requiring SOC Review</h3>
            <p className="text-xs text-slate-400">Cases escalated by AI agent due to elevated risk scores</p>
          </div>
          <button
            onClick={() => setCurrentTab('incident-queue')}
            className="text-xs font-semibold text-purple-700 hover:underline flex items-center gap-1"
          >
            <span>Full Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                <th className="pb-3">Case ID</th>
                <th className="pb-3">Incident Title</th>
                <th className="pb-3">Threat Category</th>
                <th className="pb-3">Risk</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recent_incidents?.map((inc: any) => (
                <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-mono font-bold text-purple-700">{inc.incident_id}</td>
                  <td className="py-3 max-w-sm truncate text-slate-800 font-medium">{inc.title}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      {inc.threat_category?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3">
                    <RiskBadge score={inc.risk_score} size="sm" />
                  </td>
                  <td className="py-3">
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedIncidentId(inc.id);
                        setCurrentTab('incident-details');
                      }}
                      className="px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-colors"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
