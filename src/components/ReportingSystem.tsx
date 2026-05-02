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
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
        <p>Analyzing system data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
        <div className="flex items-center space-x-2 mb-6">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900 dark:text-white">Reporting Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
            <input 
              type="date"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">End Date</label>
            <input 
              type="date"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">By Country</label>
            <select
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
              value={filters.country}
              onChange={e => setFilters({ ...filters, country: e.target.value })}
            >
              <option value="">All Countries</option>
              {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Record Type</label>
            <select
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
              value={filters.type}
              onChange={e => setFilters({ ...filters, type: e.target.value as any })}
            >
              <option value="ALL">All Types</option>
              {Object.keys(TABLE_MAP).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredData.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Matched Records</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleGenerate}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex-1 md:flex-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </button>

            <button 
              onClick={exportFilteredData}
              disabled={filteredData.length === 0}
              className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Analysis & Table */}
      {!reportReady ? (
        <div className="flex flex-col items-center justify-center p-20 bg-gray-50/50 dark:bg-gray-800/20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-full mb-4">
            <BarChart3 className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
          <p className="text-gray-400 font-medium">Select filters above and click 'Generate Report' to see analysis</p>
        </div>
      ) : (
        <>
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center p-20">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 opacity-20 mb-4" />
              <p className="text-gray-400 font-medium">Updating report data...</p>
            </div>
          ) : (
            <>
              {/* Visual Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Volume by Data Type</span>
                  </h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1f2937', color: '#fff' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span>Top Geographic Reach</span>
                  </h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1f2937', color: '#fff' }}
                        />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Results Table */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                    <Search className="w-4 h-4 text-blue-600" />
                    <span>Detailed Results</span>
                  </h4>
                  <span className="text-xs font-medium text-gray-500">Showing {filteredData.length} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Passport/ID</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Citizenship</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ref Number</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredData.slice(0, 50).map((record: any) => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{new Date(record.date).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{record.full_name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{record.passport_number || record.id_number || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{record.citizenship}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 uppercase">
                              {record.record_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {record.visa_number || record.request_number || record.residence_number || record.file_number || 'N/A'}
                          </td>
                        </tr>
                      ))}
                      {filteredData.length > 50 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-400 italic">
                            And {filteredData.length - 50} more records... (Use export for full list)
                          </td>
                        </tr>
                      )}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                            No records match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
