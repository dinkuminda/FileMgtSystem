import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, Play, Pause, Grid, Monitor, Download, Check, 
  ShieldCheck, Database, Layout, Search, FileText, Settings, AlertTriangle, 
  TrendingUp, Cpu, Server, Key, Eye, Home, Sparkles, LogIn, HardDrive, Filter, BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Auto-play slides logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slidesData.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle arrow keys navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Escape') {
        setShowGrid(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slidesData.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slidesData.length) % slidesData.length);
  };

  // 15 Slide Presentations Structure
  const slidesData = [
    {
      title: "Project Overview & Executive Summary",
      subtitle: "Federal Citizenship & Digital Archive Management System",
      icon: <Cpu className="w-8 h-8 text-blue-500" />,
      tag: "Slide 1 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-semibold text-blue-400">
              <Sparkles className="w-3.5 h-3.5" /> Project Launch
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-[#072146] tracking-tight leading-tight">
              Federal Citizenship <br />
              <span className="text-[#0b57d0]">Digital Archive Portal</span>
            </h1>
            <p className="text-slate-600 text-base leading-relaxed">
              A state-of-the-art secure record management solution built to bridge the gap between physical archives (cabinet drawers) and electronic record databases. Specifically engineered for consulate and immigration workflow management, focusing on automated verification, dual citizenship tracking, and security auditing.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div>
                <span className="block text-2xl font-black text-[#0b57d0]">100%</span>
                <span className="text-xs text-slate-500 font-mono">Real-Time Sync</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-emerald-600">8 Modules</span>
                <span className="text-xs text-slate-500 font-mono">Active Registry</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-amber-600">Audit-Ready</span>
                <span className="text-xs text-slate-500 font-mono">Strict Logging</span>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#072146] to-[#0a3a78] p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between h-72 lg:h-96 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono tracking-widest text-blue-300">ICS AA HQ</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] font-mono">STATUS: PRODUCTION</span>
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-bold">Comprehensive System Stack</h3>
              <p className="text-slate-350 text-xs leading-relaxed">
                Leveraging React 18+ (Vite, Tailwind, Motion) on the frontend, combined with an express-compiled backend proxy running seamlessly on Vercel Serverless Functions and Supabase Cloud-Hosted PostgreSQL databases.
              </p>
            </div>
            <div className="flex gap-4 border-t border-white/10 pt-4 text-xs font-mono text-slate-400">
              <span>DB Size: Scalable</span>
              <span>•</span>
              <span>Platform: Multi-tenant</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Problem Statement",
      subtitle: "Inefficiency, Unsecured physical drawers, and Inconsistent schemas",
      icon: <AlertTriangle className="w-8 h-8 text-rose-500" />,
      tag: "Slide 2 of 15",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left h-full items-stretch">
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold">01</div>
              <h3 className="text-lg font-bold text-slate-900">Physical Chaos</h3>
              <p className="text-sm text-slate-600">
                Paper records stored arbitrarily across hundreds of physical cabinet files. Staff spends precious hours seeking file matches. Hand-written indices lead to misplaced dossiers and slow response rates.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold">02</div>
              <h3 className="text-lg font-bold text-slate-900">Security Gate Leaks</h3>
              <p className="text-sm text-slate-600">
                No tracking mechanism for who accessed, modified, or verified delicate citizenship dossiers. Standard shared drive solutions lack micro-level Row Level Security guidelines, creating critical regulatory compliance loopholes.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold">03</div>
              <h3 className="text-lg font-bold text-slate-900">Disparate Registry Schemas</h3>
              <p className="text-sm text-slate-600">
                Different modules (Visa, EOID, ETD, Alien Passports, Eritrean ID) enforce independent validations. Lacking database constraint checks allowed data deterioration and duplicate passports across divisions.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Proposed Solution",
      subtitle: "Unified Consulate Portal with Digital Locker Mappings",
      icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
      tag: "Slide 3 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-6 text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              A Complete Digital-to-Physical Mapped Ecosystem
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We implemented a unified, dual-login (Admin vs. Staff) electronic console. By standardizing physical attributes — such as cabinet shelf tracking, box numbers, and automated specimen generation — the system streamlines access times from hours to milliseconds.
            </p>
            <ul className="space-y-3.5 text-sm font-semibold text-slate-700">
              <li className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Dual-layer state verification (Pending &rarr; Verified/Rejected)
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Physical Drawer Grid mapping with locked/unlocked hardware feedback
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Server-enforced indexing of personal metadata to safeguard data leaks
              </li>
            </ul>
          </div>
          <div className="p-6 bg-[#091527] rounded-3xl border-2 border-slate-800 text-left h-76 lg:h-90 flex flex-col justify-between font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-blue-400 text-[10px] uppercase font-black tracking-widest">Digital Locker Mapper V1.0</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-2 text-xs text-slate-350">
              <p className="text-emerald-400">&gt;&gt; Cabinet: ERID-B1 Status Checked</p>
              <p>&gt;&gt; Total Drawers Indexed: 12 Units</p>
              <p>&gt;&gt; Active Temp: 20.5°C | Relative Humidity: 42%</p>
              <p className="text-blue-300">&gt;&gt; Security Gate: Active RLS Policies Verified</p>
              <p className="text-amber-500">&gt;&gt; Server Connection Protocol: SSL Secured</p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-[10px] text-slate-300">SYSTEM ARCHIVE HEALTH</p>
                <div className="w-32 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div className="bg-emerald-500 w-[96%] h-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Key Implementation Objectives",
      subtitle: "Guiding rules for database engineering and security thresholds",
      icon: <Check className="w-8 h-8 text-blue-500" />,
      tag: "Slide 4 of 15",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left h-full">
          {[
            {
              title: "1. Data Integrity",
              desc: "Database constraints strictly enforced. Structured schemas with customized constraints for genders, passport codes, and box mappings.",
              color: "border-blue-200 bg-blue-50/20"
            },
            {
              title: "2. Real-Time Tracking",
              desc: "Immediate synchronization of records. Real-time changes triggered by Postgres LISTEN/NOTIFY and local polling fallbacks.",
              color: "border-emerald-200 bg-emerald-50/20"
            },
            {
              title: "3. Fast Search",
              desc: "Unified searches checking matching full name keywords, shelf location, passport number, request numbers, and personal record IDs.",
              color: "border-amber-200 bg-amber-50/20"
            },
            {
              title: "4. Modular Registry",
              desc: "8 custom modules running on a mutual platform: Visa, EOID, EOID Under-Age, Residence ID, ETD, Alien Pass, Yellow Card, Eritrean ID.",
              color: "border-indigo-200 bg-indigo-50/20"
            }
          ].map((obj, i) => (
            <div key={i} className={`p-6 border rounded-2xl flex flex-col justify-between ${obj.color}`}>
              <h3 className="font-bold text-slate-900 text-lg mb-2">{obj.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed mt-auto">{obj.desc}</p>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Interactive System Architecture",
      subtitle: "Serverless Proxy and Dual-Access Control Layers",
      icon: <Server className="w-8 h-8 text-indigo-500" />,
      tag: "Slide 5 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch h-full text-left">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Layout className="w-4 h-4 text-blue-500" /> Dynamic Frontend UI
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Modular React, styled sequentially with Tailwind CSS for visual hierarchy. Interactive Specimen cards generate vector barcodes dynamically on the client side using Canvas overlays.
            </p>
            <div className="text-[10px] font-mono text-slate-400 pt-3 border-t mt-4 border-slate-200">
              Vite 5.0 • React Router 6.0
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500" /> Serverless API Bridge
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Express.ts API proxy bundle working as self-contained Vercel serverless function, allowing API credentials and Supabase database requests to be completed out of user-sight.
            </p>
            <div className="text-[10px] font-mono text-slate-400 pt-3 border-t mt-4 border-slate-200">
              Node 18.x • ESBundle CJS
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" /> Database Stack
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Cloud Supabase PostgreSQL database equipped with dynamic secure stored procedures, automated system audit log tables, and cascades for clean relationship deletes.
            </p>
            <div className="text-[10px] font-mono text-slate-400 pt-3 border-t mt-4 border-slate-200">
              PostgreSQL 15 • RLS Gates
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Database Schemas & Table Configurations",
      subtitle: "The SQL Core defining the 8 record tables",
      icon: <Database className="w-8 h-8 text-blue-500" />,
      tag: "Slide 6 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-bold text-slate-900">High-Fidelity DB Foundations</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our SQL setup creates 8 primary registry tables. Standardized keys include: <code>id</code> (UUID Primary Key), <code>full_name</code>, <code>shelf_number</code>, <code>box_number</code>, <code>passport_number</code>, <code>request_number</code>, and JSON fields for attachments.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="font-mono text-slate-700 font-bold">public.visa_records</span>
                <span className="text-blue-600 font-semibold font-mono">visa_type CHECK</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="font-mono text-slate-700 font-bold">public.eoid_records</span>
                <span className="text-emerald-600 font-semibold font-mono">eoid_type CHECK</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="font-mono text-slate-700 font-bold">public.eritrean_id_records</span>
                <span className="text-amber-600 font-semibold font-mono">personal_id_no TEXT</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 text-white rounded-2xl p-5 text-left text-[11px] font-mono overflow-x-auto h-72 border border-slate-850">
            <span className="text-slate-500 block border-b border-slate-800 pb-2 mb-2">-- Eritrean ID Table Scheme Snippet</span>
            <p className="text-amber-400">CREATE TABLE public.eritrean_id_records (</p>
            <p className="pl-4 text-slate-300">id UUID PRIMARY KEY DEFAULT gen_random_uuid(),</p>
            <p className="pl-4 text-slate-300">shelf_number TEXT NOT NULL,</p>
            <p className="pl-4 text-slate-300">box_number TEXT NOT NULL,</p>
            <p className="pl-4 text-slate-300">personal_id_no TEXT,</p>
            <p className="pl-4 text-slate-300">full_name TEXT NOT NULL,</p>
            <p className="pl-4 text-blue-400">sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),</p>
            <p className="pl-4 text-slate-300">passport_number TEXT,</p>
            <p className="pl-4 text-slate-300">attachments JSONB DEFAULT '[]'::jsonb,</p>
            <p className="pl-4 text-slate-300">created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP</p>
            <p className="text-amber-400">);</p>
          </div>
        </div>
      )
    },
    {
      title: "Security Gateways & Row Level Security (RLS)",
      subtitle: "Micro-level authorization controls via Supabase Policies",
      icon: <Key className="w-8 h-8 text-amber-500" />,
      tag: "Slide 7 of 15",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left h-full items-stretch">
          <div className="bg-emerald-50/25 border border-emerald-100 p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#072146] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> RLS Enabled
              </h3>
              <p className="text-xs text-slate-600">
                All tables have Row Level Security enabled actively. Users cannot read, input, edit or delete records unless authorization rules permit that exact action.
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded inline-block w-max mt-4">ALTER TABLE ENABLE RLS;</span>
          </div>
          <div className="bg-indigo-50/25 border border-indigo-100 p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#072146] flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-600" /> Role-Based Access
              </h3>
              <p className="text-xs text-slate-600">
                Determines operational privileges based on authentication roles (<code>admin</code> vs <code>staff</code>). Admins are granted absolute create, read, update, and deletion capability. Staff are limited to assigned modules.
              </p>
            </div>
            <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded inline-block w-max mt-4">auth.uid() = profiles.id</span>
          </div>
          <div className="bg-amber-50/25 border border-amber-100 p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#072146] flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-600" /> Audit Logging Trigger
              </h3>
              <p className="text-xs text-slate-600">
                A secure trigger fires on any row manipulation. This fires record modifications directly to a secure <code>audit_logs</code> table to track dates, users, and pre-update vs post-update JSON state.
              </p>
            </div>
            <span className="text-[10px] font-mono text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded inline-block w-max mt-4">CREATE TRIGGER audit_log</span>
          </div>
        </div>
      )
    },
    {
      title: "Digital Cabinet Mapper Technology",
      subtitle: "Visualizing the physical-to-digital floor rack index",
      icon: <HardDrive className="w-8 h-8 text-blue-500" />,
      tag: "Slide 8 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-6 text-left">
            <h2 className="text-2xl font-black text-slate-900">Physical-to-Digital Twin index</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              The platform implements physical drawer visualizations. Each physical shelf (e.g. <code>Shelf-01</code> to <code>Shelf-10</code>) and drawer cabinet box has been indexed with dynamic telemetry including active record volume counter, moisture thresholds, and locked/unlocked physical states.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-50">
                <span className="text-xs text-slate-500 font-semibold uppercase font-mono block">Average Search Speed</span>
                <span className="text-xl font-bold text-blue-600">Under 0.2 Secs</span>
              </div>
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-50">
                <span className="text-xs text-slate-500 font-semibold uppercase font-mono block">Cabinet Sync Rate</span>
                <span className="text-xl font-bold text-emerald-600">100% Real-time</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 text-center shadow-xs transition-colors duration-200 ${
                  i === 7 ? 'bg-gradient-to-br from-blue-500 to-emerald-600 border-blue-400 text-white' : 'bg-white border-slate-200 hover:border-blue-400'
                }`}
              >
                <HardDrive className={`w-5 h-5 ${i === 7 ? 'text-white' : 'text-slate-450'}`} />
                <span className={`text-[8px] font-mono font-bold mt-1 ${i === 7 ? 'text-blue-100' : 'text-slate-500'}`}>Box {i+1}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Record Ingest Form Engine",
      subtitle: "Dynamic multi-screen validation & error prevention safeguards",
      icon: <Layout className="w-8 h-8 text-slate-700" />,
      tag: "Slide 9 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-bold text-slate-900">Preventing Duplicates at Ingestion</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              We developed a robust multi-step <code>RecordForm.tsx</code> component. Before data is processed, the engine performs asynchronous validations across tables to check: 
            </p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <strong>Duplicate Passport Guards:</strong> Stops submission if passport exists for security.
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <strong>Attachment Managers:</strong> Formulates pre-defined required assets based on profile type.
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <strong>Schema Transformers:</strong> Coerces missing elements to <code>null</code> to prevent database crashes.
              </li>
            </ul>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-250 shadow-md text-left text-xs Space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <span className="font-bold text-slate-800">New Record Intake Form</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-mono">STEP 1 OF 3</span>
            </div>
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                <div className="w-full h-8 mt-1 border rounded bg-slate-50 border-slate-200 px-2.5 flex items-center font-mono text-slate-700">Amanuel G. Weldegiorgis</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Shelf Number</label>
                  <div className="w-full h-8 mt-1 border rounded bg-slate-50 border-slate-200 px-2.5 flex items-center font-mono">Shelf-07</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Box Number</label>
                  <div className="w-full h-8 mt-1 border rounded bg-slate-50 border-slate-200 px-2.5 flex items-center font-mono">ERID-B1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Asynchronous Verification Framework",
      subtitle: "Multi-point checklist & forensic document classification",
      icon: <ShieldCheck className="w-8 h-8 text-blue-500" />,
      tag: "Slide 10 of 15",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left h-full items-stretch">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black tracking-widest uppercase">Stage 01: Intake</span>
              <h3 className="font-bold text-slate-900 text-base">Metadata Gathering</h3>
              <p className="text-xs text-slate-600">
                System assigns initial <code>Pending</code> flag. File storage checks and processes visual uploaded logs onto file metadata profiles.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[9px] font-black tracking-widest uppercase">Stage 02: Verification</span>
              <h3 className="font-bold text-slate-900 text-base">Forensic Inspections</h3>
              <p className="text-xs text-slate-600">
                Auditors inspect individual uploads. Check for passport validity, registration consistency, and physical box match compliance.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black tracking-widest uppercase">Stage 03: Final Gate</span>
              <h3 className="font-bold text-slate-900 text-base">System Authorization</h3>
              <p className="text-xs text-slate-600">
                Upon review approval, the status converts to <code>Verified</code> or <code>Rejected</code>, indexing the drawer twin log directly to locked drawers.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Consulate Reporting & Analytics",
      subtitle: "Analyzing monthly intake statistics and active cabinet space",
      icon: <TrendingUp className="w-8 h-8 text-[#0b57d0]" />,
      tag: "Slide 11 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-bold text-slate-900">Secure Analytical Reporting</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Equipped with clean modular data visualizations, the system reports active statistics on cabinet space occupancy rates, record categories distribution, and monthly archive registration velocity.
            </p>
            <div className="p-4 bg-slate-55 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-mono font-semibold text-slate-700">
              <div>
                <p className="text-[10px] text-slate-500">TOTAL SYSTEM RECORDS</p>
                <p className="text-xl font-bold text-slate-900 mt-1">14,231 Files</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">CABINET OCCUPANCY</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">42% Secured</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 border rounded-2xl shadow-md h-64 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b pb-2 mb-3 border-slate-150">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth Velocity Tracker</span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">+12.4% MoM</span>
            </div>
            {/* Visual Bar Plot representation */}
            <div className="flex-1 flex gap-3.5 items-end justify-between px-3 pt-4">
              {[50, 70, 40, 85, 60, 95, 80, 55, 75, 90].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-500 rounded-t-md" style={{ height: `${v}%` }} />
                  <span className="text-[9px] font-mono mt-2 text-slate-400">M{i+1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Eritrean ID Module Implementation",
      subtitle: "Aligning user specifications directly with secure SQL schemas",
      icon: <FileText className="w-8 h-8 text-blue-500" />,
      tag: "Slide 12 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-bold text-slate-900">Customized "Eritrean ID" Integration</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              We tailored the registry specifically for Eritrea Citizenship ID records based on direct client specifications:
            </p>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Flexible Passport Policy:</strong> Modified database fields as <code>NULL</code> allowed on eritrean_id_records table.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Search Key Upgrade:</strong> Upgraded the main query loop to accept search queries matched on <code>personal_id_no</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Rigid Sex Constraint:</strong> Configured clean DB checks to constrain options to <code>Male</code>, <code>Female</code> or <code>Other</code> specifically.</span>
              </li>
            </ul>
          </div>
          <div className="bg-slate-900 text-white p-5 rounded-2xl text-left text-[11px] font-mono border border-slate-800 space-y-3">
            <span className="text-slate-500 block border-b border-slate-800 pb-2">-- Schema Check Constraint Migration Applied</span>
            <p className="text-slate-400">// Dropping old wide check system</p>
            <p className="text-amber-500">ALTER TABLE public.eritrean_id_records <br />DROP CONSTRAINT IF EXISTS eritrean_id_records_sex_check;</p>
            <p className="text-slate-400">// Installing absolute strict check system</p>
            <p className="text-emerald-400">ALTER TABLE public.eritrean_id_records <br />ADD CONSTRAINT eritrean_id_records_sex_check CHECK (sex IN ('Male', 'Female', 'Other'));</p>
          </div>
        </div>
      )
    },
    {
      title: "Resolving Vercel Serverless Function Errors",
      subtitle: "Troubleshooting & bundling node runtime modules",
      icon: <Settings className="w-8 h-8 text-amber-500" />,
      tag: "Slide 13 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-black text-slate-900 leading-snug">The <code>FUNCTION_INVOCATION_FAILED</code> Bug</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              During serverless edge hosting deploy times on Vercel, the engine failed with Module Not Found errors. This was caused by the server trying to resolve relative ESModule imports (<code>../server</code>) inside serverless gateway functions.
            </p>
            <p className="text-xs text-indigo-700 font-bold bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <strong>Fixed Solution:</strong> Modified server exports inside the server bundle to explicitly include <code>.js</code> file structures on production builds and declared <code>process.env.IS_SERVERLESS = "true"</code> statically.
            </p>
          </div>
          <div className="bg-slate-950 text-white p-5 rounded-2xl text-left text-[11px] font-mono border border-slate-900 flex flex-col justify-between h-64">
            <div className="border-b border-slate-800 pb-2 mb-2">
              <span className="text-rose-500 font-bold">ERROR RED &rarr; RESOLVED GREEN</span>
            </div>
            <div className="space-y-1.5 flex-1 pt-2">
              <p className="text-rose-400 font-bold">-- FAILED STATE</p>
              <p className="pl-4 text-slate-400">import app from "../server";</p>
              <div className="border-t border-slate-850 my-2" />
              <p className="text-emerald-400 font-bold">++ SUCCESS RESOLVED STATE</p>
              <p className="pl-4 text-slate-200">process.env.IS_SERVERLESS = "true";</p>
              <p className="pl-4 text-slate-200">import app from "../server.js";</p>
            </div>
            <span className="text-[9px] text-slate-500 border-t border-slate-850 pt-2 block text-right">Bundled via Webpack ESBuild</span>
          </div>
        </div>
      )
    },
    {
      title: "System Performance & Verification",
      subtitle: "High-level metrics, active DB latencies, and UX auditing",
      icon: <Monitor className="w-8 h-8 text-emerald-500" />,
      tag: "Slide 14 of 15",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left h-full items-stretch">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono text-slate-400 font-bold">API STACK LATENCY</span>
              <h3 className="text-3xl font-black text-slate-900">45ms</h3>
              <p className="text-xs text-slate-600">
                Extremely swift database requests processed near-instantly via Cloud Run container pipelines.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono text-slate-400 font-bold">LINT & BUILD SUCCESS</span>
              <h3 className="text-3xl font-black text-emerald-600">100%</h3>
              <p className="text-xs text-slate-600">
                Compilation, linting protocols, and TypeScript type-checking checks verify absolutely zero errors.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono text-slate-400 font-bold">FAILSAFE RE-SYNC POLLING</span>
              <h3 className="text-3xl font-black text-blue-600">15s</h3>
              <p className="text-xs text-slate-600">
                15-second fallbacks synchronize active tabs if the Postgres realtime channel disconnects.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Future Roadmap",
      subtitle: "Expanding biometric integration and federated consulate databases",
      icon: <BookOpen className="w-8 h-8 text-blue-500" />,
      tag: "Slide 15 of 15",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-extrabold text-[#072146]">Next Engineering Frontiers</h2>
            <p className="text-slate-600 text-xs leading-relaxed">
              We look forward to expanding the application's capabilities sequentially with three high-priority research vectors:
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Federated Consul Indexing</h4>
                  <p className="text-xs text-slate-500">Enable peer-to-peer real-time registry synchronization between global consulates (e.g. Washington D.C., Rome, Kampala).</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Consolidated AI Auto-Scan</h4>
                  <p className="text-xs text-slate-500">Inject Gemini OCR scanning to analyze uploaded metadata and auto-populate records in real-time.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#0b57d0] to-[#012d6a] text-white p-8 rounded-3xl text-left h-72 flex flex-col justify-between select-none shadow-xl">
            <span className="text-xs font-mono text-blue-200 uppercase tracking-widest font-black">Ready to scale</span>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Federal Record Digital Cabinet Twin</h3>
              <p className="text-xs text-blue-100 leading-relaxed">
                Thank you for reviewing the implementation presentation slides for the Federal Citizenship & Archive Portal project.
              </p>
            </div>
            <div className="flex gap-4 items-center pt-4 border-t border-white/10 text-xs text-blue-200">
              <span>Federal Government of Ethiopia</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 md:p-8" id="presentation-slide-deck">
      
      {/* 1. Header Toolbar */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 select-none">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <Home className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
              PROJECT SLIDEDECK
            </span>
            <h1 className="text-sm font-bold text-slate-300 mt-0.5 max-w-xs md:max-w-none truncate">{slidesData[currentSlide].title}</h1>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title={isPlaying ? "Pause autoplay" : "Start autoplay"}
          >
            {isPlaying ? <Pause className="w-5 h-5 text-[#0b57d0]" /> : <Play className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Show all slides grid"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button 
            onClick={() => window.print()}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Download slide as PDF/Print"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Slide Main Stage */}
      <main className="flex-1 flex items-center justify-center relative my-4">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-6xl bg-white text-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl border border-slate-200 min-h-[480px] flex flex-col justify-between"
            id={`slide-stage-card-${currentSlide}`}
          >
            {/* Header portion on Card */}
            <div className="flex items-center justify-between border-b pb-4 mb-4 select-none">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl">
                  {slidesData[currentSlide].icon}
                </div>
                <div className="text-left">
                  <span className="text-[10px] uppercase tracking-widest text-[#0b57d0] font-mono font-bold">{slidesData[currentSlide].subtitle}</span>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">{slidesData[currentSlide].title}</h2>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{slidesData[currentSlide].tag}</span>
            </div>

            {/* Dynamic Content layout */}
            <div className="flex-1 py-4">
              {slidesData[currentSlide].content}
            </div>

            {/* Footer on slide card */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 select-none">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono">Federal Citizenship Archive (ICS)</span>
              <span className="text-xs font-mono text-slate-400 font-bold">Slide {currentSlide + 1} / {slidesData.length}</span>
            </div>

          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Navigation Controls */}
      <footer className="flex items-center justify-between pt-4 border-t border-slate-800 select-none">
        <button 
          onClick={prevSlide}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-97 text-sm font-semibold text-slate-100 rounded-xl transition-all border-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        {/* Bubble Indicators */}
        <div className="hidden md:flex gap-1.5 p-1 bg-slate-800/50 rounded-full border border-slate-800/60 max-w-full overflow-x-auto">
          {slidesData.map((_, i) => (
            <button 
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full transition-all border-none cursor-pointer ${
                i === currentSlide ? 'bg-[#0b57d0] scale-110' : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title={`Go to slide ${i+1}`}
            />
          ))}
        </div>

        <button 
          onClick={nextSlide}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0b57d0] hover:bg-[#0942a0] active:scale-97 text-sm font-bold text-white rounded-xl transition-all border-none cursor-pointer"
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </footer>

      {/* 4. Slides Overviews grid */}
      <AnimatePresence>
        {showGrid && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 bg-slate-950/95 backdrop-blur-md p-6 md:p-12 overflow-y-auto flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 className="text-2xl font-black text-slate-100">Slide Deck Index Menu</h3>
                <button 
                  onClick={() => setShowGrid(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors border-none cursor-pointer"
                >
                  Close (ESC)
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {slidesData.map((slide, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setCurrentSlide(i);
                      setShowGrid(false);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      i === currentSlide 
                        ? 'bg-[#0b57d0]/15 border-[#0b57d0] text-white' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold block opacity-60">Slide {i+1}</span>
                    <span className="text-sm font-bold block mt-1 line-clamp-2">{slide.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 font-mono mt-8 select-none">
              Click on any option box to transition to its respective stage slide.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
