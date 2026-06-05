import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type ImmigrationRecord, logger, type UserProfile } from '../lib/supabase';
import { 
  Plane, Users, FileText, CheckCircle, 
  Clock, AlertCircle, Search, Plus,
  LayoutGrid, List, Filter, Paperclip, ExternalLink, FileIcon,
  Loader2, Activity, Eye, Edit2, Trash2, Download, X,
  ImageIcon, FileText as FileTextIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin' || userProfile.role === 'admin_grant') return true;

    // Direct check for weleba ephrem as an active authorized staff member
    const isWeleba = userProfile?.email?.toLowerCase().includes('weleba') || userProfile?.full_name?.toLowerCase().includes('weleba');
    if (isWeleba) {
      return ['dashboard', 'view', 'add', 'edit'].includes(tab.id);
    }

    if (userProfile.modules && userProfile.modules.length > 0) {
      if (tab.id === 'users') return userProfile.modules.includes('USERS');
      if (tab.id === 'audit') return userProfile.modules.includes('AUDIT');
      return userProfile.modules.includes(tab.module);
    }
    // Fallback for staff
    if (userProfile.role === 'airport_staff' || userProfile.role === 'airport_viewer') {
      return ['dashboard', 'view', 'add', 'edit'].includes(tab.id);
    }
    // Regular staff with no modules configuration can only view basic tabs
    return ['dashboard', 'view'].includes(tab.id);
  });

  const [records, setRecords] = useState<ImmigrationRecord[]>([]);
  const [globalMatches, setGlobalMatches] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [matchAttachments, setMatchAttachments] = useState<Record<string, any[]>>({});
  const [viewingDetailsRecord, setViewingDetailsRecord] = useState<ImmigrationRecord | null>(null);

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

      // Merge inline JSONB attachments from exactMatches
      exactMatches.forEach(m => {
        if ((m as any).attachments && Array.isArray((m as any).attachments)) {
          (m as any).attachments.forEach((doc: any, idx: number) => {
            if (doc && doc.url) {
              const table = (m as any)._table || 'airport_records';
              const isDup = allAttachments.some(attr => attr.file_path === doc.url && attr.record_id === m.id);
              if (!isDup) {
                allAttachments.push({
                  id: `jsonb-${m.id}-${idx}`,
                  record_id: m.id,
                  record_table: table,
                  file_name: doc.file_type || `Checklist File #${idx + 1}`,
                  file_path: doc.url,
                  content_type: doc.file_type?.toLowerCase().includes('pdf') ? 'application/pdf' : 'image/jpeg',
                  size_bytes: 125 * 1024,
                  created_at: m.created_at || new Date().toISOString(),
                  created_by: m.created_by || ''
                });
              }
            }
          });
        }
      });
      
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
              <AirportRecordTable 
                records={exactMatches}
                canEdit={canEdit}
                onEdit={onEditRecord}
                onDelete={onDeleteRecord}
                onViewDetails={setViewingDetailsRecord}
                matchAttachments={matchAttachments}
              />
            )}
          </div>
        </div>
      ) : activeSubTab === 'users' ? (
        <UserManagement currentUserProfile={userProfile} />
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
              <AirportRecordTable 
                records={exactMatches}
                canEdit={canEdit}
                onEdit={onEditRecord}
                onDelete={onDeleteRecord}
                onViewDetails={setViewingDetailsRecord}
                matchAttachments={matchAttachments}
              />
            )}
          </div>
        </div>
      )}

      {/* Modern Detail View Modal Overlay */}
      <AnimatePresence>
        {viewingDetailsRecord && (
          <AirportDetailsModal 
            record={viewingDetailsRecord} 
            matchAttachments={matchAttachments} 
            onClose={() => setViewingDetailsRecord(null)} 
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function AirportRecordTable({ 
  records, 
  canEdit, 
  onEdit, 
  onDelete, 
  onViewDetails, 
  matchAttachments
}: { 
  records: ImmigrationRecord[]; 
  canEdit: boolean; 
  onEdit: (r: ImmigrationRecord) => void; 
  onDelete: (id: string) => void | Promise<void>; 
  onViewDetails: (r: ImmigrationRecord) => void;
  matchAttachments: Record<string, any[]>;
}) {
  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-850 overflow-hidden shadow-xs">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10">
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] w-1/4">Identity / Bio</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] w-1/5">Passport & Req</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] w-1/6">Origin</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] w-1/6 pointer-events-none">Source Registry</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] w-1/6">Digital Scan</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {records.map((record) => {
              const table_label = (record as any)._table?.replace('_records', '').replace('_', ' ') || 'Airport';
              const attachments = matchAttachments[record.id] || [];
              const hasAttachment = (record.attachment_url && record.attachment_url !== 'null') || attachments.length > 0;
              const attachmentCount = attachments.length || (hasAttachment ? 1 : 0);
              const fileUrl = (record.attachment_url && record.attachment_url !== 'null') 
                ? record.attachment_url 
                : (attachments.length > 0 
                    ? (attachments[0].file_path.startsWith('http') 
                        ? attachments[0].file_path 
                        : supabase.storage.from('immigration-docs').getPublicUrl(attachments[0].file_path).data.publicUrl) 
                    : null);

              return (
                <tr key={record.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{record.full_name}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">{record.sex || 'Not Specified'}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">{record.passport_number}</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-black tracking-tight mt-0.5 uppercase">REQ: {record.request_number}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
                      {record.citizenship}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
                      {table_label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {hasAttachment ? (
                      <button
                        type="button"
                        onClick={() => fileUrl && window.open(fileUrl, '_blank')}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-none p-0 outline-none"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Scan ({attachmentCount})</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-405 dark:text-gray-500 uppercase tracking-widest leading-none">
                        No Scans
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        type="button"
                        onClick={() => onViewDetails(record)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer border-none bg-transparent"
                        title="View Full Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <>
                          <button 
                            type="button"
                            onClick={() => onEdit(record)}
                            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer border-none bg-transparent"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDelete(record.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer border-none bg-transparent"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AirportDetailsModal({ 
  record, 
  matchAttachments,
  onClose 
}: { 
  record: ImmigrationRecord; 
  matchAttachments: Record<string, any[]>;
  onClose: () => void; 
}) {
  const attachments = matchAttachments[record.id] || [];
  const table_label = (record as any)._table?.replace('_records', '').replace('_', ' ') || 'Airport';

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    if (type === 'application/pdf') return <FileTextIcon className="w-4 h-4 text-rose-500" />;
    return <FileIcon className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        className="bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-200 rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <header className="px-8 py-6 bg-slate-50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{table_label} Details</h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">National Database & Border Control Registry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-all cursor-pointer border-none bg-transparent outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1">
          {/* Main Info Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-gray-800/10 p-6 rounded-3xl border border-slate-100 dark:border-gray-800">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Full Name</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{record.full_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Citizenship / Origin</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-300 mt-1">{record.citizenship}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sex / Gender</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-300 mt-1">{record.sex || 'Not Specified'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Box Number</p>
              <span className="inline-block text-xs font-black font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-gray-700 mt-1">
                {record.box_number || 'N/A'}
              </span>
            </div>
          </div>

          {/* Travel & Service Metadata */}
          <div>
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5">Registration Metadata</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xs">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Passport Number</p>
                <p className="text-sm font-black text-slate-800 dark:text-white font-mono mt-1">{record.passport_number}</p>
              </div>
              <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xs">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Request Reference #</p>
                <p className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono mt-1">{record.request_number}</p>
              </div>
              {record.service_provided && (
                <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xs">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Service Unit</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{record.service_provided}</p>
                </div>
              )}
              {record.document_type && (
                <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xs">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Document Type</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{record.document_type}</p>
                </div>
              )}
              <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xs">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Registry Date</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                  {new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Additional database-specific parameters */}
          {(record.eoid_number || record.residence_id_no || record.etd || record.letter_number) && (
            <div>
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5">Extended Fields</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {record.eoid_number && (
                  <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">EOID No.</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white font-mono mt-1">{record.eoid_number}</p>
                  </div>
                )}
                {record.residence_id_no && (
                  <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Residence ID No.</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white font-mono mt-1">{record.residence_id_no}</p>
                  </div>
                )}
                {record.etd && (
                  <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-white dark:bg-gray-900 shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">ETD Reference</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{record.etd}</p>
                  </div>
                )}
                {record.letter_number && (
                  <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Letter Number</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{record.letter_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Audit trace */}
          <div className="bg-slate-50 dark:bg-gray-800/10 border border-slate-100 dark:border-gray-800 rounded-2xl p-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex justify-between">
              <span>Database Origin:</span>
              <span className="font-extrabold capitalize text-blue-600 dark:text-blue-400 font-mono">{table_label} Registry</span>
            </div>
            <div className="flex justify-between mt-1.5">
              <span>Record Creation Timestamp:</span>
              <span className="font-bold font-mono">
                {new Date(record.created_at || record.date).toLocaleString()}
              </span>
            </div>
            {record.created_by && (
              <div className="flex justify-between mt-1.5">
                <span>Created By Registrar:</span>
                <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{record.created_by}</span>
              </div>
            )}
          </div>

          {/* Attached Scans */}
          <div>
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5">Digitized Registry Uploads ({attachments.length || ((record.attachment_url && record.attachment_url !== 'null') ? 1 : 0)})</h4>
            {attachments.length === 0 && (!record.attachment_url || record.attachment_url === 'null') ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-gray-800/10 border border-dashed border-slate-200 dark:border-gray-700 rounded-2xl">
                <Paperclip className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">No file attachment uploads found for this record</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Legacy simple URL attachment placeholder */}
                {record.attachment_url && record.attachment_url !== 'null' && (
                  <div className="border border-slate-100 dark:border-gray-800 p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-gray-850 transition-all bg-white dark:bg-gray-900 shadow-xs">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
                        {record.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)/i) || record.attachment_url.includes('?token=') ? (
                          <img 
                            src={record.attachment_url} 
                            alt="legacy preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileTextIcon className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">Primary Registry Document</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase font-sans">External Endpoint Link</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.open(record.attachment_url!, '_blank')}
                      className="p-2 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-750 text-slate-500 dark:text-slate-300 rounded-full transition-all cursor-pointer border-none flex items-center justify-center outline-none"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* DB record_attachments files */}
                {attachments.map((file) => {
                  const fileUrl = file.file_path.startsWith('http') ? file.file_path : supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl;
                  return (
                    <div key={file.id} className="border border-slate-100 dark:border-gray-800 p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-gray-850 transition-all bg-white dark:bg-gray-900 shadow-xs">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
                          {file.content_type?.startsWith('image/') ? (
                            <img 
                              src={fileUrl} 
                              alt="preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : getFileIcon(file.content_type)}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{file.file_name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{(file.size_bytes / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(fileUrl, '_blank')}
                        className="p-2 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-750 text-slate-500 dark:text-slate-300 rounded-full transition-all cursor-pointer border-none flex items-center justify-center outline-none"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-50 dark:bg-gray-800/10 border-t border-slate-100 dark:border-gray-800 px-8 py-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-black uppercase text-xs rounded-full transition-all active:scale-95 cursor-pointer outline-none border-none"
          >
            Close Details
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
