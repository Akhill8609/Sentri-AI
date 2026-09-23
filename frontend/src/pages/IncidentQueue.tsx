import React, { useEffect, useState, useRef } from 'react';
import { Inbox, Search, Filter, RefreshCw, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { RiskBadge, SeverityBadge, StatusBadge } from '../components/common/Badges';

interface IncidentQueueProps {
  setCurrentTab: (tab: string) => void;
  setSelectedIncidentId: (id: string) => void;
}

export const IncidentQueue: React.FC<IncidentQueueProps> = ({ setCurrentTab, setSelectedIncidentId }) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const requestIdRef = useRef(0);

  // 300ms debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchIncidents = async (overrideSearch?: string) => {
    const reqId = ++requestIdRef.current;
    setIsFetching(true);
    try {
      const activeSearch = overrideSearch !== undefined ? overrideSearch : debouncedSearch;
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (activeSearch.trim()) params.search = activeSearch.trim();

      const res = await api.getIncidents(params);
      if (reqId !== requestIdRef.current) {
        return; // Stale request, ignore response
      }
      setIncidents(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      if (reqId === requestIdRef.current) {
        console.error("Queue error:", e);
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setInitialLoading(false);
        setIsFetching(false);
      }
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter, debouncedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(searchQuery);
    fetchIncidents(searchQuery);
  };

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
              <Inbox className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              SOC Analyst Queue
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Incident Triage Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} total incidents logged • Filter by status, severity, or keywords
          </p>
        </div>

        <button
          onClick={() => fetchIncidents()}
          disabled={isFetching}
          className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-purple-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-soft p-4 bg-white flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          {isFetching ? (
            <RefreshCw className="w-4 h-4 text-purple-600 animate-spin absolute left-3.5 top-3" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case ID, title, or keywords..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
          />
        </form>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="AI_ANALYSIS_COMPLETE">AI Analysis Complete</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] uppercase">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incident Queue Table */}
      <div className="card-soft p-6 bg-white">
        {initialLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
            <span>Fetching triage incidents...</span>
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-slate-700">No incidents match your filter.</p>
            <p className="text-slate-400 mt-1">Try resetting the status or severity filter.</p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Case ID</th>
                  <th className="pb-3">Source</th>
                  <th className="pb-3">Incident Title</th>
                  <th className="pb-3">Threat Category</th>
                  <th className="pb-3">Risk</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-mono font-bold text-purple-700">
                      {inc.incident_id}
                    </td>
                    <td className="py-3.5 text-slate-500 text-[11px]">
                      {inc.source}
                    </td>
                    <td className="py-3.5 max-w-xs truncate font-medium text-slate-900">
                      {inc.title}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {inc.threat_category?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <RiskBadge score={inc.risk_score} size="sm" />
                    </td>
                    <td className="py-3.5">
                      <SeverityBadge severity={inc.severity} />
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
                        className="px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-colors"
                      >
                        Inspect
                      </button>
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
