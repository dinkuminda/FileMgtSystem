import React, { useState, useEffect, useRef } from 'react';
import { supabase, type UserProfile, type ImmigrationRecord, type RecordType, TABLE_MAP, logger, REVERSE_TABLE_MAP } from '../lib/supabase';
import { 
  FileText, Users, LogOut, Plus, Search, 
  CreditCard, Fingerprint, MapPin, FileQuestion,
  Download, Trash2, Edit2, Loader2,
  FileOutput, FileInput, LayoutDashboard, Shield, X,
  Activity, BarChart3, Plane, Paperclip,
  ArrowLeft, Clock, List, LayoutGrid, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Bell, Archive, Baby, Calendar
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
import CabinetsView from './CabinetsView';
import { EthiopiaFingerprint } from './EthiopiaFingerprint';
import EthiopianImmigrationLogo from './EthiopianImmigrationLogo';
import { 
  getPermissionRules, 
  hasViewAccess, 
  hasCreateAccess, 
  hasUpdateAccess, 
  DEFAULT_PERMISSION_RULES, 
  type ModulePermissionRule 
} from '../lib/permissions';
import Papa from 'papaparse';

interface DashboardProps {
  userProfile: UserProfile | null;
  onProfileUpdate?: () => void;
}

export type ThemeAccent = 'emerald' | 'blue' | 'amber' | 'slate';

interface ThemeStyles {
  primary: string;
  primaryHover: string;
  primaryText: string;
  border: string;
  bgLight: string;
  badge: string;
  accentHex: string;
  textHex: string;
  glow: string;
  pulse: string;
}

const THEMES: Record<ThemeAccent, ThemeStyles> = {
  emerald: {
    primary: 'bg-[#2b825a]',
    primaryHover: 'hover:bg-[#206243]',
    primaryText: 'text-[#2b825a]',
    border: 'border-[#2b825a]',
    bgLight: 'bg-[#ecf7f1]',
    badge: 'bg-emerald-50 border border-emerald-100 text-[#1b8b58]',
    accentHex: '#2b825a',
    textHex: 'text-[#2b825a]',
    glow: 'shadow-[#2b825a]/10',
    pulse: 'bg-[#2b825a]'
  },
  blue: {
    primary: 'bg-[#1b54ac]',
    primaryHover: 'hover:bg-[#154694]',
    primaryText: 'text-[#1b54ac]',
    border: 'border-[#1b54ac]',
    bgLight: 'bg-[#ebf2fc]',
    badge: 'bg-blue-50 border border-blue-100 text-[#1b54ac]',
    accentHex: '#1b54ac',
    textHex: 'text-[#1b54ac]',
    glow: 'shadow-[#1b54ac]/10',
    pulse: 'bg-[#1b54ac]'
  },
  amber: {
    primary: 'bg-[#d97706]',
    primaryHover: 'hover:bg-[#b45309]',
    primaryText: 'text-[#d97706]',
    border: 'border-[#d97706]',
    bgLight: 'bg-[#fef3c7]',
    badge: 'bg-amber-50 border border-amber-100 text-[#b45309]',
    accentHex: '#d97706',
    textHex: 'text-[#d97706]',
    glow: 'shadow-[#d97706]/10',
    pulse: 'bg-[#d97706]'
  },
  slate: {
    primary: 'bg-[#475569]',
    primaryHover: 'hover:bg-[#334155]',
    primaryText: 'text-[#475569]',
    border: 'border-[#475569]',
    bgLight: 'bg-[#f1f5f9]',
    badge: 'bg-slate-50 border border-slate-200 text-[#475569]',
    accentHex: '#475569',
    textHex: 'text-[#475569]',
    glow: 'shadow-[#475569]/10',
    pulse: 'bg-[#475569]'
  }
};

export default function Dashboard({ userProfile, onProfileUpdate }: DashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>('emerald');
  const [permissionRules, setPermissionRules] = useState<ModulePermissionRule[]>(DEFAULT_PERMISSION_RULES);
  const [isEoidGroupOpen, setIsEoidGroupOpen] = useState(true);

  useEffect(() => {
    getPermissionRules().then(rules => {
      setPermissionRules(rules);
    });
  }, [location.pathname]);

  useEffect(() => {
    if (userProfile) {
      const persistedTheme = (userProfile.theme as ThemeAccent) || 
                             (localStorage.getItem(`ics_theme_${userProfile.id}`) as ThemeAccent);
      if (persistedTheme && THEMES[persistedTheme]) {
        setThemeAccent(persistedTheme);
      }
    }
  }, [userProfile]);

  const updateTheme = async (newTheme: ThemeAccent) => {
    setThemeAccent(newTheme);
    if (userProfile?.id) {
      localStorage.setItem(`ics_theme_${userProfile.id}`, newTheme);
      try {
        await supabase.from('profiles').update({ theme: newTheme }).eq('id', userProfile.id);
      } catch (e) {
        console.warn("Could not persist theme column on database backend", e);
      }
    }
  };

  const currentTheme = THEMES[themeAccent] || THEMES.emerald;

  const [records, setRecords] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const allTabs: { type: RecordType | 'OVERVIEW' | 'AUDIT' | 'REPORTS' | 'USERS' | 'CABINETS' | 'AIRPORT'; icon: any; label: string }[] = [
    { type: 'OVERVIEW', icon: LayoutDashboard, label: 'Dashboard' },
    { type: 'Eritrean ID', icon: Plane, label: 'Eritrean ID' },
    { type: 'VISA', icon: FileText, label: 'VISA Records' },
    { type: 'EOID', icon: Fingerprint, label: 'Normal EOID' },
    { type: 'EOID Under_Age', icon: Baby, label: 'Under-Age EOID' },
    { type: 'Alien Passport', icon: CreditCard, label: 'Alien Passport' },
    { type: 'Residence ID', icon: CreditCard, label: 'Residence ID' },
    { type: 'ETD', icon: MapPin, label: 'Emergency Travel Document' },
    { type: 'Yellow Card', icon: Shield, label: 'Yellow Card ' },
      { type: 'CABINETS', icon: Archive, label: 'Physical Cabinets' },
    { type: 'USERS', icon: Users, label: 'User Management' },
    { type: 'REPORTS', icon: BarChart3, label: 'System Reports' },
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
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin' || userProfile.role === 'admin_grant') return true;

    // Command Deck (Overview) is the baseline landing page for everyone
    if (tab.type === 'OVERVIEW') return true;

    // Direct check for weleba ephrem as an active authorized staff member
    const isWeleba = userProfile?.email?.toLowerCase().includes('weleba') || userProfile?.full_name?.toLowerCase().includes('weleba');
    if (isWeleba) {
      if (tab.type === 'AIRPORT') return true;
    }

    // If user has specific modules array assigned, use those STRICTLY as the primary authorization rule
    if (userProfile.modules && Array.isArray(userProfile.modules)) {
      if (tab.type === 'Yellow Card') {
        return userProfile.modules.includes('Yellow Card') || 
               userProfile.modules.includes('AIRPORT') ||
               userProfile.modules.includes('Yellow Card:read') ||
               userProfile.modules.includes('AIRPORT:read');
      }
      return userProfile.modules.includes(tab.type) || 
             userProfile.modules.includes(`${tab.type}:read`) ||
             userProfile.modules.includes(`${tab.type}:write`) ||
             userProfile.modules.includes(`${tab.type}:approve`);
    }

    // STRICT NON-ADMIN PROTECTION: If they have no custom modules array configured in database,
    // they should ONLY see the Overview tab and NOT get default fallback access to other divisions.
    // However, if they are historic airport_staff/airport_viewer, let them view AIRPORT/Yellow Card.
    if (userProfile.role === 'airport_staff' || userProfile.role === 'airport_viewer') {
      return tab.type === 'Yellow Card' || tab.type === 'AIRPORT';
    }

    // Regular staff (or other roles) with no configured modules array get ONLY the Overview baseline.
    return false;
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
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin' || userProfile.role === 'admin_grant') return true;
    if (userProfile.modules && userProfile.modules.length > 0) {
      // If they have users/audit module, show them in airport too
      if (at.module === 'USERS') return userProfile.modules.includes('USERS');
      if (at.module === 'AUDIT') return userProfile.modules.includes('AUDIT');
      
      // Map general AIRPORT clearance to specific sub-clearance keys
      if (at.module === 'AIRPORT_VIEW') {
        return userProfile.modules.includes('AIRPORT') || 
               userProfile.modules.includes('AIRPORT:read') || 
               userProfile.modules.includes('AIRPORT_VIEW');
      }
      if (at.module === 'AIRPORT_ADD') {
        return userProfile.modules.includes('AIRPORT:write') || 
               userProfile.modules.includes('AIRPORT_ADD');
      }
      if (at.module === 'AIRPORT_EDIT') {
        return userProfile.modules.includes('AIRPORT:approve') || 
               userProfile.modules.includes('AIRPORT:write') || 
               userProfile.modules.includes('AIRPORT_EDIT');
      }
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
    if (activeTab !== 'OVERVIEW' && activeTab !== 'AUDIT' && activeTab !== 'REPORTS' && activeTab !== 'CABINETS') {
      fetchRecords();
    }
  }, [activeTab]);

  const DEFAULT_EOID_UNDERAGE_MOCKS: ImmigrationRecord[] = [
    {
      id: "ua-rec-1",
      box_number: "EOID-Underage-000006",
      full_name: "Yared Yohannes Assefa",
      sex: "Male",
      citizenship: "Ethiopia",
      personal_file_no: "PF-UA-10492",
      eoid_number: "ID-12490-UA",
      passport_number: "EP0891242",
      request_number: "REQ-778931",
      date: "2026-06-03",
      service_provided: "Minor Travel Clearance Integration",
      created_at: new Date().toISOString(),
      created_by: "system"
    },
    {
      id: "ua-rec-2",
      box_number: "EOID-Underage-000006",
      full_name: "Netsanet Tesfaye Bekele",
      sex: "Female",
      citizenship: "Ethiopia",
      personal_file_no: "PF-UA-10493",
      eoid_number: "ID-12491-UA",
      passport_number: "EP0891243",
      request_number: "REQ-778932",
      date: "2026-06-03",
      service_provided: "Minor Border Exit Clearance",
      created_at: new Date().toISOString(),
      created_by: "system"
    },
    {
      id: "ua-rec-3",
      box_number: "EOID-Underage-000006",
      full_name: "Binyam Daniel Samuel",
      sex: "Male",
      citizenship: "United States",
      personal_file_no: "PF-UA-10494",
      eoid_number: "ID-12492-UA",
      passport_number: "US9918231",
      request_number: "REQ-778933",
      date: "2026-06-02",
      service_provided: "Birth Verification & Exit Certificate",
      created_at: new Date().toISOString(),
      created_by: "system"
    }
  ];

  const fetchRecords = async () => {
    if (activeTab === 'OVERVIEW' || activeTab === 'AUDIT' || activeTab === 'REPORTS' || activeTab === 'CABINETS') return;
    setLoading(true);
    const tableName = TABLE_MAP[activeTab as RecordType];
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecords(data as ImmigrationRecord[]);
      } else {
        throw error || new Error("Failed to load");
      }
    } catch (e: any) {
      console.warn(`Error or missing table on fetching ${activeTab} records, applying fallback:`, e?.message || e);
      if (activeTab === 'EOID Under_Age') {
        const stored = localStorage.getItem('local_records_eoid_under_age');
        if (stored) {
          setRecords(JSON.parse(stored));
        } else {
          localStorage.setItem('local_records_eoid_under_age', JSON.stringify(DEFAULT_EOID_UNDERAGE_MOCKS));
          setRecords(DEFAULT_EOID_UNDERAGE_MOCKS);
        }
      } else {
        setRecords([]);
      }
    }
    setLoading(false);
  };

  const hasAccess = (tabType: typeof allTabs[number]['type']) => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin' || userProfile.role === 'admin_grant') return true;
    return tabs.some(t => t.type === tabType);
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
      } catch (dbErr) {
        if (activeTab === 'EOID Under_Age') {
          console.warn("Delete DB error, performing local delete", dbErr);
          const stored = localStorage.getItem('local_records_eoid_under_age');
          if (stored) {
            const parsed = JSON.parse(stored) as ImmigrationRecord[];
            const updated = parsed.filter(r => r.id !== id);
            localStorage.setItem('local_records_eoid_under_age', JSON.stringify(updated));
          }
        } else {
          throw dbErr;
        }
      }
      
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

  const canAdd = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin' || userProfile.role === 'admin_grant') return true;
    
    // Check custom granular modules array for activeTab
    if (userProfile.modules && Array.isArray(userProfile.modules)) {
      return userProfile.modules.includes(`${activeTab}:write`);
    }
    
    return hasCreateAccess(userProfile.role, activeTab, permissionRules);
  };

  const canEdit = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin' || userProfile.role === 'admin_grant') return true;
    
    // Check custom granular modules array for activeTab
    if (userProfile.modules && Array.isArray(userProfile.modules)) {
      return userProfile.modules.includes(`${activeTab}:approve`) || userProfile.modules.includes(`${activeTab}:write`);
    }
    
    return hasUpdateAccess(userProfile.role, activeTab, permissionRules);
  };

  const filteredRecords = records.filter(r => 
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.passport_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.request_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SidebarContent = () => {
    const isAirportContext = location.pathname.startsWith('/airport');

    return (
      <div className="flex flex-col h-full w-full bg-white border-r border-slate-100 transition-all duration-300 font-sans">
        {/* Branding Area */}
        <div className="pt-8 pb-5 px-6 flex items-center justify-center flex-shrink-0">
          <EthiopianImmigrationLogo size={isSidebarCollapsed ? "sm" : "lg"} />
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
                <Link
                  to="/"
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-black text-blue-600 hover:bg-blue-50/60 pb-3 border-b border-slate-100 mb-2 transition-all cursor-pointer ${
                    isSidebarCollapsed ? 'justify-center' : 'justify-start'
                  }`}
                >
                  <ArrowLeft className="w-4.5 h-4.5 text-blue-500 flex-shrink-0" />
                  {!isSidebarCollapsed && <span>Back to Main Menu</span>}
                </Link>
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
                          ? `${currentTheme.bgLight} ${currentTheme.primaryText} font-extrabold shadow-xs border-l-4 ${currentTheme.border}` 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? currentTheme.primaryText : 'text-slate-400'}`} />
                      {!isSidebarCollapsed && <span className="flex-1">{at.label}</span>}
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
                {(() => {
                  const renderedItems: React.ReactNode[] = [];
                  let hasRenderedEoidGroup = false;

                  tabs.forEach((tab) => {
                    const isGroupItem = tab.type === 'EOID' || tab.type === 'EOID Under_Age';

                    if (isGroupItem) {
                      if (!hasRenderedEoidGroup) {
                        hasRenderedEoidGroup = true;
                        
                        const innerGroupTabs = tabs.filter(t => t.type === 'EOID' || t.type === 'EOID Under_Age');
                        const isAnyChildActive = activeTab === 'EOID' || activeTab === 'EOID Under_Age';
                        
                        renderedItems.push(
                          <div key="eoid-group" className="space-y-1.5 mt-2.5">
                            {/* Group Header */}
                            {!isSidebarCollapsed ? (
                              <button
                                type="button"
                                onClick={() => setIsEoidGroupOpen(!isEoidGroupOpen)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-all rounded-lg outline-none border-none cursor-pointer ${
                                  isAnyChildActive
                                    ? 'text-[#8c1d1d] font-extrabold bg-red-50/20'
                                    : 'text-slate-400 hover:text-slate-655 hover:text-slate-600'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <Fingerprint className={`w-3.5 h-3.5 ${isAnyChildActive ? 'text-[#8c1d1d]' : 'text-slate-400'}`} />
                                  <span>Ethiopian Origin ID</span>
                                </span>
                                <div>
                                  {isEoidGroupOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </div>
                              </button>
                            ) : (
                              <div className="border-t border-slate-100 my-2" />
                            )}

                            {/* Sub items */}
                            <AnimatePresence initial={false}>
                              {(isEoidGroupOpen || isSidebarCollapsed) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className={`space-y-1 overflow-hidden ${!isSidebarCollapsed ? 'pl-3 border-l border-slate-100 ml-5' : ''}`}
                                >
                                  {innerGroupTabs.map((subTab) => {
                                    const isSubActive = activeTab === subTab.type;
                                    const path = `/${subTab.type.toLowerCase().replace(' ', '-')}`;
                                    return (
                                      <Link
                                        key={subTab.type}
                                        to={path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center gap-4 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                          isSidebarCollapsed ? 'justify-center' : 'justify-start'
                                        } ${
                                          isSubActive 
                                            ? `${currentTheme.bgLight} ${currentTheme.primaryText} font-extrabold shadow-xs` 
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                                        }`}
                                      >
                                        <subTab.icon className={`w-4 h-4 flex-shrink-0 ${isSubActive ? currentTheme.primaryText : 'text-slate-400'}`} />
                                        {!isSidebarCollapsed && <span className="flex-1 truncate">{subTab.label}</span>}
                                      </Link>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      }
                    } else {
                      // Normal non-grouped tab link
                      const isActive = activeTab === tab.type;
                      const path = tab.type === 'OVERVIEW' ? '/' : `/${tab.type.toLowerCase().replace(' ', '-')}`;
                      renderedItems.push(
                        <Link
                          key={tab.type}
                          to={path}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                            isSidebarCollapsed ? 'justify-center font-bold' : 'justify-start'
                          } ${
                            isActive 
                              ? `${currentTheme.bgLight} ${currentTheme.primaryText} font-extrabold shadow-sm border-l-4 ${currentTheme.border}` 
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                          }`}
                        >
                          <tab.icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? currentTheme.primaryText : 'text-slate-400'}`} />
                          {!isSidebarCollapsed && <span className="flex-1">{tab.label}</span>}
                        </Link>
                      );
                    }
                  });

                  return renderedItems;
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Bottom Module Logout / Profile (Exactly resembling the laptop screenshot) */}
        <div className="p-4 mt-auto border-t border-slate-100 flex-shrink-0">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3.5 mb-4 text-left px-2">
              <div className="w-10 h-10 rounded-full bg-[#8c1d1d] text-white flex items-center justify-center font-black text-sm shadow-md flex-shrink-0">
                {userProfile?.full_name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="overflow-hidden">
                <p className="font-extrabold text-xs text-slate-800 tracking-tight leading-tight truncate">
                  {userProfile?.full_name || 'System Administrator'}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {userProfile?.role || 'ADMIN'}
                </p>
              </div>
            </div>
          )}

          <button 
            onClick={() => supabase.auth.signOut()}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full text-red-600 bg-red-50/50 hover:bg-red-50/80 ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Log Out Terminal</span>}
          </button>
          
          <div className="mt-3 pt-2 border-t border-slate-100/45 text-center flex justify-center w-full">
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
      {canAdd() && ['VISA', 'EOID', 'Residence ID', 'ETD', 'Yellow Card', 'AIRPORT'].includes(activeTab) && (
        <button 
          onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}
          className={`fixed bottom-24 md:bottom-8 right-6 w-14 h-14 md:w-16 md:h-16 ${currentTheme.primary} ${currentTheme.primaryHover} text-white rounded-2xl shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-40 border-none cursor-pointer outline-none`}
        >
          <Plus className="w-7 h-7 text-white" />
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 shadow-lg">
        {tabs.slice(0, 4).map((tab) => {
          const isActive = activeTab === tab.type;
          const path = tab.type === 'OVERVIEW' ? '/' : `/${tab.type.toLowerCase().replace(' ', '-')}`;
          return (
            <Link
              key={tab.type}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 gap-1 py-1 transition-all ${isActive ? currentTheme.primaryText : 'text-slate-500'}`}
            >
              <div className={`w-16 h-8 flex items-center justify-center rounded-xl transition-all ${isActive ? `${currentTheme.bgLight} ${currentTheme.primaryText}` : 'text-slate-400'}`}>
                <tab.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${isActive ? currentTheme.primaryText : 'text-slate-400'}`}>
                {tab.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
        {/* Toggle Sidebar Button for Mobile */}
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center justify-center flex-1 gap-1 py-1 transition-all text-slate-500"
        >
          <div className="w-16 h-8 flex items-center justify-center rounded-xl transition-all text-slate-400">
            <List className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-slate-400">More</span>
        </button>
      </nav>

      {/* Sidebar (Navigation Drawer) */}
      <aside className={`fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:h-screen transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) transform ${
        isSidebarCollapsed ? 'w-24' : 'w-72'
      } ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } flex flex-col shadow-sm md:shadow-none bg-white md:border-r md:border-slate-100`}>
        <SidebarContent />
      </aside>

      {/* Scaffold */}
      <main className="flex-1 flex flex-col w-full pb-20 md:pb-0">
        {/* Header Bar */}
        <header className="h-16 md:h-20 flex items-center justify-between px-6 md:px-8 bg-white border-b border-slate-100 sticky top-0 z-30">
          <div className="flex items-center gap-3">
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Dynamic Theme Chooser for the User */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-[10px] p-1 px-1.5 mr-1">
                {(['emerald', 'blue', 'amber', 'slate'] as const).map((tName) => (
                  <button
                    key={tName}
                    onClick={() => updateTheme(tName)}
                    title={`Switch system theme to ${tName}`}
                    className={`w-3.5 h-3.5 rounded-full border cursor-pointer transition-all ${
                      tName === 'emerald' ? 'bg-[#2b825a]' :
                      tName === 'blue' ? 'bg-[#1b54ac]' :
                      tName === 'amber' ? 'bg-[#d97706]' : 'bg-[#475569]'
                    } ${
                      themeAccent === tName 
                        ? 'scale-110 ring-2 ring-white border-slate-700 shadow-sm opacity-100' 
                        : 'opacity-40 hover:opacity-100 border-transparent hover:scale-105'
                    }`}
                  />
                ))}
              </div>

              {/* Active IP Status capsule styled with active theme */}
              <div className={`flex items-center gap-2 ${currentTheme.bgLight} rounded-[10px] px-4 py-1.5 text-[10px] font-mono font-bold ${currentTheme.primaryText} border ${currentTheme.border} opacity-90`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.pulse} animate-pulse`} />
                <span>10.40.20.125 / SECURE</span>
              </div>

              {/* Notification bell with red feedback dot */}
              <div className="relative p-2 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 border border-white" />
              </div>
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
                {['VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'Yellow Card', 'AIRPORT'].includes(activeTab) ? (
                  <div className="space-y-6">
                    {/* FSD Division style heading row */}
                    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 ${currentTheme.border} pl-5 py-1`}>
                      <div className="text-left">
                        <h1 className="text-2xl md:text-3xl font-semibold text-slate-700 tracking-tight leading-tight">
                          {activeTab === 'VISA' ? 'VISA Structuring Division' : 
                           activeTab === 'EOID' ? 'Ethiopian Origin ID - Normal Registrations' : 
                           activeTab === 'EOID Under_Age' ? 'Ethiopian Origin ID - Under-Age Applications' : 
                           activeTab === 'Residence ID' ? 'Residence ID Division' : 
                           activeTab === 'ETD' ? 'ETD Structuring Division' : 
                           activeTab === 'Yellow Card' ? 'Yellow Card Division' : 
                           activeTab === 'AIRPORT' ? 'Bole Airport Division' : activeTab}
                        </h1>
                        <p className="text-slate-400 text-xs font-extrabold tracking-wider mt-1.5 uppercase">
                          {activeTab === 'VISA' ? 'SOURCE: - FSD Division Data structuring' : 
                           activeTab === 'EOID' ? 'SOURCE: - National ID verification feeds' : 
                           activeTab === 'EOID Under_Age' ? 'SOURCE: - Verified Minors Database Registry' : 
                           activeTab === 'Residence ID' ? 'SOURCE: - Permanent ID verification records' : 
                           activeTab === 'ETD' ? 'SOURCE: - Non-resident exception travels' : 
                           activeTab === 'AIRPORT' ? 'SOURCE: - BOLE AIRPORT BORDER SECURITY CONTROL' :
                           'SOURCE: - DIASPORA REGISTRATION HUB'}
                        </p>
                      </div>

                      {/* Header Buttons matching the screen exact colors */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {canAdd() && (
                          <button 
                            onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}
                            className={`flex items-center gap-2 px-5 py-2.5 ${currentTheme.primary} ${currentTheme.primaryHover} text-white rounded-lg text-xs font-extrabold transition-all shadow-sm ${currentTheme.glow} cursor-pointer outline-none border-none`}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Entry</span>
                          </button>
                        )}
                        <button 
                          onClick={exportToCSV}
                          disabled={records.length === 0}
                          className="flex items-center gap-2 px-4.5 py-2.5 bg-[#f4f7f5] hover:bg-[#e2ede6] text-slate-600 disabled:opacity-50 border border-slate-200/50 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none"
                        >
                          <FileOutput className="w-4 h-4 text-slate-400" />
                          <span>Export CSV</span>
                        </button>
                        {canAdd() && (
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4.5 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none"
                          >
                            <FileInput className="w-4 h-4 text-slate-400" />
                            <span>Import CSV</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Integrated custom search bar */}
                    <div className="relative w-full group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Filter this division by Box, Name, Passport or Request Number..."
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 focus:bg-white focus:ring-4 focus:ring-slate-500/5 focus:border-slate-400 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  activeTab !== 'CABINETS' ? (
                    <div className="text-left">
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                        {activeTab === 'OVERVIEW' ? 'Overview' : 
                         activeTab === 'AIRPORT' ? 'Bole Airport Division' : activeTab}
                      </h1>
                      <p className="text-slate-500 text-sm md:text-base font-medium">
                        {activeTab === 'OVERVIEW' ? 'Monitoring organizational resources and performance analytics.' : 
                         activeTab === 'AIRPORT' ? 'Localized Bole operations, passenger tracking, and border registry controls.' : 
                         `Manage and process ${activeTab.toLowerCase()} system registry entries.`}
                      </p>
                    </div>
                  ) : null
                )}
              </div>

              <Routes>
                <Route path="/" element={<DashboardReports userProfile={userProfile} />} />
                <Route path="/cabinets" element={hasAccess('CABINETS') ? <CabinetsView userProfile={userProfile} /> : <Navigate to="/" replace />} />
                <Route path="/audit" element={hasAccess('AUDIT') ? <AuditLogView /> : <Navigate to="/" replace />} />
                <Route path="/reports" element={hasAccess('REPORTS') ? <ReportingSystem /> : <Navigate to="/" replace />} />
                <Route path="/users" element={hasAccess('USERS') ? <UserManagement currentUserProfile={userProfile} onProfileUpdate={onProfileUpdate} /> : <Navigate to="/" replace />} />
                <Route path="/airport/:subTab" element={
                  hasAccess('AIRPORT') ? (
                    <AirportView 
                      userProfile={userProfile}
                      onAddRecord={() => { setEditingRecord(null); setIsFormOpen(true); }}
                      onEditRecord={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                      onDeleteRecord={handleDelete}
                      searchQuery={searchQuery}
                      canEdit={canEdit()}
                      refreshCounter={refreshCounter}
                    />
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/airport" element={
                  hasAccess('AIRPORT') ? (
                    <AirportView 
                      userProfile={userProfile}
                      onAddRecord={() => { setEditingRecord(null); setIsFormOpen(true); }}
                      onEditRecord={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                      onDeleteRecord={handleDelete}
                      searchQuery={searchQuery}
                      canEdit={canEdit()}
                      refreshCounter={refreshCounter}
                    />
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/yellow-card" element={
                  hasAccess('Yellow Card') ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <RecordTable 
                        loading={loading}
                        records={filteredRecords}
                        activeTab={activeTab as RecordType}
                        canEdit={canEdit()}
                        onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                        onDelete={handleDelete}
                      />
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/visa" element={
                  hasAccess('VISA') ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <RecordTable 
                        loading={loading}
                        records={filteredRecords}
                        activeTab={activeTab as RecordType}
                        canEdit={canEdit()}
                        onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                        onDelete={handleDelete}
                      />
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/eoid" element={
                  hasAccess('EOID') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <RecordTable 
                        loading={loading}
                        records={filteredRecords}
                        activeTab={activeTab as RecordType}
                        canEdit={canEdit()}
                        onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                        onDelete={handleDelete}
                      />
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/eoid-under_age" element={
                  hasAccess('EOID Under_Age') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <RecordTable 
                        loading={loading}
                        records={filteredRecords}
                        activeTab={activeTab as RecordType}
                        canEdit={canEdit()}
                        onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                        onDelete={handleDelete}
                      />
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/residence-id" element={
                  hasAccess('Residence ID') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <RecordTable 
                        loading={loading}
                        records={filteredRecords}
                        activeTab={activeTab as RecordType}
                        canEdit={canEdit()}
                        onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                        onDelete={handleDelete}
                      />
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/etd" element={
                  hasAccess('ETD') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <RecordTable 
                        loading={loading}
                        records={filteredRecords}
                        activeTab={activeTab as RecordType}
                        canEdit={canEdit()}
                        onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
                        onDelete={handleDelete}
                      />
                    </div>
                  ) : <Navigate to="/" replace />
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
              : (activeTab === 'OVERVIEW' || activeTab === 'AUDIT' || activeTab === 'REPORTS' || activeTab === 'CABINETS' ? 'VISA' : activeTab as RecordType)}
            record={editingRecord}
            onSuccess={(record) => {
              setIsFormOpen(false);
              setRefreshCounter(prev => prev + 1);
              if ((activeTab === 'Yellow Card' || activeTab === 'AIRPORT') && record.passport_number) {
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
