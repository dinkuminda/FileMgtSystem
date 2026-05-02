import React, { useState, useEffect, useRef } from 'react';
import { supabase, type UserProfile, type ImmigrationRecord, type RecordType, TABLE_MAP, logger } from '../lib/supabase';
import { 
  FileText, Users, LogOut, Plus, Search, 
  CreditCard, Fingerprint, MapPin, FileQuestion,
  Download, Trash2, Edit2, Loader2,
  FileOutput, FileInput, LayoutDashboard,
  Sun, Moon, Activity, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RecordForm from './RecordForm';
import DashboardReports from './DashboardReports';
import AuditLogView from './AuditLogView';
import ReportingSystem from './ReportingSystem';
import Papa from 'papaparse';

interface DashboardProps {
  userProfile: UserProfile | null;
}

export default function Dashboard({ userProfile }: DashboardProps) {
  const [records, setRecords] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RecordType | 'OVERVIEW' | 'AUDIT' | 'REPORTS'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ImmigrationRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { type: RecordType | 'OVERVIEW' | 'AUDIT' | 'REPORTS'; icon: any; label: string }[] = [
    { type: 'OVERVIEW', icon: LayoutDashboard, label: 'Overview' },
    { type: 'REPORTS', icon: BarChart3, label: 'Deep Reports' },
    { type: 'VISA', icon: FileText, label: 'VISA Records' },
    { type: 'EOID', icon: Fingerprint, label: 'EOID' },
    { type: 'Residence ID', icon: CreditCard, label: 'Residence ID' },
    { type: 'ETD', icon: MapPin, label: 'ETD' },
    { type: 'AUDIT', icon: Activity, label: 'System Audit' },
  ];

  useEffect(() => {
    if (activeTab !== 'OVERVIEW' && activeTab !== 'AUDIT' && activeTab !== 'REPORTS') {
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
            <div className="p-2 bg-blue-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">IDS Manager</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.type;
            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-900/20 text-blue-400' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
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
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-700 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
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

      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 flex flex-col transition-colors duration-300">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {activeTab === 'OVERVIEW' ? 'Dashboard Reports' : activeTab === 'AUDIT' ? 'System Audit Logs' : activeTab === 'REPORTS' ? 'Advanced Analytics' : activeTab}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Immigration Data Structuring Division</p>
          </div>

          <div className="flex items-center space-x-3">
            {['VISA', 'EOID', 'Residence ID', 'ETD'].includes(activeTab) && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search database..."
                    className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 w-64 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />
              </>
            )}

            <div className="flex items-center space-x-1">
              {['VISA', 'EOID', 'Residence ID', 'ETD'].includes(activeTab) && (
                <button 
                  onClick={exportToCSV}
                  title="Export to CSV"
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                >
                  <FileOutput className="w-5 h-5" />
                </button>
              )}

              {userProfile?.role !== 'viewer' && ['VISA', 'EOID', 'Residence ID', 'ETD'].includes(activeTab) && (
                <>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    title="Import from CSV"
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                  >
                    <FileInput className="w-5 h-5" />
                  </button>
                  <button 
                    id="add-record-btn"
                    onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Entry</span>
                  </button>
                </>
              )}
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
              {activeTab === 'OVERVIEW' ? (
                <DashboardReports />
              ) : activeTab === 'AUDIT' ? (
                <AuditLogView />
              ) : activeTab === 'REPORTS' ? (
                <ReportingSystem />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">BOX #</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Full Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Citizenship</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Passport / Req #</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600 opacity-20" />
                            Loading records...
                          </td>
                        </tr>
                      ) : filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                            <FileQuestion className="w-12 h-12 mx-auto mb-2 opacity-10" />
                            No records found for this category
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{record.box_number}</td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{record.full_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">{record.sex}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{record.citizenship}</span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex flex-col">
                                <span>{record.passport_number}</span>
                                <span className="text-blue-500 dark:text-blue-400">{record.request_number}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                {record.service_provided}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {userProfile?.role !== 'viewer' && (
                                  <>
                                    <button 
                                      onClick={() => { setEditingRecord(record); setIsFormOpen(true); }}
                                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                                      title="Edit Record"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(record.id)}
                                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
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
            type={activeTab === 'OVERVIEW' || activeTab === 'AUDIT' || activeTab === 'REPORTS' ? 'VISA' : activeTab}
            record={editingRecord}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchRecords();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
