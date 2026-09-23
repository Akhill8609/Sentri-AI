import React, { useEffect, useState } from 'react';
import { BookOpen, Upload, Plus, Trash2, Search, Sparkles, RefreshCw, CheckCircle, Bookmark } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Document Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('PHISHING');
  const [newContent, setNewContent] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  // Query Tester
  const [testQuery, setTestQuery] = useState('How should a student handle a fake scholarship?');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const data = await api.getKnowledgeDocuments();
      setDocuments(data);
    } catch (e) {
      console.error("KB error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsIngesting(true);
    setIngestSuccess(null);
    try {
      const res = await api.ingestKnowledgeText({
        title: newTitle,
        category: newCategory,
        content: newContent
      });
      setIngestSuccess(`Document ingested and indexed into ${res.chunks_indexed} semantic vector chunks!`);
      setNewTitle('');
      setNewContent('');
      setShowAddModal(false);
      await fetchDocs();
    } catch (err: any) {
      alert(err.message || 'Ingestion failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this knowledge document and its vector chunks?")) return;
    try {
      await api.deleteKnowledgeDocument(id);
      await fetchDocs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsTesting(true);
    try {
      const res = await api.queryKnowledge({ query: testQuery, top_k: 3 });
      setTestResults(res.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-pastel-blue-light text-pastel-blue-text border border-pastel-blue-border">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Retrieval-Augmented Generation (RAG)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Security Knowledge Base & Vector Store
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Institutional guidelines, playbooks, and advisories indexed as semantic vector chunks for AI agent grounding
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-pastel-lavender-main hover:bg-pastel-lavender-text text-white text-xs font-semibold shadow-soft transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest New Document</span>
          </button>
        )}
      </div>

      {ingestSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{ingestSuccess}</span>
        </div>
      )}

      {/* Ingestion Modal */}
      {showAddModal && (
        <div className="card-soft p-6 bg-white border-2 border-pastel-lavender-border">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Ingest Security Knowledge Document</h3>
            <button onClick={() => setShowAddModal(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <form onSubmit={handleIngest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Campus Wi-Fi Security Standard"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main"
                >
                  <option value="PHISHING">Phishing & Credential Theft</option>
                  <option value="STUDENT_GUIDE">Student Security Guide</option>
                  <option value="EMPLOYEE_GUIDE">Employee Enterprise Guide</option>
                  <option value="PLAYBOOK">Incident Response Playbook</option>
                  <option value="SAFE_BROWSING">Safe Browsing & Domains</option>
                  <option value="SOCIAL_ENGINEERING">Social Engineering & MFA</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Content (Markdown or Text)</label>
              <textarea
                rows={6}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="# Document Header&#10;&#10;Explain procedures, indicators, and recommended response steps here..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pastel-lavender-main leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isIngesting}
                className="px-5 py-2 rounded-xl bg-pastel-lavender-main hover:bg-pastel-lavender-text text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {isIngesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Chunk, Embed & Ingest</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Semantic Vector Search Tester */}
      <div className="card-soft p-6 bg-gradient-to-br from-pastel-blue-light/40 via-white to-pastel-lavender-light/30 border-pastel-blue-border/40">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-pastel-blue-main" />
          <h3 className="font-bold text-slate-900 text-sm">Live Semantic Retrieval Tester</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Test the RAG vector store directly. Evaluates cosine similarity matching across indexed knowledge chunks.
        </p>

        <form onSubmit={handleTestQuery} className="flex gap-2 mb-4">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type a security question to test semantic retrieval..."
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-blue-main bg-white"
          />
          <button
            type="submit"
            disabled={isTesting || !testQuery.trim()}
            className="px-4 py-2 rounded-xl bg-pastel-blue-main text-white text-xs font-semibold hover:bg-pastel-blue-text transition-colors flex items-center gap-1.5"
          >
            {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Test Search</span>
          </button>
        </form>

        {testResults.length > 0 && (
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-200/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top Semantic Matches:</p>
            {testResults.map((m, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">{m.document_title}</span>
                  <span className="text-[10px] font-semibold text-pastel-blue-text bg-pastel-blue-light px-2 py-0.5 rounded-full border border-pastel-blue-border">
                    Match: {Math.round(m.similarity_score * 100)}%
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-2 text-[11px] font-mono leading-relaxed">{m.chunk_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="card-soft p-6 bg-white">
        <h3 className="font-bold text-slate-900 text-base mb-4">Indexed Knowledge Documents ({documents.length})</h3>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pastel-lavender-main" />
            <span>Loading knowledge repository...</span>
          </div>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-400">No documents indexed in knowledge base.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-pastel-lavender-border transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                      {doc.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-slate-500">
                      {doc.total_chunks} chunks
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{doc.title}</h4>
                  <p className="text-[11px] text-slate-500">Source: {doc.source}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Author: {doc.author}</span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-pastel-rose-text hover:text-red-700 font-semibold p-1 hover:bg-pastel-rose-light rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
