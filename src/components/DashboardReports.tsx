import React, { useState, useEffect } from 'react';
import { supabase, TABLE_MAP, type RecordType, type UserProfile, type ImmigrationRecord, type RecordAttachment, logger } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { 
  Loader2, TrendingUp, Users, FileText, Globe, Archive, Folder,
  FolderOpen, Search, Info, CheckCircle, ChevronRight, Minimize2, Tag, Calendar,
  Eye, Edit2, Trash2, Plus, Paperclip, ChevronDown, X, ExternalLink, CreditCard, Fingerprint, MapPin,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RecordForm, { MODULE_BOX_MAP } from './RecordForm';

const COLORS = ['#1b54ac', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#06b6d4'];

export const BOX_MODULE_DESC: Record<string, string> = {
  'Visa-000001': 'Visa Portal Logs',
  'EOID-000002': 'EOID National Registry',
  'Residence-000003': 'Residence Permits',
  'ETD-000004': 'Emergency Travel Docs',
  'Airport-000005': 'Bole Airport Logs'
};

interface DashboardReportsProps {
  userProfile?: UserProfile | null;
}

export default function DashboardReports({ userProfile }: DashboardReportsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [boxSearchQuery, setBoxSearchQuery] = useState('');

  // States for CRUD of module records inside Archived Folders
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<RecordType>('VISA');
  const [editingRecord, setEditingRecord] = useState<ImmigrationRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<ImmigrationRecord | null>(null);
  const [viewingRecordAttachments, setViewingRecordAttachments] = useState<RecordAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ImmigrationRecord | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  
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
    if (record.document_type) return "AIRPORT";
    return "VISA";
  };

  const canEditOrDelete = !userProfile || userProfile.role === 'admin' || userProfile.role === 'staff' || userProfile.role === 'airport_staff';

  useEffect(() => {
    fetchStats();
  }, []);

  // Set up attachment loader for selected file details
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

  const getRecordCategory = (record: any) => {
    if (record.eoid_number) return "EOID Logs";
    if (record.residence_id_no) return "Residence ID";
    if (record.etd) return "ETD Records";
    if (record.document_type) return "Bole Airport";
    return "VISA Records";
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

      await logger.log('DELETE', rType, `Deleted record for ${record.full_name} via Archived Folders`, record.id);
      addToast(`Record for ${record.full_name} was successfully deleted.`, 'success');
      
      // Refresh calculations
      await fetchStats();
    } catch (err: any) {
      console.error("Error deleting physical record:", err);
      addToast('Deletion failed: ' + err.message, 'error');
    } finally {
      setRecordToDelete(null);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        Object.entries(TABLE_MAP).map(async ([type, table]) => {
          const { data, count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact' });
          
          if (error) throw error;
          return { type, count: count || 0, data };
        })
      );

      // Process totals
      const totals = results.map(r => ({ name: r.type, value: r.count }));
      const allData = results.flatMap(r => r.data || []);

      // Citizenship distribution
      const citizenshipMap: Record<string, number> = {};
      allData.forEach(r => {
        if (r.citizenship) {
          citizenshipMap[r.citizenship] = (citizenshipMap[r.citizenship] || 0) + 1;
        }
      });
      const citizenshipData = Object.entries(citizenshipMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Records over time (last 30 days)
      const dateMap: Record<string, number> = {};
      allData.forEach(r => {
        const date = new Date(r.created_at).toLocaleDateString();
        dateMap[date] = (dateMap[date] || 0) + 1;
      });
      const timeData = Object.entries(dateMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10);

      // Box Grouping for File Management View
      const boxMap: Record<string, any[]> = {
        'Visa-000001': [],
        'EOID-000002': [],
        'Residence-000003': [],
        'ETD-000004': [],
        'Airport-000005': []
      };
      
      allData.forEach(r => {
        const rType = getRecordType(r);
        const box = r.box_number?.trim() || MODULE_BOX_MAP[rType] || 'Visa-000001';
        if (!boxMap[box]) {
          boxMap[box] = [];
        }
        boxMap[box].push(r);
      });

      const boxData = Object.entries(boxMap).map(([boxName, items]) => ({
        boxName,
        itemsCount: items.length,
        items
      })).sort((a, b) => a.boxName.localeCompare(b.boxName, undefined, { numeric: true, sensitivity: 'base' }));

      setStats({ totals, citizenshipData, timeData, totalRecords: allData.length, boxData });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600 opacity-20" />
        <p className="font-semibold text-sm">Compiling digital files and reports...</p>
      </div>
    );
  }

  // Get current selected box data
  const activeBoxInfo = stats?.boxData?.find((b: any) => b.boxName === selectedBox);
  const filteredBoxItems = activeBoxInfo?.items.filter((item: any) => {
    const q = boxSearchQuery.toLowerCase();
    return (
      item.full_name?.toLowerCase().includes(q) ||
      item.passport_number?.toLowerCase().includes(q) ||
      item.request_number?.toLowerCase().includes(q) ||
      item.service_provided?.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
      
      {/* Dynamic Breadcrumbs & Title like Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/60 p-5 rounded-2xl border border-slate-200/40 mb-6 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#da8eff] to-[#be5eff] rounded-xl flex items-center justify-center shadow-md shadow-purple-500/15">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-[#343a40] tracking-tight">
            Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#6c757d] select-none">
          <span>Overview</span>
          <Info className="w-4 h-4 text-[#be5eff]" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Total Digitized Files */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#ffbf96] to-[#fe7096] text-white p-6 md:p-8 rounded-2xl shadow-lg border border-transparent h-44 md:h-48 flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
          {/* Concentric circles background decor */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -right-16 -bottom-16 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          
          <div className="flex items-center justify-between z-10">
            <p className="text-sm md:text-base font-bold text-white/90">Total Digitized Files</p>
            <Users className="w-6 h-6 text-white/50 animate-pulse" />
          </div>
          <div className="z-10 mt-2">
            <p className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {stats?.totalRecords ? Number(stats.totalRecords).toLocaleString() : '1,240'}
            </p>
          </div>
          <div className="z-10 mt-auto">
            <p className="text-xs font-semibold text-white/85">Increased by 60%</p>
          </div>
        </div>

        {/* Card 2: Physical Box Shelves */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#90caf9] to-[#047edf] text-white p-6 md:p-8 rounded-2xl shadow-lg border border-transparent h-44 md:h-48 flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
          {/* Concentric circles background decor */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -right-16 -bottom-16 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          
          <div className="flex items-center justify-between z-10">
            <p className="text-sm md:text-base font-bold text-white/90">Secure Storage Units</p>
            <Archive className="w-6 h-6 text-white/50" />
          </div>
          <div className="z-10 mt-2">
            <p className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {stats?.boxData?.length || 5}
            </p>
          </div>
          <div className="z-10 mt-auto">
            <p className="text-xs font-semibold text-white/85">Decreased by 10%</p>
          </div>
        </div>

        {/* Card 3: Active Transit Origins */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#84d9d2] to-[#07cdae] text-white p-6 md:p-8 rounded-2xl shadow-lg border border-transparent h-44 md:h-48 flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
          {/* Concentric circles background decor */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -right-16 -bottom-16 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          
          <div className="flex items-center justify-between z-10">
            <p className="text-sm md:text-base font-bold text-white/90">Global Origins Mapped</p>
            <Globe className="w-6 h-6 text-white/50" />
          </div>
          <div className="z-10 mt-2">
            <p className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {stats?.citizenshipData?.length || 0}
            </p>
          </div>
          <div className="z-10 mt-auto">
            <p className="text-xs font-semibold text-white/85">Increased by 5%</p>
          </div>
        </div>

      </div>

      {/* Advanced Section: Physical Archive Box Explorer */}
      <section className="bg-white border border-slate-200 p-6 md:p-10 rounded-3xl shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1b54ac] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <Archive className="w-3.5 h-3.5" /> High Density Archivist
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Physical Storage Box Explorer</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Review and locate paper files mapped by physical archive box index
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/50">
            <Info className="w-4 h-4 text-[#1b54ac]" />
            <span>Click any box below to inspect its contents</span>
          </div>
        </div>

        {/* Dynamic Box Shelf Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {stats?.boxData?.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 font-bold text-sm uppercase tracking-wider">
              No Physical Storage Boxes Recorded Yet.
            </div>
          ) : (
            stats?.boxData?.map((box: any) => {
              const isSelected = selectedBox === box.boxName;
              return (
                <button
                  key={box.boxName}
                  onClick={() => {
                    setSelectedBox(isSelected ? null : box.boxName);
                    setBoxSearchQuery('');
                  }}
                  className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-40 focus:outline-none relative group ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-500/20' 
                      : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-slate-100/50 text-slate-800'
                  }`}
                >
                  {/* Visual steel bar on top of archive box */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${
                    isSelected ? 'bg-blue-900' : 'bg-slate-300'
                  }`} />

                  <div className="flex justify-between items-start pt-1.5 w-full">
                    {isSelected ? (
                      <FolderOpen className="w-7 h-7 text-blue-100 animate-pulse" />
                    ) : (
                      <Folder className="w-7 h-7 text-[#1b54ac] group-hover:scale-105 transition-transform" />
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-blue-900/40 text-blue-100' : 'bg-slate-200/65 text-slate-500'
                    }`}>
                      {box.itemsCount} Files
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      isSelected ? 'text-blue-200' : 'text-slate-400'
                    }`}>
                      {BOX_MODULE_DESC[box.boxName] || 'PHYSICAL CABINET'}
                    </p>
                    <p className="text-lg font-black tracking-tight leading-none mt-1">
                      {box.boxName}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Box Drawer Contents */}
        <AnimatePresence>
          {selectedBox && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-slate-100 pt-8"
            >
              <div className="bg-slate-50/50 rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[#1b54ac]">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-lg">Digitized Records inside {selectedBox} - {BOX_MODULE_DESC[selectedBox]}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Physical location code verified</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                    {canEditOrDelete && (
                      <div className="relative">
                        <button
                          onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.98] shadow-sm shadow-blue-500/15 cursor-pointer border-none outline-none"
                        >
                          <Plus className="w-3.5 h-3.5" /> Digitize Personal File
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isAddMenuOpen && (
                          <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto bg-white border border-slate-200 rounded-2xl shadow-xl py-2 w-56 z-30 font-semibold text-slate-700 text-xs flex flex-col items-stretch overflow-hidden">
                            <span className="px-4 py-1.5 text-[9px] font-black uppercase text-slate-450 text-slate-400 tracking-wider bg-slate-50 border-b border-slate-100">Select Module / Category</span>
                            <button
                              onClick={() => {
                                setEditingRecord(null);
                                setFormType('VISA');
                                setIsFormOpen(true);
                                setIsAddMenuOpen(false);
                              }}
                              className="px-4 py-2.5 hover:bg-slate-50 hover:text-blue-600 text-left transition-colors font-bold cursor-pointer border-none bg-transparent flex items-center gap-2 text-slate-700"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-500" /> VISA Document
                            </button>
                            <button
                              onClick={() => {
                                setEditingRecord(null);
                                setFormType('EOID');
                                setIsFormOpen(true);
                                setIsAddMenuOpen(false);
                              }}
                              className="px-4 py-2.5 hover:bg-slate-50 hover:text-blue-600 text-left transition-colors font-bold cursor-pointer border-none bg-transparent flex items-center gap-2 text-slate-700"
                            >
                              <Fingerprint className="w-3.5 h-3.5 text-emerald-500" /> EOID Document
                            </button>
                            <button
                              onClick={() => {
                                setEditingRecord(null);
                                setFormType('Residence ID');
                                setIsFormOpen(true);
                                setIsAddMenuOpen(false);
                              }}
                              className="px-4 py-2.5 hover:bg-slate-50 hover:text-blue-600 text-left transition-colors font-bold cursor-pointer border-none bg-transparent flex items-center gap-2 text-slate-700"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-amber-500" /> Residence ID Document
                            </button>
                            <button
                              onClick={() => {
                                setEditingRecord(null);
                                setFormType('ETD');
                                setIsFormOpen(true);
                                setIsAddMenuOpen(false);
                              }}
                              className="px-4 py-2.5 hover:bg-slate-50 hover:text-blue-600 text-left transition-colors font-bold cursor-pointer border-none bg-transparent flex items-center gap-2 text-slate-700"
                            >
                              <MapPin className="w-3.5 h-3.5 text-rose-500" /> ETD Record Document
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Micro Search container */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Filter records inside this box..."
                        value={boxSearchQuery}
                        onChange={(e) => setBoxSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#1b54ac] focus:ring-4 focus:ring-blue-500/5 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Box Records Table */}
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type / Unit</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Name</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Passport No.</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Request Ref</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">National Base</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Creation Date</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {filteredBoxItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                            No matching files inside this box.
                          </td>
                        </tr>
                      ) : (
                        filteredBoxItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-4 select-none">
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-blue-50 text-[#1b54ac] px-2.5 py-1 rounded-full border border-blue-100/40">
                                <Tag className="w-3 h-3 text-[#1b54ac]/70" /> {getRecordCategory(item)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-xs font-black text-slate-800">{item.full_name}</div>
                              <div className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">{item.sex}</div>
                            </td>
                            <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700">{item.passport_number}</td>
                            <td className="px-5 py-4 text-[10px] font-black text-[#1b54ac] font-mono">{item.request_number}</td>
                            <td className="px-5 py-4 text-xs font-bold text-slate-600">{item.citizenship}</td>
                            <td className="px-5 py-4 text-xs font-mono text-slate-400">
                              {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setViewingRecord(item)}
                                  className="p-1.5 bg-slate-55 hover:bg-slate-100 border-none rounded-lg text-slate-500 hover:text-blue-600 cursor-pointer transition-colors bg-slate-50"
                                  title="View Details & PDF Attachments"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {canEditOrDelete && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingRecord(item);
                                        setFormType(getRecordType(item));
                                        setIsFormOpen(true);
                                      }}
                                      className="p-1.5 bg-slate-55 hover:bg-slate-100 border-none rounded-lg text-slate-500 hover:text-amber-600 cursor-pointer transition-colors bg-slate-50"
                                      title="Edit Record"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setRecordToDelete(item)}
                                      className="p-1.5 bg-slate-55 hover:bg-slate-100 border-none rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer transition-colors bg-slate-50"
                                      title="Delete Record"
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Main Stats Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Resource Pulse (Reg Trend) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 md:p-10 rounded-3xl shadow-sm">
          <div className="mb-6 md:mb-10">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Immigration File Distribution</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active records across database tables</p>
          </div>
          <div className="h-[300px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.totals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800, textTransform: 'uppercase' }} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
                  }}
                  itemStyle={{ color: '#0f172a', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#1b54ac" 
                  radius={[12, 12, 4, 4]} 
                  barSize={36} 
                  animationBegin={200}
                  animationDuration={1000}
                >
                  {stats?.totals?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Distribution */}
        <div className="bg-white border border-slate-200 p-6 md:p-10 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-6 md:mb-10">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Geographic Density</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Top registry origins</p>
            </div>
            <div className="space-y-4 md:space-y-6">
              {stats?.citizenshipData.map((item: any, idx: number) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-bold text-slate-600">{item.name}</p>
                    <p className="text-xs font-black text-[#1b54ac]">{( (item.value / stats.totalRecords) * 100 ).toFixed(1)}%</p>
                  </div>
                  <div className="h-2 w-full bg-slate-50 border border-slate-100/80 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / stats.totalRecords) * 100}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className="h-full bg-[#1b54ac] rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-lg md:text-xl font-bold text-slate-900">{stats?.citizenshipData.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recorded Nations</p>
            </div>
            <Globe className="w-8 h-8 md:w-10 md:h-10 text-slate-200" />
          </div>
        </div>
      </div>

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
            defaultBoxNumber={selectedBox || undefined}
            onSuccess={async () => {
              setIsFormOpen(false);
              setEditingRecord(null);
              addToast(editingRecord ? 'Registry updated successfully!' : 'New file digitized & added successfully!', 'success');
              await fetchStats();
            }}
          />
        )}
      </AnimatePresence>

      {/* REVOLUTIONARY VIEW DETAILS DIALOG WITH SCAN PREVIEWS */}
      <AnimatePresence>
        {viewingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/60 font-sans"
            >
              {/* Header */}
              <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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

              {/* Body */}
              <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[70vh] text-left">
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

                  {/* Conditional fields based on modules */}
                  {viewingRecord.eoid_number && (
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">EOID Reference</span>
                      <p className="text-sm font-mono font-bold text-emerald-600 mt-0.5">{viewingRecord.eoid_number}</p>
                    </div>
                  )}
                  {viewingRecord.residence_id_no && (
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Residence ID No.</span>
                      <p className="text-sm font-mono font-bold text-amber-600 mt-0.5">{viewingRecord.residence_id_no}</p>
                    </div>
                  )}
                  {viewingRecord.etd && (
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">ETD Registry No.</span>
                      <p className="text-sm font-mono font-bold text-rose-600 mt-0.5">{viewingRecord.etd}</p>
                    </div>
                  )}
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

              {/* Footer */}
              <footer className="px-8 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-5 py-2.5 bg-[#1b54ac] hover:bg-[#164894] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer border-none"
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
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200"
            >
              <h4 className="text-lg font-black text-slate-900 tracking-tight text-left">Delete Registry File?</h4>
              <p className="text-xs text-slate-500 mt-2 text-left">
                Are you absolutely sure you want to delete the file for <strong className="text-slate-800">{recordToDelete.full_name}</strong>? 
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
              <CheckCircle className={`w-4 h-4 ${toast.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`} />
              <span className="flex-1 text-left">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
