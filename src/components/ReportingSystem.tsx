import React, { useState, useEffect } from 'react';
import { supabase, TABLE_MAP, type ImmigrationRecord, type RecordType } from '../lib/supabase';
import { 
  BarChart3, Calendar, Globe, FileText, 
  Download, Filter, Loader2, Search,
  ChevronDown, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import Papa from 'papaparse';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4'];

export default function ReportingSystem() {
  const [data, setData] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    country: '',
    type: 'ALL' as RecordType | 'ALL'
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
      const combined = results.flatMap((r, idx) => {
        const type = (Object.keys(TABLE_MAP) as RecordType[])[idx];
        return (r.data || []).map((item: any) => ({ ...item, record_type: type }));
      });

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

  const filteredData = data.filter(record => {
    const recordDate = new Date(record.date);
    const matchesStart = !filters.startDate || recordDate >= new Date(filters.startDate);
    const matchesEnd = !filters.endDate || recordDate <= new Date(filters.endDate);
    const matchesCountry = !filters.country || record.citizenship === filters.country;
    const matchesType = filters.type === 'ALL' || (record as any).record_type === filters.type;
    
    return matchesStart && matchesEnd && matchesCountry && matchesType;
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
    const csv = Papa.unparse(filteredData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `immigration_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-12 h-12 animate-spin mb-6 text-[var(--m3-primary)] opacity-40" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--m3-on-surface-variant)]">Compiling Analytical Data...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700">
      {/* Filters Bar */}
      <div className="m3-card-elevated p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-[var(--m3-primary-container)] rounded-2xl text-[var(--m3-on-primary-container)]">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--m3-on-surface)]">Report Configuration</h3>
            <p className="text-xs text-[var(--m3-on-surface-variant)] font-black uppercase tracking-widest opacity-50">Define your query parameters</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1">Start Date</label>
            <input 
              type="date"
              className="m3-input w-full"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1">End Date</label>
            <input 
              type="date"
              className="m3-input w-full"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1">By Country</label>
            <select
              className="m3-input w-full"
              value={filters.country}
              onChange={e => setFilters({ ...filters, country: e.target.value })}
            >
              <option value="">All Regions</option>
              {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1">Record Type</label>
            <select
              className="m3-input w-full"
              value={filters.type}
              onChange={e => setFilters({ ...filters, type: e.target.value as any })}
            >
              <option value="ALL">Complete Registry</option>
              {Object.keys(TABLE_MAP).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--m3-outline)]/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-3xl font-bold text-[var(--m3-on-surface)]">{filteredData.length}</p>
              <p className="text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.2em] opacity-40">Matched Units</p>
            </div>
            <div className="w-px h-10 bg-[var(--m3-outline)]/20" />
            <div className="flex -space-x-3">
              {[...Array(Math.min(5, Math.ceil(filteredData.length/10)))].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-[var(--m3-surface-container-highest)] border-2 border-[var(--m3-surface-container-high)] flex items-center justify-center text-[10px] font-bold text-[var(--m3-primary)]">
                  {i+1}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={handleGenerate}
              className="m3-button-filled flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-4 shadow-xl shadow-[var(--m3-primary)]/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="uppercase tracking-widest text-[10px]">Processing...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  <span className="uppercase tracking-widest text-[10px]">Generate Analysis</span>
                </>
              )}
            </button>

            <button 
              onClick={exportFilteredData}
              disabled={filteredData.length === 0}
              className="p-4 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] rounded-2xl border border-[var(--m3-outline)]/10 hover:bg-[var(--m3-primary-container)] hover:text-[var(--m3-on-primary-container)] transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              title="Download results as CSV"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Analysis & Table */}
      {!reportReady ? (
        <div className="flex flex-col items-center justify-center py-32 m3-card bg-transparent border-2 border-dashed border-[var(--m3-outline)]/10">
          <div className="relative mb-8">
            <BarChart3 className="w-20 h-20 text-[var(--m3-primary)] opacity-5" />
            <Search className="w-10 h-10 text-[var(--m3-primary)] absolute bottom-0 right-0 animate-bounce" />
          </div>
          <h4 className="text-lg font-bold text-[var(--m3-on-surface)] opacity-30">Analysis Pending</h4>
          <p className="text-xs text-[var(--m3-on-surface-variant)] mt-2 uppercase tracking-widest opacity-40">Apply filters to stream intelligence data</p>
        </div>
      ) : (
        <div className="space-y-10">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-16 h-16 animate-spin text-[var(--m3-primary)] opacity-10 mb-6" />
              <p className="text-xs font-black uppercase tracking-widest text-[var(--m3-on-surface-variant)] opacity-40">Re-indexing analytical core...</p>
            </div>
          ) : (
            <>
              {/* Visual Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <div className="m3-card p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <FileText className="w-5 h-5 text-[var(--m3-primary)]" />
                    <h4 className="font-bold text-[var(--m3-on-surface)] uppercase tracking-tight">Record Distribution</h4>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--m3-outline)" opacity={0.1} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--m3-on-surface-variant)', opacity: 0.6 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--m3-on-surface-variant)', opacity: 0.6 }} />
                        <Tooltip 
                          cursor={{ fill: 'var(--m3-surface-container-highest)', opacity: 0.3 }}
                          contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: 'var(--m3-surface-container-high)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
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

                <div className="m3-card p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Globe className="w-5 h-5 text-[var(--m3-secondary)]" />
                    <h4 className="font-bold text-[var(--m3-on-surface)] uppercase tracking-tight">Geographic Intelligence</h4>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryData} layout="vertical">
                        <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="var(--m3-outline)" opacity={0.1} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--m3-on-surface-variant)', opacity: 0.6 }} />
                        <Tooltip 
                          cursor={{ fill: 'var(--m3-surface-container-highest)', opacity: 0.3 }}
                          contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: 'var(--m3-surface-container-high)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="value" fill="var(--m3-primary)" radius={[0, 12, 12, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Results Table */}
              <div className="m3-card-elevated !p-0 overflow-hidden border border-[var(--m3-outline-variant)]/30 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <div className="p-8 border-b border-[var(--m3-outline-variant)]/30 flex items-center justify-between bg-[var(--m3-surface-container-low)]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[var(--m3-surface-container-highest)] rounded-2xl text-[var(--m3-primary)]">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--m3-on-surface)]">Raw Intelligence Feed</h4>
                      <p className="text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-widest opacity-50">Filtered granularity</p>
                    </div>
                  </div>
                  <span className="px-4 py-1.5 bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {filteredData.length} UNITS LOCALIZED
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--m3-surface-container)]/30 border-b border-[var(--m3-outline-variant)]/20">
                        <th className="px-8 py-5 text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.2em]">Registry Date</th>
                        <th className="px-8 py-5 text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.2em]">Subject Name</th>
                        <th className="px-8 py-5 text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.2em]">Credential ID</th>
                        <th className="px-8 py-5 text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.2em]">Origin</th>
                        <th className="px-8 py-5 text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.2em]">Classification</th>
                        <th className="px-8 py-5 text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.2em] text-right">Ref Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--m3-outline-variant)]/20">
                      {filteredData.slice(0, 50).map((record: any) => (
                        <tr key={record.id} className="hover:bg-[var(--m3-surface-container-high)] transition-all group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3 text-xs font-bold text-[var(--m3-on-surface-variant)] font-mono">
                              <Calendar className="w-4 h-4 text-[var(--m3-primary)] opacity-40" />
                              <span>{new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm font-bold text-[var(--m3-on-surface)] group-hover:text-[var(--m3-primary)] transition-colors">{record.full_name}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-xs font-mono font-bold text-[var(--m3-on-surface-variant)] opacity-70">{record.passport_number || record.id_number || 'N/A'}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-xs font-bold text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container-high)] px-3 py-1 rounded-lg">
                              {record.citizenship}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] uppercase tracking-tighter shadow-sm">
                              {record.record_type}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right font-mono text-xs font-bold text-[var(--m3-primary)]">
                            {record.visa_number || record.request_number || record.residence_number || record.file_number || 'TRK-XXX'}
                          </td>
                        </tr>
                      ))}
                      {filteredData.length > 50 && (
                        <tr>
                          <td colSpan={6} className="px-8 py-8 text-center bg-[var(--m3-surface-container-low)]/50">
                            <p className="text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.3em] opacity-40">
                              + {filteredData.length - 50} ADDITIONAL SUBJECTS ENUMERATED
                            </p>
                            <button 
                              onClick={exportFilteredData}
                              className="mt-3 text-[10px] font-black text-[var(--m3-primary)] uppercase tracking-widest hover:underline"
                            >
                              Download Full CSV Intelligence Manifest
                            </button>
                          </td>
                        </tr>
                      )}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center text-[var(--m3-on-surface-variant)] italic">
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
