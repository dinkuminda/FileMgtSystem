import React from 'react';
import { type ImmigrationRecord } from '../lib/supabase';
import { Paperclip, Shield, CheckCircle, Award, BadgeCheck } from 'lucide-react';

interface VisaSpecimenCardProps {
  record: ImmigrationRecord;
}

// Deterministic mock helper so data remains stable per record ID
const getDeterministicValue = (id: string, seed: number, options: string[]) => {
  let hash = 0;
  const combined = id + seed.toString();
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  return options[Math.abs(hash) % options.length];
};

const getDeterministicDOB = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const day = (Math.abs(hash) % 28) + 1;
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = monthNames[Math.abs(hash) % 12];
  const year = 1975 + (Math.abs(hash) % 24);
  return `${day} ${month} ${year}`;
};

export default function VisaSpecimenCard({ record }: VisaSpecimenCardProps) {
  const dob = getDeterministicDOB(record.id);
  const purpose = record.service_provided || 'TOURISM';
  const duration = getDeterministicValue(record.id, 101, ['30 DAYS (Per Entry)', '90 DAYS (Per Entry)']);
  const entriesCount = getDeterministicValue(record.id, 202, ['SINGLE', 'MULTIPLE']);
  
  // Format dates elegantly
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '22 MAY 2026';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    } catch {
      return '22 MAY 2026';
    }
  };

  const getExpiryDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '22 NOV 2026';
      d.setMonth(d.getMonth() + 6); // standard 6 month validity
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    } catch {
      return '22 NOV 2026';
    }
  };

  const issueDateStr = formatDate(record.date);
  const expiryDateStr = getExpiryDate(record.date);

  // Simple clean mock barcode lines
  const barcodeLines = Array.from({ length: 42 }, (_, i) => {
    const widths = [1, 2, 3, 1, 4, 2, 1, 3, 2];
    const width = widths[i % widths.length];
    return (
      <div 
        key={i} 
        style={{ width: `${width}px` }} 
        className={`h-7 bg-slate-900 dark:bg-slate-200 ${i % 3 === 0 ? 'mr-[1px]' : 'mr-[2px]'}`} 
      />
    );
  });

  return (
    <div className="w-full bg-slate-50 dark:bg-gray-950 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-gray-900 shadow-inner flex flex-col lg:flex-row gap-8">
      {/* Left Column: High-fidelity Digital eVisa Specimen */}
      <div className="lg:col-span-7 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-[530px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden relative p-5 transition-all duration-300 hover:shadow-2xl hover:border-blue-500/20">
          
          {/* Subtle security mesh background pattern (CSS SVG grid overlay) */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none bg-[linear-gradient(45deg,#3b82f6_25%,transparent_25%,transparent_75%,#3b82f6_75%,#3b82f6),linear-gradient(45deg,#3b82f6_25%,transparent_25%,transparent_75%,#3b82f6_75%,#3b82f6)] [background-size:40px_40px] [background-position:0_0,20px_20px]" />

          {/* Golden Seal Ribbon overlay left center */}
          <div className="absolute inset-x-0 top-[45%] flex items-center justify-center pointer-events-none opacity-[0.04] dark:opacity-[0.08]">
            <Award className="w-48 h-48 text-blue-600 dark:text-blue-400 rotate-12" />
          </div>

          {/* Header Bar */}
          <header className="border-b-2 border-slate-200 dark:border-slate-800 pb-3 flex items-start gap-2 relative">
            {/* Coat of Arms (Replica) */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <span className="text-[10px] font-black font-serif">★</span>
            </div>
            
            {/* Amharic/English Title Rails */}
            <div className="flex-1 flex justify-between items-start">
              <div className="text-[7.5px] font-extrabold uppercase leading-snug text-slate-500 dark:text-slate-400 max-w-[130px]">
                FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA
                <span className="block text-[6.5px] font-medium leading-[1.1] text-slate-400 dark:text-slate-500 lowercase">
                  & nationality affairs
                </span>
              </div>
              
              <div className="text-[7.5px] font-extrabold uppercase leading-snug text-slate-500 dark:text-slate-400 text-right max-w-[190px]">
                የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ
                <span className="block text-[6.5px] font-medium leading-[1.1] text-slate-400 dark:text-slate-500 uppercase">
                  MAIN DEPARTMENT FOR IMMIGRATION & NATIONALITY AFFAIRS
                </span>
              </div>
            </div>

            {/* QR Code Graphic block */}
            <div className="w-10 h-10 bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-wrap gap-[1px] content-center">
              {Array.from({ length: 9 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-[11px] h-[11px] rounded-[1px] ${
                    (i + 4) % 3 === 0 ? 'bg-white' : 'bg-slate-900'
                  }`} 
                />
              ))}
            </div>
          </header>

          {/* eVisa Badge Title */}
          <div className="mt-3 text-center">
            <h5 className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center justify-center gap-1.5 font-sans">
              ELECTRONIC VISA (eVisa) - TOURIST
            </h5>
            <p className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 tracking-tight leading-none">
              ({record.document_type || 'VTE'})
            </p>
            <div className="inline-block mt-1 text-[8.5px] font-bold font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-850 px-2.5 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
              Application ID: {record.request_number}
            </div>
          </div>

          {/* Content Document Grid Split */}
          <div className="mt-4 grid grid-cols-12 gap-4">
            
            {/* Left Portion of eVisa: Portrait Passport Photo Frame & Signature & Hologram */}
            <div className="col-span-4 flex flex-col items-center">
              <div className="relative w-full aspect-[3/4] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden bg-slate-100 dark:bg-slate-850 flex items-center justify-center">
                {/* Simulated ID Passport Portrait Graphic with Security overlay */}
                <svg viewBox="0 0 100 120" className="w-full h-full object-cover text-slate-350 dark:text-slate-600">
                  <rect width="100" height="120" fill="currentColor" opacity="0.1" />
                  <path d="M 0 5 L 100 115" stroke="currentColor" strokeWidth="0.25" opacity="0.3" />
                  <path d="M 0 115 L 100 5" stroke="currentColor" strokeWidth="0.25" opacity="0.3" />
                  {/* Faint watermark blue waves */}
                  <path d="M-10,35 Q20,45 50,35 T110,35 M-10,65 Q20,75 50,65 T110,65 M-10,95 Q20,105 50,95 T110,95" fill="none" stroke="#60a5fa" strokeWidth="0.75" strokeOpacity="0.4" />
                  
                  {/* Outer glow portrait base */}
                  <circle cx="50" cy="46" r="21" fill="currentColor" opacity="0.15" />
                  {/* Portrait head */}
                  <circle cx="50" cy="45" r="18" fill="currentColor" opacity="0.25" />
                  {/* Portrait body shoulders */}
                  <path d="M12,110 C12,85 28,80 50,80 C72,80 88,85 88,110 Z" fill="currentColor" opacity="0.3" />
                </svg>

                {/* Left floating sticker */}
                <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-rose-500/90 text-white rounded-full text-[6px] font-black uppercase tracking-widest shadow-md">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  VERIFIED
                </div>

                {/* Passport photo custom stamps */}
                <div className="absolute -bottom-1 -right-1 w-12 h-12 border border-blue-500/30 dark:border-blue-400/20 rounded-full flex items-center justify-center pointer-events-none select-none rotate-12 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[0.5px]">
                  <div className="w-10 h-10 border border-dashed border-blue-500/20 rounded-full flex flex-col items-center justify-center text-[5px] text-blue-500 font-black tracking-normal leading-none uppercase">
                    <span>IMMIG</span>
                    <span>ONLINE</span>
                  </div>
                </div>
              </div>

              {/* handwritten Bearer Signature placeholder */}
              <div className="mt-2.5 text-center w-full min-h-[22px] border-b border-dashed border-slate-300 dark:border-slate-800 pb-1 flex flex-col items-center justify-center">
                <span className="text-[12px] font-serif italic text-slate-500 dark:text-slate-400 tracking-wide select-none truncate max-w-full leading-none">
                  {record.full_name}
                </span>
                <span className="text-[6.5px] text-slate-400 dark:text-slate-500 font-extrabold uppercase mt-0.5 tracking-wider leading-none">
                  Bearer Signature
                </span>
              </div>
            </div>

            {/* Right Portion of eVisa: Structured Table Columns */}
            <div className="col-span-8 space-y-2 border-l border-slate-100 dark:border-slate-850 pl-4 relative">
              
              {/* Authentic Table Information Schema */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-[8px] leading-tight">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Applicant Name:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase truncate block focus:outline-none">{record.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Passport Number:</span>
                  <span className="font-mono font-extrabold text-slate-800 dark:text-white uppercase tracking-wider block">{record.passport_number}</span>
                </div>
                
                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Nationality:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase truncate block">{record.citizenship}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Date of Birth:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-350 block">{dob}</span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Gender:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350 block uppercase">{record.sex || 'MALE'}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Visa Type:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white block uppercase">{record.document_type || 'TOURIST VISA (VTE)'}</span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Purpose of Visit:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350 block uppercase">{purpose}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Number of Entries:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 block uppercase">{entriesCount}</span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Duration of Stay:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-300 block uppercase">{duration}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Place of Issue:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350 block uppercase leading-snug">ADDIS ABABA (eVisa)</span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Date of Issue:</span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200 block">{issueDateStr}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Date of Expiry:</span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-450 block">{expiryDateStr}</span>
                </div>
              </div>

              {/* Holographic Sticker on the right bottom corner */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-850">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Box Registry Reference</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white leading-none mt-1 bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">{record.box_number || 'B-92'}</span>
                </div>

                {/* Hologram Box */}
                <div className="relative overflow-hidden w-20 h-8 rounded-lg bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-blue-400/20 hover:from-emerald-400/30 hover:to-blue-400/30 border border-emerald-400/30 flex flex-col items-center justify-center p-0.5 select-none transition-all duration-500 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/45 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="text-[6px] font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-widest leading-none">IMMIGRATION</span>
                  <span className="text-[7.5px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mt-0.5 leading-none flex items-center gap-0.5">
                    <BadgeCheck className="w-2.5 h-2.5 inline text-emerald-500" /> VALID
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Barcode */}
          <footer className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-3 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center h-5">
              {barcodeLines}
            </div>
            <div className="text-[6.5px] font-black font-mono tracking-[0.6em] text-slate-600 dark:text-slate-400 uppercase mt-1 leading-none select-none">
              *{record.passport_number}*
            </div>
          </footer>
        </div>
      </div>

      {/* Right Column: Securitized Customer Schema details panel */}
      <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
        <div>
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-500" />
            Securitized Customer Schema
          </h4>

          <div className="space-y-4">
            <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block tracking-wider leading-none">Customer Full Name</span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-2 leading-none">{record.full_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block tracking-wider leading-none">Passport ID</span>
                <p className="text-xs font-black text-slate-800 dark:text-white font-mono mt-2 leading-none uppercase">{record.passport_number}</p>
              </div>
              <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block tracking-wider leading-none">Visa Code</span>
                <p className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono mt-2 leading-none uppercase">{record.document_type || 'VTE'}</p>
              </div>
            </div>

            <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block tracking-wider mb-2">Verification Rules & Security Audit</span>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2.5 list-none pl-0">
                <li className="flex items-start gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Ensure background features complex guilloche waves or security grid.</span>
                </li>
                <li className="flex items-start gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Barcode encodes raw customer passport string for fast border scans.</span>
                </li>
                <li className="flex items-start gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Issue date lines up perfectly with official traveler entries.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/30 text-[11px] text-blue-600 dark:text-blue-350 font-medium leading-relaxed shadow-inner">
          <p className="font-extrabold uppercase tracking-wider mb-1">Electronic Visa (eVisa) Specimen Style</p>
          You are now viewing the dynamic real-time digital specimen view styled explicitly for personal VISA records. Confirm system parity with paper standard logs.
        </div>
      </div>
    </div>
  );
}
