import React from 'react';
import { CheckSquare, ShieldCheck, ArrowRight, Lightbulb } from 'lucide-react';

interface ActionStep {
  order?: number;
  step_order?: number;
  title: string;
  action_type?: string;
  type?: string;
  description: string;
  rationale?: string;
}

interface ActionPlanCardProps {
  actions: ActionStep[];
  title?: string;
  subtitle?: string;
}

export const ActionPlanCard: React.FC<ActionPlanCardProps> = ({
  actions,
  title = "What Should I Do Now?",
  subtitle = "Immediate, step-by-step protective actions generated specifically for your situation"
}) => {
  return (
    <div className="card-soft p-6 border-l-4 border-l-pastel-lavender-main bg-gradient-to-br from-white via-white to-pastel-lavender-light/20">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-xl bg-pastel-lavender-light text-pastel-lavender-text flex items-center justify-center font-bold">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {actions.map((act, idx) => {
          const stepNum = act.order || act.step_order || (idx + 1);
          const actType = act.action_type || act.type || 'IMMEDIATE';
          const isImmediate = actType === 'IMMEDIATE';

          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-pastel-lavender-border transition-all flex flex-col sm:flex-row sm:items-start gap-4"
            >
              {/* Step Number Circle */}
              <div className="flex-shrink-0 flex items-center gap-2 sm:block">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                  isImmediate
                    ? 'bg-pastel-rose-light text-pastel-rose-text border border-pastel-rose-border'
                    : 'bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border'
                }`}>
                  {stepNum}
                </div>
                <span className={`sm:hidden text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isImmediate ? 'bg-rose-50 text-rose-700' : 'bg-purple-50 text-purple-700'
                }`}>
                  {actType}
                </span>
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-slate-900 text-sm">{act.title}</h4>
                  <span className={`hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isImmediate ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {actType}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                
                {act.rationale && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-pastel-lavender-text bg-pastel-lavender-light/40 px-2.5 py-1 rounded-lg border border-pastel-lavender-border/40">
                    <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 text-pastel-lavender-main" />
                    <span><strong>Why:</strong> {act.rationale}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
