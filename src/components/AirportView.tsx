import React, { useState, useEffect } from 'react';
import { supabase, ImmigrationRecord, logger } from '../lib/supabase';
import { 
  Plane, Users, FileText, CheckCircle, 
  Clock, AlertCircle, Search, Plus,
  LayoutGrid, List, Filter, Paperclip, ExternalLink, FileIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

interface AirportViewProps {
  onAddRecord: () => void;
  onEditRecord: (record: ImmigrationRecord) => void;
  onDeleteRecord: (id: string) => void;
  searchQuery: string;
  canEdit: boolean;
}

export default function AirportView({ onAddRecord, onEditRecord, onDeleteRecord, searchQuery, canEdit }: AirportViewProps) {
  const [records, setRecords] = useState<ImmigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [matchAttachments, setMatchAttachments] = useState<Record<string, any[]>>({});
  const [activeSubTab, setActiveSubTab] = useState<'add' | 'view' | 'edit'>('view');

  // Logic for the requested "view document type by searching name"
  const exactMatches = searchQuery && searchQuery.length > 2 
    ? records.filter(r => 
        r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.passport_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.request_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    fetchAirportData();
  }, [searchQuery]);

  useEffect(() => {
    if (exactMatches.length > 0) {
      fetchAttachmentsForMatches();
    }
  }, [exactMatches.length]);

  const fetchAttachmentsForMatches = async () => {
    try {
      const matchIds = exactMatches.map(m => m.id);
      const { data, error } = await supabase
        .from('record_attachments')
        .select('*')
        .in('record_id', matchIds)
        .eq('record_table', 'airport_records');
      
      if (error) throw error;
      
      const grouped = (data || []).reduce((acc: any, attr: any) => {
        if (!acc[attr.record_id]) acc[attr.record_id] = [];
        acc[attr.record_id].push(attr);
        return acc;
      }, {});
      
      setMatchAttachments(grouped);
    } catch (err) {
      console.error('Error fetching match attachments:', err);
    }
  };

  const fetchAirportData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('airport_records')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      const airportRecords = data as ImmigrationRecord[];
      setRecords(airportRecords);

      // Process Stats
      const total = airportRecords.length;
      const today = airportRecords.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).length;
      
      const services: Record<string, number> = {};
      airportRecords.forEach(r => {
        services[r.service_provided] = (services[r.service_provided] || 0) + 1;
      });
      const serviceData = Object.entries(services).map(([name, value]) => ({ name, value }));

      const types: Record<string, number> = {};
      airportRecords.forEach(r => {
        types[r.document_type || 'Other'] = (types[r.document_type || 'Other'] || 0) + 1;
      });
      const typeData = Object.entries(types).map(([name, value]) => ({ name, value }));

      setStats({ total, today, serviceData, typeData });
    } catch (err) {
      console.error('Error fetching airport data:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Navigation Tabs (Based on Sketch) */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button 
          onClick={() => setActiveSubTab('add')}
          className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all ${
            activeSubTab === 'add' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          Add Document
        </button>
        <button 
          onClick={() => setActiveSubTab('view')}
          className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all ${
            activeSubTab === 'view' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          View Document
        </button>
        {canEdit && (
          <button 
            onClick={() => setActiveSubTab('edit')}
            className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all ${
              activeSubTab === 'edit' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            Edit Document
          </button>
        )}
      </div>

      {activeSubTab === 'add' ? (
        <div className="min-h-[400px] flex items-center justify-center p-12 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <div className="text-center space-y-6 max-w-md">
            <div className="mx-auto w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Plus className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">Register New Document</h3>
              <p className="text-gray-500 mt-2">Initialize a new immigration record for Bole Airport operations.</p>
            </div>
            {canEdit ? (
              <button 
                onClick={onAddRecord}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                Launch Entry Form
              </button>
            ) : (
              <p className="text-sm text-red-500 font-bold bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-lg">
                Insufficient Permissions to Add Records
              </p>
            )}
          </div>
        </div>
      ) : activeSubTab === 'edit' ? (
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20">
                  <Plus className="w-6 h-6 text-white rotate-45" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Modify Records</h3>
                  <p className="text-sm text-gray-500">Search and select highly sensitive records for correction or deletion.</p>
                </div>
              </div>
            </div>

            {searchQuery.length < 3 ? (
              <div className="py-24 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem]">
                <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Search to Modify Documents</p>
              </div>
            ) : exactMatches.length === 0 ? (
              <div className="py-24 text-center bg-gray-50 dark:bg-gray-800/20 rounded-[2rem]">
                 <p className="text-gray-400">No records found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {exactMatches.map(match => (
                  <div key={match.id} className="p-6 rounded-[2rem] bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                    <h4 className="text-lg font-black mb-1">{match.full_name}</h4>
                    <p className="text-xs font-mono text-blue-600 mb-6">{match.passport_number}</p>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEditRecord(match)}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                      >
                        Edit Details
                      </button>
                      <button 
                        onClick={() => onDeleteRecord(match.id)}
                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Lookup Interface (View Document) */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Document Search</h3>
                <p className="text-sm text-gray-500">View only scanned documents by Name, Passport No or Request Number</p>
              </div>
            </div>

            {searchQuery.length < 3 ? (
              <div className="py-24 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem]">
                <div className="inline-flex p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl mb-4">
                  <Search className="w-12 h-12 text-blue-500 opacity-20" />
                </div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white">Document Lookup Ready</h4>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">Enter an applicant name, passport number, or request ID to retrieve their scanned documents.</p>
              </div>
            ) : exactMatches.length === 0 ? (
              <div className="py-24 text-center bg-gray-50 dark:bg-gray-800/20 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                <div className="inline-flex p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-sm mb-4">
                  <AlertCircle className="w-12 h-12 text-amber-500" />
                </div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white">Record Not Found</h4>
                <p className="text-gray-500 mt-2">We couldn't find any immigration files matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {exactMatches.map(match => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={match.id} 
                    className="group bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none p-8 flex flex-col transition-all hover:border-blue-500/50"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-tighter">
                          {match.document_type}
                        </span>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                        {match.full_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 uppercase tracking-widest">{match.citizenship}</span>
                        <span className="text-[10px] font-mono font-bold text-blue-500 uppercase">REQ: {match.request_number}</span>
                      </div>
                    </div>

                    {/* Scanned Files Visualization */}
                    <div className="flex-1 space-y-3 mb-8">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-blue-500" />
                          Document Scan Files
                        </p>
                        <span className="text-[10px] font-bold text-gray-300">
                          {matchAttachments[match.id]?.length || 0} FILE(S)
                        </span>
                      </div>

                      {matchAttachments[match.id]?.length > 0 ? (
                        <div className="space-y-3">
                          {matchAttachments[match.id].map(file => (
                            <button 
                              key={file.id}
                              onClick={() => window.open(supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl)}
                              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-gray-900 transition-all text-left shadow-sm group/file"
                            >
                              <div className="flex items-center gap-4 truncate">
                                <div className="p-2 bg-white dark:bg-gray-900 rounded-xl group-hover/file:bg-blue-600 group-hover/file:text-white transition-colors">
                                  <FileIcon className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="text-xs font-black text-gray-900 dark:text-gray-100 block truncate max-w-[140px] uppercase">
                                    {file.file_name}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                    {(file.size_bytes / 1024).toFixed(1)} KB • {file.content_type?.split('/')[1] || 'DOC'}
                                  </span>
                                </div>
                              </div>
                              <ExternalLink className="w-5 h-5 text-blue-500 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 rounded-3xl bg-gray-50/50 dark:bg-gray-900/50 text-center border-2 border-dotted border-gray-200 dark:border-gray-800">
                          <AlertCircle className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Digital Scan Missing</p>
                          <p className="text-[10px] text-gray-300 font-medium italic mt-1">This record requires a manual scan upload.</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Passport No</span>
                        <span className="text-sm font-black font-mono tracking-tighter">{match.passport_number}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEditRecord(match)}
                          className="py-3 px-6 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                          View Scan Doc
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
