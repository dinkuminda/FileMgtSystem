import React, { useState, useEffect, useRef } from 'react';
import { supabase, type UserProfile, type ImmigrationRecord, type RecordType, TABLE_MAP, logger, REVERSE_TABLE_MAP } from '../lib/supabase';
import { 
  FileText, Users, LogOut, Plus, Search, 
  CreditCard, Fingerprint, MapPin, FileQuestion,
  Download, Trash2, Edit2, Loader2,
  FileOutput, FileInput, LayoutDashboard, Shield, X,
  Activity, BarChart3, Plane, Paperclip,
  ArrowLeft, Clock, List, LayoutGrid, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Bell, Archive, Baby, Calendar, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation, Link, Routes, Route, Navigate } from 'react-router-dom';
import RecordForm, { getPrefixForType } from './RecordForm';
import DashboardReports from './DashboardReports';
import AuditLogView from './AuditLogView';
import ReportingSystem from './ReportingSystem';
import RecordTable from './RecordTable';
import UserManagement from './UserManagement';
import AdvancedSearch from './AdvancedSearch';
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
import * as XLSX from 'xlsx';

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
  const [eoidSubtype, setEoidSubtype] = useState<'normal' | 'underage'>('normal');

  useEffect(() => {
    const lowerPath = location.pathname.toLowerCase();
    if (lowerPath === '/eoid-under_age' || lowerPath === '/eoid-under-age') {
      setEoidSubtype('underage');
      navigate('/eoid', { replace: true });
    }
  }, [location.pathname, navigate]);

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

  const currentTheme = THEMES[themeAccent] || THEMES.emerald;

  const [records, setRecords] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  
  const allTabs: { type: RecordType | 'OVERVIEW' | 'AUDIT' | 'REPORTS' | 'USERS' | 'SEARCH'; icon: any; label: string }[] = [
    { type: 'OVERVIEW', icon: LayoutDashboard, label: 'Dashboard' },
    { type: 'Eritrean ID', icon: Plane, label: 'Eritrean ID' },
    { type: 'VISA', icon: FileText, label: 'VISA Records' },
    { type: 'EOID', icon: Fingerprint, label: 'Ethiopian Origin ID' },
    { type: 'Alien Passport', icon: CreditCard, label: 'Alien Passport' },
    { type: 'Residence ID', icon: CreditCard, label: 'Residence ID' },
    { type: 'ETD', icon: MapPin, label: 'Emergency Travel Document' },
    { type: 'Yellow Card', icon: Shield, label: 'Yellow Card' },
    { type: 'USERS', icon: Users, label: 'User Management' },
    { type: 'SEARCH', icon: Search, label: 'Advanced Search' },
    { type: 'REPORTS', icon: BarChart3, label: 'System Reports' },
    { type: 'AUDIT', icon: Activity, label: 'System Audit Logs' },
  ];

  // Map path to tab type
  const pathParts = location.pathname.split('/').filter(p => p);
  const currentPath = pathParts[0]?.toLowerCase() || '';

  const matchingTab = allTabs.find(tab => {
    const slug = tab.type === 'OVERVIEW' ? '' : tab.type.toLowerCase().replace(' ', '-');
    return slug === currentPath;
  });
  const activeTab = matchingTab?.type || 'OVERVIEW';

  const rRole = (userProfile?.role as string || '').toLowerCase();
  const isViewerRole = rRole === 'viewer';
  const isViewer = isViewerRole && ['VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'Yellow Card', 'Eritrean ID', 'Alien Passport'].includes(activeTab);

  const tabs = React.useMemo(() => {
    return allTabs.filter(tab => {
      if (!userProfile) return false;
      
      // Admins should always see everything
      const r = (userProfile.role as string || '').toLowerCase();
      if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin' || r === 'admin_grant') return true;

      // Command Deck (Overview) is the baseline landing page for everyone
      if (tab.type === 'OVERVIEW' || tab.type === 'SEARCH') return true;

      // Direct check for weleba ephrem as an active authorized staff member
      const isWeleba = userProfile?.email?.toLowerCase().includes('weleba') || userProfile?.full_name?.toLowerCase().includes('weleba');

      // If user has specific modules array assigned, use those STRICTLY as the primary authorization rule
      if (userProfile.modules && Array.isArray(userProfile.modules)) {
        if (tab.type === 'Yellow Card') {
          return userProfile.modules.includes('Yellow Card') || 
                 userProfile.modules.includes('Yellow Card:read');
        }
        return userProfile.modules.includes(tab.type) || 
               userProfile.modules.includes(`${tab.type}:read`) ||
               userProfile.modules.includes(`${tab.type}:write`) ||
               userProfile.modules.includes(`${tab.type}:approve`);
      }

      // STRICT NON-ADMIN PROTECTION: If they have no custom modules array configured in database,
      // they should ONLY see the Overview tab and NOT get default fallback access to other divisions.
      if (r === 'staff' || r === 'supervisor') {
        return tab.type === 'Yellow Card' || tab.type === 'AUDIT';
      }
      if (r === 'airport_viewer' || r === 'editor') {
        return tab.type === 'Yellow Card';
      }

      // Regular staff (or other roles) with no configured modules array get ONLY the Overview baseline.
      return false;
    });
  }, [userProfile]);

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
    if (activeTab !== 'OVERVIEW' && activeTab !== 'AUDIT' && activeTab !== 'REPORTS') {
      fetchRecords();
    }
  }, [activeTab, eoidSubtype]);

  const DEFAULT_EOID_UNDERAGE_MOCKS: ImmigrationRecord[] = [
    {
      id: "ua-rec-1",
      box_number: "EOID-Underage-000006",
      full_name: "Yared Yohannes Assefa",
      sex: "Male",
      citizenship: "Ethiopia",
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
    if (activeTab === 'OVERVIEW' || activeTab === 'AUDIT' || activeTab === 'REPORTS') return;
    setLoading(true);
    setSchemaError(null);
    
    const effectiveRecordType = activeTab === 'EOID' 
      ? (eoidSubtype === 'underage' ? 'EOID Under_Age' : 'EOID')
      : (activeTab as RecordType);

    const tableName = TABLE_MAP[effectiveRecordType];

    try {
      if (!tableName) {
        throw new Error(`No table mapped for record type: ${effectiveRecordType}`);
      }
      let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
      const { data, error } = await query;

      if (!error && data) {
        const rRole = (userProfile?.role as string || '').toLowerCase();
        const isElevated = rRole === 'admin' || rRole === 'super_admin' || rRole === 'super-admin' || rRole === 'super admin' || rRole === 'admin_grant' || rRole === 'supervisor' || rRole === 'viewer' || rRole === 'editor';
        let mappedData = (data || []).map(r => ({ ...r, _table: tableName })) as ImmigrationRecord[];
        if (!isElevated && userProfile?.id) {
          mappedData = mappedData.filter(r => r.created_by === userProfile.id);
        }
        setRecords(mappedData);
      } else {
        throw error || new Error("Failed to load");
      }
    } catch (e: any) {
      console.warn(`Error or missing table on fetching ${effectiveRecordType} records, applying fallback:`, e?.message || e);
      const msg = e?.message || String(e);
      if (msg.includes('schema cache') || msg.includes('does not exist')) {
        setSchemaError(`Database schema out of sync: The table "${tableName}" is missing or uncached in Supabase. Please copy and run Section #7 or #12 of "supabase_setup.sql" in your Supabase SQL Editor and execute NOTIFY pgrst, 'reload schema'; to sync.`);
      } else {
        setSchemaError(null);
      }
      
      const storageKey = 'local_records_' + effectiveRecordType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const stored = localStorage.getItem(storageKey);
      let parsed = stored ? JSON.parse(stored) : [];
      
      if (effectiveRecordType === 'EOID Under_Age' && parsed.length === 0) {
        parsed = DEFAULT_EOID_UNDERAGE_MOCKS;
        localStorage.setItem(storageKey, JSON.stringify(DEFAULT_EOID_UNDERAGE_MOCKS));
      }
      
      let mappedParsed = parsed.map((r: any) => ({ ...r, _table: tableName }));
      
      const rRole = (userProfile?.role as string || '').toLowerCase();
      const isElevated = rRole === 'admin' || rRole === 'super_admin' || rRole === 'super-admin' || rRole === 'super admin' || rRole === 'admin_grant' || rRole === 'supervisor' || rRole === 'viewer' || rRole === 'editor';
      if (!isElevated && userProfile?.id) {
        mappedParsed = mappedParsed.filter((r: any) => r.created_by === userProfile.id);
      }
      setRecords(mappedParsed);
    }
    setLoading(false);
  };

  const hasAccess = (tabType: typeof allTabs[number]['type']) => {
    if (!userProfile) return false;
    const r = (userProfile.role as string || '').toLowerCase();
    if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin' || r === 'admin_grant') return true;
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
    const tableName = (record as any)?._table || TABLE_MAP[activeTab as RecordType];
    
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
        const effectiveRecordType = activeTab === 'EOID' 
          ? (((record as any)?.under_age) ? 'EOID Under_Age' : 'EOID')
          : (activeTab as RecordType);
        const storageKey = 'local_records_' + effectiveRecordType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        console.warn(`Delete DB error, performing local delete for ${effectiveRecordType}`, dbErr);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as ImmigrationRecord[];
          const updated = parsed.filter(r => r.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
      }
      
      await logger.log('DELETE', activeTab === 'EOID' ? (((record as any)?.under_age) ? 'EOID Under_Age' : 'EOID') : activeTab, `Deleted record for ${record?.full_name || 'unknown'}`, id);
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

  const exportToExcel = async () => {
    if (records.length === 0) return;
    await logger.log('EXPORT', activeTab, `Exported ${records.length} records to Excel`);
    
    // Map records to replace "id" string with a sequential 1-based autonumber
    const formattedRecords = records.map((record, index) => {
      // Build an object with 'id' as the very first column/key
      const { id, ...rest } = record as any;
      return {
        id: index + 1,
        ...rest
      };
    });

    // Convert JSON records to an Excel Worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedRecords);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab.substring(0, 31)); // sheet names must be <= 31 chars

    // Write file using modern xls format
    const filename = `${activeTab.toLowerCase().replace(' ', '_')}_records_${new Date().toISOString().split('T')[0]}.xls`;
    XLSX.writeFile(workbook, filename);
    addToast(`Successfully exported ${records.length} records to Excel .xls file.`, 'success');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const effectiveRecordType = activeTab === 'EOID' 
      ? (eoidSubtype === 'underage' ? 'EOID Under_Age' : 'EOID')
      : (activeTab as RecordType);

    // 1. Prevent duplicate file import immediately
    try {
      const importedFilesStr = localStorage.getItem('local_imported_files_log') || '[]';
      const importedFilesLog = JSON.parse(importedFilesStr);
      
      const isDuplicateFile = importedFilesLog.some((f: any) => 
        f.fileName === file.name && 
        f.fileSize === file.size && 
        f.tab === effectiveRecordType
      );
      
      if (isDuplicateFile) {
        addToast(`Duplicate File Cancelled: The spreadsheet "${file.name}" has already been imported into the "${effectiveRecordType}" module. To prevent duplicate registers, this import has been cancelled.`, 'error');
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    } catch (err) {
      console.error("Error verifying file registry duplicates:", err);
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      let uniqueProcessed: any[] = [];
      let duplicateInDbCount = 0;
      let duplicateInFileCount = 0;
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error('Workbook sheet is empty or invalid.');
        }
        
        const json = XLSX.utils.sheet_to_json(worksheet);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const getValidColumnsForTab = (tab: string): string[] => {
          // Columns that exist in absolutely all tables (except passport_number, personal_id, personal_id_no)
          const baseAll = [
            'box_number', 'full_name', 'sex', 'citizenship', 
            'request_number', 'date', 'service_provided',
            'shelf_number', 'personal_id_no', 'attachment_url'
          ];
          
          if (tab === 'VISA') {
            return [...baseAll, 'passport_number', 'visa_type'];
          }
          if (tab === 'EOID') {
            return [...baseAll, 'passport_number', 'personal_id', 'eoid_number', 'eoid_type', 'under_age', 'dob'];
          }
          if (tab === 'EOID Under_Age') {
            return [...baseAll, 'passport_number', 'personal_id', 'eoid_number', 'eoid_type', 'under_age', 'dob'];
          }
          if (tab === 'Alien Passport') {
            return [...baseAll, 'passport_number'];
          }
          if (tab === 'Yellow Card') {
            return [...baseAll, 'passport_number', 'personal_id', 'eoid_type', 'letter_number', 'document_type'];
          }
          if (tab === 'Eritrean ID') {
            // Note: Eritrean ID has no passport_number in the db!
            return baseAll;
          }
          if (tab === 'Residence ID') {
            return [...baseAll, 'passport_number', 'id_type'];
          }
          if (tab === 'ETD') {
            return [...baseAll, 'passport_number', 'etd'];
          }
          return baseAll;
        };

        const normalizeKey = (key: string): string => {
          const normalized = key.toLowerCase().trim()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');

          // Map common fields to exact schema field names
          if (['fullname', 'full_name', 'name', 'applicant_name', 'applicant', 'full_name_english', 'full_name_amharic'].some(k => normalized.includes(k))) {
            return 'full_name';
          }
          if (['box_number', 'boxnumber', 'box_no', 'boxno', 'box', 'drawer', 'locker', 'box_num'].includes(normalized)) {
            return 'box_number';
          }
          if (['sex', 'gender'].includes(normalized)) {
            return 'sex';
          }
          if (['citizenship', 'citizen', 'nationality', 'origin'].includes(normalized)) {
            return 'citizenship';
          }
          if (['passport_number', 'passport_no', 'passportnumber', 'passportno', 'passport'].includes(normalized)) {
            return 'passport_number';
          }
          if (['request_number', 'request_no', 'requestnumber', 'requestno', 'request', 'req_no'].includes(normalized)) {
            return 'request_number';
          }
          if (['service_provided', 'serviceprovided', 'service', 'services', 'action'].includes(normalized)) {
            return 'service_provided';
          }
          if (['eoid_number', 'eoid_no', 'eoidnumber', 'eoidno', 'origin_id'].includes(normalized)) {
            return 'eoid_number';
          }
          if (['residence_id_no', 'residence_id_number', 'residence_id', 'residence_no', 'residenceid', 'id_type', 'idtype', 'residence_type', 'id_category'].includes(normalized)) {
            return 'id_type';
          }
          if (['personal_id', 'personal_id_no', 'personal_id_number', 'id_number', 'id_no', 'idno', 'personalid', 'personalid_no'].includes(normalized)) {
            return 'personal_id_no';
          }
          if (['shelf_number', 'shelf', 'shelf_num', 'shelfno'].includes(normalized)) {
            return 'shelf_number';
          }
          if (['date', 'registered_date', 'creation_date', 'registration_date'].includes(normalized)) {
            return 'date';
          }
          if (['letter_number', 'letter_no', 'letternumber', 'letterno', 'yell_no', 'yellow_card_id'].includes(normalized)) {
            return 'letter_number';
          }
          if (['document_type', 'documenttype', 'doc_type', 'doctype'].includes(normalized)) {
            return 'document_type';
          }
          if (['etd', 'etd_no', 'etd_number'].includes(normalized)) {
            return 'etd';
          }
          if (['visa_type', 'visatype', 'visa_category', 'visacategory', 'visa_class', 'visaclass'].includes(normalized)) {
            return 'visa_type';
          }
          return normalized;
        };

        const validColumns = getValidColumnsForTab(activeTab);

        const parseExcelDate = (val: any): string => {
          if (!val) {
            return new Date().toISOString().split('T')[0];
          }
          if (val instanceof Date) {
            if (!isNaN(val.getTime())) {
              return val.toISOString().split('T')[0];
            }
          }
          const num = typeof val === 'number' ? val : parseFloat(val);
          if (!isNaN(num) && num > 10000 && num < 100000) {
            try {
              const date = new Date(Math.round((num - 25569) * 86400 * 1000));
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            } catch (err) {
              console.error("Failed to parse Excel date serial number:", val, err);
            }
          }
          if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed) {
              const parsed = Date.parse(trimmed);
              if (!isNaN(parsed)) {
                return new Date(parsed).toISOString().split('T')[0];
              }
            }
          }
          return new Date().toISOString().split('T')[0];
        };

        const localModuleBoxMap: Record<string, string> = {
          'VISA': 'VS-B1-01',
          'EOID': 'EOID-B1-01',
          'Residence ID': 'RES-B1-01',
          'ETD': 'ETD-B1-01',
          'Yellow Card': 'YC-B1-01',
          'EOID Under_Age': 'EOIDUA-B1-01',
          'Alien Passport': 'AP-B1-01',
          'Eritrean ID': 'ERID-B1-01'
        };

        let existingBoxes: string[] = [];
        const tableName = TABLE_MAP[effectiveRecordType];
        if (tableName) {
          const { data, error } = await supabase
            .from(tableName)
            .select('box_number');
          if (!error && data) {
            existingBoxes = data.map((r: any) => r.box_number || '');
          } else {
            const storageKey = 'local_records_' + effectiveRecordType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              try {
                existingBoxes = JSON.parse(stored).map((r: any) => r.box_number || '');
              } catch (e) {}
            }
          }
        }

        const processedData = json.map((row: any) => {
          const cleanRow: any = {};
          // Normalize and filter key values of individual row
          Object.entries(row).forEach(([key, val]) => {
            const normKey = normalizeKey(key);
            if (validColumns.includes(normKey)) {
              if (normKey === 'date' || normKey === 'dob') {
                cleanRow[normKey] = parseExcelDate(val);
              } else {
                cleanRow[normKey] = val;
              }
            }
          });

          // Discard internal system fields to avoid writing stale ids
          delete cleanRow.id;
          delete cleanRow.created_at;

          // Cross-populate personal_id and personal_id_no safely ONLY if supported in current tab's schema definition
          if (cleanRow.personal_id_no && validColumns.includes('personal_id')) {
            cleanRow.personal_id = cleanRow.personal_id_no;
          } else if (cleanRow.personal_id && validColumns.includes('personal_id_no')) {
            cleanRow.personal_id_no = cleanRow.personal_id;
          }

          const finalRow: any = {};
          validColumns.forEach(col => {
            if (cleanRow[col] !== undefined) {
              finalRow[col] = cleanRow[col];
            }
          });

          // Auto-populate cabinet box number format if blank, undefined, or legacy
          const cleanBox = (finalRow.box_number || '').toString().trim();
          const pfx = getPrefixForType(effectiveRecordType);
          const needsBoxAllocation = !cleanBox || 
            cleanBox === 'Eritrean-000008' || 
            cleanBox === 'ERID-B1' || 
            cleanBox === 'Visa-000001' || 
            cleanBox === 'VS-B1' ||
            !cleanBox.startsWith(`${pfx}-B`);

          if (needsBoxAllocation) {
            let calculatedBox = `${pfx}-B1-01`;
            let foundNext = false;
            
            // Build count map of currently assigned boxes in the import batch + database
            const counts: Record<string, number> = {};
            existingBoxes.forEach(b => {
              counts[b] = (counts[b] || 0) + 1;
            });
            
            for (let bIdx = 1; bIdx <= 1000; bIdx++) {
              for (let sIdx = 1; sIdx <= 50; sIdx++) {
                const padSIdx = sIdx < 10 ? `0${sIdx}` : sIdx.toString();
                const candidate = `${pfx}-B${bIdx}-${padSIdx}`;
                if ((counts[candidate] || 0) === 0) {
                  calculatedBox = candidate;
                  foundNext = true;
                  break;
                }
              }
              if (foundNext) break;
            }
            finalRow.box_number = calculatedBox;
            existingBoxes.push(calculatedBox);
          }

          // Force trim and normalize gender values to handle Case/Single letter constraints (e.g., MALE -> Male, f -> Female)
          if (finalRow.sex) {
            const normalizedSex = finalRow.sex.toString().trim().toLowerCase();
            if (normalizedSex.startsWith('m')) {
              finalRow.sex = 'Male';
            } else if (normalizedSex.startsWith('f')) {
              finalRow.sex = 'Female';
            } else {
              finalRow.sex = 'Other';
            }
          } else {
            finalRow.sex = 'Male';
          }

          finalRow.created_by = user.id;

          if (effectiveRecordType === 'EOID' || effectiveRecordType === 'EOID Under_Age') {
            finalRow.under_age = effectiveRecordType === 'EOID Under_Age';
          }

          return finalRow;
        }).filter((row: any) => row.full_name);

        if (processedData.length === 0) {
          throw new Error('No valid rows containing a "full_name" (or equivalent name column) were found.');
        }

        // Validate Box Number format for all records during excel imports
        for (let i = 0; i < processedData.length; i++) {
          const row = processedData[i];
          const boxNum = (row.box_number || '').toString().trim();
          const expectedPrefix = getPrefixForType(effectiveRecordType);
          let isBoxValid = boxNum.toLowerCase().startsWith(`${expectedPrefix.toLowerCase()}-b`);
          if (!isBoxValid && effectiveRecordType === 'EOID Under_Age') {
            isBoxValid = boxNum.toLowerCase().startsWith('eoid-b');
          }
          if (!isBoxValid) {
            const exampleBox = expectedPrefix === 'EOIDUA' ? 'EOIDUA-B1-01' : `${expectedPrefix}-B1-01`;
            const acceptedPrefixes = effectiveRecordType === 'EOID Under_Age' ? '"EOIDUA-B" or "EOID-B"' : `"${expectedPrefix}-B"`;
            throw new Error(`Row #${i + 1} (${row.full_name || 'Unnamed'}) has an invalid Box Number "${boxNum || 'Empty'}". ${effectiveRecordType} records only accept box numbers starting with ${acceptedPrefixes} (e.g., ${exampleBox}).`);
          }
        }

        // PRE-CALCULATE MAXIMUM SEQUENTIAL ID KEY IN THE DATABASE & OFFLINE CORES
        let maxNum = 0;
        let prefix = 'PID-';
        if (effectiveRecordType === 'VISA') prefix = 'PID-VISA-';
        else if (effectiveRecordType === 'EOID') prefix = 'PID-EOID-';
        else if (effectiveRecordType === 'EOID Under_Age') prefix = 'PID-U-';
        else if (effectiveRecordType === 'Residence ID') prefix = 'PID-RES-';
        else if (effectiveRecordType === 'ETD') prefix = 'PID-ETD-';
        else if (effectiveRecordType === 'Yellow Card') prefix = 'PID-YEL-';
        else if (effectiveRecordType === 'Alien Passport') prefix = 'PID-ALN-';
        else if (effectiveRecordType === 'Eritrean ID') prefix = 'PID-ER-';

        const existingPassports = new Set<string>();
        const existingRequests = new Set<string>();
        const existingPersonalIds = new Set<string>();
        const existingEtds = new Set<string>();
        const existingEoidNumbers = new Set<string>();
        const existingLetterNumbers = new Set<string>();

        // Dynamically build select columns based on table requirements to prevent missing column crashes
        let selectCols = 'request_number, personal_id_no';
        if (activeTab !== 'Eritrean ID') {
          selectCols += ', passport_number';
        }
        if (activeTab === 'ETD') {
          selectCols += ', etd';
        }
        if (activeTab === 'EOID' || activeTab === 'EOID Under_Age') {
          selectCols += ', eoid_number, personal_id';
        }
        if (activeTab === 'Yellow Card') {
          selectCols += ', personal_id, letter_number';
        }

        // 1. Populating unique verification sets from active database records
        try {
          let dbRecords: any[] = [];
          const { data, error: dbErr } = await supabase
            .from(tableName)
            .select(selectCols);
          if (!dbErr && data) {
            dbRecords = data;
          }

          dbRecords.forEach((r: any) => {
            if (r.passport_number) {
              existingPassports.add(r.passport_number.toString().trim().toLowerCase());
            }
            if (r.request_number) {
              existingRequests.add(r.request_number.toString().trim().toLowerCase());
            }
            if (r.personal_id_no) {
              const idVal = r.personal_id_no.toString().trim();
              existingPersonalIds.add(idVal.toLowerCase());
              const match = idVal.match(/\d+/);
              if (match) {
                const num = parseInt(match[0], 10);
                if (num > maxNum) maxNum = num;
              }
            }
            if (r.personal_id) {
              existingPersonalIds.add(r.personal_id.toString().trim().toLowerCase());
            }
            if (r.etd) {
              existingEtds.add(r.etd.toString().trim().toLowerCase());
            }
            if (r.eoid_number) {
              existingEoidNumbers.add(r.eoid_number.toString().trim().toLowerCase());
            }
            if (r.letter_number) {
              existingLetterNumbers.add(r.letter_number.toString().trim().toLowerCase());
            }
          });
        } catch (e) {
          console.warn('Could not load database-level records for duplicate checklist, checking local cache instead:', e);
        }

        // 2. Load from local storage cache always (ensures offline entries are also accounted for)
        const storageKeys = ['local_records_' + effectiveRecordType.toLowerCase().replace(/[^a-z0-9_]/g, '_')];

        storageKeys.forEach(storageKey => {
          try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              parsed.forEach((r: any) => {
                if (r.passport_number) {
                  existingPassports.add(r.passport_number.toString().trim().toLowerCase());
                }
                if (r.request_number) {
                  existingRequests.add(r.request_number.toString().trim().toLowerCase());
                }
                if (r.personal_id_no) {
                  const idVal = r.personal_id_no.toString().trim();
                  existingPersonalIds.add(idVal.toLowerCase());
                  const match = idVal.match(/\d+/);
                  if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxNum) maxNum = num;
                  }
                }
                if (r.personal_id) {
                  existingPersonalIds.add(r.personal_id.toString().trim().toLowerCase());
                }
                if (r.etd) {
                  existingEtds.add(r.etd.toString().trim().toLowerCase());
                }
                if (r.eoid_number) {
                  existingEoidNumbers.add(r.eoid_number.toString().trim().toLowerCase());
                }
                if (r.letter_number) {
                  existingLetterNumbers.add(r.letter_number.toString().trim().toLowerCase());
                }
              });
            }
          } catch (storageErr) {
            console.error('Error loading offline storage cache for key ' + storageKey, storageErr);
          }
        });

        // Automatic ID sequence initiation point
        let importSeqNum = maxNum === 0 ? 100001 : maxNum + 1;

        uniqueProcessed = [];
        duplicateInDbCount = 0;
        duplicateInFileCount = 0;
        const filePassports = new Set<string>();
        const fileRequests = new Set<string>();
        const filePersonalIds = new Set<string>();
        const fileEtds = new Set<string>();
        const fileEoidNumbers = new Set<string>();
        const fileLetterNumbers = new Set<string>();

        processedData.forEach((row: any) => {
          // If row misses Personal ID No., assign the next sequential non-colliding ID immediately
          if (!row.personal_id_no) {
            let nextId = `${prefix}${importSeqNum.toString().padStart(6, '0')}`;
            while (existingPersonalIds.has(nextId.toLowerCase()) || filePersonalIds.has(nextId.toLowerCase())) {
              importSeqNum++;
              nextId = `${prefix}${importSeqNum.toString().padStart(6, '0')}`;
            }
            row.personal_id_no = nextId;
            row.personal_id = nextId;
            importSeqNum++;
          }

          const pass = row.passport_number ? row.passport_number.toString().trim() : '';
          const req = row.request_number ? row.request_number.toString().trim() : '';
          const pid = row.personal_id_no ? row.personal_id_no.toString().trim() : '';
          const pid2 = row.personal_id ? row.personal_id.toString().trim() : '';
          const etdDoc = row.etd ? row.etd.toString().trim() : '';
          const eoidNum = row.eoid_number ? row.eoid_number.toString().trim() : '';
          const letNum = row.letter_number ? row.letter_number.toString().trim() : '';
          
          const passLower = pass.toLowerCase();
          const reqLower = req.toLowerCase();
          const pidLower = pid.toLowerCase();
          const pid2Lower = pid2.toLowerCase();
          const etdLower = etdDoc.toLowerCase();
          const eoidLower = eoidNum.toLowerCase();
          const letLower = letNum.toLowerCase();

          // 1. Check if it exists in the active DB / local storage
          if (pass && existingPassports.has(passLower)) {
            duplicateInDbCount++;
            return;
          }
          if (req && existingRequests.has(reqLower)) {
            duplicateInDbCount++;
            return;
          }
          if (pid && existingPersonalIds.has(pidLower)) {
            duplicateInDbCount++;
            return;
          }
          if (pid2 && existingPersonalIds.has(pid2Lower)) {
            duplicateInDbCount++;
            return;
          }
          if (etdLower && existingEtds.has(etdLower)) {
            duplicateInDbCount++;
            return;
          }
          if (eoidLower && existingEoidNumbers.has(eoidLower)) {
            duplicateInDbCount++;
            return;
          }
          if (letLower && existingLetterNumbers.has(letLower)) {
            duplicateInDbCount++;
            return;
          }

          // 2. Check if it duplicates a row earlier in the same excel file
          if (pass && filePassports.has(passLower)) {
            duplicateInFileCount++;
            return;
          }
          if (req && fileRequests.has(reqLower)) {
            duplicateInFileCount++;
            return;
          }
          if (pid && filePersonalIds.has(pidLower)) {
            duplicateInFileCount++;
            return;
          }
          if (pid2 && filePersonalIds.has(pid2Lower)) {
            duplicateInFileCount++;
            return;
          }
          if (etdLower && fileEtds.has(etdLower)) {
            duplicateInFileCount++;
            return;
          }
          if (eoidLower && fileEoidNumbers.has(eoidLower)) {
            duplicateInFileCount++;
            return;
          }
          if (letLower && fileLetterNumbers.has(letLower)) {
            duplicateInFileCount++;
            return;
          }

          // Add to tracked sets
          if (pass) filePassports.add(passLower);
          if (req) fileRequests.add(reqLower);
          if (pid) filePersonalIds.add(pidLower);
          if (pid2) filePersonalIds.add(pid2Lower);
          if (etdLower) fileEtds.add(etdLower);
          if (eoidLower) fileEoidNumbers.add(eoidLower);
          if (letLower) fileLetterNumbers.add(letLower);

          uniqueProcessed.push(row);
        });

        if (uniqueProcessed.length === 0) {
          let errMsg = 'All rows in the Excel file are duplicates.';
          if (duplicateInDbCount > 0) errMsg += ` (${duplicateInDbCount} match existing database records)`;
          if (duplicateInFileCount > 0) errMsg += ` (${duplicateInFileCount} match other rows in the file)`;
          throw new Error(errMsg);
        }

        const { error } = await supabase.from(tableName).insert(uniqueProcessed);
        if (error) throw error;
        
        await logger.log('IMPORT', activeTab, `Imported ${uniqueProcessed.length} records via Excel (skipped ${duplicateInDbCount + duplicateInFileCount} duplicates)`);
        
        // Log imported file metadata to local storage to prevent duplicate double imports
        try {
          const importedFilesStr = localStorage.getItem('local_imported_files_log') || '[]';
          const importedFilesLog = JSON.parse(importedFilesStr);
          importedFilesLog.push({
            fileName: file.name,
            fileSize: file.size,
            importedAt: new Date().toISOString(),
            tab: activeTab,
            recordCount: uniqueProcessed.length
          });
          localStorage.setItem('local_imported_files_log', JSON.stringify(importedFilesLog));
        } catch (e) {
          console.error("Error storing imported file log:", e);
        }

        let successMsg = `Successfully imported ${uniqueProcessed.length} new document entries into ${effectiveRecordType}!`;
        if (duplicateInDbCount > 0 || duplicateInFileCount > 0) {
          successMsg += ` Skipped ${duplicateInDbCount + duplicateInFileCount} duplicates (${duplicateInDbCount} in DB, ${duplicateInFileCount} in file).`;
        }
        addToast(successMsg, 'success');
        fetchRecords();
      } catch (err: any) {
        const msg = err.message || String(err);
        const expectedTable = TABLE_MAP[effectiveRecordType] || 'eoid_records';
        if (msg.includes(expectedTable) || msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('relation')) {
          try {
            console.warn(`Excel import DB insertion failed for ${effectiveRecordType}, falling back to localStorage offline security cache:`, err);
            const storageKey = 'local_records_' + effectiveRecordType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const stored = localStorage.getItem(storageKey);
            const parsed = stored ? JSON.parse(stored) : [];
            const importPrefix = effectiveRecordType.toLowerCase().replace(/[^a-z0-9]/g, '') + '-local-';
            const fallbackProcessed = uniqueProcessed.map((row, idx) => ({
              ...row,
              id: importPrefix + Date.now().toString() + '-' + idx,
              created_at: new Date().toISOString(),
              _table: expectedTable
            }));
            const merged = [...parsed, ...fallbackProcessed];
            localStorage.setItem(storageKey, JSON.stringify(merged));
            try {
              const importedFilesStr = localStorage.getItem('local_imported_files_log') || '[]';
              const importedFilesLog = JSON.parse(importedFilesStr);
              importedFilesLog.push({
                fileName: file.name,
                fileSize: file.size,
                importedAt: new Date().toISOString(),
                tab: activeTab,
                recordCount: fallbackProcessed.length,
                is_local: true
              });
              localStorage.setItem('local_imported_files_log', JSON.stringify(importedFilesLog));
            } catch (e) {
              console.error("Error storing imported file log:", e);
            }
            let offlineSuccessMsg = `Successfully imported ${fallbackProcessed.length} new document entries into offline cache for ${activeTab}!`;
            if (duplicateInDbCount > 0 || duplicateInFileCount > 0) {
              offlineSuccessMsg += ` Skipped ${duplicateInDbCount + duplicateInFileCount} duplicates (${duplicateInDbCount} in offline, ${duplicateInFileCount} in file).`;
            }
            addToast(offlineSuccessMsg, 'success');
            setSchemaError(`Database schema out of sync: The table "${expectedTable}" is missing or uncached in Supabase. Imported data was safely recorded in local web storage. To sync, run Section #7 or #12 of "supabase_setup.sql" in your Supabase SQL Editor.`);
            fetchRecords();
            return;
          } catch (fallbackErr: any) {
            console.error("Local list import recovery failed:", fallbackErr);
            addToast('Error importing Excel file offline: ' + (fallbackErr.message || String(fallbackErr)), 'error');
            return;
          }
        }
        if ((msg.includes(expectedTable) || msg.includes('schema cache') || msg.includes('does not exist'))) {
          addToast(`Database schema out of sync: The table "${expectedTable}" is missing or uncached in Supabase. Please copy and run Section #7 or #12 of "supabase_setup.sql" in your Supabase SQL Editor and execute NOTIFY pgrst, 'reload schema'; to sync.`, 'error');
        } else {
          addToast('Error importing Excel file: ' + msg, 'error');
        }
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = (err) => {
      addToast('Error reading file: ' + err, 'error');
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const canAdd = () => {
    if (!userProfile) return false;
    const r = (userProfile.role as string || '').toLowerCase();
    if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin' || r === 'admin_grant') return true;
    
    // Check custom granular modules array for activeTab
    if (userProfile.modules && Array.isArray(userProfile.modules)) {
      const isEditorRole = r === 'editor' || r === 'airport_viewer';
      if (isEditorRole && (userProfile.modules.includes(activeTab) || userProfile.modules.includes(`${activeTab}:write`) || userProfile.modules.includes(`${activeTab}:approve`))) {
        return true;
      }
      return userProfile.modules.includes(`${activeTab}:write`);
    }
    
    return hasCreateAccess(userProfile.role, activeTab, permissionRules);
  };

  const canEdit = () => {
    if (!userProfile) return false;
    const r = (userProfile.role as string || '').toLowerCase();
    if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin' || r === 'admin_grant') return true;
    
    // Check custom granular modules array for activeTab
    if (userProfile.modules && Array.isArray(userProfile.modules)) {
      const isEditorRole = r === 'editor' || r === 'airport_viewer';
      if (isEditorRole && (userProfile.modules.includes(activeTab) || userProfile.modules.includes(`${activeTab}:write`) || userProfile.modules.includes(`${activeTab}:approve`))) {
        return true;
      }
      return userProfile.modules.includes(`${activeTab}:approve`) || userProfile.modules.includes(`${activeTab}:write`);
    }
    
    return hasUpdateAccess(userProfile.role, activeTab, permissionRules);
  };

  const filteredRecords = records.filter(r => {
    // Role-based visibility layer: non-elevated users can only view their own records
    const rRole = (userProfile?.role as string || '').toLowerCase();
    const isElevated = rRole === 'admin' || rRole === 'super_admin' || rRole === 'super-admin' || rRole === 'super admin' || rRole === 'admin_grant' || rRole === 'supervisor' || rRole === 'viewer' || rRole === 'editor';
    if (!isElevated && userProfile?.id) {
      if (r.created_by && r.created_by !== userProfile.id) {
        return false;
      }
    }

    const query = searchQuery.toLowerCase();
    const nameMatch = (r.full_name || '').toLowerCase().includes(query);
    const passportMatch = r.passport_number ? r.passport_number.toLowerCase().includes(query) : false;
    const requestMatch = (r.request_number || '').toLowerCase().includes(query);
    const shelfMatch = (r as any).shelf_number ? (r as any).shelf_number.toLowerCase().includes(query) : false;
    const personalIdMatch = (r as any).personal_id_no ? (r as any).personal_id_no.toLowerCase().includes(query) : false;
    return nameMatch || passportMatch || requestMatch || shelfMatch || personalIdMatch;
  });

  const renderRecordTable = () => {
    if (isViewer && !searchQuery.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-6 bg-[#fafbfc] rounded-2xl border border-dashed border-slate-200 text-center shadow-xs" id="viewer-restricted-lookup-card">
          <div className="w-16 h-16 rounded-full bg-slate-100/80 flex items-center justify-center mb-5 text-slate-400 border border-slate-200/30 shadow-xs">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-600 tracking-tight mb-1.5 max-w-md">
            Enter a name, passport number, or ID above to locate a specific record.
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Bulk data is restricted for security purposes.
          </p>
        </div>
      );
    }
    return (
      <RecordTable 
        loading={loading}
        records={filteredRecords}
        activeTab={activeTab as RecordType}
        canEdit={canEdit()}
        onEdit={(record) => { setEditingRecord(record); setIsFormOpen(true); }}
        onDelete={handleDelete}
      />
    );
  };

  const SidebarContent = () => {
    return (
      <div className="flex flex-col h-screen max-h-screen overflow-hidden w-full bg-white border-r border-slate-100 transition-all duration-300 font-sans" id="dashboard-sidebar-container">
        {/* Branding Area */}
        <div className={`pt-8 pb-5 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'px-3' : 'px-6'}`}>
          <EthiopianImmigrationLogo size={isSidebarCollapsed ? "sm" : "lg"} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1.5 py-4 overflow-y-auto custom-sidebar-scrollbar min-h-0 text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key="main-sidebar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              {(() => {
                const renderedItems: React.ReactNode[] = [];

                tabs.forEach((tab) => {
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
                });

                return renderedItems;
              })()}
            </motion.div>
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
            {!isSidebarCollapsed && <span>Log Out</span>}
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
        accept=".xls,.xlsx" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleImportExcel} 
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
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
               <div className="mb-8 md:mb-10">
                {['VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'Yellow Card', 'Eritrean ID', 'Alien Passport'].includes(activeTab) ? (
                  <div className="space-y-6">
                    {/* FSD Division style heading row */}
                    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 ${currentTheme.border} pl-5 py-1`}>
                      <div className="text-left">
                         <h1 className="text-2xl md:text-3xl font-semibold text-slate-700 tracking-tight leading-tight flex flex-wrap items-center gap-2.5">
                          {isViewer ? 'Record Lookup' : (
                            activeTab === 'VISA' ? 'VISA Records' : 
                            activeTab === 'EOID' ? 'Ethiopian Origin ID File' : 
                            activeTab === 'EOID Under_Age' ? 'Ethiopian Origin ID Under-Age' : 
                            activeTab === 'Residence ID' ? 'Residence ID Records' : 
                            activeTab === 'ETD' ? 'ETD Records' : 
                            activeTab === 'Yellow Card' ? 'Yellow Card Records' : 
                            activeTab === 'Eritrean ID' ? 'Eritrean ID Records' :
                            activeTab === 'Alien Passport' ? 'Alien Passport Records' : activeTab
                          )}
                        </h1>
                        <p className="text-slate-400 text-xs font-semibold tracking-wide mt-1.5 uppercase text-slate-500">
                          {isViewer ? (
                            `${records.length} record${records.length === 1 ? '' : 's'} stored — search to locate and manage individual entries.`
                          ) : (
                            activeTab === 'VISA' ? 'SOURCE: - FSD Division Data structuring' : 
                            activeTab === 'EOID' ? 'Source: - FSD Division Data structuring' : 
                            activeTab === 'EOID Under_Age' ? 'SOURCE: - Unified National ID Verification Feeds (Minor Applications)' : 
                            activeTab === 'Residence ID' ? 'SOURCE: - Permanent ID verification records' : 
                            activeTab === 'ETD' ? 'SOURCE: - Non-resident exception travels' : 
                            activeTab === 'Eritrean ID' ? 'SOURCE: - ERITREAN ORIGIN ID REGISTRY' :
                            activeTab === 'Alien Passport' ? 'SOURCE: - ALIEN PASSPORT RECEPTACLE DATA' :
                            'SOURCE: - DIASPORA REGISTRATION HUB'
                          )}
                        </p>
                        {activeTab === 'EOID' && (
                          <div className="flex items-center gap-3 mt-4" id="eoid-type-selector-wrapper">
                            <span className="text-slate-600 font-bold text-[13px] md:text-sm tracking-tight">EOID Type:</span>
                            <div className="relative inline-block">
                              <select
                                id="eoid-type-selector-input"
                                value={eoidSubtype}
                                onChange={(e) => setEoidSubtype(e.target.value as 'normal' | 'underage')}
                                className="appearance-none bg-[#232c3f] hover:bg-[#2d3950] text-white font-bold py-2 pl-4 pr-10 rounded-xl text-[12px] md:text-xs cursor-pointer outline-none border-none shadow-md transition-all duration-200"
                              >
                                <option value="normal" className="bg-[#232c3f]">Normal EOID File</option>
                                <option value="underage" className="bg-[#232c3f]">Under-Age EOID File</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-white">
                                <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
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
                        {!isViewer && (
                          <button 
                            onClick={exportToExcel}
                            disabled={records.length === 0}
                            className="flex items-center gap-2 px-4.5 py-2.5 bg-[#f4f7f5] hover:bg-[#e2ede6] text-slate-600 disabled:opacity-50 border border-slate-200/50 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none"
                          >
                            <FileOutput className="w-4 h-4 text-slate-400" />
                            <span>Export Excel</span>
                          </button>
                        )}
                        {canAdd() && (
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4.5 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none"
                          >
                            <FileInput className="w-4 h-4 text-slate-400" />
                            <span>Import Excel</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Integrated custom search bar */}
                    <div className="relative w-full group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors" />
                      <input 
                        type="text"
                        placeholder={isViewer ? "Search by Full Name, Passport No., Personal ID, Box Number..." : "Filter this division by Box, Name, Passport or Request Number..."}
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 focus:bg-white focus:ring-4 focus:ring-slate-500/5 focus:border-slate-400 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  activeTab !== 'SEARCH' && activeTab !== 'OVERVIEW' && activeTab !== 'REPORTS' && activeTab !== 'AUDIT' ? (
                    <div className="text-left">
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                        {activeTab}
                      </h1>
                      <p className="text-slate-500 text-sm md:text-base font-medium">
                        {`Manage and process ${activeTab.toLowerCase()} system registry entries.`}
                      </p>
                    </div>
                  ) : null
                )}
              </div>

              {schemaError && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-800 text-xs md:text-sm shadow-sm flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-bold block mb-1">Database Schema Warning</span>
                    <span className="font-medium leading-relaxed">{schemaError}</span>
                  </div>
                </div>
              )}

              <Routes>
                <Route path="/" element={<DashboardReports userProfile={userProfile} />} />
                <Route path="/search" element={
                  <AdvancedSearch 
                    userProfile={userProfile} 
                    onEditRecord={(record) => {
                      setEditingRecord(record);
                      setIsFormOpen(true);
                    }}
                    onDeleteRecord={handleDelete}
                    refreshCounter={refreshCounter}
                  />
                } />
                <Route path="/audit" element={hasAccess('AUDIT') ? <AuditLogView /> : <Navigate to="/" replace />} />
                <Route path="/reports" element={hasAccess('REPORTS') ? <ReportingSystem userProfile={userProfile} /> : <Navigate to="/" replace />} />
                <Route path="/users" element={hasAccess('USERS') ? <UserManagement currentUserProfile={userProfile} onProfileUpdate={onProfileUpdate} /> : <Navigate to="/" replace />} />
                 <Route path="/yellow-card" element={
                  hasAccess('Yellow Card') ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      {renderRecordTable()}
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/visa" element={
                  hasAccess('VISA') ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      {renderRecordTable()}
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/eoid" element={
                  hasAccess('EOID') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      {renderRecordTable()}
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/eoid-under_age" element={
                  hasAccess('EOID Under_Age') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      {renderRecordTable()}
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/residence-id" element={
                  hasAccess('Residence ID') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      {renderRecordTable()}
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/etd" element={
                  hasAccess('ETD') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      {renderRecordTable()}
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/eritrean-id" element={
                  hasAccess('Eritrean ID') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      {renderRecordTable()}
                    </div>
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/alien-passport" element={
                  hasAccess('Alien Passport') ? (
                     <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      {renderRecordTable()}
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
            type={(() => {
              if (editingRecord) {
                const isEoid = (editingRecord as any)._table === 'eoid_records' || (editingRecord as any)._table === 'eoid_underage_records';
                if (isEoid) {
                  return (editingRecord as any).under_age ? 'EOID Under_Age' : 'EOID';
                }
                return REVERSE_TABLE_MAP[(editingRecord as any)._table] || (activeTab as RecordType);
              }
              return (activeTab === 'OVERVIEW' || activeTab === 'AUDIT' || activeTab === 'REPORTS' 
                ? 'VISA' 
                : (activeTab === 'EOID' ? (eoidSubtype === 'underage' ? 'EOID Under_Age' : 'EOID') : activeTab as RecordType));
            })()}
            record={editingRecord}
            onSuccess={(record) => {
              setIsFormOpen(false);
              setRefreshCounter(prev => prev + 1);
              if (activeTab === 'Yellow Card' && record.passport_number) {
                setSearchQuery(record.request_number || record.passport_number);
              }
              if ((record as any)._isOffline) {
                const offError = String((record as any)._offlineError || '');
                const isRLS = offError.toLowerCase().includes('row-level security') || offError.toLowerCase().includes('violates');
                if (isRLS) {
                  addToast(
                    `Database Permission Missing: The record was saved to local browser cache, but the live insert failed due to Row-Level Security (RLS) on table "${(record as any)._table}". To authorize writes, copy & run Section #5 ("Policies for Records") of your "supabase_setup.sql" file in your Supabase SQL Editor and notify schemas.`, 
                    'error'
                  );
                } else {
                  addToast(`Record Offline Fallback: Saved ${record.full_name} to local browser cache, but database insert failed: ${(record as any)._offlineError}`, 'error');
                }
              } else {
                addToast(`Record for ${record.full_name} was successfully saved!`, 'success');
              }
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
