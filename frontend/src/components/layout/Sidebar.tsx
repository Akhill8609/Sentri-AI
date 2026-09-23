import React from 'react';
import {
  LayoutDashboard,
  Mail,
  MessageSquare,
  Globe,
  FileCheck,
  AlertTriangle,
  Bot,
  ListTodo,
  CheckCircle2,
  ShieldAlert,
  Inbox,
  TrendingUp,
  BookOpen,
  Users,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { user } = useAuth();
  const isSocOrAdmin = user?.role === 'SOC_ANALYST' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  const userItems = [
    { id: 'dashboard', label: 'Security Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'analyze-email', label: 'Analyze Email', icon: Mail, badge: null },
    { id: 'analyze-message', label: 'Analyze Message', icon: MessageSquare, badge: null },
    { id: 'analyze-url', label: 'Check Link / URL', icon: Globe, badge: null },
    { id: 'analyze-file', label: 'Check Attachment', icon: FileCheck, badge: null },
    { id: 'emergency', label: 'Emergency / Compromise', icon: AlertTriangle, badge: 'Urgent', badgeColor: 'bg-pastel-rose-light text-pastel-rose-text border-pastel-rose-border' },
    { id: 'ai-assistant', label: 'AI Security Assistant', icon: Bot, badge: 'RAG' },
    { id: 'my-incidents', label: 'My Incidents', icon: ListTodo, badge: null },
    { id: 'recommendations', label: 'Security Checklist', icon: CheckCircle2, badge: null },
  ];

  const socItems = [
    { id: 'soc-dashboard', label: 'SOC Operations', icon: ShieldAlert },
    { id: 'incident-queue', label: 'Incident Triage Queue', icon: Inbox },
    { id: 'threat-trends', label: 'Threat Trends', icon: TrendingUp },
  ];

  const adminItems = [
    { id: 'knowledge-base', label: 'Knowledge Base (RAG)', icon: BookOpen },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'audit-logs', label: 'Compliance Audit Logs', icon: FileText },
  ];

  const renderItem = (item: any) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setCurrentTab(item.id)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
          isActive
            ? 'bg-pastel-lavender-light text-pastel-lavender-text font-semibold border border-pastel-lavender-border shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${isActive ? 'text-pastel-lavender-main' : 'text-slate-400'}`} />
          <span>{item.label}</span>
        </div>
        {item.badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${item.badgeColor || 'bg-pastel-lavender-light text-pastel-lavender-text border-pastel-lavender-border'}`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-pastel-border min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        
        {/* User Navigation */}
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Threat Analysis</p>
          <div className="space-y-1">
            {userItems.map(renderItem)}
          </div>
        </div>

        {/* SOC Operations */}
        {isSocOrAdmin && (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pastel-lavender-text">SOC Operations</p>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">Analyst</span>
            </div>
            <div className="space-y-1">
              {socItems.map(renderItem)}
            </div>
          </div>
        )}

        {/* Administration */}
        {isAdmin && (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pastel-blue-text">Admin & Governance</p>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">Admin</span>
            </div>
            <div className="space-y-1">
              {adminItems.map(renderItem)}
            </div>
          </div>
        )}

      </div>

      {/* Trust & Safe Badge */}
      <div className="mt-8 p-3.5 rounded-2xl bg-gradient-to-br from-pastel-mint-light/60 to-pastel-blue-light/50 border border-pastel-mint-border/50 text-xs">
        <div className="flex items-center gap-2 mb-1 text-pastel-mint-text font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>SOC Shield Active</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          AI agent autonomously triaging campus and workplace threats.
        </p>
      </div>
    </aside>
  );
};
