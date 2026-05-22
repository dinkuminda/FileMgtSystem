import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Fingerprint, CreditCard, MapPin, Plane, 
  ShieldAlert, ArrowRight, Lock, Server, CheckCircle, 
  Database, UserCheck, PhoneCall, HelpCircle, LogIn
} from 'lucide-react';
import { EthiopiaFingerprint } from './EthiopiaFingerprint';

export default function Home() {
  const modules = [
    {
      icon: FileText,
      title: "VISA Records Tracking",
      description: "Automated digital lifecycle archiving of entry, tourist, business, work and diplomatic visa categories with rapid authorization lookup.",
      badge: "Visa Hub"
    },
    {
      icon: Fingerprint,
      title: "EOID Logs & Biometrics",
      description: "Direct linking of Electronic Official Identification profiles and secure reference parameters for automated operational verification.",
      badge: "Biometrics"
    },
    {
      icon: CreditCard,
      title: "Residence ID Register",
      description: "Permanent and temporary residence document monitoring, expiration alerts, status verification, and foreign national record filing.",
      badge: "Residence"
    },
    {
      icon: MapPin,
      title: "ETD Records Module",
      description: "Processing and cataloging of Emergency Travel Documents, facilitating consular support pipelines and secure cross-border permits.",
      badge: "Consular"
    },
    {
      icon: Plane,
      title: "Bole Airport Border Logs",
      description: "Continuous real-time passenger transit logging, border status checks, and instant authorization sync for Bole International checkpoints.",
      badge: "Border Control"
    }
  ];

  const features = [
    {
      icon: Lock,
      title: "Military-Grade Security",
      detail: "End-to-end data encryption with automatic Supabase Row-Level Security (RLS) enforcement on all agency tables."
    },
    {
      icon: Database,
      title: "Auditable Actions",
      detail: "Every interaction, deletion, file change, or login triggers an immutable cryptographic logging trail."
    },
    {
      icon: UserCheck,
      title: "Granular Controls",
      detail: "Role-Based Access Control (RBAC) ensuring staff only toggle records within their assigned state borders."
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#1e40af] selection:text-white">
      {/* Top Header navbar */}
      <header className="border-b border-slate-200/80 backdrop-blur-md bg-white/80 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 select-none">
            <EthiopiaFingerprint className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-sm flex-shrink-0" />
            <div className="text-2xl sm:text-4xl font-black text-[#1b54ac] tracking-tighter leading-none select-none">
              ICS
            </div>
            <div className="w-px h-8 sm:h-10 bg-slate-200/80 mx-1 sm:mx-2" />
            <div className="flex flex-col justify-center">
              <h1 className="text-slate-900 font-extrabold text-xs sm:text-base tracking-tight leading-tight">የኢሚግሬሽንና የዜግነት አገልግሎት</h1>
              <p className="text-[8px] sm:text-[11px] text-[#1b54ac] uppercase tracking-[0.08em] mt-0.5 sm:mt-1 font-black">Immigration and Citizenship Services</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to="/login"
              className="px-5 py-2.5 bg-[#1b54ac] hover:bg-[#164894] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.98] shadow-sm shadow-blue-500/15"
            >
              Staff Portal <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-18 px-6 bg-gradient-to-b from-white to-[#f8fafc]">
        {/* Subtle light blue radial reflection */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-[#1b54ac] rounded-full border border-blue-100 text-xs font-bold tracking-wide uppercase">
            <Server className="w-3.5 h-3.5" /> SECURE RECORDS SYSTEM
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-none">
            ICS Digital File <br />
            <span className="bg-gradient-to-r from-[#1b54ac] via-[#3b82f6] to-[#047857] bg-clip-text text-transparent">
              Management Portal
            </span>
          </h2>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            Centralized document tracking, identity verification, and border logging suite supporting modern cryptographic security and strict institutional audits.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-[#1b54ac] hover:bg-[#164894] text-white text-base font-bold rounded-2xl shadow-xl shadow-blue-500/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <LogIn className="w-5 h-5" /> Sign In to System
            </Link>
            <a 
              href="#modules"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 text-base font-bold rounded-2xl border border-slate-200 transition-all text-center"
            >
              Explore Modules
            </a>
          </div>
        </div>
      </section>

      {/* Quick Status / Metrics Band */}
      <section className="border-y border-slate-200 bg-white py-8 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">42,912+</p>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Records</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-[#10b981]">99.99%</p>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Uptime SLA</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">&lt; 150ms</p>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Query Latency</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">100%</p>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Audit Traceability</p>
          </div>
        </div>
      </section>

      {/* Core Modules Grid */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-24 space-y-16">
        <div className="text-center space-y-4">
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Core Modules</h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto font-medium">
            Authorized personnel can access and process biometric security and travel validation parameters across five main operation hubs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, idx) => (
            <div 
              key={idx}
              className="p-8 bg-white rounded-3xl border border-slate-200/80 hover:border-blue-200 hover:shadow-lg transition-all hover:-translate-y-1 duration-300 relative group flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-[#1b54ac]/5 group-hover:border-[#1b54ac]/20 transition-all">
                    <m.icon className="w-6 h-6 text-[#1b54ac]" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#1b54ac] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {m.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#1b54ac] transition-colors">{m.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{m.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Detail Component */}
      <section className="bg-[#f1f5f9]/50 border-t border-slate-200 py-24">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <div className="lg:col-span-1 space-y-6 text-left">
            <span className="text-xs font-extrabold text-[#1b54ac] uppercase tracking-[0.2em] bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
              Operational Standards
            </span>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Designed for Institutional Integrity
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              The ICS platform complies with regulatory requirements for storing and processing national travel logs, providing maximum speed without compromising sensitive private data.
            </p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                <f.icon className="w-8 h-8 text-[#10b981]" />
                <h4 className="font-bold text-slate-900 text-base">{f.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer support details */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <EthiopiaFingerprint className="w-6 h-6 opacity-80" />
            <span className="text-xs text-slate-500 font-bold">
              © {new Date().getFullYear()} ICS (Immigration and Citizenship Services). For Internal Staff Use Only.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-bold">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Authorized Connection Secure</span>
            <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 opacity-70" /> Support: support.fms@ics.gov.et</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
