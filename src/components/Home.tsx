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
    <div className="min-h-screen bg-[#07132a] text-[#f0f4fa] flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#1b54ac] selection:text-white">
      {/* Top Header navbar */}
      <header className="border-b border-white/5 backdrop-blur-md bg-[#07132a]/80 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/10 transition-all duration-300">
              <EthiopiaFingerprint className="w-8 h-8 drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-white font-extrabold text-sm tracking-tight leading-none">የኢሚግሬሽንና የዜግነት አገልግሎት</h1>
              <p className="text-xs text-[#9fb0c7] uppercase tracking-[0.1em] mt-1">Immigration & Citizenship Service</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to="/login"
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/10 transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              Staff Portal <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6">
        {/* Subtle blur highlights behind */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-[#5490f2] rounded-full border border-blue-500/20 text-xs font-bold tracking-wide uppercase">
            <Server className="w-3.5 h-3.5" /> SECURE RECORDS SYSTEM
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
            ICS Digital File <br />
            <span className="bg-gradient-to-r from-blue-400 via-[#5490f2] to-emerald-400 bg-clip-text text-transparent">
              Management Portal
            </span>
          </h2>

          <p className="text-lg text-[#9fb0c7] max-w-2xl mx-auto font-medium leading-relaxed">
            Centralized document tracking, identity verification, and border logging suite supporting modern cryptographic security and strict institutional audits.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-[#1b54ac] hover:bg-[#164894] text-white text-base font-bold rounded-2xl shadow-xl shadow-[#1b54ac]/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <LogIn className="w-5 h-5" /> Sign In to System
            </Link>
            <a 
              href="#modules"
              className="w-full sm:w-auto px-8 py-4 bg-[#112240] hover:bg-[#1a305c] text-[#9fb0c7] hover:text-white text-base font-bold rounded-2xl border border-white/10 transition-all text-center"
            >
              Explore Modules
            </a>
          </div>
        </div>
      </section>

      {/* Quick Status / Metrics Band */}
      <section className="border-y border-white/5 bg-white/[0.01] py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-white">42,912+</p>
            <p className="text-xs text-[#9fb0c7] uppercase font-bold tracking-wider">Active Records</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">99.99%</p>
            <p className="text-xs text-[#9fb0c7] uppercase font-bold tracking-wider">Uptime SLA</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-white">&lt; 150ms</p>
            <p className="text-xs text-[#9fb0c7] uppercase font-bold tracking-wider">Query Latency</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-white">100%</p>
            <p className="text-xs text-[#9fb0c7] uppercase font-bold tracking-wider">Audit Traceability</p>
          </div>
        </div>
      </section>

      {/* Core Modules Grid */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-24 space-y-16">
        <div className="text-center space-y-4">
          <h3 className="text-3xl font-extrabold text-white tracking-tight">System Core Modules</h3>
          <p className="text-sm text-[#9fb0c7] max-w-lg mx-auto">
            Authorized personnel can access and process biometric security and travel validation parameters across five main operation hubs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, idx) => (
            <div 
              key={idx}
              className="p-8 bg-[#0d1f3d] rounded-3xl border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1 duration-300 relative group flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-[#1b54ac]/10 group-hover:border-[#1b54ac]/30 transition-all">
                    <m.icon className="w-6 h-6 text-[#5490f2]" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#5490f2]/85 bg-[#1b54ac]/15 border border-[#1b54ac]/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {m.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-white group-hover:text-[#5490f2] transition-colors">{m.title}</h4>
                  <p className="text-sm text-[#9fb0c7] leading-relaxed font-medium">{m.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Detail Component */}
      <section className="bg-white/[0.01] border-t border-white/5 py-24">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <div className="lg:col-span-1 space-y-6 text-left">
            <span className="text-xs font-extrabold text-[#5490f2] uppercase tracking-[0.2em] bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              Operational Standards
            </span>
            <h3 className="text-3xl font-black text-white tracking-tight leading-tight">
              Designed for Institutional Integrity
            </h3>
            <p className="text-sm text-[#9fb0c7] leading-relaxed font-medium">
              The ICS platform complies with regulatory requirements for storing and processing national travel logs, providing maximum speed without compromising sensitive private data.
            </p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div key={idx} className="p-6 bg-[#0d1f3d]/50 rounded-2xl border border-white/5 space-y-4 text-left">
                <f.icon className="w-8 h-8 text-emerald-400" />
                <h4 className="font-bold text-white text-base">{f.title}</h4>
                <p className="text-xs text-[#9fb0c7] leading-relaxed font-medium">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer support details */}
      <footer className="mt-auto border-t border-white/5 bg-[#040d1c] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <EthiopiaFingerprint className="w-6 h-6 opacity-40" />
            <span className="text-xs text-[#9fb0c7]/60 font-medium">
              © {new Date().getFullYear()} ICS File Management System. For Internal Staff Use Only.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#9fb0c7]/60">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Authorized Connection Secure</span>
            <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Support: support.fms@ics.gov.et</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
