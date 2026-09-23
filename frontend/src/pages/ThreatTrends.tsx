import React, { useEffect, useState } from 'react';
import { TrendingUp, BarChart, ShieldAlert, RefreshCw, Calendar } from 'lucide-react';
import { api } from '../services/api';

export const ThreatTrends: React.FC = () => {
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await api.getTrends();
        setTrends(res);
      } catch (e) {
        console.error("Trends error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, []);

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
            <TrendingUp className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
            Telemetry Analytics
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Threat Trends & Attack Patterns
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Longitudinal insights into phishing vectors, recurring lures, and campaign IOCs
        </p>
      </div>

      {/* Weekly Trend Bar Simulation */}
      <div className="card-soft p-6 bg-white">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Weekly Attack Vector Activity</h3>
            <p className="text-xs text-slate-400">Aggregated incidents across days of week</p>
          </div>
          <Calendar className="w-4 h-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {trends?.weekly_trend?.map((item: any, idx: number) => {
            const total = item.phishing + item.scams + item.credential_harvesting;
            const max = 70;
            const heightPct = Math.round((total / max) * 100);

            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="text-[11px] font-bold text-slate-700">{total}</div>
                <div className="w-full bg-slate-100 rounded-xl h-40 flex flex-col justify-end p-1 overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-purple-600 via-indigo-500 to-pastel-blue-main rounded-lg transition-all duration-700"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600">{item.day}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-600"></span>
            <span>Credential Harvesting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-500"></span>
            <span>Urgency Phishing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-pastel-blue-main"></span>
            <span>Financial / Scholarship Scams</span>
          </div>
        </div>
      </div>

      {/* Top Indicators Frequency */}
      <div className="card-soft p-6 bg-white">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Most Frequent Threat Indicators</h3>
        <div className="space-y-3">
          {trends?.top_indicators?.map((ind: any, idx: number) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-800">{ind.indicator}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold font-mono">
                {ind.count} occurrences
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
