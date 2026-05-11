import React, { useState, useEffect, useRef } from 'react';
import { supabase, type UserProfile, type ImmigrationRecord, type RecordType, TABLE_MAP, logger, REVERSE_TABLE_MAP } from '../lib/supabase';
import { 
  FileText, Users, LogOut, Plus, Search, 
  CreditCard, Fingerprint, MapPin, FileQuestion,
  Download, Trash2, Edit2, Loader2,
  FileOutput, FileInput, LayoutDashboard, Shield, X,
  Sun, Moon, Activity, BarChart3, Plane, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation, Link, Routes, Route, Navigate } from 'react-router-dom';
import RecordForm from './RecordForm';
import DashboardReports from './DashboardReports';
import AuditLogView from './AuditLogView';
import ReportingSystem from './ReportingSystem';
import AirportView from './AirportView';
import RecordTable from './RecordTable';
import Papa from 'papaparse';

interface DashboardProps {
  userProfile: UserProfile | null;
}

export default function Dashboard({ userProfile }: DashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [records, setRecords] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const allTabs: { type: RecordType | 'OVERVIEW' | 'AUDIT' | 'REPORTS'; icon: any; label: string }[] = [
    { type: 'OVERVIEW', icon: LayoutDashboard, label: 'Dashboard' },
    { type: 'REPORTS', icon: BarChart3, label: 'Reports' },
    { type: 'VISA', icon: FileText, label: 'VISA Records' },
    { type: 'EOID', icon: Fingerprint, label: 'EOID' },
    { type: 'Residence ID', icon: CreditCard, label: 'Residence ID' },
    { type: 'ETD', icon: MapPin, label: 'ETD' },
    { type: 'AIRPORT', icon: Plane, label: 'Bole Airport' },
    { type: 'AUDIT', icon: Activity, label: 'System Audit' },
  ];

  // Map path to tab type
  const currentPath = location.pathname.split('/')[1]?.toLowerCase() || '';
  const matchingTab = allTabs.find(tab => {
    const slug = tab.type === 'OVERVIEW' ? '' : tab.type.toLowerCase().replace(' ', '-');
    return slug === currentPath;
  });
  const activeTab = matchingTab?.type || 'OVERVIEW';

  const tabs = allTabs.filter(tab => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.role === 'airport_staff' || userProfile.role === 'airport_viewer') {
      return tab.type === 'AIRPORT' || tab.type === 'OVERVIEW';
    }
    if (tab.type === 'AUDIT') return false;
    return true;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ImmigrationRecord | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    return (
      <div className="flex flex-col h-full bg-gray-900 text-gray-100 transition-colors duration-300">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1 px-1.5 bg-white rounded-lg">
              <img 
                src="https://www.ics.gov.et/wp-content/uploads/2023/10/cropped-logo-192x192.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">IDS Manager</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 md:hidden text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" /> 
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.type;
            const path = tab.type === 'OVERVIEW' ? '/' : `/${tab.type.toLowerCase().replace(' ', '-')}`;
            return (
              <Link
                key={tab.type}
                to={path}
                onClick={() => setIsSidebarOpen(false)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-900/20 text-blue-400' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 mt-auto space-y-3">
          <div className="p-4 rounded-xl bg-gray-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-500">Active Session</p>
            <p className="text-sm font-bold truncate text-gray-100">{userProfile?.full_name || 'Staff Member'}</p>
            <p className="text-xs mt-1 capitalize text-gray-400">{userProfile?.role} Account</p>
          </div>
          
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3.5 bg-red-600/15 border border-red-500/30 rounded-xl text-sm font-black text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-950/20 uppercase tracking-widest group"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-black transition-colors duration-300 overflow-hidden">
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
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 md:relative md:translate-x-0 transition-transform duration-300 ease-in-out transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } border-r border-gray-800 flex flex-col bg-gray-900`}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col w-full">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 md:hidden text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <LayoutDashboard className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {activeTab === 'OVERVIEW' ? 'Dashboard Reports' : 
                 activeTab === 'AUDIT' ? 'System Audit Logs' : 
                 activeTab === 'REPORTS' ? 'Advanced Analytics' : 
                 activeTab === 'AIRPORT' ? 'Bole Airport Operations' : 
                 activeTab}
              </h2>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">Immigration Data Structuring Division</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="hidden md:flex items-center space-x-3">
              {['VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT'].includes(activeTab) && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search database..."
                      className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 w-48 lg:w-64 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />
                </>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {['VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT'].includes(activeTab) && (
                <button 
                  onClick={exportToCSV}
                  title="Export to CSV"
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                >
                  <FileOutput className="w-5 h-5" />
                </button>
              )}

              {canEdit() && ['VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT'].includes(activeTab) && (
                <>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    title="Import from CSV"
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all hidden md:block"
                  >
                    <FileInput className="w-5 h-5" />
                  </button>
                  {activeTab !== 'AIRPORT' && (
                    <button 
                      id="add-record-btn"
                      onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">New Entry</span>
                    </button>
                  )}
                </>
              )}
              
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 md:mx-2" />
              
              <button 
                onClick={() => supabase.auth.signOut()}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all group relative"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
                <span className="absolute -bottom-8 right-0 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Logout
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={activeTab === 'OVERVIEW' ? '' : 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors'}
            >
              <Routes>
                <Route path="/" element={<DashboardReports />} />
                <Route path="/audit" element={<AuditLogView />} />
                <Route path="/reports" element={<ReportingSystem />} />
                <Route path="/airport" element={
                  <AirportView 
                    refreshCounter={refreshCounter}
                    onAddRecord={() => { setEditingRecord(null); setIsFormOpen(true); }}
                    onEditRecord={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                    onDeleteRecord={handleDelete}
                    searchQuery={searchQuery}
                    canEdit={canEdit()}
                  />
                } />
                <Route path="/visa" element={
                  <RecordTable 
                    loading={loading}
                    records={filteredRecords}
                    activeTab={activeTab as RecordType}
                    canEdit={canEdit()}
                    onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                    onDelete={handleDelete}
                  />
                } />
                <Route path="/eoid" element={
                  <RecordTable 
                    loading={loading}
                    records={filteredRecords}
                    activeTab={activeTab as RecordType}
                    canEdit={canEdit()}
                    onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                    onDelete={handleDelete}
                  />
                } />
                <Route path="/residence-id" element={
                  <RecordTable 
                    loading={loading}
                    records={filteredRecords}
                    activeTab={activeTab as RecordType}
                    canEdit={canEdit()}
                    onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                    onDelete={handleDelete}
                  />
                } />
                <Route path="/etd" element={
                  <RecordTable 
                    loading={loading}
                    records={filteredRecords}
                    activeTab={activeTab as RecordType}
                    canEdit={canEdit()}
                    onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                    onDelete={handleDelete}
                  />
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
