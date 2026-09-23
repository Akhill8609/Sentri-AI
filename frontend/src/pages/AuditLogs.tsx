import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, Shield } from 'lucide-react';
import { api } from '../services/api';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-200">
              <FileText className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Governance & Compliance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">System Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">Immutable record of security events, analyst decisions, and administrative actions</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="card-soft p-6 bg-white">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pastel-lavender-main" />
            <span>Fetching audit entries...</span>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No audit entries recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Actor / User</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Resource</th>
                  <th className="pb-3">Details</th>
                  <th className="pb-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-slate-400">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 text-slate-700 font-sans font-medium">
                      {l.user_email}
                    </td>
                    <td className="py-3 font-semibold text-purple-700">
                      {l.action}
                    </td>
                    <td className="py-3 text-slate-500">
                      {l.resource_type}
                    </td>
                    <td className="py-3 text-slate-600 max-w-xs truncate font-sans">
                      {JSON.stringify(l.details)}
                    </td>
                    <td className="py-3 text-slate-400">
                      {l.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
