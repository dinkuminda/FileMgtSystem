import React, { useState } from 'react';
import { Shield, Lock, Fingerprint, FileText, Globe, Landmark, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Auth from './Auth';
import EthiopianImmigrationLogo from './EthiopianImmigrationLogo';

// Import our beautifully generated images
const fileVaultBanner = "/assets/images/file_vault_banner_1780902756713.png";
const biometricFolder = "/assets/images/biometric_document_folder_1780902775494.png";
const staffConsultation = "/assets/images/ics_staff_consultation_1780903157041.png";
const passportHandover = "/assets/images/ethiopian_passport_handover_1780903171194.png";
const checkpointAssist = "/assets/images/airport_checkpoint_immigration_1780903187170.png";

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col font-sans selection:bg-[#0b57d0] selection:text-white" id="portal-frame-root">
      
      {/* 1. TOP NAVBAR HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-xs" id="portal-top-navbar">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Navigation Menu Links */}
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <EthiopianImmigrationLogo size="sm" className="h-10 md:h-12" />
            </div>
            
            {/* Nav site links */}
            <nav className="hidden md:flex items-center gap-3" id="main-nav-links">
              <a 
                href="#home" 
                className="text-sm font-semibold text-slate-900 border-b-2 border-[#0b57d0] pb-1 px-1 transition-all"
              >
                Home
              </a>
            </nav>
          </div>

          {/* Call to action Button: Login / Register */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-[#0b57d0] hover:bg-[#0942a0] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-97 cursor-pointer border-none"
              id="btn-login-register"
            >
              Login/Register
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN HERO SECTION & IMAGE COLLAGE GRID CARD */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" id="portal-main-container">
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full bg-gradient-to-br from-[#edf4fc] via-[#fdfbf7] to-[#ecf3fc] border border-[#e2e8f1] rounded-[32px] p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 shadow-xs relative overflow-hidden" 
          id="hero-gradient-card"
        >
          {/* Subtle lighting overlay decorations */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-blue-400/5 rounded-full blur-[100px] pointer-events-none" />
          
          {/* LEFT COLUMN: System Welcome Typography & Dynamic Button */}
          <div className="flex-1 text-left space-y-6 relative z-10" id="hero-text-content">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#072146] tracking-tight leading-[1.12]">
              Physical and digital <br />
              file management Hub
            </h2>
            
            <p className="text-[#4a5568] text-sm sm:text-[15px] md:text-[16px] leading-relaxed max-w-lg font-medium">
              Welcome to the official portal of the Ethiopian Immigration and Citizenship Service. Securely organize, search, and verify core archives, track physical cabinet drawer mapping and access permissions, and manage dual biometric citizenship records efficiently.
            </p>

            <div className="pt-2">
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-[#0b57d0] hover:bg-[#0942a0] text-white px-7 py-3.5 rounded-lg text-sm font-bold transition-all shadow-md active:scale-97 cursor-pointer border-none"
                id="btn-get-started"
              >
                Get started
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Asymmetric Floating Image Collage as request */}
          <div className="flex-1 w-full lg:w-auto flex items-center justify-center lg:justify-end relative z-10" id="hero-image-collage">
            
            {/* The collage frame wrapper */}
            <div className="flex items-center gap-4 sm:gap-6 w-full max-w-[550px] justify-center" id="collage-flex-layout">
              
              {/* Image Group A (Left/Center vertical block) */}
              <div className="shrink-0 scale-95 md:scale-100" id="collage-col-left">
                <div className="relative group rounded-3xl overflow-hidden border border-white/50 shadow-md">
                  <img 
                    src={fileVaultBanner} 
                    alt="Physical Security Cabinets" 
                    className="w-[180px] sm:w-[220px] h-[240px] sm:h-[300px] object-cover transition-transform duration-500 group-hover:scale-104 select-none"
                    referrerPolicy="no-referrer"
                    id="collage-img-consultation"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
                </div>
              </div>

              {/* Image Group B (Right column stacked block) */}
              <div className="flex flex-col gap-4 sm:gap-6 shrink-0" id="collage-col-right">
                
                {/* Biometric Secure Folder */}
                <div className="relative group rounded-3xl overflow-hidden border border-white/50 shadow-md">
                  <img 
                    src={biometricFolder} 
                    alt="Biometric Secure Folder" 
                    className="w-[180px] sm:w-[220px] h-[160px] sm:h-[220px] object-cover transition-transform duration-500 group-hover:scale-104 select-none"
                    referrerPolicy="no-referrer"
                    id="collage-img-handover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
                </div>

                {/* Friendly Staff consultation */}
                <div className="relative group rounded-3xl overflow-hidden border border-white/50 shadow-md">
                  <img 
                    src={staffConsultation} 
                    alt="ICS Staff Assisting Citizen" 
                    className="w-[200px] sm:w-[260px] h-[130px] sm:h-[180px] object-cover transition-transform duration-500 group-hover:scale-104 select-none"
                    referrerPolicy="no-referrer"
                    id="collage-img-checkpoint"
                  />
                  <div className="absolute inset-0 bg-[#072146]/10 to-transparent" />
                </div>

              </div>

            </div>

          </div>

        </motion.div>

      </main>

      {/* 3. SYSTEM FEATURES INFORMATION LOGS GRID */}
      <section className="bg-white border-t border-gray-100 py-16" id="portal-key-features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
            <span className="text-[10px] font-black text-[#0b57d0] tracking-widest uppercase bg-blue-50 px-3 py-1 rounded-full">
              CORE PORTAL HUB
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
              Administrative Capabilities
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Authorized personnel access standard system sub-modules for document management, biometrics, residency checks, and physical cabinets mapping.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="features-box-grid">
            
            {/* Visas */}
            <div className="p-6 bg-[#fafbfc] rounded-2xl border border-slate-100 shadow-xs text-left space-y-3">
              <div className="bg-blue-50 text-[#0b57d0] p-3 rounded-xl w-10 h-10 flex items-center justify-center border border-blue-100/50">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Visa Management</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Approve, create, and track transit, tourist, work, and diplomatic visas in high confidence.
              </p>
            </div>

            {/* Biometrics */}
            <div className="p-6 bg-[#fafbfc] rounded-2xl border border-slate-100 shadow-xs text-left space-y-3">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl w-10 h-10 flex items-center justify-center border border-emerald-100/50">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Identity Records</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Manage fingerprint checks, unique electronic IDs, and minor's registration logs mapping.
              </p>
            </div>

            {/* Residency */}
            <div className="p-6 bg-[#fafbfc] rounded-2xl border border-slate-100 shadow-xs text-left space-y-3">
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl w-10 h-10 flex items-center justify-center border border-amber-100/50">
                <Landmark className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Residence & Origin</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Oversee temporary, permanent residence permits and secure Origin Identity Card statuses.
              </p>
            </div>

            {/* Cabinet integration */}
            <div className="p-6 bg-[#fafbfc] rounded-2xl border border-slate-100 shadow-xs text-left space-y-3">
              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl w-10 h-10 flex items-center justify-center border border-indigo-100/50">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Hardware cabinets</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Direct mechanical drawer lockers integrations for absolute document-to-container synchronization.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="bg-[#f8fafc] border-t border-slate-200/50 py-12 px-6 sm:px-8 mt-auto" id="portal-system-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8 h-fit select-none">
          
          {/* Footer Logo & Information */}
          <div className="space-y-4 text-left max-w-sm">
            <EthiopianImmigrationLogo size="sm" className="h-10 opacity-90 filter grayscale hover:grayscale-0 transition-all" />
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              The central authority in the Federal Democratic Republic of Ethiopia responsible for maintaining civil records security, boundary controls, passport verifications, and high-security file locker compliance.
            </p>
          </div>

          {/* Quick Footer Links */}
          <div className="flex gap-16 text-left shrink-0">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal</h4>
              <ul className="space-y-1.5 text-[11px] text-slate-505 text-slate-500 font-bold uppercase tracking-wider">
                <li><span className="hover:text-slate-800 transition-colors cursor-pointer">Proclamation 754/2512</span></li>
                <li><span className="hover:text-slate-800 transition-colors cursor-pointer">Privacy Guidelines</span></li>
                <li><span className="hover:text-slate-800 transition-colors cursor-pointer">Compliance Audit</span></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</h4>
              <ul className="space-y-1.5 text-[11px] text-slate-505 text-slate-500 font-bold uppercase tracking-wider">
                <li><span className="hover:text-slate-800 transition-colors cursor-pointer">Support Center</span></li>
                <li><span className="hover:text-slate-800 transition-colors cursor-pointer">Addis Ababa Headquarters</span></li>
                <li><span className="hover:text-slate-800 transition-colors cursor-pointer">Secure Hot-Line</span></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Legal Signatures */}
        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-250 border-slate-200/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] text-slate-450 text-slate-400 font-black uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Federal Government of Ethiopia (ICS). All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-[#0b57d0]">
            <Shield className="w-3.5 h-3.5" /> PROCLAMATION COMPLIANT PORTAL
          </p>
        </div>
      </footer>

      {/* 5. GORGEOUS ADMINISTRATIVE AUTHENTICATION MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            id="auth-modal-overlay"
          >
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-[460px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-1 shadow-2xl"
              id="auth-modal-content-box"
            >
              {/* Close Button on top of the box */}
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-5 right-5 z-20 p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                aria-label="Close form"
                id="btn-close-auth-modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* The actual Auth form - inline mode since inside card */}
              <Auth isInline={true} onClose={() => setShowAuthModal(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
