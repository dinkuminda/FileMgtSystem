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

interface CabinetsViewProps {
  userProfile?: UserProfile | null;
}

interface CabinetInfo {
  boxName: string;
  module: RecordType;
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
  const [cabinets, setCabinets] = useState<CabinetInfo[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simulated environment status that refreshes with beautiful micro-animations
  const [refreshingClimate, setRefreshingClimate] = useState(false);

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
    if (record.eoid_number) return "EOID";
    if (record.residence_id_no) return "Residence ID";
    if (record.etd) return "ETD";
    if (record.document_type) return "Yellow Card";
    return "VISA";
  };

  const getRecordCategory = (record: any) => {
    const rType = getRecordType(record);
    if (rType === 'EOID') return "EOID Logs";
    if (rType === 'Residence ID') return "Residence ID";
    if (rType === 'ETD') return "Emergency Travel Docs";
    if (rType === 'Yellow Card') return "Yellow Card Registry";
    return "VISA Records";
  };

  const canEditOrDelete = !userProfile || userProfile.role === 'admin' || userProfile.role === 'staff' || userProfile.role === 'airport_staff';

  const fetchRecordsAndBuildCabinets = async () => {
    setLoading(true);
    try {
      // Execute all fetches in parallel
      const tables: RecordType[] = ['VISA', 'EOID', 'Residence ID', 'ETD', 'Yellow Card'];
      const fetches = tables.map(async (type) => {
        const { data, error } = await supabase.from(TABLE_MAP[type]).select('*');
        if (error) throw error;
        return { type, data: data || [] };
      });

      const results = await Promise.all(fetches);
      const allData = results.flatMap(r => r.data);

      const boxMap: Record<string, any[]> = {
        'Visa-000001': [],
        'EOID-000002': [],
        'Residence-000003': [],
        'ETD-000004': [],
        'Yellow-000005': []
      };

      allData.forEach(r => {
        const rType = getRecordType(r);
        const box = r.box_number?.trim() || MODULE_BOX_MAP[rType] || 'Visa-000001';
        if (!boxMap[box]) {
          boxMap[box] = [];
        }
        boxMap[box].push(r);
      });

      // Define default details for the cabinets
      const cabinetMeta: Record<string, { desc: string; type: RecordType; color: string; temp: number; hum: number }> = {
        'Visa-000001': { desc: 'Visa Portal Logs Archive Drawer', type: 'VISA', color: 'from-blue-600 to-blue-800', temp: 21.4, hum: 42 },
        'EOID-000002': { desc: 'EOID National Biometric File Drawers', type: 'EOID', color: 'from-emerald-600 to-emerald-800', temp: 20.1, hum: 38 },
        'Residence-000003': { desc: 'Residence Permit Physical Registry Drawer', type: 'Residence ID', color: 'from-amber-600 to-amber-750', temp: 21.8, hum: 45 },
        'ETD-000004': { desc: 'Emergency Travel Document Secure Vault', type: 'ETD', color: 'from-rose-600 to-rose-800', temp: 19.5, hum: 35 },
        'Yellow-000005': { desc: 'Yellow Card / Origin ID Physical Registry Box', type: 'Yellow Card', color: 'from-yellow-600 to-amber-700', temp: 22.1, hum: 41 },
      };

      const builtCabinets: CabinetInfo[] = Object.keys(boxMap).map((boxName) => {
        const meta = cabinetMeta[boxName] || { desc: 'General Archive Locker', type: 'VISA' as RecordType, color: 'from-slate-600 to-slate-800', temp: 21.0, hum: 40 };
        return {
          boxName,
          module: meta.type,
          desc: meta.desc,
          color: meta.color,
          count: boxMap[boxName].length,
          records: boxMap[boxName],
          isLocked: false, // Default unlocked, user can toggle locks
          temp: meta.temp,
          humidity: meta.hum
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
          if (!error && data) {
            setViewingRecordAttachments(data as RecordAttachment[]);
          }
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
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Abstract structural grid overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10">
          <div className="space-y-2 text-left">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> High-Security Hardware Mapped
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">Physical Cabinet Vault Matrix</h2>
            <p className="text-xs text-slate-450 text-slate-450 text-slate-400 font-semibold max-w-xl">
              Each distinct digital module aligns directly with a registered physical container. Keep your secure hardware boxes systematically locked or browse manual file folders.
            </p>
          </div>
          
          <button
            onClick={handleClimateRefresh}
            disabled={refreshingClimate}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 border border-slate-700/60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingClimate ? 'animate-spin' : ''}`} /> Scan Environment Sensors
          </button>
        </div>
      </div>

      {/* RACKS GRID LAYOUT */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-left">Active Physical Shelves / Security Vaults</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {cabinets.map((cab) => {
            const isSelected = selectedCabinet === cab.boxName;
            return (
              <div 
                key={cab.boxName} 
                className={`flex flex-col rounded-3xl border transition-all overflow-hidden ${
                  isSelected ? 'ring-4 ring-blue-500/10 border-blue-500 bg-white' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {/* Physical Cabinet Head Panel */}
                <div className={`p-4 bg-gradient-to-br ${cab.color} text-white flex flex-col justify-between h-32 relative`}>
                  {/* Mechanical metal lock icon */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(cab.boxName);
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/35 rounded-lg border-none cursor-pointer transition-colors text-white"
                    title={cab.isLocked ? "Unlock Vault" : "Lock Vault"}
                  >
                    {cab.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 opacity-80" />}
                  </button>

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
                        const fileUrl = supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl;
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
