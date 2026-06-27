import React, { useState, useEffect } from 'react';
import { supabase, TABLE_MAP, type ImmigrationRecord, type RecordType, type UserProfile } from '../lib/supabase';
import { 
  BarChart3, Calendar, Globe, FileText, 
  Download, Filter, Loader2, Search,
  ChevronDown, X, Layers, User, FileDown, 
  ArrowRight, RotateCcw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4'];

interface ReportingSystemProps {
  userProfile?: UserProfile | null;
}

export default function ReportingSystem({ userProfile }: ReportingSystemProps) {
  const [data, setData] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  
  const [filterMode, setFilterMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    country: 'ALL',
    type: 'ALL' as RecordType | 'ALL',
    sex: 'ALL',
    scans: 'ALL',
    serviceProvided: '',
    searchTerm: ''
  });
  
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  useEffect(() => {
    fetchAllRecords();
  }, []);

  const fetchAllRecords = async () => {
    setLoading(true);
    try {
      const allPromises = (Object.keys(TABLE_MAP) as RecordType[]).map(type => 
        supabase.from(TABLE_MAP[type]).select('*')
      );
      
      const results = await Promise.all(allPromises);
      let combined = results.flatMap((r, idx) => {
        const type = (Object.keys(TABLE_MAP) as RecordType[])[idx];
        return (r.data || []).map((item: any) => ({ ...item, record_type: type }));
      });

      const rRole = (userProfile?.role as string || '').toLowerCase();
      const isElevated = rRole === 'admin' || rRole === 'super_admin' || rRole === 'super-admin' || rRole === 'super admin' || rRole === 'admin_grant' || rRole === 'supervisor';
      if (!isElevated && userProfile?.id) {
        combined = combined.filter((item: any) => item.created_by === userProfile.id);
      }

      setData(combined);
      
      const countries = Array.from(new Set(combined.map(r => r.citizenship))).sort();
      setAvailableCountries(countries);
    } catch (err) {
      console.error('Error fetching data for reporting:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate a complex query process for UX
    setTimeout(() => {
      setIsGenerating(false);
      setReportReady(true);
    }, 800);
  };

  const handleReset = () => {
    setFilterMode('ALL');
    setFilters({
      startDate: '',
      endDate: '',
      country: 'ALL',
      type: 'ALL',
      sex: 'ALL',
      scans: 'ALL',
      serviceProvided: '',
      searchTerm: ''
    });
    setReportReady(false);
  };

  const filteredData = data.filter(record => {
    // 1. Date filters
    const recordDate = record.date ? new Date(record.date) : null;
    let matchesStart = true;
    if (filters.startDate) {
      matchesStart = record.date >= filters.startDate;
    }
    let matchesEnd = true;
    if (filters.endDate) {
      matchesEnd = record.date <= filters.endDate;
    }

    // 2. Type filter based on active checked radio option & select dropdown value
    const activeRecordType = filterMode === 'ALL' ? 'ALL' : filters.type;
    const matchesType = activeRecordType === 'ALL' || (record as any).record_type === activeRecordType;

    // 3. Country / Citizenship filter
    const matchesCountry = filters.country === 'ALL' || record.citizenship === filters.country;

    // 4. Sex filter
    const matchesSex = filters.sex === 'ALL' || record.sex?.toLowerCase() === filters.sex.toLowerCase();

    // 5. Scans (Attachments) filter
    let matchesScans = true;
    const hasAttachments = (record as any).attachments && (record as any).attachments.length > 0;
    if (filters.scans === 'HAS_SCANS') {
      matchesScans = hasAttachments;
    } else if (filters.scans === 'NO_SCANS') {
      matchesScans = !hasAttachments;
    }

    // 6. Service Provided filter
    let matchesService = true;
    if (filters.serviceProvided) {
      const recordService = (record.service_provided || '').toLowerCase();
      const fallbackService = ((record as any).record_type === 'VISA' ? 'VISA EXTENSION' : 
                               (record as any).record_type === 'Residence ID' ? 'RESIDENCE ID ISSUANCE' : 
                               (record as any).record_type === 'ETD' ? 'ETD ISSUANCE' : 
                               'ALIEN PASSPORT ISSUANCE').toLowerCase();
      matchesService = recordService.includes(filters.serviceProvided.toLowerCase()) || 
                       fallbackService.includes(filters.serviceProvided.toLowerCase());
    }

    // 7. Search terms across core metadata
    let matchesSearch = true;
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const name = (record.full_name || '').toLowerCase();
      const passport = (record.passport_number || '').toLowerCase();
      const box = (record.box_number || '').toLowerCase();
      const request = (record.request_number || '').toLowerCase();
      const resId = ((record as any).id_type || (record as any).residence_id_no || '').toLowerCase();
      const personalId = ((record as any).personal_id || '').toLowerCase();
      const etdDoc = ((record as any).etd || '').toLowerCase();
      
      matchesSearch = name.includes(term) || 
                      passport.includes(term) || 
                      box.includes(term) || 
                      request.includes(term) || 
                      resId.includes(term) || 
                      personalId.includes(term) ||
                      etdDoc.includes(term);
    }

    return matchesStart && matchesEnd && matchesType && matchesCountry && matchesSex && matchesScans && matchesService && matchesSearch;
  });

  const getStats = () => {
    const typeDistribution = filteredData.reduce((acc: any, r: any) => {
      acc[r.record_type] = (acc[r.record_type] || 0) + 1;
      return acc;
    }, {});

    const countryDistribution = filteredData.reduce((acc: any, r: any) => {
      acc[r.citizenship] = (acc[r.citizenship] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(typeDistribution).map(([name, value]) => ({ name, value: value as number }));
    const countryData = Object.entries(countryDistribution)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { chartData, countryData };
  };

  const { chartData, countryData } = getStats();

  const exportFilteredData = () => {
    if (filteredData.length === 0) return;
    
    // Map records to replace "id" string with a sequential 1-based autonumber
    const formattedRecords = filteredData.map((record, index) => {
      const { id, ...rest } = record as any;
      return {
        id: index + 1,
        ...rest
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRecords);
    const workbook = XLSX.utils.book_new();
    XxlsxUtilsBookAppendSheet: XLSX.utils.book_append_sheet(workbook, worksheet, "Immigration Report");
    const filename = `immigration_report_${new Date().toISOString().split('T')[0]}.xls`;
    XLSX.writeFile(workbook, filename);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-600 opacity-60" />
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Compiling Analytical Data...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700 font-sans">
      
      {/* Dynamic Blue Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#0a234b] to-[#1e3a8a] text-white rounded-3xl p-8 shadow-xl border border-slate-800/10">
        {/* Decorative background visual elements */}
        <div className="absolute inset-x-0 bottom-0 top-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.12),transparent_50%50)] pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 -right-16 w-48 h-48 rounded-full border-[12px] border-white/5 -translate-y-1/2" />
        <div className="absolute -bottom-8 right-16 w-32 h-32 rounded-full border-4 border-white/5" />
        
        <div className="relative flex items-center gap-5">
          <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Reports & Analytics</h2>
            <p className="mt-1 text-sm text-slate-300 font-medium">Generate customized reports across all immigration file modules</p>
          </div>
        </div>
      </div>

      {/* Main Reports Panel Custom Format Card */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-6">
        
        {/* Toggle Radio Selection: All Files vs Specific Modules */}
        <div className="flex items-center gap-8 px-2 select-none">
          <label className="flex items-center gap-3 cursor-pointer group">
            <span className="relative flex items-center justify-center w-5 h-5">
              <input 
                type="radio" 
                name="filterMode" 
                className="sr-only" 
                checked={filterMode === 'ALL'} 
                onChange={() => {
                  setFilterMode('ALL');
                  setFilters(prev => ({ ...prev, type: 'ALL' }));
                }}
              />
              {filterMode === 'ALL' ? (
                <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#10b981]">
                  <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full" />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-slate-400 block transition-colors" />
              )}
            </span>
            <span className={`text-sm font-semibold tracking-wide transition-colors ${filterMode === 'ALL' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>All Files</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <span className="relative flex items-center justify-center w-5 h-5">
              <input 
                type="radio" 
                name="filterMode" 
                className="sr-only" 
                checked={filterMode === 'SPECIFIC'} 
                onChange={() => {
                  setFilterMode('SPECIFIC');
                  setFilters(prev => ({ ...prev, type: prev.type === 'ALL' ? Object.keys(TABLE_MAP)[0] as RecordType : prev.type }));
                }}
              />
              {filterMode === 'SPECIFIC' ? (
                <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#10b981]">
                  <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full" />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-slate-400 block transition-colors" />
              )}
            </span>
            <span className={`text-sm font-semibold tracking-wide transition-colors ${filterMode === 'SPECIFIC' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>Specific Modules</span>
          </label>
        </div>

        {/* Dynamic Filter Layout Row */}
        <div className="flex flex-col lg:flex-row items-stretch border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20">
          
          {/* 1. File Module Dropdown */}
          <div className="flex-1 min-w-[190px] flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-slate-100 relative group">
            <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
              <Layers className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">File Module</span>
              {filterMode === 'ALL' ? (
                <span className="block text-sm font-extrabold text-slate-700 mt-1 cursor-not-allowed">All File Modules</span>
              ) : (
                <select
                  className="block w-full bg-transparent text-sm font-extrabold text-slate-700 mt-1 focus:outline-none appearance-none cursor-pointer pr-5"
                  value={filters.type}
                  onChange={e => setFilters({ ...filters, type: e.target.value as any })}
                >
                  {Object.keys(TABLE_MAP).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
            </div>
            {filterMode === 'SPECIFIC' && (
              <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-4" />
            )}
          </div>

          {/* Separation indicator arrow */}
          <div className="hidden lg:flex items-center justify-center px-2 text-slate-300 select-none">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* 3. From Date input block */}
          <div className="flex-1 min-w-[145px] flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-slate-100 relative">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">From Date</span>
              <input 
                type="date"
                className="block w-full bg-transparent text-sm font-extrabold text-slate-700 mt-1 focus:outline-none cursor-pointer"
                value={filters.startDate}
                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
          </div>

          {/* 4. To Date input block */}
          <div className="flex-1 min-w-[145px] flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-slate-100 relative">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">To Date</span>
              <input 
                type="date"
                className="block w-full bg-transparent text-sm font-extrabold text-slate-700 mt-1 focus:outline-none cursor-pointer"
                value={filters.endDate}
                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* 5. Sex selection block */}
          <div className="flex-1 min-w-[110px] flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-slate-100 relative group">
            <User className="w-5 h-5 text-slate-400" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sex</span>
              <select
                className="block w-full bg-transparent text-sm font-extrabold text-slate-700 mt-1 focus:outline-none appearance-none cursor-pointer pr-5"
                value={filters.sex}
                onChange={e => setFilters({ ...filters, sex: e.target.value })}
              >
                <option value="ALL">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-4" />
          </div>

          {/* 6. Citizenship selection block */}
          <div className="flex-1 min-w-[140px] flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-slate-100 relative group">
            <Globe className="w-5 h-5 text-slate-400" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Citizenship</span>
              <select
                className="block w-full bg-transparent text-sm font-extrabold text-slate-700 mt-1 focus:outline-none appearance-none cursor-pointer pr-5"
                value={filters.country}
                onChange={e => setFilters({ ...filters, country: e.target.value })}
              >
                <option value="ALL">All</option>
                {availableCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-4" />
          </div>

          {/* 7. Scans selection block */}
          <div className="flex-1 min-w-[120px] flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-slate-100 relative group">
            <FileDown className="w-5 h-5 text-slate-400" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Scans</span>
              <select
                className="block w-full bg-transparent text-sm font-extrabold text-slate-700 mt-1 focus:outline-none appearance-none cursor-pointer pr-5"
                value={filters.scans}
                onChange={e => setFilters({ ...filters, scans: e.target.value })}
              >
                <option value="ALL">All</option>
                <option value="HAS_SCANS">Has Scans</option>
                <option value="NO_SCANS">No Scans</option>
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-4" />
          </div>

          {/* 8. Orange Action Button */}
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-[#e99f1b] hover:bg-[#cf8305] text-white font-extrabold transition-all duration-200 px-8 py-4 flex items-center justify-center gap-3 disabled:opacity-80 active:scale-[0.98] cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Search className="w-5 h-5 text-white" />
            )}
            <span className="uppercase text-sm tracking-wider whitespace-nowrap">Generate Report</span>
          </button>
        </div>

        {/* Grid search filters layer */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          
          {/* Service Provided Input */}
          <div className="w-full md:w-1/3 relative flex items-center">
            <FileText className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
            <input 
              type="text"
              placeholder="Service Provided (e.g. VISA EXTENSION)"
              className="w-full pl-11 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              value={filters.serviceProvided}
              onChange={e => setFilters({ ...filters, serviceProvided: e.target.value })}
            />
            {filters.serviceProvided && (
              <button 
                onClick={() => setFilters(prev => ({ ...prev, serviceProvided: '' }))}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Global Search Term Input */}
          <div className="flex-1 w-full relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search Name, Passport #, Box #, Request # ..."
              className="w-full pl-11 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-sans"
              value={filters.searchTerm}
              onChange={e => setFilters({ ...filters, searchTerm: e.target.value })}
            />
            {filters.searchTerm && (
              <button 
                onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Modern Reset Button */}
          <button 
            onClick={handleReset}
            className="w-full md:w-auto px-6 py-3 border border-slate-200 text-slate-500 hover:text-slate-750 hover:bg-slate-50 active:bg-slate-100 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

      </div>

      {/* Visual Analysis & Table */}
      {!reportReady ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="relative mb-8">
            <BarChart3 className="w-16 h-16 text-slate-300 animate-pulse" />
            <Search className="w-8 h-8 text-emerald-600 absolute bottom-0 right-0 animate-bounce" />
          </div>
          <h4 className="text-lg font-bold text-slate-700">Analysis Pending</h4>
          <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-semibold">Apply filters to stream intelligence data</p>
        </div>
      ) : (
        <div className="space-y-10">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 opacity-60 mb-4" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Re-indexing analytical core...</p>
            </div>
          ) : (
            <>
              {/* Visual Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                  <div className="flex items-center gap-3 mb-8">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Record Distribution</h4>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" opacity={0.8} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                  <div className="flex items-center gap-3 mb-8">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Geographic Intelligence</h4>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryData} layout="vertical">
                        <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#f1f5f9" opacity={0.8} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="value" fill="#2b825a" radius={[0, 12, 12, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Results Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 text-base leading-tight">Raw Intelligence Feed</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Filtered granularity</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs">
                    {filteredData.length} UNITS LOCALIZED
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registry Date</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject Name</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credential ID</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origin</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classification</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ref Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.slice(0, 50).map((record: any) => (
                        <tr key={record.id} className="hover:bg-slate-50/60 transition-all group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 font-mono">
                              <Calendar className="w-4 h-4 text-slate-450 opacity-60" />
                              <span>{new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-slate-850 group-hover:text-emerald-600 transition-colors">{record.full_name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono font-bold text-slate-500">{record.passport_number || record.id_number || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-lg">
                              {record.citizenship}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 uppercase tracking-wide">
                              {record.record_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs font-bold text-emerald-600">
                            {record.visa_number || record.request_number || record.residence_number || record.file_number || 'TRK-XXX'}
                          </td>
                        </tr>
                      ))}
                      {filteredData.length > 50 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-6 text-center bg-slate-50/30">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              + {filteredData.length - 50} ADDITIONAL SUBJECTS ENUMERATED
                            </p>
                            <button 
                              onClick={exportFilteredData}
                              className="mt-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider hover:underline transition-all"
                            >
                              Download Full CSV Intelligence Manifest
                            </button>
                          </td>
                        </tr>
                      )}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic text-xs font-medium">
                            No subjects localized within the current temporal or geographic parameters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
