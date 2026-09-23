import React from 'react';
import { CheckCircle2, Shield, Lock, Eye, AlertOctagon, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SecurityRecommendations: React.FC = () => {
  const { userMode } = useAuth();
  const isStudent = userMode === 'STUDENT';

  const recommendations = isStudent ? [
    {
      icon: Lock,
      title: "Protect Your University Single Sign-On (SSO)",
      description: "Never enter your university student ID or password on any site other than the verified campus domain (look for your university's exact URL in the address bar).",
      tag: "CRITICAL"
    },
    {
      icon: AlertOctagon,
      title: "Scholarships Never Require Upfront Payment",
      description: "Any scholarship, fellowship, or grant that asks for an 'application fee' or 'processing charge' is a scam. Authentic awards credit funds directly to your student ledger.",
      tag: "STUDENT RULE"
    },
    {
      icon: Smartphone,
      title: "Guard Your One-Time Passwords (OTPs)",
      description: "No university administrator, professor, or technical support member will ever ask for your OTP over phone, SMS, or Discord.",
      tag: "MFA DEFENSE"
    },
    {
      icon: Eye,
      title: "Inspect Shortened Links & QR Codes",
      description: "Scan campus flyers and Discord links carefully. Use SentriAI's 'Check Link' tool before opening unexpected shortened URLs.",
      tag: "SAFE BROWSING"
    }
  ] : [
    {
      icon: Lock,
      title: "Enforce Multi-Factor Authentication (MFA)",
      description: "Use an authenticator app (e.g. Microsoft Authenticator or Google Authenticator) rather than SMS where possible. Never approve push notifications you didn't initiate.",
      tag: "IDENTITY"
    },
    {
      icon: AlertOctagon,
      title: "Verify Invoice & Payment Routing Requests Out-of-Band",
      description: "If an email requests an urgent change to banking details or payment routing, call the vendor or client using a pre-verified directory telephone number.",
      tag: "BEC DEFENSE"
    },
    {
      icon: Smartphone,
      title: "Beware of IT Support Impersonation",
      description: "Fraudulent IT technicians often claim your mailbox is full or your account will be disabled today. Real IT never requires you to verify passwords on external websites.",
      tag: "EMPLOYEE RULE"
    },
    {
      icon: Eye,
      title: "Screen External Meeting & Calendar Invites",
      description: "Attackers often send calendar invitations with malicious links in the meeting description. Check the sender domain before accepting.",
      tag: "HYGIENE"
    }
  ];

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-pastel-mint-light text-pastel-mint-text border border-pastel-mint-border">
            <CheckCircle2 className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isStudent ? 'Campus Security Guidelines' : 'Corporate Security Posture'}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Recommended Security Practices
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Essential guidelines curated from institutional cybersecurity playbooks to safeguard your digital identity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recommendations.map((rec, idx) => {
          const Icon = rec.icon;
          return (
            <div key={idx} className="card-soft p-5 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-pastel-mint-light text-pastel-mint-text flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5 text-pastel-mint-main" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {rec.tag}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">{rec.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
