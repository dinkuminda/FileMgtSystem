import React, { useState, useEffect } from 'react';
import { supabase, TABLE_MAP, type RecordType } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { 
  Loader2, TrendingUp, Users, FileText, Globe, Archive, Folder,
  FolderOpen, Search, Info, CheckCircle, ChevronRight, Minimize2, Tag, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#1b54ac', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#06b6d4'];

export default function DashboardReports() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [boxSearchQuery, setBoxSearchQuery] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const getRecordCategory = (record: any) => {
    if (record.eoid_number) return "EOID Logs";
    if (record.residence_id_no) return "Residence ID";
    if (record.etd) return "ETD Records";
    if (record.document_type) return "Bole Airport";
    return "VISA Records";
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        Object.entries(TABLE_MAP).map(async ([type, table]) => {
          const { data, count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact' });
          
          if (error) throw error;
          return { type, count: count || 0, data };
        })
      );

      // Process totals
      const totals = results.map(r => ({ name: r.type, value: r.count }));
      const allData = results.flatMap(r => r.data || []);

      // Citizenship distribution
      const citizenshipMap: Record<string, number> = {};
      allData.forEach(r => {
        if (r.citizenship) {
          citizenshipMap[r.citizenship] = (citizenshipMap[r.citizenship] || 0) + 1;
        }
      });
      const citizenshipData = Object.entries(citizenshipMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Records over time (last 30 days)
      const dateMap: Record<string, number> = {};
      allData.forEach(r => {
        const date = new Date(r.created_at).toLocaleDateString();
        dateMap[date] = (dateMap[date] || 0) + 1;
      });
      const timeData = Object.entries(dateMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10);

      // Box Grouping for File Management View
      const boxMap: Record<string, any[]> = {};
      allData.forEach(r => {
        const box = r.box_number?.trim() || 'Box 01';
        if (!boxMap[box]) {
          boxMap[box] = [];
        }
        boxMap[box].push(r);
      });

      const boxData = Object.entries(boxMap).map(([boxName, items]) => ({
        boxName,
        itemsCount: items.length,
        items
      })).sort((a, b) => a.boxName.localeCompare(b.boxName, undefined, { numeric: true, sensitivity: 'base' }));

      setStats({ totals, citizenshipData, timeData, totalRecords: allData.length, boxData });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600 opacity-20" />
        <p className="font-semibold text-sm">Compiling digital files and reports...</p>
      </div>
    );
  }

  // Get current selected box data
  const activeBoxInfo = stats?.boxData?.find((b: any) => b.boxName === selectedBox);
  const filteredBoxItems = activeBoxInfo?.items.filter((item: any) => {
    const q = boxSearchQuery.toLowerCase();
    return (
      item.full_name?.toLowerCase().includes(q) ||
      item.passport_number?.toLowerCase().includes(q) ||
      item.request_number?.toLowerCase().includes(q) ||
      item.service_provided?.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40 md:h-48 group hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between pointer-events-none">
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400">Total Digitized Files</p>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-[#1b54ac] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-4xl font-black text-slate-900 mb-1">{stats?.totalRecords}</p>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-emerald-500" />
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#10b981]">Live Synchronization</p>
            </div>
          </div>
        </div>

        {stats?.totals.slice(0, 3).map((item: any) => {
          const colors = ['bg-emerald-50 text-[#10b981]', 'bg-amber-50 text-amber-600', 'bg-rose-50 text-rose-600'];
          const idx = stats.totals.indexOf(item) % colors.length;
          return (
            <div key={item.name} className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40 md:h-48 group hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between pointer-events-none">
                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 truncate pr-2">{item.name}</p>
                <div className={`w-10 h-10 md:w-12 md:h-12 ${colors[idx]} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <FileText className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl md:text-4xl font-black text-slate-900 mb-1">{item.value}</p>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Archived Folders</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advanced Section: Physical Archive Box Explorer */}
      <section className="bg-white border border-slate-200 p-6 md:p-10 rounded-3xl shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1b54ac] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <Archive className="w-3.5 h-3.5" /> High Density Archivist
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Physical Storage Box Explorer</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Review and locate paper files mapped by physical archive box index
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/50">
            <Info className="w-4 h-4 text-[#1b54ac]" />
            <span>Click any box below to inspect its contents</span>
          </div>
        </div>

        {/* Dynamic Box Shelf Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {stats?.boxData?.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 font-bold text-sm uppercase tracking-wider">
              No Physical Storage Boxes Recorded Yet.
            </div>
          ) : (
            stats?.boxData?.map((box: any) => {
              const isSelected = selectedBox === box.boxName;
              return (
                <button
                  key={box.boxName}
                  onClick={() => {
                    setSelectedBox(isSelected ? null : box.boxName);
                    setBoxSearchQuery('');
                  }}
                  className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-40 focus:outline-none relative group ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-500/20' 
                      : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-slate-100/50 text-slate-800'
                  }`}
                >
                  {/* Visual steel bar on top of archive box */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${
                    isSelected ? 'bg-blue-900' : 'bg-slate-300'
                  }`} />

                  <div className="flex justify-between items-start pt-1.5 w-full">
                    {isSelected ? (
                      <FolderOpen className="w-7 h-7 text-blue-100 animate-pulse" />
                    ) : (
                      <Folder className="w-7 h-7 text-[#1b54ac] group-hover:scale-105 transition-transform" />
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-blue-900/40 text-blue-100' : 'bg-slate-200/65 text-slate-500'
                    }`}>
                      {box.itemsCount} Files
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      isSelected ? 'text-blue-200' : 'text-slate-400'
                    }`}>PHYSICAL CABINET</p>
                    <p className="text-lg font-black tracking-tight leading-none mt-1">
                      {box.boxName}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Box Drawer Contents */}
        <AnimatePresence>
          {selectedBox && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-slate-100 pt-8"
            >
              <div className="bg-slate-50/50 rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[#1b54ac]">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-lg">Digitized Records inside {selectedBox}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Physical location code verified</p>
                    </div>
                  </div>

                  {/* Micro Search container */}
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filter records inside this box..."
                      value={boxSearchQuery}
                      onChange={(e) => setBoxSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#1b54ac] focus:ring-4 focus:ring-blue-500/5 transition-all"
                    />
                  </div>
                </div>

                {/* Box Records Table */}
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type / Unit</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Name</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Passport No.</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Request Ref</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">National Base</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Creation Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {filteredBoxItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                            No matching files inside this box.
                          </td>
                        </tr>
                      ) : (
                        filteredBoxItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-4 select-none">
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-blue-50 text-[#1b54ac] px-2.5 py-1 rounded-full border border-blue-100/40">
                                <Tag className="w-3 h-3 text-[#1b54ac]/70" /> {getRecordCategory(item)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-xs font-black text-slate-800">{item.full_name}</div>
                              <div className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">{item.sex}</div>
                            </td>
                            <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700">{item.passport_number}</td>
                            <td className="px-5 py-4 text-[10px] font-black text-[#1b54ac] font-mono">{item.request_number}</td>
                            <td className="px-5 py-4 text-xs font-bold text-slate-600">{item.citizenship}</td>
                            <td className="px-5 py-4 text-xs font-mono text-slate-400">
                              {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Main Stats Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Resource Pulse (Reg Trend) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 md:p-10 rounded-3xl shadow-sm">
          <div className="mb-6 md:mb-10">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Immigration File Distribution</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active records across database tables</p>
          </div>
          <div className="h-[300px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.totals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800, textTransform: 'uppercase' }} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
                  }}
                  itemStyle={{ color: '#0f172a', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#1b54ac" 
                  radius={[12, 12, 4, 4]} 
                  barSize={36} 
                  animationBegin={200}
                  animationDuration={1000}
                >
                  {stats?.totals?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Distribution */}
        <div className="bg-white border border-slate-200 p-6 md:p-10 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-6 md:mb-10">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Geographic Density</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Top registry origins</p>
            </div>
            <div className="space-y-4 md:space-y-6">
              {stats?.citizenshipData.map((item: any, idx: number) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-bold text-slate-600">{item.name}</p>
                    <p className="text-xs font-black text-[#1b54ac]">{( (item.value / stats.totalRecords) * 100 ).toFixed(1)}%</p>
                  </div>
                  <div className="h-2 w-full bg-slate-50 border border-slate-100/80 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / stats.totalRecords) * 100}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className="h-full bg-[#1b54ac] rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-lg md:text-xl font-bold text-slate-900">{stats?.citizenshipData.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recorded Nations</p>
            </div>
            <Globe className="w-8 h-8 md:w-10 md:h-10 text-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
