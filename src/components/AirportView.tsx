import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type ImmigrationRecord, logger, type UserProfile } from '../lib/supabase';
import { 
  Plane, Users, FileText, CheckCircle, 
  Clock, AlertCircle, Search, Plus,
  LayoutGrid, List, Filter, Paperclip, ExternalLink, FileIcon,
  Loader2, Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import UserManagement from './UserManagement';
import AuditLogView from './AuditLogView';

interface AirportViewProps {
  userProfile: UserProfile | null;
  onAddRecord: () => void;
  onEditRecord: (record: ImmigrationRecord) => void;
  onDeleteRecord: (id: string) => void | Promise<void>;
  searchQuery: string;
  canEdit: boolean;
  refreshCounter?: number;
}

export default function AirportView({ userProfile, onAddRecord, onEditRecord, onDeleteRecord, searchQuery, canEdit, refreshCounter }: AirportViewProps) {
  const { subTab: urlSubTab } = useParams();
  const navigate = useNavigate();
  const activeSubTab = (urlSubTab || 'dashboard') as 'dashboard' | 'add' | 'view' | 'edit' | 'users' | 'audit';

  // Sub-tabs configuration with permission check
  const subTabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutGrid, module: 'AIRPORT_VIEW' },
    { id: 'add', label: 'Register', icon: Plus, module: 'AIRPORT_ADD' },
    { id: 'view', label: 'Database', icon: List, module: 'AIRPORT_VIEW' },
    { id: 'edit', label: 'Correct', icon: Clock, module: 'AIRPORT_EDIT' },
    { id: 'users', label: 'Users', icon: Users, module: 'USERS' },
    { id: 'audit', label: 'Audit', icon: Activity, module: 'AUDIT' },
  ].filter(tab => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.modules && userProfile.modules.length > 0) {
      if (tab.id === 'users') return userProfile.modules.includes('USERS');
      if (tab.id === 'audit') return userProfile.modules.includes('AUDIT');
      return userProfile.modules.includes(tab.module);
    }
    // Fallback for staff
    if (userProfile.role === 'airport_staff' || userProfile.role === 'airport_viewer') {
      return ['dashboard', 'view', 'add', 'edit'].includes(tab.id);
    }
    return true;
  });

  const [records, setRecords] = useState<ImmigrationRecord[]>([]);
  const [globalMatches, setGlobalMatches] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [matchAttachments, setMatchAttachments] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (refreshCounter && refreshCounter > 0) {
      if (activeSubTab === 'add') {
        navigate('/airport/view');
      }
    }
  }, [refreshCounter, activeSubTab, navigate]);

  // Memoize search query to fetch data from all tables
  useEffect(() => {
    const performGlobalSearch = async () => {
      if (searchQuery.length < 3 || activeSubTab === 'dashboard') return;
      
      setSearching(true);
      try {
        const tables = ['airport_records', 'residence_id_records', 'visa_records', 'eoid_records', 'etd_records'];
        let allMatches: any[] = [];
        
        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .or(`full_name.ilike.%${searchQuery}%,passport_number.ilike.%${searchQuery}%,request_number.ilike.%${searchQuery}%`)
            .limit(10);
            
          if (!error && data) {
            allMatches = [...allMatches, ...data.map(r => ({ ...r, _table: table }))];
          }
        }
        
        setGlobalMatches(allMatches);
      } catch (err) {
        console.error('Global search err:', err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(performGlobalSearch, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeSubTab, refreshCounter]);

  // Use global matches for View and Edit if searching
  const exactMatches = React.useMemo(() => {
    if (searchQuery.length >= 3) {
      return globalMatches;
    }
    return records.map(r => ({ ...r, _table: 'airport_records' }));
  }, [searchQuery, globalMatches, records]);

  useEffect(() => {
    fetchAirportData();
  }, [refreshCounter]);

  useEffect(() => {
    if (exactMatches.length > 0) {
      fetchAttachmentsForMatches();
    }
  }, [exactMatches, refreshCounter]);

  const fetchAttachmentsForMatches = async () => {
    try {
      const matchIds = exactMatches.map(m => m.id);
      if (matchIds.length === 0) return;

      // Group records by table to fetch attachments correctly
      const tableMap: Record<string, string[]> = {};
      exactMatches.forEach(m => {
        const table = (m as any)._table || 'airport_records';
        if (!tableMap[table]) tableMap[table] = [];
        tableMap[table].push(m.id);
      });

      let allAttachments: any[] = [];
      
      for (const [table, ids] of Object.entries(tableMap)) {
        const { data, error } = await supabase
          .from('record_attachments')
          .select('*')
          .in('record_id', ids)
          .eq('record_table', table);
        
        if (!error && data) {
          allAttachments = [...allAttachments, ...data];
        }
      }
      
      const grouped = (allAttachments || []).reduce((acc: any, attr: any) => {
        if (!acc[attr.record_id]) acc[attr.record_id] = [];
        acc[attr.record_id].push(attr);
        return acc;
      }, {});
      
      setMatchAttachments(grouped);
    } catch (err) {
      console.error('Error fetching match attachments:', err);
    }
  };

  const fetchAirportData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('airport_records')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      const airportRecords = data as ImmigrationRecord[];
      setRecords(airportRecords.map(r => ({ ...r, _table: 'airport_records' })));

      // Process Stats
      const total = airportRecords.length;
      const today = airportRecords.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).length;
      
      const services: Record<string, number> = {};
      airportRecords.forEach(r => {
        services[r.service_provided] = (services[r.service_provided] || 0) + 1;
      });
      const serviceData = Object.entries(services).map(([name, value]) => ({ name, value }));

      const types: Record<string, number> = {};
      airportRecords.forEach(r => {
        types[r.document_type || 'Other'] = (types[r.document_type || 'Other'] || 0) + 1;
      });
      const typeData = Object.entries(types).map(([name, value]) => ({ name, value }));

      setStats({ total, today, serviceData, typeData });
    } catch (err) {
      console.error('Error fetching airport data:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a'];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="space-y-12">
        {/* Navigation Tabs - M3 Style */}
        <div className="flex items-center gap-6 pb-2 border-b border-[var(--m3-outline)]/10 overflow-x-auto scrollbar-hide">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(`/airport/${tab.id}`)}
                className={`relative flex items-center gap-2 px-4 py-4 transition-all whitespace-nowrap group`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--m3-primary)]' : 'text-[var(--m3-on-surface-variant)] group-hover:text-[var(--m3-on-surface)]'}`} />
                <span className={`text-sm font-bold ${isActive ? 'text-[var(--m3-on-surface)]' : 'text-[var(--m3-on-surface-variant)] group-hover:text-[var(--m3-on-surface)]'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--m3-primary)] rounded-t-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {activeSubTab === 'dashboard' ? (
        <div className="space-y-12">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="m3-card-elevated flex flex-col justify-between h-44"
            >
              <div className="w-12 h-12 bg-[var(--m3-primary-container)] rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-[var(--m3-on-primary-container)]" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--m3-primary)]">Cumulative</p>
                <h3 className="text-4xl font-bold text-[var(--m3-on-surface)] mt-1">{stats?.total || 0}</h3>
                <p className="text-[10px] text-[var(--m3-on-surface-variant)] font-medium mt-1">Total Records Scanned</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="m3-card flex flex-col justify-between h-44 border-none shadow-none bg-amber-500/10"
            >
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-600">Daily</p>
                <h3 className="text-4xl font-bold text-[var(--m3-on-surface)] mt-1">{stats?.today || 0}</h3>
                <p className="text-[10px] text-[var(--m3-on-surface-variant)] font-medium mt-1">New Entries Detected</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="m3-card-elevated flex flex-col justify-between h-44"
            >
              <div className="w-12 h-12 bg-[var(--m3-secondary-container)] rounded-2xl flex items-center justify-center">
                <Filter className="w-6 h-6 text-[var(--m3-on-secondary-container)]" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Compliance</p>
                <h3 className="text-4xl font-bold text-[var(--m3-on-surface)] mt-1">
                  {records.filter(r => !r.attachment_url || r.attachment_url === 'null').length}
                </h3>
                <p className="text-[10px] text-[var(--m3-on-surface-variant)] font-medium mt-1">Partial Attachments</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="m3-card flex flex-col justify-between h-44 border-none shadow-none bg-emerald-500/10"
            >
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Status</p>
                <h3 className="text-4xl font-bold text-[var(--m3-on-surface)] mt-1">ACTIVE</h3>
                <p className="text-[10px] text-[var(--m3-on-surface-variant)] font-medium mt-1">Endpoint Connection</p>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Document Types Chart */}
            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-[var(--m3-outline-variant)]">
              <div className="flex items-center justify-between mb-8 md:mb-10">
                <div>
                  <h3 className="text-xl md:text-2xl font-black">Record Distribution</h3>
                  <p className="text-xs md:text-sm text-gray-500">Breakdown by document classification</p>
                </div>
                <LayoutGrid className="w-5 h-5 md:w-6 md:h-6 text-gray-300" />
              </div>
              <div className="h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.typeData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#334155' : '#f1f5f9'} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        backgroundColor: '#1e293b',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                      {(stats?.typeData || []).map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Service Breakdown */}
            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-[var(--m3-outline-variant)]">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-black">Top Services</h3>
                  <p className="text-xs md:text-sm text-gray-500">Most frequent operations</p>
                </div>
                <List className="w-5 h-5 md:w-6 md:h-6 text-gray-300" />
              </div>
              <div className="space-y-4 md:space-y-6">
                {(stats?.serviceData || []).sort((a: any, b: any) => b.value - a.value).slice(0, 4).map((service: any, index: number) => (
                  <div key={service.name} className="flex items-center gap-4 md:gap-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl flex-shrink-0" style={{ backgroundColor: `${COLORS[index % COLORS.length]}20`, color: COLORS[index % COLORS.length] }}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1 md:mb-2">
                        <span className="text-xs font-black uppercase tracking-widest truncate pr-2">{service.name}</span>
                        <span className="text-[10px] font-mono font-bold text-gray-400">{service.value}</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(service.value / (stats?.total || 1)) * 100}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'add' ? (
        <div className="min-h-[400px] flex items-center justify-center p-12 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <div className="text-center space-y-6 max-w-md">
            <div className="mx-auto w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Plus className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">Register New Document</h3>
              <p className="text-gray-500 mt-2">Initialize a new immigration record for Bole Airport operations.</p>
            </div>
            {canEdit ? (
              <button 
                onClick={onAddRecord}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                Launch Entry Form
              </button>
            ) : (
              <p className="text-sm text-red-500 font-bold bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-lg">
                Insufficient Permissions to Add Records
              </p>
            )}
          </div>
        </div>
      ) : activeSubTab === 'edit' ? (
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20">
                  <Plus className="w-6 h-6 text-white rotate-45" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Modify Records</h3>
                  <p className="text-sm text-gray-500">Search and select highly sensitive records for correction or deletion.</p>
                </div>
              </div>
            </div>

            {searchQuery.length < 3 ? (
              <div className="py-24 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem]">
                <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Search to Modify Documents</p>
              </div>
            ) : searching ? (
              <div className="py-24 text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Accessing Information System...</p>
              </div>
            ) : exactMatches.length === 0 ? (
              <div className="py-24 text-center bg-gray-50 dark:bg-gray-800/20 rounded-[2rem]">
                 <p className="text-gray-400">No records found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {exactMatches.map(match => (
                  <div key={match.id} className="p-6 rounded-[2rem] bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-black mb-1">{match.full_name}</h4>
                        <p className="text-xs font-mono text-blue-600 truncate">{match.passport_number}</p>
                      </div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-800 px-1.5 py-1 rounded shadow-sm">
                        {(match as any)._table?.replace('_records', '').replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEditRecord(match)}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                      >
                        Edit Details
                      </button>
                      <button 
                        onClick={() => onDeleteRecord(match.id)}
                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === 'users' ? (
        <UserManagement />
      ) : activeSubTab === 'audit' ? (
        <AuditLogView filter="AIRPORT" />
      ) : (
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Record Viewport</h3>
                  <p className="text-sm text-gray-500 font-medium">Quick search for all airport and linked records.</p>
                </div>
              </div>
            </div>
            
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Type Passport or Name to search..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900 dark:text-white"
                value={searchQuery}
                readOnly
              />
            </div>

            {searchQuery.length < 3 ? (
              <div className="py-24 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem]">
                <div className="inline-flex p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl mb-4">
                  <Search className="w-12 h-12 text-blue-500 opacity-20" />
                </div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white">Document Lookup Ready</h4>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">Enter an applicant name, passport number, or request ID to retrieve their scanned documents.</p>
              </div>
            ) : searching ? (
              <div className="py-24 text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Retrieving Scanned Records...</p>
              </div>
            ) : exactMatches.length === 0 ? (
              <div className="py-24 text-center bg-gray-50 dark:bg-gray-800/20 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                <div className="inline-flex p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-sm mb-4">
                  <AlertCircle className="w-12 h-12 text-amber-500" />
                </div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white">Record Not Found</h4>
                <p className="text-gray-500 mt-2">We couldn't find any immigration files matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {exactMatches.map(match => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={match.id} 
                    className="group m3-card-elevated flex flex-col transition-all hover:bg-[var(--m3-surface-container-highest)]"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-14 h-14 bg-[var(--m3-primary)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--m3-primary)]/30">
                        <FileText className="w-7 h-7 text-[var(--m3-on-primary)]" />
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className="inline-block px-3 py-1 bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                          {match.document_type || (match as any)._table?.replace('_records', '').replace('_', ' ') || 'Record'}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--m3-on-surface-variant)] opacity-50 uppercase tracking-widest">
                          {(match as any)._table?.replace('_records', '').replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h4 className="text-2xl font-bold text-[var(--m3-on-surface)] tracking-tight leading-tight group-hover:text-[var(--m3-primary)] transition-colors">
                        {match.full_name}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-[11px] font-bold bg-[var(--m3-surface-container-highest)] px-2.5 py-1 rounded-lg text-[var(--m3-on-surface)] uppercase tracking-wide border border-[var(--m3-outline)]/5">{match.citizenship}</span>
                        <span className="text-[11px] font-mono font-bold text-[var(--m3-primary)] px-2.5 py-1 bg-[var(--m3-primary-container)]/30 rounded-lg">REQ: {match.request_number}</span>
                      </div>
                    </div>

                    {/* Scanned Files Visualization */}
                    <div className="flex-1 space-y-4 mb-8">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-widest flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-[var(--m3-primary)]" />
                          Registry Artifacts
                        </p>
                        <span className="px-2 py-0.5 bg-[var(--m3-surface-container)] rounded-md text-[10px] font-bold text-[var(--m3-on-surface-variant)]">
                          {Math.max(matchAttachments[match.id]?.length || 0, (match.attachment_url && match.attachment_url !== 'null') ? 1 : 0)} FILES
                        </span>
                      </div>

                      {(matchAttachments[match.id]?.length > 0 || (match.attachment_url && match.attachment_url !== 'null')) ? (
                        <div className="space-y-4">
                          {matchAttachments[match.id]?.length > 0 ? (
                            matchAttachments[match.id].map(file => {
                              const isImage = file.content_type?.startsWith('image/');
                              const fileUrl = supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl;
                              
                              return (
                                <div key={file.id} className="relative group/doc animate-in fade-in zoom-in duration-500">
                                  {isImage ? (
                                    <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-[var(--m3-outline)]/5 shadow-inner bg-[var(--m3-surface-container)]">
                                      <img 
                                        src={fileUrl} 
                                        alt="Scan"
                                        className="w-full h-full object-cover group-hover/doc:scale-110 transition-transform duration-1000"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover/doc:bg-black/30 transition-all flex items-center justify-center backdrop-blur-0 group-hover/doc:backdrop-blur-[2px]">
                                        <button 
                                          onClick={() => window.open(fileUrl)}
                                          className="p-4 bg-[var(--m3-surface-container-high)]/90 rounded-2xl shadow-2xl text-[var(--m3-primary)] opacity-0 group-hover/doc:opacity-100 transition-all transform translate-y-2 group-hover/doc:translate-y-0"
                                        >
                                          <ExternalLink className="w-6 h-6" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => window.open(fileUrl)}
                                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)] border border-transparent hover:border-[var(--m3-primary)] transition-all text-left group/file"
                                    >
                                      <div className="flex items-center gap-4 truncate">
                                        <div className="p-3 bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] rounded-xl group-hover/file:bg-[var(--m3-primary)] group-hover/file:text-[var(--m3-on-primary)] transition-colors">
                                          <FileIcon className="w-5 h-5" />
                                        </div>
                                        <div className="truncate pr-2">
                                          <span className="text-sm font-bold text-[var(--m3-on-surface)] block truncate uppercase">
                                            {file.file_name}
                                          </span>
                                          <span className="text-[10px] text-[var(--m3-on-surface-variant)] font-bold uppercase">
                                            {(file.size_bytes / 1024).toFixed(1)} KB • {file.content_type?.split('/')[1] || 'DOC'}
                                          </span>
                                        </div>
                                      </div>
                                      <ExternalLink className="w-5 h-5 text-[var(--m3-primary)] opacity-0 group-hover/file:opacity-100 transition-opacity" />
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="relative group/doc animate-in fade-in zoom-in duration-500">
                              <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-[var(--m3-outline)]/5 shadow-inner bg-[var(--m3-surface-container)] flex items-center justify-center">
                                {match.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)/i) || match.attachment_url?.includes('?token=') ? (
                                  <img 
                                    src={match.attachment_url} 
                                    alt="Scan"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <FileText className="w-12 h-12 text-[var(--m3-outline)] opacity-20" />
                                )}
                                <div className="absolute inset-0 bg-black/5 hover:bg-black/30 transition-all flex items-center justify-center backdrop-blur-0 hover:backdrop-blur-[2px]">
                                  <button 
                                    onClick={() => window.open(match.attachment_url!)}
                                    className="p-4 bg-[var(--m3-surface-container-high)]/90 rounded-2xl shadow-2xl text-[var(--m3-primary)]"
                                  >
                                    <ExternalLink className="w-6 h-6" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-10 rounded-[2rem] bg-[var(--m3-surface-container)]/50 text-center border-2 border-dashed border-[var(--m3-outline)]/10">
                          <AlertCircle className="w-8 h-8 text-[var(--m3-on-surface-variant)] opacity-20 mx-auto mb-3" />
                          <p className="text-xs text-[var(--m3-on-surface-variant)] font-bold uppercase tracking-widest">Metadata Only</p>
                          <p className="text-[10px] text-[var(--m3-on-surface-variant)] font-medium italic mt-2 opacity-60">Physical artifact not yet digitized.</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-[var(--m3-outline)]/5 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--m3-on-surface-variant)] uppercase tracking-widest">ID Reference</span>
                        <span className="text-sm font-bold font-mono tracking-tighter text-[var(--m3-on-surface)]">{match.passport_number}</span>
                      </div>
                      <div className="flex gap-2">
                        {((match.attachment_url && match.attachment_url !== 'null') || matchAttachments[match.id]?.length > 0) ? (
                          <button 
                            onClick={() => {
                              const attachments = matchAttachments[match.id];
                              const effectiveUrl = (match.attachment_url && match.attachment_url !== 'null') 
                                ? match.attachment_url 
                                : (attachments && attachments.length > 0 
                                    ? supabase.storage.from('immigration-docs').getPublicUrl(attachments[0].file_path).data.publicUrl 
                                    : null);
                              
                              if (effectiveUrl) {
                                window.open(effectiveUrl);
                              }
                            }}
                            className="m3-button-filled px-6 py-3 text-xs shadow-none group-hover:scale-105 transition-transform"
                          >
                            Digital Scan
                          </button>
                        ) : canEdit ? (
                          <button 
                            onClick={() => onEditRecord(match)}
                            className="bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Upload
                          </button>
                        ) : (
                          <button 
                            disabled
                            className="bg-[var(--m3-surface-container)] text-[var(--m3-on-surface-variant)] opacity-50 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase transition-all flex items-center gap-2 cursor-not-allowed"
                          >
                            Unavailable
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
