import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Fingerprint, CreditCard, MapPin, Plane, 
  ShieldAlert, ArrowRight, Lock, Server, CheckCircle, 
  Database, UserCheck, PhoneCall, HelpCircle, LogIn,
  Menu, X, Activity, Shield, Phone, ChevronRight
} from 'lucide-react';
import { EthiopiaFingerprint } from './EthiopiaFingerprint';
import { motion, AnimatePresence } from 'motion/react';
import Auth from './Auth';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [msgInput, setMsgInput] = useState({ name: '', email: '', message: '' });

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (msgInput.name && msgInput.email && msgInput.message) {
      setSupportSubmitted(true);
      setTimeout(() => {
        setSupportSubmitted(false);
        setMsgInput({ name: '', email: '', message: '' });
      }, 5000);
    }
  };

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
    <div className="min-h-screen bg-white text-[#1e293b] flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#1b54ac] selection:text-white pt-20">
      {/* Top Header navbar */}
      <header className="fixed top-0 left-0 right-0 border-b border-slate-200/80 backdrop-blur-md bg-white/95 z-50 transition-all shadow-sm h-20 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 select-none">
            <EthiopiaFingerprint className="w-10 h-10 sm:w-14 sm:h-14 drop-shadow-sm flex-shrink-0" />
            <div className="text-2xl sm:text-3xl font-black text-[#1b54ac] tracking-tight leading-none select-none font-sans">
              ICS
            </div>
            <div className="flex flex-col justify-center text-left pl-1 sm:pl-2">
              <h1 className="text-[#1b54ac] font-bold text-xs sm:text-base tracking-tight leading-none">የኢሚግሬሽንና ዜግነት አገልግሎት</h1>
              <p className="text-[6.5px] sm:text-[9.5px] text-[#1b54ac] uppercase tracking-[0.03em] mt-1 font-bold leading-none">IMMIGRATION AND CITIZENSHIP SERVICE</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Desktop Quick Nav Menu Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-wider text-slate-500">
              <a href="#" className="hover:text-[#1b54ac] transition-colors">Home</a>
              <a href="#modules" className="hover:text-[#1b54ac] transition-colors">Core Modules</a>
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="hover:text-[#1b54ac] transition-colors flex items-center gap-1.5 focus:outline-none font-black text-slate-600"
              >
                System Menu 
                <span className="text-[9px] bg-blue-50 text-[#1b54ac] px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest font-black animate-pulse">
                  Open Hub
                </span>
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {/* Menu Toggle for Mobile & Info Hub */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2.5 text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Open Information Menu Page"
              >
                {isMenuOpen ? <X className="w-5 h-5 text-red-600 animate-in spin-in duration-300" /> : <Menu className="w-5 h-5 text-[#1b54ac]" />}
              </button>

              <button 
                onClick={() => setIsLoginOpen(true)}
                className="px-5 py-2.5 bg-[#1b54ac] hover:bg-[#164894] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.98] shadow-sm shadow-blue-500/15 cursor-pointer border-none outline-none"
              >
                Staff Portal <ArrowRight className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Interactive Menu Page Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xl md:backdrop-blur-2xl pt-24 overflow-y-auto px-6 pb-12 flex justify-center"
          >
            <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl border border-slate-200 p-6 md:p-12 self-start mt-4 relative animate-in fade-in duration-300">
              {/* Close corner button */}
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-6 right-6 p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800 transition-colors border border-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 text-left">
                
                {/* Column 1: Navigation & System Info */}
                <div className="space-y-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-blue-50 text-[#1b54ac] px-2.5 py-1 rounded-full border border-blue-100 font-extrabold tracking-widest uppercase">
                      <Activity className="w-3.5 h-3.5 animate-pulse" /> Core Navigation
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">Information Desk</h3>
                    <p className="text-xs text-slate-500">Quick link pathways across the public records gateway</p>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full text-left group flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200/60 hover:border-blue-200 transition-all text-slate-700 hover:text-[#1b54ac]"
                    >
                      <span className="text-xs font-black uppercase tracking-wider">ICS Portal Home</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <a 
                      href="#modules" 
                      onClick={() => setIsMenuOpen(false)}
                      className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200/60 hover:border-blue-200 transition-all text-slate-700 hover:text-[#1b54ac]"
                    >
                      <span className="text-xs font-black uppercase tracking-wider">Explore System Modules</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </a>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsLoginOpen(true);
                      }}
                      className="group flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 rounded-2xl border border-blue-700 text-white shadow-md shadow-blue-500/10 transition-all font-bold text-left cursor-pointer border-none outline-none w-full"
                    >
                      <span className="text-xs font-black uppercase tracking-wider">Secure Officer Portal Login</span>
                      <ArrowRight className="w-4 h-4 text-blue-100 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* System statistics metrics banner inside the menu page */}
                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500" /> Security Standard Status
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-lg font-black text-slate-800">AES-256</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Record Encryption</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-800">ISO-27001</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">SLA Compliance</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Digital Border Gate Health Status Indicators */}
                <div className="space-y-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100 font-extrabold tracking-widest uppercase">
                      <Server className="w-3.5 h-3.5" /> Live Gateway Channels
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">Border Control Units</h3>
                    <p className="text-xs text-slate-500">Real-time biometrics synchronization link status</p>
                  </div>

                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {[
                      { name: "Bole International Main Gate A/B", code: "ADD-AA", location: "Addis Ababa", status: "ONLINE" },
                      { name: "Bole International VIP Lounge Terminal", code: "ADD-VIP", location: "Addis Ababa", status: "ONLINE" },
                      { name: "Bole International Cargo Wing Terminal", code: "ADD-CRG", location: "Addis Ababa", status: "ONLINE" },
                      { name: "Moyale Crossing Kenya Border Hub", code: "MYL-KB", location: "Oromia Region", status: "ONLINE" },
                      { name: "Togochale Somaliland Crossing Hub", code: "TGL-SB", location: "Somali Region", status: "ONLINE" },
                      { name: "Galafi Djibouti Crossing Station", code: "GLF-DB", location: "Afar Region", status: "ONLINE" }
                    ].map((gate) => (
                      <div key={gate.code} className="p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between transition-colors">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-extrabold text-[#1c2938]">{gate.name}</p>
                            <span className="text-[9px] font-bold text-slate-400 px-1 py-0.2 bg-slate-200/50 rounded">{gate.code}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{gate.location}</p>
                        </div>
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-100/50">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          ONLINE
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: Contact Directory & Quick Support Form Request */}
                <div className="space-y-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full border border-amber-100 font-extrabold tracking-widest uppercase">
                      <Phone className="w-3.5 h-3.5" /> Support Directory
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">Institutional Support</h3>
                    <p className="text-xs text-slate-500">Contact active support desks or lodge queries</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 text-xs font-semibold text-slate-600 space-y-2">
                      <p className="font-extrabold text-slate-800 mb-1">Direct HQ Telephone Directory</p>
                      <p className="flex justify-between"><span>Central Registry Desk:</span> <span className="font-mono text-[#1b54ac] font-bold">+251 111 262 262</span></p>
                      <p className="flex justify-between"><span>Biometric Verification:</span> <span className="font-mono text-[#1b54ac] font-bold">+251 111 262 300</span></p>
                      <p className="flex justify-between"><span>IT Border Tech Ops:</span> <span className="font-mono text-[#1b54ac] font-bold">+251 111 262 450</span></p>
                    </div>

                    <form onSubmit={handleSupportSubmit} className="space-y-2 text-left">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lodge Support Ticket</p>
                      
                      <input 
                        type="text"
                        placeholder="Your full name"
                        required
                        value={msgInput.name}
                        onChange={(e) => setMsgInput({ ...msgInput, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 focus:border-[#1b54ac] focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400"
                      />

                      <input 
                        type="email"
                        placeholder="Your institutional email address"
                        required
                        value={msgInput.email}
                        onChange={(e) => setMsgInput({ ...msgInput, email: e.target.value })}
                        className="w-full bg-white border border-slate-200 focus:border-[#1b54ac] focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400"
                      />

                      <textarea 
                        placeholder="Lodge details or reference query..."
                        required
                        rows={2}
                        value={msgInput.message}
                        onChange={(e) => setMsgInput({ ...msgInput, message: e.target.value })}
                        className="w-full bg-white border border-slate-200 focus:border-[#1b54ac] focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 resize-none animate-none"
                      />

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-[#1b54ac] hover:bg-[#164894] cursor-pointer text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/15 active:scale-95"
                      >
                        File Cryptographic Ticket
                      </button>

                      {supportSubmitted && (
                        <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-[10px] font-extrabold text-[#10b981] text-center animate-bounce mt-2">
                          ✓ Ref Token Cached! Ticket dispatched safely to IT tech team.
                        </div>
                      )}
                    </form>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 bg-gradient-to-br from-[#1b54ac] via-[#103575] to-[#0c2040] text-white overflow-hidden">
        {/* Subtle light blue radial reflection */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/15 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          {/* Centered Premium Official Branded Logo Block */}
          <div className="inline-flex items-center gap-3 sm:gap-4 bg-white px-5 sm:px-7 py-3 sm:py-4 rounded-3xl shadow-2xl shadow-black/25 border border-white mx-auto select-none">
            <EthiopiaFingerprint className="w-9 h-9 sm:w-12 sm:h-12 flex-shrink-0" />
            <div className="text-xl sm:text-2.5xl font-black text-[#1b54ac] tracking-tight leading-none select-none font-sans">
              ICS
            </div>
            <div className="flex flex-col justify-center text-left pl-1">
              <h1 className="text-[#1b54ac] font-black text-[10px] sm:text-sm tracking-tight leading-none">የኢሚግሬሽንና ዜግነት አገልግሎት</h1>
              <p className="text-[6.5px] sm:text-[8.5px] text-[#1b54ac] uppercase tracking-[0.03em] mt-1 font-bold leading-none">IMMIGRATION AND CITIZENSHIP SERVICE</p>
            </div>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
            ICS Digital File <br />
            <span className="bg-gradient-to-r from-blue-200 via-blue-100 to-emerald-300 bg-clip-text text-transparent">
              Management Portal
            </span>
          </h2>

          <p className="text-lg text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
            Centralized document tracking, identity verification, and border logging suite supporting modern cryptographic security and strict institutional audits.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-[#1b54ac] text-base font-black rounded-2xl shadow-xl shadow-black/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer border-none outline-none"
            >
              <LogIn className="w-5 h-5" /> Sign In to System
            </button>
            <a 
              href="#modules"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/15 text-white text-base font-bold rounded-2xl border border-white/20 transition-all text-center"
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
      <footer className="mt-auto border-t border-blue-700 bg-[#1b54ac] py-12 px-6 text-white text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <EthiopiaFingerprint className="w-6 h-6 opacity-90 p-0.5 bg-white/10 rounded-md" />
            <span className="text-slate-100 font-bold">
              © {new Date().getFullYear()} ICS (Immigration and Citizenship Service). For Internal Staff Use Only.
            </span>
          </div>

          <div className="flex items-center gap-6 font-bold text-slate-100">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Authorized Connection Secure
            </span>
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 opacity-80" /> Support: support.fms@ics.gov.et
            </span>
          </div>
        </div>
      </footer>

      {/* Modern High-Performance Inline Auth Modal Overlay */}
      <AnimatePresence>
        {isLoginOpen && (
          <Auth isModal={true} onClose={() => setIsLoginOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
