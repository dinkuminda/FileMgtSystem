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
  
  const allTabs: { type: RecordType | 'OVERVIEW' | 'AUDIT' | 'REPORTS' | 'USERS' | 'CABINETS'; icon: any; label: string }[] = [
    { type: 'OVERVIEW', icon: LayoutDashboard, label: 'Dashboard' },
    { type: 'Eritrean ID', icon: Plane, label: 'Eritrean ID' },
    { type: 'VISA', icon: FileText, label: 'VISA Records' },
    { type: 'EOID', icon: Fingerprint, label: 'Ethiopian Origin ID' },
    { type: 'Alien Passport', icon: CreditCard, label: 'Alien Passport' },
    { type: 'Residence ID', icon: CreditCard, label: 'Residence ID' },
    { type: 'ETD', icon: MapPin, label: 'Emergency Travel Document' },
    { type: 'Yellow Card', icon: Shield, label: 'Yellow Card' },
    { type: 'CABINETS', icon: Archive, label: 'Physical Cabinets' },
    { type: 'USERS', icon: Users, label: 'User Management' },
    { type: 'REPORTS', icon: BarChart3, label: 'System Reports' },
    { type: 'AUDIT', icon: Activity, label: 'System Audit' },
  ];

  // Map path to tab type
  const pathParts = location.pathname.split('/').filter(p => p);
  const currentPath = pathParts[0]?.toLowerCase() || '';

  const matchingTab = allTabs.find(tab => {
    const slug = tab.type === 'OVERVIEW' ? '' : tab.type.toLowerCase().replace(' ', '-');
    return slug === currentPath;
  });
  const activeTab = matchingTab?.type || 'OVERVIEW';

  const tabs = allTabs.filter(tab => {
    if (!userProfile) return false;
    
    // Admins should always see everything
    const r = (userProfile.role as string || '').toLowerCase();
    if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin' || r === 'admin_grant') return true;

    // Command Deck (Overview) is the baseline landing page for everyone
    if (tab.type === 'OVERVIEW') return true;

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
    if (r === 'airport_staff' || r === 'airport_viewer' || r === 'staff' || r === 'supervisor') {
      return tab.type === 'Yellow Card';
    }

    // Regular staff (or other roles) with no configured modules array get ONLY the Overview baseline.
    return false;
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
    setSchemaError(null);
    
    try {
      if (activeTab === 'EOID') {
        const [eoidRes, underageRes] = await Promise.all([
          supabase.from('eoid_records').select('*').order('created_at', { ascending: false }),
          supabase.from('eoid_underage_records').select('*').order('created_at', { ascending: false })
        ]);

        if (eoidRes.error) throw eoidRes.error;
        if (underageRes.error) throw underageRes.error;

        const combined = [
          ...(eoidRes.data || []).map(r => ({ ...r, _table: 'eoid_records', under_age: r.under_age ?? false })),
          ...(underageRes.data || []).map(r => ({ ...r, _table: 'eoid_underage_records', under_age: r.under_age ?? true }))
        ];

        combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setRecords(combined as ImmigrationRecord[]);
      } else {
        const tableName = TABLE_MAP[activeTab as RecordType];
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setRecords((data || []).map(r => ({ ...r, _table: tableName })) as ImmigrationRecord[]);
        } else {
          throw error || new Error("Failed to load");
        }
      }
    } catch (e: any) {
      console.warn(`Error or missing table on fetching ${activeTab} records, applying fallback:`, e?.message || e);
      const msg = e?.message || String(e);
      if (msg.includes('schema cache') || msg.includes('does not exist')) {
        const expectedTable = TABLE_MAP[activeTab as RecordType] || 'eoid_records';
        setSchemaError(`Database schema out of sync: The table "${expectedTable}" is missing or uncached in Supabase. Please copy and run Section #7 or #12 of "supabase_setup.sql" in your Supabase SQL Editor and execute NOTIFY pgrst, 'reload schema'; to sync.`);
      } else {
        setSchemaError(null);
      }
      
      if (activeTab === 'EOID') {
        const storedNormal = localStorage.getItem('local_records_eoid') || '[]';
        const storedUnderage = localStorage.getItem('local_records_eoid_under_age') || '[]';
        
        let valNormal = JSON.parse(storedNormal);
        let valUnderage = JSON.parse(storedUnderage);
        if (valUnderage.length === 0 && !localStorage.getItem('local_records_eoid_under_age')) {
          valUnderage = DEFAULT_EOID_UNDERAGE_MOCKS;
          localStorage.setItem('local_records_eoid_under_age', JSON.stringify(DEFAULT_EOID_UNDERAGE_MOCKS));
        }

        const combinedLocal = [
          ...valNormal.map((r: any) => ({ ...r, under_age: r.under_age ?? false, _table: 'eoid_records' })),
          ...valUnderage.map((r: any) => ({ ...r, under_age: r.under_age ?? true, _table: 'eoid_underage_records' }))
        ];
        combinedLocal.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setRecords(combinedLocal);
      } else {
        setRecords([]);
      }
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
        if (activeTab === 'EOID') {
          const isUnderAge = (record as any)?.under_age;
          const storageKey = isUnderAge ? 'local_records_eoid_under_age' : 'local_records_eoid';
          console.warn("Delete DB error, performing local delete for EOID", dbErr);
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as ImmigrationRecord[];
            const updated = parsed.filter(r => r.id !== id);
            localStorage.setItem(storageKey, JSON.stringify(updated));
          }
        } else {
          throw dbErr;
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
    
    // Convert JSON records to an Excel Worksheet
    const worksheet = XLSX.utils.json_to_sheet(records);
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
    const reader = new FileReader();
    reader.onload = async (evt) => {
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
          const common = [
            'box_number', 'full_name', 'sex', 'citizenship', 
            'passport_number', 'request_number', 'date', 
            'service_provided', 'created_by', 'attachment_url'
          ];
          
          if (tab === 'VISA') {
            return [...common, 'personal_file_no'];
          }
          if (tab === 'EOID') {
            return [...common, 'eoid_number', 'personal_file_no', 'personal_id', 'eoid_type', 'under_age'];
          }
          if (tab === 'EOID Under_Age') {
            return [...common, 'eoid_number', 'personal_file_no', 'personal_id', 'eoid_type', 'dob', 'under_age'];
          }
          if (tab === 'Alien Passport') {
            return [...common, 'personal_file_no'];
          }
          if (tab === 'Yellow Card' || tab === 'Eritrean ID') {
            return [...common, 'personal_file_no', 'personal_id', 'eoid_type', 'letter_number', 'document_type'];
          }
          if (tab === 'Residence ID') {
            return [...common, 'personal_file_no', 'id_type'];
          }
          if (tab === 'ETD') {
            return [...common, 'personal_file_no', 'etd'];
          }
          return common;
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
          if (['personal_file_no', 'personal_file_number', 'personal_file', 'fileno', 'file_no'].includes(normalized)) {
            return 'personal_file_no';
          }
          if (['personal_id', 'personal_id_no', 'personal_id_number', 'id_number', 'id_no', 'idno'].includes(normalized)) {
            return 'personal_id';
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

          return {
            ...cleanRow,
            created_by: user.id
          };
        }).filter((row: any) => row.full_name);

        if (processedData.length === 0) {
          throw new Error('No valid rows containing a "full_name" (or equivalent name column) were found.');
        }

        // Validate Box Number format for VISA records during excel imports
        if (activeTab === 'VISA') {
          for (let i = 0; i < processedData.length; i++) {
            const row = processedData[i];
            const boxNum = (row.box_number || '').toString().trim();
            if (!boxNum.toLowerCase().startsWith('visa-')) {
              throw new Error(`Row #${i + 1} (${row.full_name || 'Unnamed'}) has an invalid Box Number "${boxNum || 'Empty'}". Visa records only accept box numbers starting with "Visa-" (e.g., Visa-000001).`);
            }
          }
        }

        const tableName = TABLE_MAP[activeTab as RecordType];

        // Fetch existing records for duplicate check checking passport_number and request_number
        const existingPassports = new Set<string>();
        const existingRequests = new Set<string>();
        try {
          if (activeTab === 'EOID') {
            const [normalDb, underageDb] = await Promise.all([
              supabase.from('eoid_records').select('passport_number, request_number'),
              supabase.from('eoid_underage_records').select('passport_number, request_number')
            ]);
            
            const dbRecords = [
              ...(normalDb.data || []),
              ...(underageDb.data || [])
            ];
            dbRecords.forEach((r: any) => {
              if (r.passport_number) {
                existingPassports.add(r.passport_number.toString().trim().toLowerCase());
              }
              if (r.request_number) {
                existingRequests.add(r.request_number.toString().trim().toLowerCase());
              }
            });
          } else {
            const { data: dbRecords, error: dbErr } = await supabase
              .from(tableName)
              .select('passport_number, request_number');
            if (!dbErr && dbRecords) {
              dbRecords.forEach((r: any) => {
                if (r.passport_number) {
                  existingPassports.add(r.passport_number.toString().trim().toLowerCase());
                }
                if (r.request_number) {
                  existingRequests.add(r.request_number.toString().trim().toLowerCase());
                }
              });
            }
          }
        } catch (e) {
          console.warn('Could not load existing records for duplicate checks, using file-level checks:', e);
        }

        const uniqueProcessed: any[] = [];
        let duplicateInDbCount = 0;
        let duplicateInFileCount = 0;
        const filePassports = new Set<string>();
        const fileRequests = new Set<string>();

        processedData.forEach((row: any) => {
          const pass = row.passport_number ? row.passport_number.toString().trim() : '';
          const req = row.request_number ? row.request_number.toString().trim() : '';
          
          const passLower = pass.toLowerCase();
          const reqLower = req.toLowerCase();

          // 1. Check if it exists in the active DB
          if (pass && existingPassports.has(passLower)) {
            duplicateInDbCount++;
            return;
          }
          if (req && existingRequests.has(reqLower)) {
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

          // Add to tracked sets
          if (pass) filePassports.add(passLower);
          if (req) fileRequests.add(reqLower);

          uniqueProcessed.push(row);
        });

        if (uniqueProcessed.length === 0) {
          let errMsg = 'All rows in the Excel file are duplicates.';
          if (duplicateInDbCount > 0) errMsg += ` (${duplicateInDbCount} match existing database records)`;
          if (duplicateInFileCount > 0) errMsg += ` (${duplicateInFileCount} match other rows in the file)`;
          throw new Error(errMsg);
        }

        if (activeTab === 'EOID') {
          const normalRows = uniqueProcessed.filter(row => !row.under_age);
          const underageRows = uniqueProcessed.filter(row => !!row.under_age);

          const promises = [];
          if (normalRows.length > 0) {
            const cleanedNormal = normalRows.map(({ dob, ...r }) => r);
            promises.push(supabase.from('eoid_records').insert(cleanedNormal));
          }
          if (underageRows.length > 0) {
            promises.push(supabase.from('eoid_underage_records').insert(underageRows));
          }

          const results = await Promise.all(promises);
          const firstErr = results.find(res => res.error);
          if (firstErr) throw firstErr.error;
        } else {
          const { error } = await supabase.from(tableName).insert(uniqueProcessed);
          if (error) throw error;
        }
        
        await logger.log('IMPORT', activeTab, `Imported ${uniqueProcessed.length} records via Excel (skipped ${duplicateInDbCount + duplicateInFileCount} duplicates)`);
        
        let successMsg = `Successfully imported ${uniqueProcessed.length} new document entries into ${activeTab}!`;
        if (duplicateInDbCount > 0 || duplicateInFileCount > 0) {
          successMsg += ` Skipped ${duplicateInDbCount + duplicateInFileCount} duplicates (${duplicateInDbCount} in DB, ${duplicateInFileCount} in file).`;
        }
        addToast(successMsg, 'success');
        fetchRecords();
      } catch (err: any) {
        const msg = err.message || String(err);
        const expectedTable = TABLE_MAP[activeTab as RecordType] || 'eoid_records';
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
    return (
      <div className="flex flex-col h-screen max-h-screen overflow-hidden w-full bg-white border-r border-slate-100 transition-all duration-300 font-sans" id="dashboard-sidebar-container">
        {/* Branding Area */}
        <div className={`pt-8 pb-5 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'px-3' : 'px-6'}`}>
          <EthiopianImmigrationLogo size={isSidebarCollapsed ? "sm" : "lg"} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1.5 py-4 overflow-y-auto scrollbar-hide min-h-0 text-left">
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

      {/* FAB */}
      {canAdd() && ['VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'Yellow Card', 'Eritrean ID', 'Alien Passport'].includes(activeTab) && (
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
                          {activeTab === 'VISA' ? 'VISA Records' : 
                           activeTab === 'EOID' ? 'Ethiopian Origin ID' : 
                           activeTab === 'Residence ID' ? 'Residence ID Records' : 
                           activeTab === 'ETD' ? 'ETD Records' : 
                           activeTab === 'Yellow Card' ? 'Yellow Card Records' : 
                           activeTab === 'Eritrean ID' ? 'Eritrean ID Records' :
                           activeTab === 'Alien Passport' ? 'Alien Passport Records' : activeTab}
                        </h1>
                        <p className="text-slate-400 text-xs font-extrabold tracking-wider mt-1.5 uppercase">
                          {activeTab === 'VISA' ? 'SOURCE: - FSD Division Data structuring' : 
                           activeTab === 'EOID' ? 'SOURCE: - Unified National ID Verification Feeds' : 
                           activeTab === 'Residence ID' ? 'SOURCE: - Permanent ID verification records' : 
                           activeTab === 'ETD' ? 'SOURCE: - Non-resident exception travels' : 
                           activeTab === 'Eritrean ID' ? 'SOURCE: - ERITREAN ORIGIN ID REGISTRY' :
                           activeTab === 'Alien Passport' ? 'SOURCE: - ALIEN PASSPORT RECEPTACLE DATA' :
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
                          onClick={exportToExcel}
                          disabled={records.length === 0}
                          className="flex items-center gap-2 px-4.5 py-2.5 bg-[#f4f7f5] hover:bg-[#e2ede6] text-slate-600 disabled:opacity-50 border border-slate-200/50 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none"
                        >
                          <FileOutput className="w-4 h-4 text-slate-400" />
                          <span>Export Excel</span>
                        </button>
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
                        {activeTab === 'OVERVIEW' ? 'Overview' : activeTab}
                      </h1>
                      <p className="text-slate-500 text-sm md:text-base font-medium">
                        {activeTab === 'OVERVIEW' ? 'Monitoring organizational resources and performance analytics.' : 
                         `Manage and process ${activeTab.toLowerCase()} system registry entries.`}
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
                <Route path="/cabinets" element={hasAccess('CABINETS') ? <CabinetsView userProfile={userProfile} /> : <Navigate to="/" replace />} />
                <Route path="/audit" element={hasAccess('AUDIT') ? <AuditLogView /> : <Navigate to="/" replace />} />
                <Route path="/reports" element={hasAccess('REPORTS') ? <ReportingSystem /> : <Navigate to="/" replace />} />
                <Route path="/users" element={hasAccess('USERS') ? <UserManagement currentUserProfile={userProfile} onProfileUpdate={onProfileUpdate} /> : <Navigate to="/" replace />} />
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
                  (hasAccess('EOID') || hasAccess('EOID Under_Age')) ? (
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
                <Route path="/eoid-under_age" element={<Navigate to="/eoid" replace />} />
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
                <Route path="/eritrean-id" element={
                  hasAccess('Eritrean ID') ? (
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
                <Route path="/alien-passport" element={
                  hasAccess('Alien Passport') ? (
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
              if (activeTab === 'Yellow Card' && record.passport_number) {
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
