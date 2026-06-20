import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, Loader2, Calendar, FileText, Fingerprint, 
  CreditCard, MapPin, Shield, Plane, Users, Activity, Eye, Edit2, 
  Trash2, X, Archive, ChevronDown, ChevronUp, Download, CheckSquare, Square
} from 'lucide-react';
import { supabase, type ImmigrationRecord, type RecordType, TABLE_MAP, REVERSE_TABLE_MAP, mapDbRoleToFrontend } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import AttachmentIndicator from './AttachmentIndicator';

interface AdvancedSearchProps {
  userProfile: any;
  onEditRecord: (record: ImmigrationRecord) => void;
  onDeleteRecord: (id: string) => void;
  refreshCounter?: number;
}

interface SearchResult {
  id: string;
  type: 'VISA' | 'EOID' | 'Residence ID' | 'ETD' | 'Yellow Card' | 'Alien Passport' | 'Eritrean ID' | 'Profiles' | 'AuditLogs';
  title: string;
  subtitle: string;
  identifier: string;
  boxNumber?: string;
  shelfNumber?: string;
  created_at: string;
  creator?: string;
  rawRecord: any;
}

export default function AdvancedSearch({ userProfile, onEditRecord, onDeleteRecord, refreshCounter = 0 }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    'VISA', 'EOID', 'Residence ID', 'ETD', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'Profiles', 'AuditLogs'
  ]);
  
  // Advanced filter criteria
  const [boxNumber, setBoxNumber] = useState('');
  const [shelfNumber, setShelfNumber] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [requestNumber, setRequestNumber] = useState('');
  const [gender, setGender] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected result for detail view
  const [activeDetail, setActiveDetail] = useState<SearchResult | null>(null);

  // Helper inside search to assert table clearance
  const hasTableClearance = (type: string) => {
    if (!userProfile) return false;
    const r = (userProfile.role || '').toLowerCase();
    if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin' || r === 'admin_grant') return true;

    if (type === 'Profiles') return r === 'admin';
    if (type === 'AuditLogs') return r === 'admin';

    // Grouping checks
    let checkingModule = type;
    if (type === 'EOID Under_Age') checkingModule = 'EOID';

    if (userProfile.modules && Array.isArray(userProfile.modules)) {
      return userProfile.modules.includes(checkingModule) || 
             userProfile.modules.includes(`${checkingModule}:read`) ||
             userProfile.modules.includes(`${checkingModule}:write`);
    }

    // Default fallbacks matching Dashboard.tsx
    if (r === 'airport_viewer' || r === 'editor' || r === 'staff' || r === 'supervisor') {
      return checkingModule === 'Yellow Card';
    }

    return false;
  };

  const handleToggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleSelectAllTypes = () => {
    setSelectedTypes(['VISA', 'EOID', 'Residence ID', 'ETD', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'Profiles', 'AuditLogs']);
  };

  const handleDeselectAllTypes = () => {
    setSelectedTypes([]);
  };

  const executeSearch = async () => {
    setSearching(true);
    let allSearched: SearchResult[] = [];

    // Master query lowercase filter
    const term = query.trim().toLowerCase();

    // Map through chosen, cleared modules
    const searchPromises = selectedTypes.map(async (type) => {
      if (!hasTableClearance(type)) return [];

      try {
        if (type === 'Profiles') {
          // QUERY USERS / PROFILES
          const { data, error } = await supabase.from('profiles').select('*');
          let matched: any[] = [];
          if (!error && data) {
            matched = data;
          } else {
            // Offline/un-sync fallback
            const localUsers = localStorage.getItem('local_admin_profiles');
            matched = localUsers ? JSON.parse(localUsers) : [];
          }

          // Apply filters
          return matched.filter(u => {
            const emailMatch = (u.email || '').toLowerCase().includes(term);
            const nameMatch = (u.full_name || '').toLowerCase().includes(term);
            const roleMatch = (u.role || '').toLowerCase().includes(term);
            const fits = emailMatch || nameMatch || roleMatch;
            
            // Gender or number specific filters don't apply, but Date check can
            let dateFits = true;
            if (startDate) dateFits = dateFits && new Date(u.created_at || u.updated_at) >= new Date(startDate);
            if (endDate) dateFits = dateFits && new Date(u.created_at || u.updated_at) <= new Date(endDate);

            return fits && dateFits;
          }).map(u => ({
            id: u.id,
            type: 'Profiles' as const,
            title: u.full_name || 'Anonymous User',
            subtitle: `Role: ${mapDbRoleToFrontend(u.role)} • Active Modules: ${(u.modules || []).join(', ')}`,
            identifier: u.email || 'No email',
            created_at: u.updated_at || u.created_at || new Date().toISOString(),
            rawRecord: { ...u, _table: 'profiles' }
          }));
        }

        if (type === 'AuditLogs') {
          // QUERY AUDIT LOGS
          const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(250);
          let matched: any[] = [];
          if (!error && data) {
            matched = data;
          } else {
            // Local fallback
            matched = [];
          }

          return matched.filter(l => {
            const emailMatch = (l.user_email || '').toLowerCase().includes(term);
            const detailsMatch = (l.details || '').toLowerCase().includes(term);
            const actionMatch = (l.action || '').toLowerCase().includes(term);
            const entityMatch = (l.entity_type || '').toLowerCase().includes(term);
            const fits = emailMatch || detailsMatch || actionMatch || entityMatch;

            let dateFits = true;
            if (startDate) dateFits = dateFits && new Date(l.created_at) >= new Date(startDate);
            if (endDate) dateFits = dateFits && new Date(l.created_at) <= new Date(endDate);

            return fits && dateFits;
          }).map(l => ({
            id: l.id,
            type: 'AuditLogs' as const,
            title: `${l.action} Action by ${l.user_email}`,
            subtitle: `Division: ${l.entity_type} • Ref ID: ${l.entity_id || 'N/A'}`,
            identifier: l.details || '',
            created_at: l.created_at,
            rawRecord: { ...l, _table: 'audit_logs' }
          }));
        }

        // DIVISION IMMIGRATION RECORDS
        if (type === 'EOID') {
          // SPECIAL EOID / EOID UNDER_AGE DUO
          const [eoidRes, underageRes] = await Promise.all([
            supabase.from('eoid_records').select('*'),
            supabase.from('eoid_underage_records').select('*')
          ]);

          let eoidData = eoidRes.data || [];
          let underageData = underageRes.data || [];

          if (eoidRes.error || underageRes.error) {
            // Local fallbacks
            eoidData = JSON.parse(localStorage.getItem('local_records_eoid') || '[]');
            underageData = JSON.parse(localStorage.getItem('local_records_eoid_under_age') || '[]');
          }

          const combined = [
            ...eoidData.map((r: any) => ({ ...r, _table: 'eoid_records', under_age: r.under_age ?? false })),
            ...underageData.map((r: any) => ({ ...r, _table: 'eoid_underage_records', under_age: r.under_age ?? true }))
          ];

          return combined.filter(r => {
            // Main term filter
            const nm = (r.full_name || '').toLowerCase().includes(term);
            const pass = (r.passport_number || '').toLowerCase().includes(term);
            const req = (r.request_number || '').toLowerCase().includes(term);
            const eoidN = (r.eoid_number || '').toLowerCase().includes(term);
            const boxN = (r.box_number || '').toLowerCase().includes(term);
            const shelfN = (r.shelf_number || '').toLowerCase().includes(term);

            const matchesText = !term || nm || pass || req || eoidN || boxN || shelfN;

            // Advanced Filters checks
            let advancedMatches = true;
            if (boxNumber) advancedMatches = advancedMatches && (r.box_number || '').toLowerCase().includes(boxNumber.toLowerCase());
            if (shelfNumber) advancedMatches = advancedMatches && (r.shelf_number || '').toLowerCase().includes(shelfNumber.toLowerCase());
            if (passportNumber) advancedMatches = advancedMatches && (r.passport_number || '').toLowerCase().includes(passportNumber.toLowerCase());
            if (requestNumber) advancedMatches = advancedMatches && (r.request_number || '').toLowerCase().includes(requestNumber.toLowerCase());
            if (gender) advancedMatches = advancedMatches && (r.sex || '').toUpperCase().startsWith(gender.substring(0, 1).toUpperCase());
            if (startDate) advancedMatches = advancedMatches && new Date(r.created_at || r.date) >= new Date(startDate);
            if (endDate) advancedMatches = advancedMatches && new Date(r.created_at || r.date) <= new Date(endDate);

            return matchesText && advancedMatches;
          }).map(r => ({
            id: r.id,
            type: (r.under_age ? 'Residence ID' : 'EOID') as any, // Visual placement match
            title: r.full_name,
            subtitle: `${r.under_age ? 'Minor' : 'Adult'} • Base: ${r.service_provided || 'None'} ${r.eoid_type ? `[${r.eoid_type}]` : ''}`,
            identifier: r.eoid_number || r.passport_number || r.request_number || 'No Identifiers',
            boxNumber: r.box_number,
            shelfNumber: r.shelf_number,
            created_at: r.created_at || r.date,
            rawRecord: r
          }));
        } else {
          // STANDARD OTHER DIVISIONS
          const tableName = TABLE_MAP[type as RecordType];
          let tblData: any[] = [];
          const { data, error } = await supabase.from(tableName).select('*');
          if (!error && data) {
            tblData = data;
          } else {
            // Local fallback
            const k = 'local_records_' + type.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            tblData = JSON.parse(localStorage.getItem(k) || '[]');
          }

          return tblData.filter(r => {
            const nm = (r.full_name || '').toLowerCase().includes(term);
            const pass = (r.passport_number || '').toLowerCase().includes(term);
            const req = (r.request_number || '').toLowerCase().includes(term);
            const boxN = (r.box_number || '').toLowerCase().includes(term);
            const shelfN = (r.shelf_number || '').toLowerCase().includes(term);
            
            // Specific ID matches
            const extraId = (r.residence_id_no || r.letter_number || r.personal_id_no || '');
            const extraMatch = extraId.toLowerCase().includes(term);

            const matchesText = !term || nm || pass || req || boxN || shelfN || extraMatch;

            // Advanced filters check
            let advancedMatches = true;
            if (boxNumber) advancedMatches = advancedMatches && (r.box_number || '').toLowerCase().includes(boxNumber.toLowerCase());
            if (shelfNumber) advancedMatches = advancedMatches && (r.shelf_number || '').toLowerCase().includes(shelfNumber.toLowerCase());
            if (passportNumber) advancedMatches = advancedMatches && (r.passport_number || '').toLowerCase().includes(passportNumber.toLowerCase());
            if (requestNumber) advancedMatches = advancedMatches && (r.request_number || '').toLowerCase().includes(requestNumber.toLowerCase());
            if (gender) {
              const checkVal = r.sex || r.gender || '';
              advancedMatches = advancedMatches && checkVal.toUpperCase().startsWith(gender.substring(0, 1).toUpperCase());
            }
            if (startDate) advancedMatches = advancedMatches && new Date(r.created_at || r.date) >= new Date(startDate);
            if (endDate) advancedMatches = advancedMatches && new Date(r.created_at || r.date) <= new Date(endDate);

            return matchesText && advancedMatches;
          }).map(r => ({
            id: r.id,
            type: type as any,
            title: r.full_name,
            subtitle: `${r.service_provided || 'Registration Service'} ${r.visa_type || r.id_type || r.document_type || ''}`,
            identifier: r.passport_number || r.residence_id_no || r.request_number || r.personal_id_no || 'N/A',
            boxNumber: r.box_number,
            shelfNumber: r.shelf_number,
            created_at: r.created_at || r.date,
            rawRecord: { ...r, _table: tableName }
          }));
        }
      } catch (err) {
        console.warn(`Parallel search error for table type ${type}:`, err);
        return [];
      }
    });

    const outcomes = await Promise.all(searchPromises);
    allSearched = outcomes.flat();

    // Sort by Date descending
    allSearched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setResults(allSearched);
    setSearching(false);
  };

  useEffect(() => {
    executeSearch();
  }, [selectedTypes, refreshCounter]);

  const handleClearFilters = () => {
    setBoxNumber('');
    setShelfNumber('');
    setPassportNumber('');
    setRequestNumber('');
    setGender('');
    setStartDate('');
    setEndDate('');
    setQuery('');
    setResults([]);
  };

  // Icon selector mapping
  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'VISA': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'EOID': return <Fingerprint className="w-4 h-4 text-blue-500" />;
      case 'Residence ID': return <CreditCard className="w-4 h-4 text-[#8c1d1d]" />;
      case 'ETD': return <MapPin className="w-4 h-4 text-amber-500" />;
      case 'Yellow Card': return <Shield className="w-4 h-4 text-yellow-600" />;
      case 'Alien Passport': return <PassportIcon className="w-4 h-4 text-purple-500" />;
      case 'Eritrean ID': return <Plane className="w-4 h-4 text-teal-500" />;
      case 'Profiles': return <Users className="w-4 h-4 text-indigo-500" />;
      case 'AuditLogs': return <Activity className="w-4 h-4 text-rose-500" />;
      default: return <Archive className="w-4 h-4 text-slate-500" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch(type) {
      case 'VISA': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EOID': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Residence ID': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ETD': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Yellow Card': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'Alien Passport': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Eritrean ID': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Profiles': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'AuditLogs': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Check if current user clearance allows edit/delete
  const canEditRecord = (type: string) => {
    if (!userProfile) return false;
    const r = (userProfile.role || '').toLowerCase();
    if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin_grant') return true;
    if (type === 'Profiles' || type === 'AuditLogs') return false; // Non editable or managed via UserManagement separately
    
    if (userProfile.modules && Array.isArray(userProfile.modules)) {
      return userProfile.modules.includes(`${type}:write`) || userProfile.modules.includes(`${type}:approve`);
    }
    return r === 'staff';
  };

  const canDeleteRecord = (type: string) => {
    if (!userProfile) return false;
    const r = (userProfile.role || '').toLowerCase();
    return r === 'super_admin' || r === 'super-admin' || r === 'super admin';
  };

  return (
    <div className="space-y-6 text-left pb-16" id="advanced-search-module-root">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#072146] tracking-tight">
            Global Search Engine
          </h1>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1.5">
            Cross-reference and query all archives, database collections, staff index, and audit traces.
          </p>
        </div>
      </div>

      {/* Primary Search Controls */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Query files globally (Name, Passport, Email, Request Number, action details ...)"
              className="w-full pl-13 pr-6 py-4 bg-slate-50 border border-slate-200 hover:bg-slate-100/60 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 rounded-2xl text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 font-sans"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') executeSearch();
              }}
            />
          </div>
          
          <button 
            onClick={executeSearch}
            disabled={searching}
            className="px-8 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border-none"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search</span>
          </button>

          <button 
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 transition-all cursor-pointer`}
            title="Toggle Advanced Filters"
          >
            <SlidersHorizontal className={`w-5 h-5 transition-transform ${isAdvancedOpen ? 'rotate-180 text-emerald-700' : ''}`} />
          </button>
        </div>

        {/* Collapsible Advanced Form */}
        <AnimatePresence>
          {isAdvancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-dashed border-slate-200 pt-5 mt-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Box Number</span>
                  <input 
                    type="text"
                    value={boxNumber}
                    onChange={(e) => setBoxNumber(e.target.value)}
                    placeholder="e.g. B-12"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Shelf Number</span>
                  <input 
                    type="text"
                    value={shelfNumber}
                    onChange={(e) => setShelfNumber(e.target.value)}
                    placeholder="e.g. S-04"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Passport / doc number</span>
                  <input 
                    type="text"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    placeholder="Search documents"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Request Number</span>
                  <input 
                    type="text"
                    value={requestNumber}
                    onChange={(e) => setRequestNumber(e.target.value)}
                    placeholder="Search request ID"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Sex / Gender</span>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Archived FROM</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Archived TO</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-end pb-0.5 justify-end">
                  <button 
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline outline-none border-none bg-transparent cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Division Search Targeted Checkboxes */}
        <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Search Scope</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSelectAllTypes}
                className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-800 outline-none border-none bg-transparent cursor-pointer"
              >
                Select All
              </button>
              <span className="text-[10px] text-slate-300">•</span>
              <button 
                onClick={handleDeselectAllTypes}
                className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 outline-none border-none bg-transparent cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {['VISA', 'EOID', 'Residence ID', 'ETD', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'Profiles', 'AuditLogs'].map((type) => {
              const checked = selectedTypes.includes(type);
              const isCleared = hasTableClearance(type);
              
              return (
                <button
                  key={type}
                  onClick={() => handleToggleType(type)}
                  disabled={!isCleared}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    checked 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  } ${!isCleared ? 'opacity-35 cursor-not-allowed select-none' : 'cursor-pointer'}`}
                >
                  {checked ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span>{type === 'Profiles' ? 'User Profiles' : type === 'AuditLogs' ? 'Audit Logs' : type}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm min-h-60 flex flex-col justify-start">
        {searching ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3.5 flex-1">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest animate-pulse">Scanning server divisions...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-350 shadow-sm leading-none">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-extrabold text-slate-800 mt-2">No matching archive registers</p>
            <p className="text-xs font-semibold text-slate-400 max-w-sm leading-relaxed">
              No results match your current query or division selection criteria. Make sure you select the correct search scope above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 pb-3">
              <span>Found {results.length} matched records / entries</span>
              <span>Sorted by archived date</span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {results.map((item) => (
                <div 
                  key={`${item.type}-${item.id}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 p-4.5 rounded-2xl transition-all shadow-sm"
                >
                  <div 
                    className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer text-left"
                    onClick={() => setActiveDetail(item)}
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm">
                      {getTypeIcon(item.type)}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-800 text-[13px] tracking-tight truncate leading-tight">
                          {item.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border leading-none shrink-0 ${getBadgeStyle(item.type)}`}>
                          {item.type === 'Profiles' ? 'User' : item.type === 'AuditLogs' ? 'Audit' : item.type}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-slate-500 truncate mt-1 leading-snug">
                        {item.subtitle}
                      </p>
                      
                      <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 mt-2 flex-wrap">
                        {item.identifier && (
                          <span className="font-mono bg-slate-100/70 border border-slate-150 rounded px-1.5 py-0.5 leading-none">
                            ID: {item.identifier}
                          </span>
                        )}
                        {item.boxNumber && (
                          <span className="flex items-center gap-1">
                            <Archive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Box: <strong className="text-slate-600">{item.boxNumber}</strong></span>
                          </span>
                        )}
                        {item.shelfNumber && (
                          <span>
                            Shelf: <strong className="text-slate-600">{item.shelfNumber}</strong>
                          </span>
                        )}
                        <span>
                          Archived: {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center justify-end gap-1.5 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-none border-dashed border-slate-150">
                    <button 
                      onClick={() => setActiveDetail(item)}
                      className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl transition-all cursor-pointer outline-none"
                      title="Inspect Document Sheet"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {canEditRecord(item.type) && (
                      <button 
                        onClick={() => {
                          onEditRecord(item.rawRecord);
                        }}
                        className="p-2 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-150 rounded-xl transition-all cursor-pointer outline-none"
                        title="Edit Entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteRecord(item.type) && (
                      <button 
                        onClick={() => {
                          onDeleteRecord(item.id);
                        }}
                        className="p-2 text-rose-500 hover:text-rose-700 bg-[#fff5f5] hover:bg-rose-100 border border-rose-150 rounded-xl transition-all cursor-pointer outline-none"
                        title="Delete Document Entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inspect Detail Modal */}
      <AnimatePresence>
        {activeDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 hover:border-slate-200 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0">
                    {getTypeIcon(activeDetail.type)}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{activeDetail.type} Archive Inspect</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5 font-mono">ID: {activeDetail.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveDetail(null)}
                  className="w-8 h-8 rounded-full border border-slate-150 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center justify-center transition-all outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[480px] text-left space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1 p-4 bg-slate-50 border border-slate-120 rounded-2xl">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Full Name / Tag</span>
                    <strong className="block text-slate-800 text-sm font-black mt-1 leading-tight">{activeDetail.title}</strong>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-4 bg-slate-50 border border-slate-120 rounded-2xl">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Main Identifier</span>
                    <strong className="block text-slate-800 text-sm font-mono mt-1 leading-tight">{activeDetail.identifier}</strong>
                  </div>

                  {activeDetail.type !== 'Profiles' && activeDetail.type !== 'AuditLogs' && (
                    <>
                      <div className="p-4 bg-slate-50 border border-slate-120 rounded-2xl">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Box Number</span>
                        <strong className="block text-slate-800 text-sm font-extrabold mt-1 leading-tight">{activeDetail.boxNumber || 'N/A'}</strong>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-120 rounded-2xl">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Shelf Number</span>
                        <strong className="block text-slate-800 text-sm font-extrabold mt-1 leading-tight">{activeDetail.shelfNumber || 'N/A'}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-5">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block mb-3">Complete Raw Parameters</span>
                  <div className="bg-[#0f172a] rounded-2xl p-4 overflow-x-auto border border-slate-800">
                    <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed text-left whitespace-pre-wrap">
                      {JSON.stringify(activeDetail.rawRecord, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-120 shrink-0 flex items-center justify-end gap-2">
                <button 
                  onClick={() => setActiveDetail(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer outline-none"
                >
                  Close Panel
                </button>
                {canEditRecord(activeDetail.type) && (
                  <button 
                    onClick={() => {
                      const rec = activeDetail.rawRecord;
                      setActiveDetail(null);
                      onEditRecord(rec);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer border-none"
                  >
                    Edit Record Form
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Minimal placeholder passport icon
function PassportIcon(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="12" cy="13" r="3" />
      <path d="M12 2v8" />
    </svg>
  );
}
