import React from 'react';
import { AlertCircle, ShieldAlert, CheckCircle } from 'lucide-react';
import { RiskBadge } from '../common/Badges';

interface RiskBreakdownCardProps {
  score: number;
  severity: string;
  confidence?: number;
  breakdown: Array<{
    indicator: string;
    points: number;
    explanation: string;
  }>;
}

export const RiskBreakdownCard: React.FC<RiskBreakdownCardProps> = ({
  score,
  severity,
  confidence = 0.90,
  breakdown
}) => {
  return (
    <div className="card-soft p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-pastel-lavender-main" />
            <h3 className="font-bold text-slate-900 text-base">Explainable Risk Assessment</h3>
          </div>
          <p className="text-xs text-slate-500">
            Transparent scoring calculated from verified observable security indicators
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 leading-none">{score}<span className="text-sm font-normal text-slate-400">/100</span></div>
            <div className="text-[10px] text-slate-400 font-medium">Confidence: {Math.round(confidence * 100)}%</div>
          </div>
          <RiskBadge score={score} size="lg" />
        </div>
      </div>

      {/* Visual Meter Bar */}
      <div className="mt-5 mb-6">
        <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1.5">
          <span>0 (Safe)</span>
          <span>30 (Low)</span>
          <span>60 (Medium)</span>
          <span>80 (High)</span>
          <span>100 (Critical)</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 flex">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              score > 80 ? 'bg-gradient-to-r from-amber-400 to-rose-500' :
              score > 60 ? 'bg-gradient-to-r from-amber-300 to-rose-400' :
              score > 30 ? 'bg-gradient-to-r from-emerald-400 to-amber-400' :
              'bg-gradient-to-r from-emerald-400 to-emerald-500'
            }`}
            style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
          />
        </div>
      </div>

      {/* Itemized Indicator Rubric */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Observable Threat Indicators</h4>
        {breakdown.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>No malicious or deceptive indicators detected. Content matches expected safe correspondence.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/80 hover:bg-white hover:border-slate-200 transition-all text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    +{item.points}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-800">{item.indicator}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{item.explanation}</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shadow-2xs flex-shrink-0">
                  Indicator
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
