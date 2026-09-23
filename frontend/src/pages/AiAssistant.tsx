import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, BookOpen, User, RefreshCw, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  rag_sources?: any[];
}

export const AiAssistant: React.FC = () => {
  const { user, userMode } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello ${user?.full_name?.split(' ')[0] || 'there'}! I am SentriAI, your intelligent digital security companion. Ask me anything about phishing emails, suspicious links, scholarship lures, password security, or report a situation you're unsure about.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sampleQuestions = [
    "Someone promised a ₹50,000 scholarship via SMS. Is it real?",
    "I clicked a suspicious link from an IT email. What should I do?",
    "Why does someone ask for my One-Time Password (OTP)?",
    "How can I tell if a university email is spoofed?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const newMsgs: Message[] = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chat({
        messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
        user_mode: userMode
      });

      setMessages([...newMsgs, {
        role: 'assistant',
        content: res.reply,
        rag_sources: res.rag_sources
      }]);
    } catch (err: any) {
      setMessages([...newMsgs, {
        role: 'assistant',
        content: `Error: ${err.message || "Failed to reach security AI service."}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] pb-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pastel-lavender-main to-purple-600 text-white flex items-center justify-center font-bold shadow-soft">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">AI Security Assistant</h1>
            <p className="text-xs text-slate-500">Connected to RAG Institutional Knowledge Base</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pastel-mint-light text-pastel-mint-text border border-pastel-mint-border flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Knowledge Grounded</span>
        </span>
      </div>

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              m.role === 'user'
                ? 'bg-pastel-blue-light text-pastel-blue-text border border-pastel-blue-border'
                : 'bg-pastel-lavender-light text-pastel-lavender-text border border-pastel-lavender-border'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
              m.role === 'user'
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-white border border-slate-200/80 text-slate-800'
            }`}>
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Grounding RAG Citations */}
              {m.rag_sources && m.rag_sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <BookOpen className="w-3 h-3 text-pastel-blue-main" />
                    <span>Retrieved Knowledge Sources</span>
                  </div>
                  <div className="space-y-1">
                    {m.rag_sources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-2 rounded-lg bg-pastel-blue-light/40 border border-pastel-blue-border/40 text-[11px] text-pastel-blue-text flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 font-medium truncate">
                          <Bookmark className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{src.document_title}</span>
                        </div>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white font-semibold">
                          {src.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-pastel-lavender-light text-pastel-lavender-text flex items-center justify-center text-xs font-bold border border-pastel-lavender-border">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 flex items-center gap-2 shadow-2xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-pastel-lavender-main" />
              <span>Querying RAG knowledge & analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Question Chips */}
      <div className="py-2 overflow-x-auto flex items-center gap-2 scrollbar-none">
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-full bg-white hover:bg-pastel-lavender-light border border-slate-200 hover:border-pastel-lavender-border text-slate-600 hover:text-pastel-lavender-text text-xs whitespace-nowrap transition-colors flex-shrink-0 shadow-2xs"
          >
            💬 {q}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="mt-2 bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Ask a security question, paste a link, or inquire about an incident..."
          className="flex-1 px-3 py-2 text-xs focus:outline-none text-slate-800"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-pastel-lavender-main hover:bg-pastel-lavender-text text-white transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
