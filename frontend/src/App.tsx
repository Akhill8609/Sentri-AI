import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UserDashboard } from './pages/UserDashboard';
import { AnalyzeMessage } from './pages/AnalyzeMessage';
import { AnalyzeEmail } from './pages/AnalyzeEmail';
import { AnalyzeUrl } from './pages/AnalyzeUrl';
import { AnalyzeFile } from './pages/AnalyzeFile';
import { EmergencyCompromise } from './pages/EmergencyCompromise';
import { AiAssistant } from './pages/AiAssistant';
import { MyIncidents } from './pages/MyIncidents';
import { IncidentDetails } from './pages/IncidentDetails';
import { SecurityRecommendations } from './pages/SecurityRecommendations';
import { SocDashboard } from './pages/SocDashboard';
import { IncidentQueue } from './pages/IncidentQueue';
import { ThreatTrends } from './pages/ThreatTrends';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { UserManagement } from './pages/UserManagement';
import { AuditLogs } from './pages/AuditLogs';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('login');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [authFlowData, setAuthFlowData] = useState<{ email: string }>({ email: '' });

  // Route path to tab mapping
  const getRouteFromPath = (path: string): { tab: string; incidentId?: string } => {
    const cleanPath = path.toLowerCase().replace(/\/+$/, '') || '/';

    if (cleanPath === '/login') return { tab: 'login' };
    if (cleanPath === '/register') return { tab: 'register' };
    if (cleanPath === '/verify-email') return { tab: 'verify-email' };
    if (cleanPath === '/forgot-password') return { tab: 'forgot-password' };
    if (cleanPath === '/reset-password') return { tab: 'reset-password' };

    if (cleanPath === '/home' || cleanPath === '/dashboard') return { tab: 'dashboard' };
    if (cleanPath === '/assistant') return { tab: 'ai-assistant' };
    if (cleanPath === '/analyze/email') return { tab: 'analyze-email' };
    if (cleanPath === '/analyze/message') return { tab: 'analyze-message' };
    if (cleanPath === '/analyze/url') return { tab: 'analyze-url' };
    if (cleanPath === '/analyze/file') return { tab: 'analyze-file' };
    if (cleanPath === '/emergency') return { tab: 'emergency' };
    if (cleanPath === '/incidents') return { tab: 'my-incidents' };
    if (cleanPath.startsWith('/incidents/')) {
      const id = cleanPath.split('/incidents/')[1];
      return { tab: 'incident-details', incidentId: id };
    }
    if (cleanPath === '/checklist' || cleanPath === '/profile' || cleanPath === '/settings') {
      return { tab: 'recommendations' };
    }

    if (cleanPath === '/soc' || cleanPath === '/soc/investigation') return { tab: 'soc-dashboard' };
    if (cleanPath === '/soc/incidents') return { tab: 'incident-queue' };
    if (cleanPath.startsWith('/soc/incidents/')) {
      const id = cleanPath.split('/soc/incidents/')[1];
      return { tab: 'incident-details', incidentId: id };
    }
    if (cleanPath === '/soc/analytics') return { tab: 'threat-trends' };

    if (cleanPath === '/admin' || cleanPath === '/admin/users') return { tab: 'users' };
    if (cleanPath === '/admin/knowledge') return { tab: 'knowledge-base' };
    if (cleanPath === '/admin/audit-logs') return { tab: 'audit-logs' };

    return { tab: '' };
  };

  const getPathFromTab = (tab: string, incidentId?: string): string => {
    switch (tab) {
      case 'login': return '/login';
      case 'register': return '/register';
      case 'verify-email': return '/verify-email';
      case 'forgot-password': return '/forgot-password';
      case 'reset-password': return '/reset-password';
      case 'dashboard': return '/home';
      case 'ai-assistant': return '/assistant';
      case 'analyze-email': return '/analyze/email';
      case 'analyze-message': return '/analyze/message';
      case 'analyze-url': return '/analyze/url';
      case 'analyze-file': return '/analyze/file';
      case 'emergency': return '/emergency';
      case 'my-incidents': return '/incidents';
      case 'incident-details': return incidentId ? `/incidents/${incidentId}` : '/incidents';
      case 'recommendations': return '/checklist';
      case 'soc-dashboard': return '/soc';
      case 'incident-queue': return '/soc/incidents';
      case 'threat-trends': return '/soc/analytics';
      case 'knowledge-base': return '/admin/knowledge';
      case 'users': return '/admin/users';
      case 'audit-logs': return '/admin/audit-logs';
      case 'landing': return '/home';
      default: return '/home';
    }
  };

  // Sync state with URL and enforce authentication-first rule
  React.useEffect(() => {
    if (isLoading) return;

    const currentPath = window.location.pathname;
    const resolved = getRouteFromPath(currentPath);

    const publicTabs = ['login', 'register', 'verify-email', 'forgot-password', 'reset-password'];

    if (!user) {
      // Unauthenticated: default to /login if opening / or any protected route
      if (!resolved.tab || !publicTabs.includes(resolved.tab)) {
        setCurrentTab('login');
        if (currentPath !== '/login') {
          window.history.replaceState(null, '', '/login');
        }
      } else {
        setCurrentTab(resolved.tab);
      }
    } else {
      // Authenticated: if visiting /login, /register, or / redirect to /home
      if (!resolved.tab || publicTabs.includes(resolved.tab) || currentPath === '/') {
        setCurrentTab('dashboard');
        if (currentPath !== '/home') {
          window.history.replaceState(null, '', '/home');
        }
      } else {
        setCurrentTab(resolved.tab);
        if (resolved.incidentId) {
          setSelectedIncidentId(resolved.incidentId);
        }
      }
    }
  }, [user, isLoading]);

  // Handle browser back / forward
  React.useEffect(() => {
    const handlePopState = () => {
      const resolved = getRouteFromPath(window.location.pathname);
      const publicTabs = ['login', 'register', 'verify-email', 'forgot-password', 'reset-password'];

      if (!user) {
        if (!resolved.tab || !publicTabs.includes(resolved.tab)) {
          setCurrentTab('login');
          window.history.replaceState(null, '', '/login');
        } else {
          setCurrentTab(resolved.tab);
        }
      } else {
        if (publicTabs.includes(resolved.tab) || window.location.pathname === '/') {
          setCurrentTab('dashboard');
          window.history.replaceState(null, '', '/home');
        } else if (resolved.tab) {
          setCurrentTab(resolved.tab);
          if (resolved.incidentId) {
            setSelectedIncidentId(resolved.incidentId);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const handleSetTab = (newTab: string) => {
    const publicTabs = ['login', 'register', 'verify-email', 'forgot-password', 'reset-password'];
    if (!user && !publicTabs.includes(newTab)) {
      setCurrentTab('login');
      window.history.pushState(null, '', '/login');
      return;
    }
    setCurrentTab(newTab);
    const targetPath = getPathFromTab(newTab, selectedIncidentId);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const handleSetIncidentId = (id: string) => {
    setSelectedIncidentId(id);
    if (id) {
      setCurrentTab('incident-details');
      const targetPath = `/incidents/${id}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pastel-bg text-slate-500 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pastel-lavender-main to-pastel-blue-main animate-pulse"></div>
          <span>Loading SentriAI...</span>
        </div>
      </div>
    );
  }

  const isPublicPage =
    currentTab === 'landing' ||
    currentTab === 'login' ||
    currentTab === 'register' ||
    currentTab === 'verify-email' ||
    currentTab === 'forgot-password' ||
    currentTab === 'reset-password';


  return (
    <div className="min-h-screen flex flex-col bg-pastel-bg text-pastel-text">
      <Navbar currentTab={currentTab} setCurrentTab={handleSetTab} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar visible when logged in or inside portal tabs */}
        {(!isPublicPage || user) && (
          <Sidebar currentTab={currentTab} setCurrentTab={handleSetTab} />
        )}

        {/* Main Content Pane */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'landing' && <LandingPage setCurrentTab={handleSetTab} />}
          {currentTab === 'login' && (
            <LoginPage setCurrentTab={handleSetTab} setAuthFlowData={setAuthFlowData} />
          )}
          {currentTab === 'register' && (
            <RegisterPage setCurrentTab={handleSetTab} setAuthFlowData={setAuthFlowData} />
          )}
          {currentTab === 'verify-email' && (
            <VerifyEmailPage
              setCurrentTab={handleSetTab}
              authFlowData={authFlowData}
              setAuthFlowData={setAuthFlowData}
            />
          )}
          {currentTab === 'forgot-password' && (
            <ForgotPasswordPage
              setCurrentTab={handleSetTab}
              authFlowData={authFlowData}
              setAuthFlowData={setAuthFlowData}
            />
          )}
          {currentTab === 'reset-password' && (
            <ResetPasswordPage
              setCurrentTab={handleSetTab}
              authFlowData={authFlowData}
              setAuthFlowData={setAuthFlowData}
            />
          )}

          {currentTab === 'dashboard' && (
            <UserDashboard
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'analyze-message' && (
            <AnalyzeMessage
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'analyze-email' && (
            <AnalyzeEmail
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'analyze-url' && (
            <AnalyzeUrl
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'analyze-file' && (
            <AnalyzeFile
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'emergency' && (
            <EmergencyCompromise
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'ai-assistant' && <AiAssistant />}

          {currentTab === 'my-incidents' && (
            <MyIncidents
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'incident-details' && (
            <IncidentDetails
              incidentId={selectedIncidentId}
              setCurrentTab={handleSetTab}
            />
          )}

          {currentTab === 'recommendations' && <SecurityRecommendations />}

          {/* SOC Analyst Views */}
          {currentTab === 'soc-dashboard' && (
            <SocDashboard
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'incident-queue' && (
            <IncidentQueue
              setCurrentTab={handleSetTab}
              setSelectedIncidentId={handleSetIncidentId}
            />
          )}

          {currentTab === 'threat-trends' && <ThreatTrends />}

          {/* Admin Views */}
          {currentTab === 'knowledge-base' && <KnowledgeBase />}
          {currentTab === 'users' && <UserManagement />}
          {currentTab === 'audit-logs' && <AuditLogs />}
        </main>
      </div>

      {/* Trust Footer */}
      <footer className="border-t border-pastel-border bg-white/70 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SentriAI • Your Intelligent Digital Security Companion</span>
          <span className="text-[11px] text-slate-400">
            Intelligent AI Agent & Institutional Safety Guidance
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
