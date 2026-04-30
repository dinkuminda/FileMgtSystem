import React, { useState, useEffect } from 'react';
import { supabase, TABLE_MAP, type RecordType } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { Loader2, TrendingUp, Users, FileText, Globe } from 'lucide-react';

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
    <div className="space-y-8 animate-in fade-in duration-500 transition-colors">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.totalRecords}</p>
            </div>
          </div>
        </div>
        {stats?.totals.map((item: any, idx: number) => (
          <div key={item.name} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl" style={{ backgroundColor: `${COLORS[idx % COLORS.length]}20` }}>
                <FileText className="w-6 h-6" style={{ color: COLORS[idx % COLORS.length] }} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.name}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribution by Category */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Category Distribution</span>
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.totals}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {stats?.totals.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    color: 'var(--tooltip-text, #000)'
                  }}
                  itemStyle={{ color: 'inherit' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Citizenships */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center space-x-2">
            <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Top Citizenships</span>
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.citizenshipData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: 'currentColor' }} className="text-gray-500 dark:text-gray-400" />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    color: 'var(--tooltip-text, #000)'
                  }}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Records Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 transition-colors">Recent Registration Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-gray-400 dark:text-gray-500" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-gray-400 dark:text-gray-500" />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    color: 'var(--tooltip-text, #000)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
