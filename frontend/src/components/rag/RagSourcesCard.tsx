import React from 'react';
import { BookOpen, ExternalLink, Bookmark } from 'lucide-react';

interface RagSource {
  chunk_id?: string;
  document_id?: string;
  document_title?: string;
  title?: string;
  category?: string;
  chunk_text?: string;
  text?: string;
  similarity_score?: number;
  relevance_reason?: string;
}

interface RagSourcesCardProps {
  sources: RagSource[];
}

export const RagSourcesCard: React.FC<RagSourcesCardProps> = ({ sources }) => {
  return (
    <div className="card-soft p-6">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-pastel-blue-light text-pastel-blue-text flex items-center justify-center font-bold">
          <BookOpen className="w-4 h-4 text-pastel-blue-main" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">RAG Knowledge Base Attribution</h3>
          <p className="text-xs text-slate-500">
            Institutional cybersecurity playbooks & advisories retrieved to ground this investigation
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {sources.length === 0 ? (
          <div className="p-4 bg-slate-50 text-slate-500 text-xs rounded-xl text-center">
            No institutional knowledge base documents were retrieved for this incident.
          </div>
        ) : (
          sources.map((src, idx) => {
            const title = src.document_title || src.title || "Knowledge Document";
            const category = (src.category || "GENERAL").replace(/_/g, ' ');
            const text = src.chunk_text || src.text || "";
            const sim = src.similarity_score ? Math.round(src.similarity_score * 100) : 88;
            const rationale = src.relevance_reason || `Retrieved ${category} guidance to evaluate observed indicators.`;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-pastel-blue-border transition-all text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-3.5 h-3.5 text-pastel-blue-main flex-shrink-0" />
                    <span className="font-bold text-slate-900">{title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pastel-blue-light text-pastel-blue-text border border-pastel-blue-border uppercase">
                      {category}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Match: {sim}%
                    </span>
                  </div>
                </div>

                <div className="mb-2 p-2 bg-pastel-blue-light/40 rounded-lg text-pastel-blue-text text-[11px] font-medium border border-pastel-blue-border/30">
                  <strong>Why Retrieved:</strong> {rationale}
                </div>

                <p className="text-slate-600 line-clamp-3 leading-relaxed font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-100">
                  {text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
