import React from 'react';

export const RiskBadge: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  let colorClass = 'bg-pastel-mint-light text-pastel-mint-text border-pastel-mint-border';
  let label = 'LOW';

  if (score > 80) {
    colorClass = 'bg-pastel-rose-light text-pastel-rose-text border-pastel-rose-border';
    label = 'CRITICAL';
  } else if (score > 60) {
    colorClass = 'bg-pastel-rose-light text-pastel-rose-text border-pastel-rose-border';
    label = 'HIGH';
  } else if (score > 30) {
    colorClass = 'bg-pastel-peach-light text-pastel-peach-text border-pastel-peach-border';
    label = 'MEDIUM';
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-bold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${colorClass} ${sizeClasses[size]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      <span>Risk {score}/100</span>
      <span className="opacity-70 font-normal">({label})</span>
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const sev = (severity || 'LOW').toUpperCase();
  const styles: Record<string, string> = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-300 font-bold animate-pulse-subtle'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[sev] || styles.LOW}`}>
      {sev}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const st = (status || 'NEW').toUpperCase();
  const styles: Record<string, string> = {
    NEW: 'bg-blue-50 text-blue-700 border-blue-200',
    INVESTIGATING: 'bg-purple-50 text-purple-700 border-purple-200',
    AI_ANALYSIS_COMPLETE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ESCALATED: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    FALSE_POSITIVE: 'bg-slate-100 text-slate-600 border-slate-200'
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${styles[st] || styles.NEW}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      <span>{st.replace(/_/g, ' ')}</span>
    </span>
  );
};
