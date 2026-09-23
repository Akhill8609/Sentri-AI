import React from 'react';
import { Clock, User, Bot, Shield, CheckCircle2 } from 'lucide-react';

interface TimelineEvent {
  id?: string;
  event_type: string;
  description: string;
  actor: string;
  timestamp?: string;
}

interface IncidentTimelineProps {
  events: TimelineEvent[];
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ events }) => {
  const getActorBadge = (actor: string) => {
    switch (actor) {
      case 'AI_AGENT':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-pastel-lavender-text bg-pastel-lavender-light border border-pastel-lavender-border px-2 py-0.5 rounded-full">
            <Bot className="w-3 h-3" /> AI SOC Agent
          </span>
        );
      case 'SOC_ANALYST':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
            <Shield className="w-3 h-3" /> SOC Analyst
          </span>
        );
      case 'USER':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
            <User className="w-3 h-3" /> User
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> System
          </span>
        );
    }
  };

  return (
    <div className="card-soft p-6">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">Incident Investigation Timeline</h3>
          <p className="text-xs text-slate-500">Chronological telemetry of agent execution and analyst interventions</p>
        </div>
      </div>

      <div className="mt-6 relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((ev, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-white border-2 border-pastel-lavender-main flex items-center justify-center group-hover:scale-110 transition-transform">
              <div className="w-1.5 h-1.5 rounded-full bg-pastel-lavender-main"></div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-white transition-all text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{ev.event_type.replace(/_/g, ' ')}</span>
                  {getActorBadge(ev.actor)}
                </div>
                {ev.timestamp && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed">{ev.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
