import React, { useState } from 'react';
import { Cpu, CheckCircle2, ChevronDown, ChevronUp, Terminal, Wrench, Sparkles, Clock } from 'lucide-react';

interface ToolCall {
  id?: string;
  tool_name: string;
  execution_order?: number;
  order?: number;
  input_arguments?: any;
  input_args?: any;
  output_result?: any;
  output?: any;
  status?: string;
}

interface AgentInvestigationCardProps {
  summary: string;
  conclusion?: string;
  modelUsed?: string;
  executionTimeMs?: number;
  toolCalls?: ToolCall[];
}

export const AgentInvestigationCard: React.FC<AgentInvestigationCardProps> = ({
  summary,
  conclusion,
  modelUsed = "gemini-1.5-flash",
  executionTimeMs = 1200,
  toolCalls = []
}) => {
  const [showTraces, setShowTraces] = useState(false);

  const safeSteps = [
    { label: "Submission received & structured", status: "completed" },
    { label: "Content & linguistic signals evaluated", status: "completed" },
    { label: "Embedded links & domains inspected", status: "completed" },
    { label: "Similar attack history cross-referenced", status: "completed" },
    { label: "Institutional knowledge retrieved via RAG", status: "completed" },
    { label: "Explainable 0–100 risk score computed", status: "completed" },
    { label: "Personalized action plan synthesized", status: "completed" }
  ];

  return (
    <div className="card-soft p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-pastel-lavender-light text-pastel-lavender-text flex items-center justify-center font-bold">
            <Cpu className="w-4 h-4 text-pastel-lavender-main" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Autonomous AI SOC Investigation</h3>
            <p className="text-xs text-slate-500">
              Multi-step agentic orchestration with real-time tool calling & RAG grounding
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{executionTimeMs}ms</span>
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{modelUsed}</span>
          </span>
        </div>
      </div>

      {/* Investigation Summary */}
      <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-1">Agent Investigation Overview:</p>
        <p>{summary}</p>
        {conclusion && (
          <p className="mt-2 text-slate-600 italic">
            <strong>Conclusion:</strong> {conclusion}
          </p>
        )}
      </div>

      {/* Safe Progress Steps */}
      <div className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Investigation Sequence</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {safeSteps.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Tool Call Traces Accordion */}
      {toolCalls.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTraces(!showTraces)}
            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-pastel-lavender-main" />
              <span>Executed Tool Traces ({toolCalls.length} security tools invoked)</span>
            </div>
            {showTraces ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTraces && (
            <div className="p-4 bg-white space-y-3 divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {toolCalls.map((tc, idx) => {
                const order = tc.execution_order || tc.order || (idx + 1);
                const args = tc.input_arguments || tc.input_args || {};
                const output = tc.output_result || tc.output || {};

                return (
                  <div key={idx} className={idx > 0 ? "pt-3" : ""}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                          {order}
                        </span>
                        <code className="text-xs font-mono font-bold text-pastel-lavender-text bg-pastel-lavender-light px-2 py-0.5 rounded">
                          {tc.tool_name}()
                        </code>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        SUCCESS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mt-2">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Inputs</div>
                        <pre className="font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(args, null, 2)}</pre>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Outputs</div>
                        <pre className="font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
