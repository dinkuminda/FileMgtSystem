import React, { useState, useEffect } from 'react';
import { supabase, TABLE_MAP, type RecordType } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { Loader2, TrendingUp, Users, FileText, Globe } from 'lucide-react';
import { motion } from 'motion/react';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#4f46e5'];

export default function DashboardReports() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

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
        citizenshipMap[r.citizenship] = (citizenshipMap[r.citizenship] || 0) + 1;
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

      setStats({ totals, citizenshipData, timeData, totalRecords: allData.length });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600 opacity-20" />
        <p className="font-medium">Compiling dynamic reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="flutter-card p-5 md:p-8 flex flex-col justify-between h-40 md:h-48 group hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between pointer-events-none">
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400">Total</p>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] rounded-[14px] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-4xl font-bold text-slate-800 mb-1">{stats?.totalRecords}</p>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-emerald-500" />
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-500">Live units</p>
            </div>
          </div>
        </div>

        {stats?.totals.slice(0, 3).map((item: any) => (
          <div key={item.name} className="flutter-card p-5 md:p-8 flex flex-col justify-between h-40 md:h-48 group hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between pointer-events-none">
              <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 truncate pr-2">{item.name}</p>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-400 rounded-[14px] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl md:text-4xl font-bold text-slate-800 mb-1">{item.value}</p>
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Active</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Resource Pulse (Reg Trend) */}
        <div className="lg:col-span-2 flutter-card p-6 md:p-10">
          <div className="mb-6 md:mb-10">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Resource Pulse</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Distribution across categories</p>
          </div>
          <div className="h-[300px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.totals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="var(--m3-primary)" 
                  radius={[12, 12, 4, 4]} 
                  barSize={40} 
                  animationBegin={200}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Distribution */}
        <div className="flutter-card p-6 md:p-10 flex flex-col">
          <div className="mb-6 md:mb-10">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Global Reach</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Top registry origins</p>
          </div>
          <div className="flex-1 space-y-4 md:space-y-6">
            {stats?.citizenshipData.map((item: any, idx: number) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-bold text-slate-600">{item.name}</p>
                  <p className="text-xs font-black text-[var(--m3-primary)]">{( (item.value / stats.totalRecords) * 100 ).toFixed(1)}%</p>
                </div>
                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / stats.totalRecords) * 100}%` }}
                    transition={{ duration: 1, delay: idx * 0.1 }}
                    className="h-full bg-[var(--m3-primary)] rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 md:mt-10 pt-8 md:pt-10 border-t border-slate-50 flex items-center justify-between">
            <div>
              <p className="text-lg md:text-xl font-bold text-slate-800">{stats?.citizenshipData.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Nations</p>
            </div>
            <Globe className="w-8 h-8 md:w-10 md:h-10 text-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
