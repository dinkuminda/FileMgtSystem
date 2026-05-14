import React, { useState, useEffect, useRef } from 'react';
import { supabase, type UserProfile, type ImmigrationRecord, type RecordType, TABLE_MAP, logger, REVERSE_TABLE_MAP } from '../lib/supabase';
import { 
  FileText, Users, LogOut, Plus, Search, 
  CreditCard, Fingerprint, MapPin, FileQuestion,
  Download, Trash2, Edit2, Loader2,
  FileOutput, FileInput, LayoutDashboard, Shield, X,
  Activity, BarChart3, Plane, Paperclip,
  ArrowLeft, Clock, List, LayoutGrid, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation, Link, Routes, Route, Navigate } from 'react-router-dom';
import RecordForm from './RecordForm';
import DashboardReports from './DashboardReports';
import AuditLogView from './AuditLogView';
import ReportingSystem from './ReportingSystem';
import AirportView from './AirportView';
import RecordTable from './RecordTable';
import UserManagement from './UserManagement';
import Papa from 'papaparse';

interface DashboardProps {
  userProfile: UserProfile | null;
}

export default function Dashboard({ userProfile }: DashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [records, setRecords] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const allTabs: { type: RecordType | 'OVERVIEW' | 'AUDIT' | 'REPORTS' | 'USERS'; icon: any; label: string }[] = [
    { type: 'OVERVIEW', icon: LayoutDashboard, label: 'Dashboard' },
    { type: 'USERS', icon: Users, label: 'User Management' },
    { type: 'REPORTS', icon: BarChart3, label: 'System Reports' },
    { type: 'VISA', icon: FileText, label: 'VISA Records' },
    { type: 'EOID', icon: Fingerprint, label: 'EOID Logs' },
    { type: 'Residence ID', icon: CreditCard, label: 'Residence ID' },
    { type: 'ETD', icon: MapPin, label: 'ETD Records' },
    { type: 'AIRPORT', icon: Plane, label: 'Bole Airport' },
    { type: 'AUDIT', icon: Activity, label: 'System Audit' },
  ];

  // Map path to tab type
  const pathParts = location.pathname.split('/').filter(p => p);
  const currentPath = pathParts[0]?.toLowerCase() || '';
  const airportSubPath = pathParts[1]?.toLowerCase() || 'dashboard';

  const matchingTab = allTabs.find(tab => {
    const slug = tab.type === 'OVERVIEW' ? '' : tab.type.toLowerCase().replace(' ', '-');
    return slug === currentPath;
  });
  const activeTab = matchingTab?.type || 'OVERVIEW';

  const tabs = allTabs.filter(tab => {
    if (!userProfile) return false;
    
    // Admins should always see everything
    if (userProfile.role === 'admin') return true;

    // If user has specific modules assigned, use those
    if (userProfile.modules && userProfile.modules.length > 0) {
      return userProfile.modules.includes(tab.type);
    }

    // Role-based fallbacks for users without explicit modules
    if (userProfile.role === 'airport_staff' || userProfile.role === 'airport_viewer') {
      return tab.type === 'AIRPORT' || tab.type === 'OVERVIEW';
    }

    // Staff can see records and reports, but not system level management
    if (tab.type === 'AUDIT' || tab.type === 'USERS') return false;
    return true;
  });

  // Calculate Airport Sub Tabs based on permissions
  const airportTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, module: 'AIRPORT_VIEW' },
    { id: 'add', label: 'Add Document', icon: Plus, module: 'AIRPORT_ADD' },
    { id: 'view', label: 'View Document', icon: Search, module: 'AIRPORT_VIEW' },
    { id: 'edit', label: 'Edit Document', icon: List, module: 'AIRPORT_EDIT' },
    { id: 'users', label: 'User Management', icon: Users, module: 'USERS' },
    { id: 'audit', label: 'System Audit', icon: Clock, module: 'AUDIT' }
  ].filter(at => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.modules && userProfile.modules.length > 0) {
      // If they have users/audit module, show them in airport too
      if (at.module === 'USERS') return userProfile.modules.includes('USERS');
      if (at.module === 'AUDIT') return userProfile.modules.includes('AUDIT');
      return userProfile.modules.includes(at.module);
    }
    // Fallback
    if (at.id === 'users' || at.id === 'audit') return false;
    return true;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ImmigrationRecord | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If current tab is not allowed, switch to Overview or first allowed
    if (userProfile && !tabs.find(t => t.type === activeTab)) {
      const fallbackTab = tabs[0]?.type || 'OVERVIEW';
      const fallbackPath = fallbackTab === 'OVERVIEW' ? '/' : `/${fallbackTab.toLowerCase().replace(' ', '-')}`;
      navigate(fallbackPath, { replace: true });
    }
  }, [userProfile, activeTab, tabs, navigate]);

  useEffect(() => {
    if (activeTab !== 'OVERVIEW' && activeTab !== 'AUDIT' && activeTab !== 'REPORTS' && activeTab !== 'AIRPORT') {
      fetchRecords();
    }
  }, [activeTab]);

  const fetchRecords = async () => {
    if (activeTab === 'OVERVIEW' || activeTab === 'AUDIT' || activeTab === 'REPORTS') return;
    setLoading(true);
    const tableName = TABLE_MAP[activeTab as RecordType];
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setRecords(data as ImmigrationRecord[]);
    else if (error) console.error(`Error fetching ${activeTab} records:`, error);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    setLoading(true);
    const recordToDelete = records.find(r => r.id === id);
    const tableName = TABLE_MAP[activeTab as RecordType];
    
    try {
      await supabase
        .from('record_attachments')
        .delete()
        .eq('record_id', id)
        .eq('record_table', tableName);

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await logger.log('DELETE', activeTab, `Deleted record for ${recordToDelete?.full_name || 'unknown'}`, id);
      setRecords(records.filter(r => r.id !== id));
    } catch (err: any) {
      console.error('Error deleting record:', err);
      alert('Error deleting record: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    if (records.length === 0) return;
    await logger.log('EXPORT', activeTab, `Exported ${records.length} records to CSV`);
    const csv = Papa.unparse(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab.toLowerCase().replace(' ', '_')}_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const processedData = results.data.map((row: any) => {
            const { id, created_at, ...cleanRow } = row;
            return {
              ...cleanRow,
              created_by: user.id
            };
          }).filter((row: any) => row.full_name);

          const tableName = TABLE_MAP[activeTab as RecordType];
          const { error } = await supabase.from(tableName).insert(processedData);
          
          if (error) throw error;
          
          await logger.log('IMPORT', activeTab, `Imported ${processedData.length} records via CSV`);
          alert(`Successfully imported ${processedData.length} records!`);
          fetchRecords();
        } catch (err: any) {
          alert('Error importing CSV: ' + err.message);
        } finally {
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const canEdit = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin' || userProfile.role === 'staff') return true;
    if (userProfile.role === 'airport_staff' && activeTab === 'AIRPORT') return true;
    return false;
  };

  const filteredRecords = records.filter(r => 
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.passport_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.request_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SidebarContent = () => {
    const isAirportContext = activeTab === 'AIRPORT';

    return (
      <div className="flex flex-col h-full w-full bg-[var(--m3-surface)] border-r border-slate-100 transition-all duration-300">
        {/* Branding Area */}
        <div className={`pt-10 pb-8 px-8 flex items-center flex-shrink-0 ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-4'}`}>
          <div className="w-12 h-12 bg-blue-600 rounded-[14px] flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <Fingerprint className="w-6 h-6 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="overflow-hidden"
            >
              <h1 className="font-bold text-xl tracking-tight text-slate-800 leading-none mb-1">
                CLOUDINV
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Inventory Sys</p>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto scrollbar-hide min-h-0">
          <AnimatePresence mode="wait">
            {isAirportContext ? (
              <motion.div
                key="airport-sidebar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                <div className="space-y-1">
                  {airportTabs.map((at) => {
                    const isActive = airportSubPath === at.id;
                    const Icon = at.icon;
                    return (
                      <Link
                        key={at.id}
                        to={`/airport/${at.id}`}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`sidebar-link ${isSidebarCollapsed ? 'p-4 justify-center' : ''} ${
                          isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0`} />
                        {!isSidebarCollapsed && <span>{at.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="main-sidebar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.type;
                  const path = tab.type === 'OVERVIEW' ? '/' : `/${tab.type.toLowerCase().replace(' ', '-')}`;
                  return (
                    <Link
                      key={tab.type}
                      to={path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`sidebar-link ${isSidebarCollapsed ? 'p-4 justify-center' : ''} ${
                        isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                      }`}
                    >
                      <tab.icon className={`w-5 h-5 flex-shrink-0`} />
                      {!isSidebarCollapsed && <span>{tab.label}</span>}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Bottom Profile Section */}
        <div className="p-4 md:p-6 mt-auto flex flex-col items-center border-t border-[var(--m3-outline-variant)]/20 flex-shrink-0">
          <div className="w-full mb-4">
            <div className={`flex items-center gap-4 px-2 py-2 mb-4 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs md:text-sm font-bold shadow-lg shadow-blue-500/20 flex-shrink-0">
                {userProfile?.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-black text-slate-900 leading-tight truncate">{userProfile?.full_name || 'System Administrator'}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">{userProfile?.role || 'ADMIN'}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <button 
                className={`sidebar-link sidebar-link-inactive w-full ${isSidebarCollapsed ? 'p-3 justify-center' : ''}`}
                onClick={() => navigate('/settings')}
                title="Settings"
              >
                <Activity className="w-5 h-5 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Settings</span>}
              </button>
              <button 
                onClick={() => supabase.auth.signOut()}
                className={`sidebar-link sidebar-link-inactive w-full text-red-500 hover:text-red-600 hover:bg-red-50 ${isSidebarCollapsed ? 'p-3 justify-center' : ''}`}
                title="Log Out"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Log Out</span>}
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-10 h-10 hidden md:flex items-center justify-center text-slate-300 hover:text-slate-500 bg-slate-50 rounded-xl transition-all"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 transition-colors duration-300 font-sans">
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleImportCSV} 
      />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/10 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* FAB */}
      {canEdit() && ['VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT'].includes(activeTab) && activeTab !== 'AIRPORT' && (
        <button 
          onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}
          className="m3-fab shadow-blue-500/20"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar (Material 3 style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[var(--m3-surface-container)] border-t border-[var(--m3-outline-variant)] flex items-center justify-around px-2 z-40">
        {tabs.slice(0, 4).map((tab) => {
          const isActive = activeTab === tab.type;
          const path = tab.type === 'OVERVIEW' ? '/' : `/${tab.type.toLowerCase().replace(' ', '-')}`;
          return (
            <Link
              key={tab.type}
              to={path}
              className={`bottom-nav-link ${isActive ? 'bottom-nav-link-active' : 'bottom-nav-link-inactive'}`}
            >
              <div className="bottom-nav-icon-container">
                <tab.icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-[var(--m3-on-primary-container)]' : 'text-[var(--clr-text)]'}`}>
                {tab.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
        {/* Toggle Sidebar Button for Mobile */}
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="bottom-nav-link bottom-nav-link-inactive"
        >
          <div className="bottom-nav-icon-container">
            <List className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-[var(--clr-text)]">More</span>
        </button>
      </nav>

      {/* Sidebar (Navigation Drawer) */}
      <aside className={`fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:h-screen transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) transform ${
        isSidebarCollapsed ? 'w-24' : 'w-72'
      } ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } flex flex-col shadow-2xl md:shadow-none bg-[var(--m3-surface)] md:border-r md:border-[var(--m3-outline-variant)]/30`}>
        <SidebarContent />
      </aside>

      {/* Scaffold */}
      <main className="flex-1 flex flex-col w-full pb-20 md:pb-0">
        {/* Header Bar */}
        <header className="h-16 md:h-20 flex items-center justify-between px-6 md:px-8 bg-[var(--m3-surface)] md:bg-white/40 md:backdrop-blur-md sticky top-0 z-30 transition-colors border-b border-[var(--m3-outline-variant)] md:border-slate-50">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="md:hidden w-10 h-10 bg-[var(--m3-primary-container)] rounded-xl flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-[var(--m3-on-primary-container)]" />
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-base md:text-sm font-bold text-slate-800">
                {activeTab === 'OVERVIEW' ? 'Dashboard' : activeTab}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {['VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT'].includes(activeTab) && (
              <div className="hidden md:flex items-center relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[var(--m3-primary)] transition-colors" />
                <input 
                  type="text"
                  placeholder="Universal search..."
                  className="pl-12 pr-6 py-2 bg-slate-50 border border-transparent focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[var(--m3-primary)]/20 rounded-xl text-xs font-bold text-slate-800 outline-none w-64 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => supabase.auth.signOut()}
                className="md:hidden p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-95 transition-all"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
               {['VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT'].includes(activeTab) && (
                <button 
                  onClick={exportToCSV}
                  className="p-2.5 bg-white text-slate-400 rounded-xl hover:bg-slate-50 hover:text-[var(--m3-primary)] border border-slate-100 transition-all"
                >
                  <FileOutput className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content View */}
        <div className="p-5 md:p-8 max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + airportSubPath}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="mb-8 md:mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                  {activeTab === 'OVERVIEW' ? 'Overview' : 
                   activeTab === 'AIRPORT' ? 'Hub Operations' : 
                   activeTab}
                </h1>
                <p className="text-slate-500 text-sm md:text-base font-medium">
                  {activeTab === 'OVERVIEW' ? 'Monitoring organizational resources and performance analytics.' : 
                   `Manage and process ${activeTab.toLowerCase()} system registry entries.`}
                </p>
              </div>

              <Routes>
                <Route path="/" element={<DashboardReports />} />
                <Route path="/audit" element={<AuditLogView />} />
                <Route path="/reports" element={<ReportingSystem />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/airport" element={
                  <AirportView 
                    userProfile={userProfile}
                    refreshCounter={refreshCounter}
                    onAddRecord={() => { setEditingRecord(null); setIsFormOpen(true); }}
                    onEditRecord={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                    onDeleteRecord={handleDelete}
                    searchQuery={searchQuery}
                    canEdit={canEdit()}
                  />
                } />
                <Route path="/airport/:subTab" element={
                  <AirportView 
                    userProfile={userProfile}
                    refreshCounter={refreshCounter}
                    onAddRecord={() => { setEditingRecord(null); setIsFormOpen(true); }}
                    onEditRecord={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                    onDeleteRecord={handleDelete}
                    searchQuery={searchQuery}
                    canEdit={canEdit()}
                  />
                } />
                <Route path="/visa" element={
                  <div className="flutter-card p-4">
                    <RecordTable 
                      loading={loading}
                      records={filteredRecords}
                      activeTab={activeTab as RecordType}
                      canEdit={canEdit()}
                      onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                      onDelete={handleDelete}
                    />
                  </div>
                } />
                <Route path="/eoid" element={
                   <div className="flutter-card p-4">
                    <RecordTable 
                      loading={loading}
                      records={filteredRecords}
                      activeTab={activeTab as RecordType}
                      canEdit={canEdit()}
                      onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                      onDelete={handleDelete}
                    />
                  </div>
                } />
                <Route path="/residence-id" element={
                   <div className="flutter-card p-4">
                    <RecordTable 
                      loading={loading}
                      records={filteredRecords}
                      activeTab={activeTab as RecordType}
                      canEdit={canEdit()}
                      onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                      onDelete={handleDelete}
                    />
                  </div>
                } />
                <Route path="/etd" element={
                   <div className="flutter-card p-4">
                    <RecordTable 
                      loading={loading}
                      records={filteredRecords}
                      activeTab={activeTab as RecordType}
                      canEdit={canEdit()}
                      onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                      onDelete={handleDelete}
                    />
                  </div>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Record Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <RecordForm 
            isOpen={isFormOpen} 
            onClose={() => setIsFormOpen(false)} 
            type={(editingRecord && (editingRecord as any)._table) 
              ? REVERSE_TABLE_MAP[(editingRecord as any)._table] 
              : (activeTab === 'OVERVIEW' || activeTab === 'AUDIT' || activeTab === 'REPORTS' ? 'VISA' : activeTab as RecordType)}
            record={editingRecord}
            onSuccess={(record) => {
              setIsFormOpen(false);
              setRefreshCounter(prev => prev + 1);
              if (activeTab === 'AIRPORT' && record.passport_number) {
                setSearchQuery(record.request_number || record.passport_number);
              }
              fetchRecords();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
