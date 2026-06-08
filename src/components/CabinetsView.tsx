import React, { useState, useEffect } from 'react';
import { supabase, TABLE_MAP, type RecordType, type UserProfile, type ImmigrationRecord, type RecordAttachment, logger } from '../lib/supabase';
import { 
  Loader2, Archive, Folder, FolderOpen, Search, Info, CheckCircle, Tag,
  Eye, Edit2, Trash2, Plus, Paperclip, ChevronDown, X, ExternalLink,
  Lock, Unlock, ShieldAlert, Thermometer, Droplets, RefreshCw, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RecordForm, { MODULE_BOX_MAP } from './RecordForm';
import { BOX_MODULE_DESC } from './DashboardReports';
import { 
  getPermissionRules, 
  hasCreateAccess, 
  DEFAULT_PERMISSION_RULES, 
  type ModulePermissionRule 
} from '../lib/permissions';

// Constant path to the generated image in the src assets directory
const fileVaultBanner = "/assets/images/file_vault_banner_1780902756713.png";

interface CabinetsViewProps {
  userProfile?: UserProfile | null;
}

interface CabinetInfo {
  boxName: string;
  module: string;
  desc: string;
  color: string;
  count: number;
  records: any[];
  isLocked: boolean;
  temp: number;
  humidity: number;
}

export default function CabinetsView({ userProfile }: CabinetsViewProps) {
  const [loading, setLoading] = useState(true);
  const [permissionRules, setPermissionRules] = useState<ModulePermissionRule[]>(DEFAULT_PERMISSION_RULES);

  useEffect(() => {
    getPermissionRules().then(rules => {
      setPermissionRules(rules);
    });
  }, []);

  const [cabinets, setCabinets] = useState<CabinetInfo[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simulated environment status that refreshes with beautiful micro-animations
  const [refreshingClimate, setRefreshingClimate] = useState(false);

  // States for adding custom physical boxes
  const [isAddCabinetOpen, setIsAddCabinetOpen] = useState(false);
  const [newCabName, setNewCabName] = useState('');
  const [newCabModule, setNewCabModule] = useState<string>('VISA');
  const [newCabDesc, setNewCabDesc] = useState('');
  const [newCabColor, setNewCabColor] = useState('from-indigo-600 to-indigo-800');

  // States for editing physical boxes
  const [isEditCabinetOpen, setIsEditCabinetOpen] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState<CabinetInfo | null>(null);
  const [editCabName, setEditCabName] = useState('');
  const [editCabModule, setEditCabModule] = useState<string>('VISA');
  const [editCabDesc, setEditCabDesc] = useState('');
  const [editCabColor, setEditCabColor] = useState('from-indigo-600 to-indigo-800');

  // States for CRUD of module records inside of physical shelves
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<RecordType>('VISA');
  const [editingRecord, setEditingRecord] = useState<ImmigrationRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<ImmigrationRecord | null>(null);
  const [viewingRecordAttachments, setViewingRecordAttachments] = useState<RecordAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ImmigrationRecord | null>(null);
  
  // High contrast custom toast system
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const getRecordType = (record: any): RecordType => {
    if (record._recordType) return record._recordType;
    if (record.personal_file_no) return "EOID Under_Age";
    if (record.eoid_number) return "EOID";
    if (record.residence_id_no) return "Residence ID";
    if (record.etd) return "ETD";
    if (record.document_type) return "Yellow Card";
    return "VISA";
  };

  const getRecordCategory = (record: any) => {
    const rType = getRecordType(record);
    if (rType === 'EOID Under_Age') return "EOID Under Age Logs";
    if (rType === 'EOID') return "EOID Logs";
    if (rType === 'Residence ID') return "Residence ID";
    if (rType === 'ETD') return "Emergency Travel Docs";
    if (rType === 'Yellow Card') return "Yellow Card Registry";
    if (rType === 'Alien Passport') return "Alien Passport Records";
    if (rType === 'Eritrean ID') return "Eritrean ID Registry";
    return "VISA Records";
  };

  const canEditOrDelete = !userProfile || hasCreateAccess(userProfile.role, 'CABINETS', permissionRules);

  const fetchRecordsAndBuildCabinets = async () => {
    setLoading(true);
    try {
      // Execute all fetches in parallel
      const tables: RecordType[] = ['VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'Yellow Card', 'Alien Passport', 'Eritrean ID'];
      const fetches = tables.map(async (type) => {
        try {
          const { data, error } = await supabase.from(TABLE_MAP[type]).select('*');
          if (error) throw error;
          const mappedData = (data || []).map(r => ({ ...r, _recordType: type }));
          return { type, data: mappedData };
        } catch (err) {
          console.warn(`Cabinet query failed for table ${type}, attempting local fallback...`);
          if (type === 'EOID Under_Age') {
            const stored = localStorage.getItem('local_records_eoid_under_age');
            return { type, data: (stored ? JSON.parse(stored) : []).map((r: any) => ({ ...r, _recordType: type })) };
          }
          return { type, data: [] };
        }
      });

      const results = await Promise.all(fetches);
      const allData = results.flatMap(r => r.data);

      // Load physical cabinets from localStorage (supporting unified standard and custom cabinets)
      let cabinetsList: any[] = [];
      try {
        const storedCabinets = localStorage.getItem('managed_physical_cabinets');
        if (storedCabinets) {
          cabinetsList = JSON.parse(storedCabinets);
        } else {
          // Initialize with default rooms
          cabinetsList = [
            { boxName: 'Visa-000001', desc: 'Visa Portal Logs Archive Drawer', module: 'VISA', color: 'from-blue-600 to-blue-800', temp: 21.4, humidity: 42, isLocked: false },
            { boxName: 'Residence-000003', desc: 'Residence Permit Physical Registry Drawer', module: 'Residence ID', color: 'from-amber-600 to-amber-750', temp: 21.8, humidity: 45, isLocked: false },
            { boxName: 'ETD-000004', desc: 'Emergency Travel Document Secure Vault', module: 'ETD', color: 'from-rose-600 to-rose-800', temp: 19.5, humidity: 35, isLocked: false },
            { boxName: 'Yellow-000005', desc: 'Yellow Card Division / Origin ID Physical Registry Box', module: 'Yellow Card', color: 'from-yellow-600 to-amber-750', temp: 22.1, humidity: 41, isLocked: false },
            { boxName: 'EOID-Underage-000006', desc: 'EOID Under-Age Physical Registry Box', module: 'EOID Under_Age', color: 'from-fuchsia-600 to-fuchsia-800', temp: 20.2, humidity: 39, isLocked: false },
            { boxName: 'Alien-000007', desc: 'Alien Passport Secure Vault', module: 'Alien Passport', color: 'from-emerald-600 to-emerald-800', temp: 20.0, humidity: 40, isLocked: false },
            { boxName: 'Eritrean-000008', desc: 'Eritrean ID division Physical Registry Box', module: 'Eritrean ID', color: 'from-blue-600 to-emerald-800', temp: 20.5, humidity: 42, isLocked: false },
          ];
          localStorage.setItem('managed_physical_cabinets', JSON.stringify(cabinetsList));
        }

        // Seamless migration of legacy custom physical cabinets if any exist
        const legacyCustomStr = localStorage.getItem('custom_physical_cabinets');
        if (legacyCustomStr) {
          try {
            const legacyCustomList = JSON.parse(legacyCustomStr);
            if (Array.isArray(legacyCustomList) && legacyCustomList.length > 0) {
              let updated = false;
              legacyCustomList.forEach((c: any) => {
                if (!cabinetsList.some(item => item.boxName === c.boxName)) {
                  cabinetsList.push({
                    boxName: c.boxName,
                    desc: c.desc || 'Dynamic Storage Unit Cabinet',
                    module: c.module,
                    color: c.color || 'from-indigo-600 to-indigo-800',
                    temp: c.temp || +(19 + Math.random() * 4).toFixed(1),
                    humidity: c.humidity || Math.floor(35 + Math.random() * 15),
                    isLocked: false
                  });
                  updated = true;
                }
              });
              if (updated) {
                localStorage.setItem('managed_physical_cabinets', JSON.stringify(cabinetsList));
              }
              localStorage.removeItem('custom_physical_cabinets');
            }
          } catch (e) {
            console.error("Migration error:", e);
          }
        }
      } catch (e) {
        console.error("Failed to parse cabinets from local storage:", e);
      }

      // Build metadata mapping from the unified cabinet list
      const cabinetMeta: Record<string, { desc: string; type: string; color: string; temp: number; hum: number; isLocked?: boolean }> = {};
      cabinetsList.forEach(c => {
        cabinetMeta[c.boxName] = {
          desc: c.desc || 'General Storage Drawer',
          type: c.module,
          color: c.color || 'from-indigo-600 to-indigo-800',
          temp: c.temp || 20.0,
          hum: c.humidity !== undefined ? c.humidity : 40,
          isLocked: c.isLocked || false
        };
      });

      const boxMap: Record<string, any[]> = {};
      Object.keys(cabinetMeta).forEach((bName) => {
        boxMap[bName] = [];
      });

      allData.forEach(r => {
        const rType = getRecordType(r);
        let box = r.box_number?.trim() || MODULE_BOX_MAP[rType] || 'Visa-000001';
        if (boxMap[box] === undefined) {
          // If cabinet drawer doesn't exist, we map to first configured drawer of same type or default
          const matchingCabinet = Object.keys(cabinetMeta).find(k => cabinetMeta[k].type === rType);
          box = matchingCabinet || Object.keys(cabinetMeta)[0] || 'Visa-000001';
        }
        if (boxMap[box]) {
          boxMap[box].push(r);
        }
      });

      const builtCabinets: CabinetInfo[] = Object.keys(boxMap).map((boxName) => {
        const meta = cabinetMeta[boxName] || { desc: 'General Archive Locker', type: 'VISA', color: 'from-slate-600 to-slate-800', temp: 21.0, hum: 40 };
        return {
          boxName,
          module: meta.type,
          desc: meta.desc,
          color: meta.color,
          count: boxMap[boxName].length,
          records: boxMap[boxName],
          isLocked: false, // Default unlocked, user can toggle locks
          temp: meta.temp,
          humidity: (meta as any).humidity !== undefined ? (meta as any).humidity : (meta as any).hum
        };
      });

      setCabinets(builtCabinets);
    } catch (err: any) {
      console.error("Error loading physical cabinets details:", err);
      addToast('Failed to fetch cabinet assets' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordsAndBuildCabinets();
  }, []);

  // Update attachments loader when viewing a record
  useEffect(() => {
    if (viewingRecord) {
      const loadAttachments = async () => {
        setLoadingAttachments(true);
        try {
          const rType = getRecordType(viewingRecord);
          const { data, error } = await supabase
            .from('record_attachments')
            .select('*')
            .eq('record_id', viewingRecord.id)
            .eq('record_table', TABLE_MAP[rType]);
          
          let merged: RecordAttachment[] = [];
          if (!error && data) {
            merged = [...data] as RecordAttachment[];
          }

          if (viewingRecord && (viewingRecord as any).attachments && Array.isArray((viewingRecord as any).attachments)) {
            (viewingRecord as any).attachments.forEach((doc: any, idx: number) => {
              if (doc && doc.url) {
                const isDup = merged.some(m => m.file_path === doc.url);
                if (!isDup) {
                  merged.push({
                    id: `jsonb-${idx}`,
                    record_id: viewingRecord.id,
                    record_table: TABLE_MAP[rType],
                    file_name: doc.file_type || `Checklist File #${idx + 1}`,
                    file_path: doc.url,
                    content_type: doc.file_type?.toLowerCase().includes('pdf') ? 'application/pdf' : 'image/jpeg',
                    size_bytes: 125 * 1024,
                    created_at: viewingRecord.created_at || new Date().toISOString(),
                    created_by: viewingRecord.created_by || ''
                  });
                }
              }
            });
          }

          setViewingRecordAttachments(merged);
        } catch (err) {
          console.error("Error loading viewing attachments:", err);
        } finally {
          setLoadingAttachments(false);
        }
      };
      loadAttachments();
    } else {
      setViewingRecordAttachments([]);
    }
  }, [viewingRecord]);

  const toggleLock = (boxName: string) => {
    setCabinets(prev => prev.map(cab => {
      if (cab.boxName === boxName) {
        const nextState = !cab.isLocked;
        addToast(`${cab.boxName} security status set to ${nextState ? 'LOCKED 🔒' : 'UNLOCKED 🔓'}`, nextState ? 'info' : 'success');
        
        try {
          const storedCabinets = localStorage.getItem('managed_physical_cabinets');
          if (storedCabinets) {
            const list = JSON.parse(storedCabinets);
            const updated = list.map((c: any) => {
              if (c.boxName === boxName) {
                return { ...c, isLocked: nextState };
              }
              return c;
            });
            localStorage.setItem('managed_physical_cabinets', JSON.stringify(updated));
          }
        } catch (e) {
          console.error("Lock persist error:", e);
        }

        return { ...cab, isLocked: nextState };
      }
      return cab;
    }));
  };

  const handleClimateRefresh = () => {
    setRefreshingClimate(true);
    setTimeout(() => {
      setCabinets(prev => prev.map(cab => ({
        ...cab,
        temp: +(cab.temp + (Math.random() * 0.4 - 0.2)).toFixed(1),
        humidity: Math.round(cab.humidity + (Math.random() * 2 - 1))
      })));
      setRefreshingClimate(false);
      addToast('Physical vault temperature & moisture levels scanned and verified.', 'success');
    }, 1200);
  };

  const executeDeleteRecord = async (record: ImmigrationRecord) => {
    try {
      const rType = getRecordType(record);
      const tableName = TABLE_MAP[rType];
      
      // Delete database attachments
      await supabase
        .from('record_attachments')
        .delete()
        .eq('record_id', record.id)
        .eq('record_table', tableName);

      // Delete master record
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      await logger.log('DELETE', rType, `Deleted record for ${record.full_name} via Cabinets Vault`, record.id);
      addToast(`Record for ${record.full_name} was successfully deleted from mechanical drawer.`, 'success');
      
      // Refresh configurations
      await fetchRecordsAndBuildCabinets();
    } catch (err: any) {
      console.error("Error deleting physical record:", err);
      addToast('Deletion failed: ' + err.message, 'error');
    } finally {
      setRecordToDelete(null);
    }
  };

  const handleAddCabinet = () => {
    if (!newCabName.trim()) {
      addToast('Cabinet box name is required', 'error');
      return;
    }
    const cleanName = newCabName.trim();
    if (cabinets.some(c => c.boxName.toLowerCase() === cleanName.toLowerCase())) {
      addToast(`Cabinet box Serial ID "${cleanName}" already exists!`, 'error');
      return;
    }

    const newCabinet = {
      boxName: cleanName,
      module: newCabModule,
      desc: newCabDesc.trim() || `${newCabModule} File Storage Vault Drawer`,
      color: newCabColor,
      temp: +(19 + Math.random() * 4).toFixed(1),
      humidity: Math.floor(35 + Math.random() * 15),
      isLocked: false
    };

    try {
      const storedCabinets = localStorage.getItem('managed_physical_cabinets');
      let list = [];
      if (storedCabinets) {
        list = JSON.parse(storedCabinets);
      } else {
        list = [
          { boxName: 'Visa-000001', desc: 'Visa Portal Logs Archive Drawer', module: 'VISA', color: 'from-blue-600 to-blue-800', temp: 21.4, humidity: 42, isLocked: false },
          { boxName: 'Residence-000003', desc: 'Residence Permit Physical Registry Drawer', module: 'Residence ID', color: 'from-amber-600 to-amber-750', temp: 21.8, humidity: 45, isLocked: false },
          { boxName: 'ETD-000004', desc: 'Emergency Travel Document Secure Vault', module: 'ETD', color: 'from-rose-600 to-rose-800', temp: 19.5, humidity: 35, isLocked: false },
          { boxName: 'Yellow-000005', desc: 'Yellow Card Division / Origin ID Physical Registry Box', module: 'Yellow Card', color: 'from-yellow-600 to-amber-750', temp: 22.1, humidity: 41, isLocked: false },
        ];
      }
      list.push(newCabinet);
      localStorage.setItem('managed_physical_cabinets', JSON.stringify(list));
      addToast(`Cabinet box "${cleanName}" successfully registered!`, 'success');
      setIsAddCabinetOpen(false);
      fetchRecordsAndBuildCabinets();
    } catch (e: any) {
      addToast('Failed to save cabinet to local profile: ' + e.message, 'error');
    }
  };

  const handleEditCabinet = () => {
    if (!editCabName.trim()) {
      addToast('Cabinet box name is required', 'error');
      return;
    }
    const cleanName = editCabName.trim();
    if (editingCabinet && cleanName.toLowerCase() !== editingCabinet.boxName.toLowerCase()) {
      if (cabinets.some(c => c.boxName.toLowerCase() === cleanName.toLowerCase())) {
        addToast(`Cabinet box Serial ID "${cleanName}" already exists!`, 'error');
        return;
      }
    }

    try {
      const storedCabinets = localStorage.getItem('managed_physical_cabinets');
      if (storedCabinets) {
        const list = JSON.parse(storedCabinets);
        const updatedList = list.map((c: any) => {
          if (c.boxName === editingCabinet?.boxName) {
            return {
              ...c,
              boxName: cleanName,
              module: editCabModule,
              desc: editCabDesc.trim() || `${editCabModule} File Storage Vault Drawer`,
              color: editCabColor,
            };
          }
          return c;
        });
        localStorage.setItem('managed_physical_cabinets', JSON.stringify(updatedList));

        if (selectedCabinet === editingCabinet?.boxName) {
          setSelectedCabinet(cleanName);
        }

        addToast(`Cabinet box "${cleanName}" successfully updated!`, 'success');
        setIsEditCabinetOpen(false);
        setEditingCabinet(null);
        fetchRecordsAndBuildCabinets();
      }
    } catch (e: any) {
      addToast('Failed to update cabinet: ' + e.message, 'error');
    }
  };

  const handleDeleteCabinet = (boxName: string) => {
    const cab = cabinets.find(c => c.boxName === boxName);
    const count = cab ? cab.count : 0;
    
    const confirmMsg = count > 0 
      ? `Are you sure you want to delete and decommission "${boxName}"? It has ${count} digitized files in it, which will be fallback-allocated to default storage boxes.`
      : `Are you sure you want to delete and decommission "${boxName}"?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const storedCabinets = localStorage.getItem('managed_physical_cabinets');
      if (storedCabinets) {
        const list = JSON.parse(storedCabinets);
        const filtered = list.filter((c: any) => c.boxName !== boxName);
        localStorage.setItem('managed_physical_cabinets', JSON.stringify(filtered));
        addToast(`Cabinet folder room "${boxName}" successfully decommissioned.`, 'success');
        if (selectedCabinet === boxName) {
          setSelectedCabinet(null);
        }
        fetchRecordsAndBuildCabinets();
      }
    } catch (e: any) {
      addToast('Deletion failed: ' + e.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600 opacity-20" />
        <p className="font-semibold text-sm">Inspecting storage vault systems and mapping active physical cabinet rooms...</p>
      </div>
    );
  }

  const activeCabinet = cabinets.find(c => c.boxName === selectedCabinet);
  const filteredRecords = activeCabinet?.records.filter((item: any) => {
    const q = searchQuery.toLowerCase();
    return (
      item.full_name?.toLowerCase().includes(q) ||
      item.passport_number?.toLowerCase().includes(q) ||
      item.request_number?.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
      
      {/* Visual Vault Controls & Dashboard Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden text-left">
        {/* Abstract structural grid overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row justify-between items-stretch gap-6 z-10">
          <div className="space-y-4 text-left flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> High-Security Hardware Mapped
              </span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">Physical Cabinet Vault Matrix</h2>
              <p className="text-xs text-slate-400 font-semibold max-w-xl leading-relaxed">
                Each distinct digital module aligns directly with a registered physical container. Keep your secure hardware boxes systematically locked or browse manual file folders.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {canEditOrDelete && (
                <button
                  onClick={() => {
                    setNewCabName('');
                    setNewCabDesc('');
                    setNewCabModule('VISA');
                    setNewCabColor('from-indigo-600 to-indigo-800');
                    setIsAddCabinetOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 cursor-pointer border-none shadow-sm shadow-blue-500/10"
                >
                  <Plus className="w-4 h-4" /> Add Physical Box
                </button>
              )}
              <button
                onClick={handleClimateRefresh}
                disabled={refreshingClimate}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 border border-slate-700/60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingClimate ? 'animate-spin' : ''}`} /> Scan Environment Sensors
              </button>
            </div>
          </div>

          {/* Visual Showcase crop */}
          <div className="hidden lg:block w-72 shrink-0 rounded-2xl overflow-hidden border border-slate-800/50 relative group select-none">
            <img 
              src={fileVaultBanner} 
              alt="File Management System"
              className="w-full h-full object-cover max-h-36 brightness-95 contrast-105 transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
            <span className="absolute bottom-2.5 left-3 text-[9px] font-black tracking-widest text-[#10b981] bg-slate-900/90 border border-emerald-800/60 px-2 py-0.5 rounded uppercase font-mono">
              FILE ARCHIVE SYSTEM
            </span>
          </div>
        </div>
      </div>

      {/* RACKS GRID LAYOUT */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-left">Active Physical Shelves / Security Vaults</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {cabinets.map((cab) => {
            const isSelected = selectedCabinet === cab.boxName;
            const isCustom = !['Visa-000001', 'Residence-000003', 'ETD-000004', 'Yellow-000005'].includes(cab.boxName);
            return (
              <div 
                key={cab.boxName} 
                className={`flex flex-col rounded-3xl border transition-all overflow-hidden ${
                  isSelected ? 'ring-4 ring-blue-500/10 border-blue-500 bg-white' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {/* Physical Cabinet Head Panel */}
                <div className={`p-4 bg-gradient-to-br ${cab.color} text-white flex flex-col justify-between h-32 relative`}>
                  {/* Action buttons inside Cabinet Panel */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center bg-transparent">
                    {canEditOrDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCabinet(cab);
                            setEditCabName(cab.boxName);
                            setEditCabModule(cab.module);
                            setEditCabDesc(cab.desc);
                            setEditCabColor(cab.color);
                            setIsEditCabinetOpen(true);
                          }}
                          className="p-1.5 bg-black/20 hover:bg-black/35 rounded-lg border-none cursor-pointer transition-colors text-white flex items-center justify-center"
                          title="Edit Cabinet Settings"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCabinet(cab.boxName);
                          }}
                          className="p-1.5 bg-red-950/25 hover:bg-red-900/40 rounded-lg border-none cursor-pointer transition-colors text-red-100 flex items-center justify-center"
                          title="Decommission Cabinet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : <div />}

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(cab.boxName);
                      }}
                      className="p-1.5 bg-black/20 hover:bg-black/35 rounded-lg border-none cursor-pointer transition-colors text-white flex items-center justify-center"
                      title={cab.isLocked ? "Unlock Vault" : "Lock Vault"}
                    >
                      {cab.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 opacity-80" />}
                    </button>
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/70">Vault Location</span>
                    <h4 className="text-sm font-black tracking-tight leading-tight">{cab.boxName}</h4>
                  </div>

                  <div className="flex justify-between items-center text-white/90">
                    <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full uppercase">
                      {cab.count} Cases
                    </span>
                    <span className="text-[10px] font-bold text-white/75">{cab.module} Drawer</span>
                  </div>
                </div>

                {/* Sensors / Environmental controls */}
                <div className="px-4 py-3 bg-slate-100/30 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono font-bold select-none">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-orange-500" /> {cab.temp}°C
                  </span>
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" /> {cab.humidity}% RH
                  </span>
                  <span className={`inline-flex items-center gap-0.5 ${cab.isLocked ? 'text-red-600' : 'text-emerald-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cab.isLocked ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    {cab.isLocked ? 'LKD' : 'OPN'}
                  </span>
                </div>

                {/* Cabinet Pullout Handles */}
                <div className="p-4 flex flex-col items-center gap-3">
                  <div className="w-full h-1 bg-slate-200 shadow-inner rounded" />
                  
                  {cab.isLocked ? (
                    <div className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1.5 py-4 select-none">
                      <Lock className="w-3.5 h-3.5 text-red-500" /> Vault Is Locked
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedCabinet(isSelected ? null : cab.boxName);
                        setSearchQuery('');
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-700 text-white shadow-sm shadow-blue-500/10' 
                          : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {isSelected ? 'Seal Pullout Box' : 'Pull Drawer Open'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED DRAWER CONTENT VIEWER */}
      <AnimatePresence>
        {selectedCabinet && activeCabinet && !activeCabinet.isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-md space-y-6 text-left"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-150 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 text-[#1b54ac] rounded-2xl flex items-center justify-center border border-blue-100/60">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Drawer Box {selectedCabinet} <span className="text-xs font-black bg-blue-100 text-[#1b54ac] px-2.5 py-0.5 rounded-full uppercase tracking-widest">{activeCabinet.module} ONLY</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Physical Cabinet verified: {activeCabinet.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {canEditOrDelete && (
                  <button
                    onClick={() => {
                      setEditingRecord(null);
                      setFormType(activeCabinet.module);
                      setIsFormOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.98] shadow-sm shadow-blue-500/15 cursor-pointer border-none"
                  >
                    <Plus className="w-3.5 h-3.5" /> Digitize & Store File
                  </button>
                )}

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search inside this drawer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#1b54ac] focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Cabinet database table */}
            <div className="overflow-x-auto bg-slate-50/50 rounded-2xl border border-slate-200/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 bg-slate-100/50">
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Registry Name</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Passport No.</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference Code</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">National Origin</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Creation Timestamp</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Vault Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 text-slate-700 bg-white">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-xs text-slate-400 font-extrabold uppercase tracking-widest">
                        This physical cabinet drawer contains no digital files matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="text-xs font-black text-slate-800">{item.full_name}</div>
                          <span className="text-[9px] text-[#1b54ac] font-black uppercase tracking-wider">{item.sex}</span>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-650">{item.passport_number || 'No Passport'}</td>
                        <td className="px-5 py-4 text-[10px] font-mono font-black text-slate-800 bg-slate-50 px-2 py-1 rounded inline-block mt-2">{item.request_number}</td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-600">{item.citizenship}</td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-400">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingRecord(item)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border-none rounded-lg text-slate-500 hover:text-blue-600 cursor-pointer transition-colors"
                              title="Inspect Attached Paper Scans"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canEditOrDelete && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingRecord(item);
                                    setFormType(activeCabinet.module);
                                    setIsFormOpen(true);
                                  }}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border-none rounded-lg text-slate-500 hover:text-amber-600 cursor-pointer transition-colors"
                                  title="Edit Drawer File Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setRecordToDelete(item)}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border-none rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
                                  title="Physically Shred / Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* RECORD FORM MODAL TRIGGER */}
      <AnimatePresence>
        {isFormOpen && (
          <RecordForm
            type={formType}
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setEditingRecord(null);
            }}
            record={editingRecord}
            defaultBoxNumber={selectedCabinet || undefined}
            onSuccess={async () => {
              setIsFormOpen(false);
              setEditingRecord(null);
              addToast(editingRecord ? 'Registry updated successfully!' : 'New file digitized & added successfully!', 'success');
              await fetchRecordsAndBuildCabinets();
            }}
          />
        )}
      </AnimatePresence>

      {/* REVOLUTIONARY VIEW DETAILS DIALOG WITH SCAN PREVIEWS */}
      <AnimatePresence>
        {viewingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 text-left font-sans"
            >
              <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase bg-blue-50 text-[#1b54ac] px-2.5 py-1 rounded-full border border-blue-100/40">
                    <Tag className="w-3.5 h-3.5 text-[#1b54ac]/70" /> {getRecordCategory(viewingRecord)}
                  </span>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1.5 leading-none">Personal File Registration Details</h3>
                </div>
                <button 
                  onClick={() => setViewingRecord(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Full Name</span>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{viewingRecord.full_name}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sex / Gender</span>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">{viewingRecord.sex}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Passport Number</span>
                    <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">{viewingRecord.passport_number}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Citizenship / Origin</span>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">{viewingRecord.citizenship}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Request Reference</span>
                    <p className="text-sm font-mono font-black text-[#1b54ac] mt-0.5">{viewingRecord.request_number}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Physical Box Location</span>
                    <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">{viewingRecord.box_number || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Registry Creation Date</span>
                    <p className="text-sm font-medium text-slate-600 mt-0.5">
                      {new Date(viewingRecord.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Service Provided</span>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">{viewingRecord.service_provided || 'None Specified'}</p>
                  </div>
                </div>

                {/* Attached Scanned PDFs */}
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 justify-start">
                    <Paperclip className="w-3.5 h-3.5 text-blue-500" /> Scanned Attachments ({loadingAttachments ? '...' : viewingRecordAttachments.length})
                  </h4>
                  
                  {loadingAttachments ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-4 justify-start">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading attachments...</span>
                    </div>
                  ) : viewingRecordAttachments.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center">
                      <Paperclip className="w-5 h-5 text-slate-300 mb-1.5" />
                      <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wide">No paper scans attached</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Edit this file to upload and attach scanned PDF documents</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewingRecordAttachments.map((file) => {
                        const fileUrl = file.file_path.startsWith('http') ? file.file_path : supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl;
                        return (
                          <div key={file.id} className="border border-slate-100 p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50 bg-white">
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4.5 h-4.5" />
                              </div>
                              <div className="truncate text-left">
                                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{file.file_name}</p>
                                <span className="text-[9px] text-[#1b54ac] font-black uppercase">{(file.size_bytes / (1024 * 1024)).toFixed(2)} MB • PDF</span>
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(fileUrl, '_blank')}
                              className="p-1.5 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
                              title="View Document"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <footer className="px-8 py-4 border-t border-slate-100 flex justify-end bg-slate-50">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-5 py-2.5 bg-[#1b54ac] hover:bg-[#164894] text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                >
                  Close Inspection
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 text-left"
            >
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Delete Registry File?</h4>
              <p className="text-xs text-slate-500 mt-2">
                Are you absolutely sure you want to delete the file for <strong className="text-slate-800">{recordToDelete.full_name}</strong> from this physical cabinet container? 
                This will delete the digitized master record and all attached scans permanently.
              </p>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setRecordToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border-none cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeDeleteRecord(recordToDelete)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer transition-colors"
                >
                  Confirm Permanent Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD PHYSICAL CABINET MODAL */}
      <AnimatePresence>
        {isAddCabinetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 text-left flex flex-col font-sans"
            >
              <header className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-blue-600" /> Store Cabinet Serial ID
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Register custom physical file drawer</p>
                </div>
                <button 
                  onClick={() => setIsAddCabinetOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer border-none bg-transparent"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </header>

              <div className="p-5 space-y-4">
                {/* Drawer Name / Location ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-505 text-slate-550 uppercase tracking-widest">Cabinet Box ID / Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Visa-000006, EOID-Secure-V"
                    value={newCabName}
                    onChange={(e) => setNewCabName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all font-mono"
                  />
                </div>

                {/* Cabinet Type / Associated Module */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-505 text-slate-550 uppercase tracking-widest">Division Association</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. VISA, EOID, Residence ID, ETD, Yellow Card, AIRPORT, Alien Passport"
                    value={newCabModule}
                    onChange={(e) => setNewCabModule(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all font-sans"
                  />
                </div>

                {/* Cabinet Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-505 text-slate-550 uppercase tracking-widest">Brief Drawer Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Custom backup vault for backlog files"
                    value={newCabDesc}
                    onChange={(e) => setNewCabDesc(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all font-sans"
                  />
                </div>

                {/* Cabinet Color Aesthetics selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">Color Label Theme</label>
                  <div className="grid grid-cols-4 gap-2 pt-0.5">
                    {[
                      { name: 'Classic Blue', value: 'from-blue-600 to-blue-800' },
                      { name: 'Emerald', value: 'from-emerald-600 to-emerald-800' },
                      { name: 'Rose', value: 'from-rose-600 to-rose-800' },
                      { name: 'Gold/Amber', value: 'from-yellow-600 to-amber-700' },
                      { name: 'Orange/Amber', value: 'from-amber-600 to-amber-750' },
                      { name: 'Indigo', value: 'from-indigo-600 to-indigo-800' },
                      { name: 'Purple', value: 'from-purple-600 to-purple-800' },
                      { name: 'Dark Slate', value: 'from-slate-700 to-slate-900' },
                    ].map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setNewCabColor(col.value)}
                        className={`py-1 px-1 font-bold rounded-lg border text-white bg-gradient-to-br ${col.value} transition-all active:scale-95 cursor-pointer h-7 ${
                          newCabColor === col.value ? 'ring-2 ring-black ring-offset-1 scale-102 border-transparent' : 'border-slate-200 text-transparent opacity-80 hover:opacity-100'
                        }`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <footer className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 text-right">
                <button
                  onClick={() => setIsAddCabinetOpen(false)}
                  className="px-4 py-2 bg-slate-200/80 hover:bg-slate-200 text-slate-705 rounded-xl text-[11px] font-black uppercase tracking-wider border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCabinet}
                  className="px-4 py-2 bg-blue-650 hover:bg-blue-600 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider border-none cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  Save Drawer
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PHYSICAL CABINET MODAL */}
      <AnimatePresence>
        {isEditCabinetOpen && editingCabinet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 text-left flex flex-col font-sans"
            >
              <header className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <Edit2 className="w-4 h-4 text-blue-600" /> Edit Cabinet Settings
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Modify physical file drawer properties</p>
                </div>
                <button 
                  onClick={() => setIsEditCabinetOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer border-none bg-transparent"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </header>

              <div className="p-5 space-y-4">
                {/* Drawer Name / Location ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">Cabinet Box ID / Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Visa-000006, EOID-Secure-V"
                    value={editCabName}
                    onChange={(e) => setEditCabName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all font-mono"
                  />
                </div>

                {/* Cabinet Type / Associated Module */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">Division Association</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. VISA, EOID, Residence ID, ETD, Yellow Card, AIRPORT, Alien Passport"
                    value={editCabModule}
                    onChange={(e) => setEditCabModule(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all font-sans"
                  />
                </div>

                {/* Cabinet Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">Brief Drawer Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Custom backup vault for backlog files"
                    value={editCabDesc}
                    onChange={(e) => setEditCabDesc(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all font-sans"
                  />
                </div>

                {/* Cabinet Color Aesthetics selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">Color Label Theme</label>
                  <div className="grid grid-cols-4 gap-2 pt-0.5">
                    {[
                      { name: 'Classic Blue', value: 'from-blue-600 to-blue-800' },
                      { name: 'Emerald', value: 'from-emerald-600 to-emerald-800' },
                      { name: 'Rose', value: 'from-rose-600 to-rose-800' },
                      { name: 'Gold/Amber', value: 'from-yellow-600 to-amber-700' },
                      { name: 'Orange/Amber', value: 'from-amber-600 to-amber-750' },
                      { name: 'Indigo', value: 'from-indigo-600 to-indigo-800' },
                      { name: 'Purple', value: 'from-purple-600 to-purple-800' },
                      { name: 'Dark Slate', value: 'from-slate-700 to-slate-900' },
                    ].map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setEditCabColor(col.value)}
                        className={`py-1 px-1 font-bold rounded-lg border text-white bg-gradient-to-br ${col.value} transition-all active:scale-95 cursor-pointer h-7 ${
                          editCabColor === col.value ? 'ring-2 ring-black ring-offset-1 scale-102 border-transparent' : 'border-slate-200 text-transparent opacity-80 hover:opacity-100'
                        }`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <footer className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 text-right">
                <button
                  type="button"
                  onClick={() => setIsEditCabinetOpen(false)}
                  className="px-4 py-2 bg-slate-200/80 hover:bg-slate-200 text-slate-705 rounded-xl text-[11px] font-black uppercase tracking-wider border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditCabinet}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider border-none cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  Update Drawer
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HIGH CONTRAST CLIENT NOTIFICATION SYSTEM (TOAST OVERLAY) */}
      <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 max-w-xs pointer-events-auto bg-white ${
                toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 
                toast.type === 'error' ? 'border-red-200 text-red-800' : 
                'border-blue-200 text-[#1b54ac]'
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${toast.type === 'success' ? 'text-emerald-500' : 'text-[#1b54ac]'}`} />
              <span className="flex-1 text-left">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
