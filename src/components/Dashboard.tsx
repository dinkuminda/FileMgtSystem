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
import { EthiopiaFingerprint } from './EthiopiaFingerprint';
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

  // Elegant React Custom UI feedback system replacing browser native alerts/confirms
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<ImmigrationRecord | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

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

  const handleDelete = (id: string) => {
    const rec = records.find(r => r.id === id);
    if (rec) {
      setRecordToDelete(rec);
    }
  };

  const executeDelete = async (id: string) => {
    setLoading(true);
    const record = records.find(r => r.id === id);
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
      
      await logger.log('DELETE', activeTab, `Deleted record for ${record?.full_name || 'unknown'}`, id);
      setRecords(records.filter(r => r.id !== id));
      addToast(`Record for ${record?.full_name || 'unknown'} was successfully deleted from the register.`, 'success');
    } catch (err: any) {
      console.error('Error deleting record:', err);
      addToast('Error deleting record: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRecordToDelete(null);
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
    addToast(`Successfully exported ${records.length} records to CSV file.`, 'success');
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
          addToast(`Successfully imported ${processedData.length} document entries into ${activeTab}!`, 'success');
          fetchRecords();
        } catch (err: any) {
          addToast('Error importing CSV: ' + err.message, 'error');
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
      <div className="flex flex-col h-full w-full bg-white border-r border-slate-100 transition-all duration-300 font-sans">
        {/* Branding Area */}
        <div className={`pt-8 pb-5 px-6 flex items-center flex-shrink-0 ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-3'}`}>
          <div className="w-10 h-10 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 transition-all">
            <EthiopiaFingerprint className="w-8 h-8 drop-shadow-xs" />
          </div>
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="overflow-hidden text-left"
            >
              <h1 className="font-black text-lg tracking-tight text-slate-900 leading-none mb-0.5">
                ICS Portal
              </h1>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#1b54ac]">File Registry</p>
            </motion.div>
          )}
        </div>

        {/* User Profile Section (at the top of Sidebar, like Screenshot) */}
        <div className={`px-6 pb-6 pt-2 border-b border-slate-100 flex-shrink-0 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-4'}`}>
          <div className="relative flex-shrink-0">
            <div className={`rounded-full overflow-hidden bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center border border-slate-100 shadow-sm ${isSidebarCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <img 
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${userProfile?.full_name || 'David'}`}
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-[#00d6b4] border-2 border-white rounded-md w-4.5 h-4.5 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden text-left">
              <p className="font-extrabold text-sm text-slate-800 tracking-tight leading-tight truncate">
                {userProfile?.full_name || 'David Grey. H'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 capitalize mt-0.5">
                {userProfile?.role === 'admin' ? 'Project Manager' : 'Staff Operator'}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1.5 py-4 overflow-y-auto scrollbar-hide min-h-0 text-left">
          <AnimatePresence mode="wait">
            {isAirportContext ? (
              <motion.div
                key="airport-sidebar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                {airportTabs.map((at) => {
                  const isActive = airportSubPath === at.id;
                  const Icon = at.icon;
                  return (
                    <Link
                      key={at.id}
                      to={`/airport/${at.id}`}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isSidebarCollapsed ? 'justify-center font-bold' : 'justify-start'
                      } ${
                        isActive 
                          ? 'bg-[#b83efd]/10 text-[#b83efd] font-extrabold shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-[#b83efd]' : 'text-slate-400'}`} />
                      {!isSidebarCollapsed && <span className="flex-1">{at.label}</span>}
                      {!isSidebarCollapsed && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#b83efd]/70' : 'bg-transparent'}`} />
                      )}
                    </Link>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="main-sidebar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.type;
                  const path = tab.type === 'OVERVIEW' ? '/' : `/${tab.type.toLowerCase().replace(' ', '-')}`;
                  return (
                    <Link
                      key={tab.type}
                      to={path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isSidebarCollapsed ? 'justify-center font-bold' : 'justify-start'
                      } ${
                        isActive 
                          ? 'bg-[#b83efd]/10 text-[#b83efd] font-extrabold shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                      }`}
                    >
                      <tab.icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-[#b83efd]' : 'text-slate-400'}`} />
                      {!isSidebarCollapsed && <span className="flex-1">{tab.label}</span>}
                      {!isSidebarCollapsed && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#b83efd]/70' : 'bg-transparent'}`} />
                      )}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Bottom Module Logout */}
        <div className="p-4 mt-auto border-t border-slate-100 flex-shrink-0">
          <button 
            onClick={() => supabase.auth.signOut()}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full text-red-500 hover:bg-red-50/50 ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
            title="Log Out"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Log Out</span>}
          </button>
          
          <div className="mt-2.5 pt-2 border-t border-slate-100/45 text-center flex justify-center w-full">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-350 hover:text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 transition-all cursor-pointer outline-none"
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
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
                <Route path="/" element={<DashboardReports userProfile={userProfile} />} />
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
              addToast(`Record for ${record.full_name} was successfully saved!`, 'success');
              fetchRecords();
            }}
          />
        )}
      </AnimatePresence>

      {/* Modern React Confirmation Modal */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecordToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[28px] max-w-md w-full p-8 shadow-2xl border border-slate-100 relative z-10"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3.5 bg-rose-50 rounded-2xl text-rose-500">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Delete Registry Entry?</h3>
                  <p className="text-xs text-slate-500 font-medium">This action is permanent and cannot be undone.</p>
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 mb-6 text-xs text-slate-700 font-medium space-y-1">
                <p><span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Registry:</span> <strong className="font-extrabold text-[#1b54ac]">{activeTab}</strong></p>
                <p><span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Full Name:</span> <strong className="text-slate-900">{recordToDelete.full_name}</strong></p>
                {recordToDelete.passport_number && (
                  <p><span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Passport No:</span> <code className="font-mono bg-slate-200/50 px-1 py-0.5 rounded text-slate-800 font-bold">{recordToDelete.passport_number}</code></p>
                )}
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="px-5 py-3.5 hover:bg-slate-100 rounded-full text-xs font-black uppercase text-slate-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeDelete(recordToDelete.id)}
                  className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-black uppercase shadow-lg shadow-rose-500/10 transition-colors"
                >
                  Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern React Toasts Notification Hub */}
      <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-2 max-w-md w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="pointer-events-auto w-full p-4.5 bg-white/95 backdrop-blur shadow-[0_12px_32px_rgba(0,0,0,0.08)] border border-slate-200/60 rounded-[20px] flex items-start gap-3.5 relative overflow-hidden"
            >
              {/* Indicator bar */}
              <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
              }`} />
              
              <div className="flex-1 text-left pl-1.5 space-y-0.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  toast.type === 'success' ? 'text-emerald-600' :
                  toast.type === 'error' ? 'text-rose-600' : 'text-blue-600'
                }`}>
                  {toast.type === 'success' ? 'Operation Success' :
                   toast.type === 'error' ? 'System Warning' : 'Notice Info'}
                </span>
                <p className="text-xs text-slate-700 font-bold leading-normal">{toast.message}</p>
              </div>

              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
