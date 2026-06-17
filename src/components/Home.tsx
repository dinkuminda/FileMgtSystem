import React, { useState } from 'react';
import { Shield, Lock, Fingerprint, FileText, Globe, Landmark, X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import Auth from './Auth';
import EthiopianImmigrationLogo from './EthiopianImmigrationLogo';

// Import our beautifully generated images
const fileVaultBanner = "/assets/images/file_vault_banner_1780902756713.png";

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
            <nav className="hidden md:flex items-center gap-6" id="main-nav-links">
              <a 
                href="#home" 
                className="text-sm font-semibold text-slate-900 border-b-2 border-[#0b57d0] pb-1 px-1 transition-all"
              >
                Home
              </a>
              <Link 
                to="/presentation" 
                className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-blue-200 transition-all select-none"
              >
                <BookOpen className="w-3.5 h-3.5" /> Project Slides (15 Slides)
              </Link>
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
              Digital <br />
              File Management Archive
            </h2>
            
            <p className="text-[#4a5568] text-sm sm:text-[15px] md:text-[16px] leading-relaxed max-w-lg font-medium">
            A Digital File Management Archive is a centralized, secure repository designed to systematically store, categorize, and preserve digital assets. Moving beyond simple storage, an archive focuses on long-term data preservation, regulatory compliance, and rapid retrieval through robust metadata structures.
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

          {/* RIGHT COLUMN: Interactive High-Aesthetic Single-Image Terminal Showcase */}
          <div className="flex-1 w-full lg:w-auto flex items-center justify-center lg:justify-end relative z-10" id="hero-image-collage">
            
            <div className="w-full max-w-[480px]" id="single-spotlight-layout">
              <motion.div 
                whileHover={{ y: -6, scale: 1.015 }}
                transition={{ duration: 0.4 }}
                className="group relative rounded-3xl overflow-hidden border-2 border-slate-200/80 bg-[#091527] shadow-xl shadow-blue-500/5"
              >
                {/* Decorative Terminal Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  </div>
                  <span className="text-[9px] font-bold tracking-widest text-[#0b57d0] bg-blue-500/10 px-2.5 py-0.5 rounded-full uppercase font-mono border border-blue-500/15">
                    Live Archive Status
                  </span>
                </div>

                <div className="aspect-[16/10] sm:aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={fileVaultBanner} 
                    alt="Physical Security Locker Cabinets Vault" 
                    className="w-full h-full object-cover select-none brightness-95 group-hover:brightness-100 transition-transform duration-700 group-hover:scale-104"
                    referrerPolicy="no-referrer"
                    id="collage-img-vault-spotlight"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent pointer-events-none" />
                  
                  {/* secure lock telemetry label overlays */}
                  <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
                    <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-slate-950/95 px-3 py-1.5 rounded-lg border border-emerald-500/30 uppercase font-mono shadow-md backdrop-blur-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      SECURE FILE VAULT
                    </span>
                    <span className="text-[9px] font-bold tracking-wider text-white/80 bg-slate-950/80 px-2.5 py-1 rounded-lg">
                      Sector 07-A Compliant
                    </span>
                  </div>
                </div>

                <div className="p-5 text-left bg-slate-950 border-t border-slate-900">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Mechanical Physical Drawers</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Digital drawer lock integration for absolute real-time record synchronization.
                  </p>
                </div>
              </motion.div>
            </div>

          </div>

        </motion.div>

      </main>

  

      {/* 4. FOOTER */}
      <footer className="relative overflow-hidden bg-[#072146] border-t border-[#0d346b] py-16 px-6 sm:px-8 mt-auto text-white/90" id="portal-system-footer">
        
        {/* Large Aesthetic Watermark Brand Seal */}
        <div className="absolute right-[-5%] bottom-[-15%] pointer-events-none select-none opacity-[0.045] w-96 md:w-[480px] lg:w-[600px] h-auto z-0" id="footer-logo-watermark">
          <img 
            src="/assets/images/ics-logo.png" 
            alt="Ethiopian Citizenship Service Watermark Seal" 
            className="w-full h-auto object-contain brightness-0 invert"
          />
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8 h-fit select-none relative z-10">
          
          {/* Footer Logo & Information */}
          <div className="space-y-4 text-left max-w-sm">
            <div className="flex items-center gap-2">
              <EthiopianImmigrationLogo size="sm" className="h-10 brightness-0 invert" />
              <span className="font-semibold tracking-wider text-xs text-blue-200">FEDERAL ARCHIVE</span>
            </div>
          
          </div>

          {/* Quick Footer Links */}
          <div className="flex gap-16 text-left shrink-0">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Legal</h4>
              <ul className="space-y-1.5 text-[11px] text-blue-100/60 font-bold uppercase tracking-wider">
                <li><span className="hover:text-white transition-colors cursor-pointer">Proclamation 754/2512</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Privacy Guidelines</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Compliance Audit</span></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Contact</h4>
              <ul className="space-y-1.5 text-[11px] text-blue-100/60 font-bold uppercase tracking-wider">
                <li><span className="hover:text-white transition-colors cursor-pointer">Support Center</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Addis Ababa Headquarters</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Secure Hot-Line</span></li>
              </ul>
            </div>
          </div>
<p>© {new Date().getFullYear()} Federal Government of Ethiopia (ICS). All rights reserved.</p>
        </div>

        {/* Legal Signatures */}
     
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
