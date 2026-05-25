import React, { useState, useEffect } from 'react';
import { Loader2, FileQuestion, Edit2, Trash2, Eye, X, Download, Paperclip, ImageIcon, FileText as FileTextIcon, File as FileIcon } from 'lucide-react';
import { supabase, type ImmigrationRecord, type RecordType, TABLE_MAP, type RecordAttachment } from '../lib/supabase';
import AttachmentIndicator from './AttachmentIndicator';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import visaSampleImg from '../assets/images/visa_sample_document_1779450724526.png';
import VisaSpecimenCard from './VisaSpecimenCard';

interface RecordTableProps {
  loading: boolean;
  records: ImmigrationRecord[];
  activeTab: RecordType;
  canEdit: boolean;
  onEdit: (record: ImmigrationRecord) => void;
  onDelete: (id: string) => void;
}

export default function RecordTable({ 
  loading, 
  records, 
  activeTab, 
  canEdit, 
  onEdit, 
  onDelete 
}: RecordTableProps) {
  const [viewingRecord, setViewingRecord] = useState<ImmigrationRecord | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [showReferenceGuide, setShowReferenceGuide] = useState(false);

  return (
    <div className="w-full">
      {/* Visa Reference Specimen banner */}
      {activeTab === 'VISA' && (
        <div className="mb-6 p-6 rounded-[2rem] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100/50 dark:border-blue-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Standard VISA Specimen Guide</h4>
              <p className="text-xs text-slate-500 max-w-xl font-medium mt-0.5">
                Verify physical securitized items against the official electronic Visa (eVisa) system standard layouts, watermark background seals, and customer credential schemas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowReferenceGuide(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer whitespace-nowrap border-none outline-none"
          >
            View Specimen Document
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">BER</th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">
                <div className="flex items-center gap-1 cursor-pointer select-none">
                  <span>FULL NAME</span>
                  <span>⇅</span>
                </div>
              </th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">SEX</th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">CITIZENSHIP</th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">PASSPORT NUMBER</th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">REQUEST NUMBER</th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">DATE</th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">SERVICE PROVIDED</th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em]">SCANS</th>
              <th className="px-5 py-5 text-[10px] font-black text-slate-455 text-slate-400 uppercase tracking-[0.1em] text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/65">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-20 text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-[#2b825a] opacity-40" />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Synchronizing Registry...</p>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <EmptyState />
                </td>
              </tr>
            ) : (
              records.map((record, index) => {
                const isExpanded = expandedRecordId === record.id;
                return (
                  <React.Fragment key={record.id}>
                    <tr 
                      className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${isExpanded ? 'bg-slate-50/20' : ''}`}
                      onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                    >
                      <td className="px-5 py-5 text-slate-450 font-normal text-xs text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-5 py-5 text-xs font-bold text-slate-800 tracking-tight uppercase">
                        {record.full_name}
                      </td>
                      <td className="px-5 py-5 text-xs font-medium text-slate-505 text-slate-500 uppercase">
                        {record.sex}
                      </td>
                      <td className="px-5 py-5 text-xs font-medium text-slate-655 text-slate-600 uppercase">
                        {record.citizenship}
                      </td>
                      <td className="px-5 py-5 text-xs font-mono text-slate-705 text-slate-700 uppercase">
                        {record.passport_number}
                      </td>
                      <td className="px-5 py-5 text-xs font-mono text-slate-655 text-slate-600 uppercase">
                        {record.request_number}
                      </td>
                      <td className="px-5 py-5 text-xs font-mono text-slate-555 text-slate-500">
                        {new Date(record.date).toISOString().split('T')[0]}
                      </td>
                      <td className="px-5 py-5 text-xs font-extrabold text-[#2b825a] uppercase leading-none">
                        {record.service_provided?.toUpperCase() || 'VISA EXTENSION'}
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="w-4.5 h-4.5 rounded-full bg-emerald-50 border border-[#d2eedf] flex items-center justify-center text-[#1b8b58] text-[10px] font-black">
                            ✓
                          </span>
                          <span className="text-[11px] font-semibold text-[#1b8b58] whitespace-nowrap">File Active</span>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-right font-semibold" onClick={e => e.stopPropagation()}>
                        <TableActions 
                          record={record} 
                          onEdit={onEdit} 
                          onDelete={onDelete} 
                          canEdit={canEdit} 
                          onView={(r) => setExpandedRecordId(expandedRecordId === r.id ? null : r.id)} 
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#101c2c]">
                        <td colSpan={10} className="p-0 border-none">
                          <div className="p-1">
                            <ExpandedDocExplorerRow 
                              record={record} 
                              activeTab={activeTab} 
                              onEdit={onEdit} 
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-[#2b825a] opacity-30" />
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Fetching data...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-12"><EmptyState /></div>
        ) : (
          records.map((record) => {
            const isExpanded = expandedRecordId === record.id;
            return (
              <div 
                key={record.id} 
                className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${isExpanded ? 'border-emerald-500/30 shadow-md ring-1 ring-emerald-500/10' : 'border-slate-100'}`}
              >
                <div 
                  className="flex justify-between items-start mb-4 cursor-pointer"
                  onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                >
                  <div className="flex gap-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold uppercase shrink-0">
                      {record.full_name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">{record.full_name}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{record.citizenship} • {record.sex}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    BOX {record.box_number}
                  </span>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Passport</p>
                    <p className="text-xs font-bold font-mono text-slate-700">{record.passport_number}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Request</p>
                    <p className="text-xs font-black text-blue-600 tracking-tight">{record.request_number}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Service</p>
                    <span className="text-[9px] font-black uppercase text-[#1b8b58] bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-full">
                      {record.service_provided}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                  <TableActions 
                    record={record} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    canEdit={canEdit} 
                    onView={(r) => setExpandedRecordId(expandedRecordId === r.id ? null : r.id)} 
                  />
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-left">
                    <div className="bg-[#101c2c] text-white p-4 rounded-xl flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <span className="text-[10px] font-black tracking-[0.08em] uppercase text-slate-200">MICROFILM VIEWER</span>
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="px-2.5 py-1 bg-[#2b825a] text-white rounded text-[9px] font-bold border-none cursor-pointer uppercase tracking-wider"
                        >
                          Edit & Scan
                        </button>
                      </div>
                      <ExpandedDocExplorerRow 
                        record={record} 
                        activeTab={activeTab} 
                        onEdit={onEdit} 
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* View Record Details Modal */}
      <AnimatePresence>
        {viewingRecord && (
          <RecordDetailsModal 
            record={viewingRecord} 
            activeTab={activeTab} 
            onClose={() => setViewingRecord(null)} 
          />
        )}
      </AnimatePresence>

      {/* Visa Specimen Document Modal */}
      <AnimatePresence>
        {showReferenceGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 35 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 35 }}
              className="bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-200 rounded-[2.5rem] w-full max-w-4xl shadow-2xl border border-slate-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <header className="px-8 py-6 bg-slate-50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Official VISA Document Specimen</h3>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">National Security Reference Standard & Customer Form Scheme</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReferenceGuide(false)}
                  className="p-2.5 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-all cursor-pointer border-none bg-transparent outline-none animate-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Main Image Comparison / Instruction layout */}
              <div className="p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                {/* Left side: High Resolution Image Specimen with Watermark */}
                <div className="lg:col-span-7 flex flex-col justify-center">
                  <div className="relative rounded-[2rem] overflow-hidden border border-slate-200 dark:border-gray-800 shadow-inner bg-slate-100 dark:bg-gray-950 group">
                    <img 
                      src={visaSampleImg} 
                      alt="Official VISA Document Specimen Abebe Kebede"
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-1000"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/90 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Digital Reference Specimen
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-center mt-3">
                    Fig 1.1: Official eVisa format with security seal and digital watermark patterns.
                  </p>
                </div>

                {/* Right side: Field Schemas & Information Definitions */}
                <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Securitized Customer Schema</h4>
                    <div className="space-y-4">
                      <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-slate-50/50 dark:bg-gray-800/10">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Customer Full Name</span>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">Abebe Kebede (አበበ ከበደ)</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Passport ID</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white font-mono mt-1">EP0192837</p>
                        </div>
                        <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Visa Code</span>
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono mt-1">VTE (Tourist)</p>
                        </div>
                      </div>
                      <div className="border border-slate-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-900">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Verification Rules & Security Audit</span>
                        <ul className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 space-y-2 list-none pl-0">
                          <li className="flex items-center gap-2 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ensure background features complex guilloche waves.
                          </li>
                          <li className="flex items-center gap-2 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Barcode encodes raw passport string for fast checks.
                          </li>
                          <li className="flex items-center gap-2 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Issue date aligns with standard validity durations.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/30 text-[11px] text-blue-600 dark:text-blue-350 font-medium">
                    <p className="font-extrabold uppercase tracking-wider mb-1">Standard eVisa Schema Compliance</p>
                    Ensure all custom fields of the input visa registration precisely align with this official specimen layout.
                  </div>
                </div>
              </div>

              {/* Footer */}
              <footer className="bg-slate-50 dark:bg-gray-800/10 border-t border-slate-100 dark:border-gray-800 px-8 py-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowReferenceGuide(false)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs rounded-full transition-all active:scale-95 cursor-pointer outline-none border-none"
                >
                  Close Document View
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 md:py-24">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <FileQuestion className="w-8 h-8 md:w-10 md:h-10 text-slate-200" />
      </div>
      <h4 className="text-lg font-bold text-slate-800">No Records Found</h4>
      <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest px-8">The system repository is empty for this category</p>
    </div>
  );
}

function TableActions({ 
  record, 
  onEdit, 
  onDelete, 
  canEdit, 
  onView 
}: { 
  record: ImmigrationRecord; 
  onEdit: (r: ImmigrationRecord) => void; 
  onDelete: (id: string) => void; 
  canEdit: boolean; 
  onView: (r: ImmigrationRecord) => void; 
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button 
        type="button"
        onClick={() => onView(record)}
        className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200/40 transition-all cursor-pointer"
        title="View Details"
      >
        <Eye className="w-4 h-4" />
      </button>
      {canEdit && (
        <>
          <button 
            type="button"
            onClick={() => onEdit(record)}
            className="p-2 text-[#1a73e8] bg-[#e8f1fc] hover:bg-[#d2e3fc] rounded-lg border border-[#cfe2f9] transition-all cursor-pointer"
            title="Edit Record"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => onDelete(record.id)}
            className="p-2 text-[#d93025] bg-[#fce8e6] hover:bg-[#fad2cf] rounded-lg border border-[#f5c2be] transition-all cursor-pointer"
            title="Delete Record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

function RecordDetailsModal({ 
  record, 
  activeTab, 
  onClose 
}: { 
  record: ImmigrationRecord; 
  activeTab: RecordType; 
  onClose: () => void; 
}) {
  const [attachments, setAttachments] = useState<RecordAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttachments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('record_attachments')
          .select('*')
          .eq('record_id', record.id)
          .eq('record_table', TABLE_MAP[activeTab]);
        
        if (!error && data) {
          setAttachments(data as RecordAttachment[]);
        }
      } catch (err) {
        console.error('Error fetching attachments in view details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [record.id, activeTab]);

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    if (type === 'application/pdf') return <FileTextIcon className="w-4 h-4 text-rose-500" />;
    return <FileIcon className="w-4 h-4 text-blue-500" />;
  };

  const isVisa = activeTab === 'VISA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        className={`bg-white rounded-[2.5rem] w-full ${isVisa ? 'max-w-4xl' : 'max-w-2xl'} shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-[#2b825a] rounded-2xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#2b825a]" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">{isVisa ? 'Official Personal VISA Record Specimen' : `${activeTab} Record Information`}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">National Registration & Border Control Registry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* eVisa Specimen layout style if the record is under VISA */}
          {isVisa && <VisaSpecimenCard record={record} />}

          {/* Main Info Blocks */}
          {!isVisa && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-105 border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Name</p>
                <p className="text-base font-extrabold text-slate-900 mt-1">{record.full_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Citizenship / Origin</p>
                <p className="text-base font-bold text-slate-800 mt-1">{record.citizenship}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sex / Gender</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{record.sex}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Box Number</p>
                <span className="inline-block text-xs font-black font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 mt-1">
                  {record.box_number}
                </span>
              </div>
            </div>
          )}

          {/* Travel & Service Metadata */}
          {!isVisa && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5">Registration Metadata</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Passport Number</p>
                  <p className="text-sm font-black text-slate-800 font-mono mt-1">{record.passport_number}</p>
                </div>
                <div className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Request Reference #</p>
                  <p className="text-sm font-black text-[#2b825a] font-mono mt-1">{record.request_number}</p>
                </div>
                <div className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Service Unit</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{record.service_provided}</p>
                </div>
                <div className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Registry Date</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Module-Specific Parameters in nice detail */}
          {!isVisa && (record.eoid_number || record.residence_id_no || record.etd || record.letter_number || record.document_type) && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5">Module Parameters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {record.eoid_number && (
                  <div className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">EOID No.</p>
                    <p className="text-sm font-black text-slate-800 font-mono mt-1">{record.eoid_number}</p>
                  </div>
                )}
                {record.residence_id_no && (
                  <div className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Residence ID No.</p>
                    <p className="text-sm font-black text-slate-800 font-mono mt-1">{record.residence_id_no}</p>
                  </div>
                )}
                {record.etd && (
                  <div className="border border-slate-105 border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ETD Reference</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{record.etd}</p>
                  </div>
                )}
                {record.letter_number && (
                  <div className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Letter Number</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{record.letter_number}</p>
                  </div>
                )}
                {record.document_type && (
                  <div className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Document Type</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{record.document_type}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Record Metadata Log Details */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[11px] text-slate-500 font-medium">
            <div className="flex justify-between">
              <span>System Created At:</span>
              <span className="font-bold font-mono">
                {new Date(record.created_at || record.date).toLocaleString()}
              </span>
            </div>
            {record.created_by && (
              <div className="flex justify-between mt-1.5">
                <span>Registrar Email:</span>
                <span className="font-bold font-mono text-[#2b825a]">{record.created_by}</span>
              </div>
            )}
          </div>

          {/* Attached Files Scan section */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5">Digitized Scans / Attachments ({loading ? '...' : attachments.length})</h4>
            {loading ? (
              <div className="flex items-center gap-2.5 text-slate-400 py-3 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#2b825a]" />
                <span>Loading attachments...</span>
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400 font-bold">No attachment files uploaded for this record</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attachments.map((file) => {
                  const fileUrl = supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl;
                  return (
                    <div key={file.id} className="border border-slate-100 p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50/50 transition-all bg-white shadow-xs">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                          {file.content_type?.startsWith('image/') ? (
                            <img 
                              src={fileUrl} 
                              alt="preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : getFileIcon(file.content_type)}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">{file.file_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{(file.size_bytes / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(fileUrl, '_blank')}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-all cursor-pointer border-none flex items-center justify-center"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-50 border-t border-slate-100 px-8 py-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black uppercase text-xs rounded-full transition-all active:scale-95 cursor-pointer outline-none border-none"
          >
            Close Information
          </button>
        </footer>
      </motion.div>
    </div>
  );
}

function ExpandedDocExplorerRow({
  record,
  activeTab,
  onEdit
}: {
  record: ImmigrationRecord;
  activeTab: RecordType;
  onEdit: (record: ImmigrationRecord) => void;
}) {
  const [attachments, setAttachments] = useState<RecordAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchAttachments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('record_attachments')
          .select('*')
          .eq('record_id', record.id)
          .eq('record_table', TABLE_MAP[activeTab]);
        
        if (active && !error && data) {
          setAttachments(data as RecordAttachment[]);
        }
      } catch (err) {
        console.error('Error fetching attachments in inline explorer:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAttachments();
    return () => {
      active = false;
    };
  }, [record.id, activeTab]);

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-[#39b47c]" />;
    return <FileTextIcon className="w-5 h-5 text-rose-500" />;
  };

  return (
    <div className="bg-[#101c2c] text-white p-6 rounded-2xl flex flex-col gap-5 text-left transition-all">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h4 className="text-xs font-black tracking-[0.08em] uppercase text-slate-200">
            FILE SCAN MANAGEMENT & EVIDENCE EXPLORER
          </h4>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
            National Border Control System • Encrypted Storage Volume
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => onEdit(record)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2b825a] hover:bg-[#206243] text-white border-none rounded-lg text-xs font-black transition-all active:scale-95 cursor-pointer outline-none shadow-sm uppercase tracking-wider"
        >
          <Edit2 className="w-3.5 h-3.5 text-white" />
          <span>Edit & Scan New Documents</span>
        </button>
      </div>

      {/* Grid of files and download links */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-[#39b47c]" />
          <span className="text-xs font-bold uppercase tracking-wider">Retrieving physical microfilm scans...</span>
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 bg-[#0c1522] border border-dashed border-white/10 rounded-xl">
          <span className="text-3xl mb-2">📥</span>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No attached documents found for this secure item.</p>
          <button
            type="button"
            onClick={() => onEdit(record)}
            className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider border-none cursor-pointer"
          >
            Add Document Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {attachments.map((file) => {
            const isImg = file.content_type?.startsWith('image/');
            const fileUrl = supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl;
            return (
              <div 
                key={file.id} 
                className="bg-[#0c1522] border border-white/5 rounded-2xl overflow-hidden p-3 flex flex-col justify-between group hover:border-[#2b825a]/45 transition-all w-44 md:w-48 self-start"
              >
                {/* Microfilm thumbnail preview */}
                <div 
                  className="w-full h-28 bg-[#0b101c] rounded-xl overflow-hidden flex items-center justify-center relative cursor-cell"
                  onClick={() => window.open(fileUrl, '_blank')}
                >
                  {isImg ? (
                    <img 
                      src={fileUrl} 
                      alt="Microfilm Scan" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-400">
                      <FileTextIcon className="w-8 h-8 text-rose-500" />
                      <span className="text-[9px] font-black uppercase tracking-wider">SECURE PDF</span>
                    </div>
                  )}
                  {/* Subtle hover overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] text-emerald-400 font-extrabold uppercase tracking-widest">Enlarge Doc ⛶</span>
                  </div>
                </div>

                <div className="mt-2 text-left">
                  <span className="text-[11px] font-bold truncate block w-full text-slate-200" title={file.file_name}>
                    {file.file_name}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase">
                    {(file.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>

                {/* Secure download action button matching Image 2 style */}
                <button
                  type="button"
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="w-full mt-3 py-2 bg-[#2b825a] hover:bg-[#206243] text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-none outline-none uppercase"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download Scan</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

