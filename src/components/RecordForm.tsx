import React, { useState, useEffect, useRef } from 'react';
import { supabase, type ImmigrationRecord, type RecordType, TABLE_MAP, type RecordAttachment, logger } from '../lib/supabase';
import { X, Save, AlertCircle, Loader2, Paperclip, Trash2, FileIcon, ImageIcon, FileTextIcon, Scan, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CITIZENSHIPS } from '../constants';

export const MODULE_BOX_MAP: Record<RecordType, string> = {
  'VISA': 'Visa-000001',
  'EOID': 'EOID-000002',
  'Residence ID': 'Residence-000003',
  'ETD': 'ETD-000004',
  'Yellow Card': 'Yellow-000005'
};

interface RecordFormProps {
  type: RecordType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: ImmigrationRecord) => void;
  record?: ImmigrationRecord | null;
  defaultBoxNumber?: string;
}

export default function RecordForm({ type, onClose, onSuccess, record, defaultBoxNumber }: RecordFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<RecordAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom dialog state for deleting attachments
  const [attachmentToDelete, setAttachmentToDelete] = useState<RecordAttachment | null>(null);

  useEffect(() => {
    // Cleanup previews on unmount
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url as string));
    };
  }, [previews]);

  const [formData, setFormData] = useState({
    box_number: '',
    full_name: '',
    sex: 'Male',
    citizenship: '',
    passport_number: '',
    request_number: '',
    date: new Date().toISOString().split('T')[0],
    service_provided: '',
    letter_number: '',
    document_type: 'Scanned Letter',
    eoid_number: '',
    residence_id_no: '',
    etd: '',
  });

  useEffect(() => {
    if (record) {
      setFormData({
        box_number: record.box_number || MODULE_BOX_MAP[type] || 'Visa-000001',
        full_name: record.full_name || '',
        sex: record.sex || 'Male',
        citizenship: record.citizenship || '',
        passport_number: record.passport_number || '',
        request_number: record.request_number || '',
        date: record.date || new Date().toISOString().split('T')[0],
        service_provided: record.service_provided || '',
        eoid_number: record.eoid_number || '',
        residence_id_no: record.residence_id_no || '',
        etd: record.etd || '',
        letter_number: record.letter_number || '',
        document_type: record.document_type || 'Scanned Letter',
      });
      fetchAttachments(record.id);
    } else {
      setFormData(prev => ({
        ...prev,
        box_number: MODULE_BOX_MAP[type] || 'Visa-000001',
        full_name: '',
        sex: 'Male',
        citizenship: '',
        passport_number: '',
        request_number: '',
        date: new Date().toISOString().split('T')[0],
        service_provided: '',
        eoid_number: '',
        residence_id_no: '',
        etd: '',
        letter_number: '',
        document_type: 'Scanned Letter',
      }));
    }
  }, [record, type, defaultBoxNumber]);

  const fetchAttachments = async (recordId: string) => {
    const { data, error } = await supabase
      .from('record_attachments')
      .select('*')
      .eq('record_id', recordId)
      .eq('record_table', TABLE_MAP[type]);
    
    if (!error && data) {
      setAttachments(data as RecordAttachment[]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [file.name]: url }));
    }

    if (record) {
      // Direct upload if record exists
      uploadFile(file, record.id);
    } else {
      // Queue for later if it's a new record
      setPendingFiles([...pendingFiles, file]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async (file: File, recordId: string): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${TABLE_MAP[type]}/${recordId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('immigration-docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('record_attachments')
        .insert([{
          record_id: recordId,
          record_table: TABLE_MAP[type],
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          size_bytes: file.size,
          created_by: user.id
        }]);

      if (dbError) throw dbError;
      
      const { data: { publicUrl } } = supabase.storage.from('immigration-docs').getPublicUrl(filePath);
      
      // Update attachment_url for the record in its main table
      const { error: updateError } = await supabase
        .from(TABLE_MAP[type])
        .update({ attachment_url: publicUrl })
        .eq('id', recordId);
      
      if (updateError) {
        console.error(`Failed to update ${TABLE_MAP[type]} attachment_url:`, updateError);
        // We don't throw here so the attachment is still considered "saved" in the record_attachments table
        // But we can inform the user that the main link failed
        setError(`File uploaded but failed to link to record. Please Refresh. Details: ${updateError.message}`);
      } else {
        console.log(`Successfully updated ${TABLE_MAP[type]} attachment_url`);
      }

      fetchAttachments(recordId);
      return publicUrl;
    } catch (err: any) {
      setError('Upload failed: ' + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = (attachment: RecordAttachment) => {
    setAttachmentToDelete(attachment);
  };

  const executeDeleteAttachment = async (attachment: RecordAttachment) => {
    try {
      await supabase.storage.from('immigration-docs').remove([attachment.file_path]);
      await supabase.from('record_attachments').delete().eq('id', attachment.id);
      
      // Clear attachment_url if this was the last one and it's an Yellow Card record
      if (type === 'Yellow Card' && record && attachments.length === 1) {
        await supabase.from('airport_records').update({ attachment_url: null }).eq('id', record.id);
      }
      
      setAttachments(attachments.filter(a => a.id !== attachment.id));
    } catch (err: any) {
      setError('Delete failed: ' + err.message);
    } finally {
      setAttachmentToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const tableName = TABLE_MAP[type];
      const basePayload: any = {
        full_name: formData.full_name,
        sex: formData.sex,
        citizenship: formData.citizenship,
        passport_number: formData.passport_number,
        request_number: formData.request_number,
        date: formData.date,
        service_provided: formData.service_provided,
        created_by: user.id,
      };

      // Ensure each module is assigned to its specific box number
      basePayload.box_number = MODULE_BOX_MAP[type];

      if (type === 'EOID') basePayload.eoid_number = formData.eoid_number;
      if (type === 'Residence ID') basePayload.residence_id_no = formData.residence_id_no;
      if (type === 'ETD') basePayload.etd = formData.etd;
      if (type === 'Yellow Card') {
        basePayload.letter_number = formData.letter_number;
        basePayload.document_type = formData.document_type;
      }

      let savedRecord: any = record;

      if (record) {
        // Remove created_by from update payload as it should remain original creator
        const { created_by, ...updatePayload } = basePayload;
        const { data, error } = await supabase.from(tableName).update(updatePayload).eq('id', record.id).select().single();
        if (error) throw error;
        savedRecord = data;
        await logger.log('UPDATE', type, `Updated record for ${basePayload.full_name}`, record.id);
      } else {
        const { data, error } = await supabase.from(tableName).insert([basePayload]).select().single();
        if (error) throw error;
        savedRecord = data;
        await logger.log('CREATE', type, `Created new record for ${basePayload.full_name}`, savedRecord.id);
      }

      // Handle pending uploads
      if (savedRecord && savedRecord.id && pendingFiles.length > 0) {
        setUploading(true);
        let firstUrl: string | null = null;
        for (const file of pendingFiles) {
          const url = await uploadFile(file, savedRecord.id);
          if (!firstUrl) firstUrl = url;
        }
        
        // Refresh savedRecord to get the attachment_url
        const { data: updatedRecord } = await supabase.from(tableName).select('*').eq('id', savedRecord.id).single();
        if (updatedRecord) savedRecord = updatedRecord;
      }

      onSuccess(savedRecord);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
  };


  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type === 'application/pdf') return <FileTextIcon className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        className="bg-[#f8faf9] w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200 transition-all font-sans"
      >
        <header className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex flex-col text-left">
            <h3 className="text-xl font-semibold text-slate-800 tracking-tight">
              {record ? 'Edit Record' : 'Register Record'} — <span className="text-[#2b825a] font-extrabold">{type}</span> 
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-none bg-transparent">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form id="record-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-hide">
          {/* Flat Inline Row for Date & Service Provided */}
          <div className="grid grid-cols-2 gap-8 pb-6 border-b border-slate-100/80">
            <div className="relative">
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">📅</span>
              <input
                required
                type="date"
                className="w-full text-slate-700 font-bold bg-transparent border-none border-b border-slate-200 focus:border-[#2b825a] pb-2 text-sm outline-none transition-all cursor-pointer"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <select
                required
                className="w-full text-slate-700 font-bold bg-transparent border-none border-b border-slate-200 focus:border-[#2b825a] pb-2 text-sm outline-none transition-all cursor-pointer"
                value={formData.service_provided || 'VISA EXTENSION'}
                onChange={e => setFormData({ ...formData, service_provided: e.target.value })}
              >
                <option value="VISA EXTENSION">VISA EXTENSION</option>
                <option value="NEW ENTRY REGISTRATION">NEW ENTRY REGISTRATION</option>
                <option value="ID CARD VERIFICATION">ID CARD VERIFICATION</option>
                <option value="EXIT PERMIT EXEMPT">EXIT PERMIT EXEMPT</option>
                <option value="YELLOW CARD HEALTH CHECK">YELLOW CARD HEALTH CHECK</option>
              </select>
            </div>
          </div>

          {/* ATTACHED DOCUMENTS block (Pristinely matching Screenshot 1) */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest text-left">
              ATTACHED DOCUMENTS ({attachments.length + pendingFiles.length})
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2b825a] hover:bg-[#206243] text-white rounded-xl text-xs font-extrabold transition-all shadow-sm cursor-pointer border-none outline-none"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Paperclip className="w-4 h-4" />}
                <span>Upload Files</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1a73e8] hover:bg-[#155cb8] text-white rounded-xl text-xs font-extrabold transition-all shadow-sm cursor-pointer border-none outline-none"
              >
                <Scan className="w-4 h-4" />
                <span>Scan via Camera</span>
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect}
                accept="image/*,application/pdf"
              />
            </div>

            {/* Grid of attached documents matching Screenshot 1 */}
            <div className="flex flex-wrap gap-4 pt-2">
              {attachments.map((file) => {
                const isImg = file.content_type?.startsWith('image/');
                const fileUrl = supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl;
                return (
                  <div key={file.id} className="relative bg-[#ebeee9] border border-slate-200/60 p-3 rounded-2xl w-48 flex-shrink-0 flex flex-col justify-between group transition-all shadow-xs">
                    <button
                      type="button"
                      onClick={() => deleteAttachment(file)}
                      className="absolute -top-1.5 -right-1.5 bg-[#d93025] text-white hover:bg-rose-700 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer transition-colors border-2 border-white shadow-md font-bold text-xs"
                      title="Delete document"
                    >
                      ×
                    </button>
                    
                    <div 
                      className="w-full h-24 bg-white border border-slate-200/40 rounded-xl overflow-hidden flex items-center justify-center self-center cursor-pointer"
                      onClick={() => window.open(fileUrl, '_blank')}
                    >
                      {isImg ? (
                        <img 
                          src={fileUrl} 
                          alt="preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-[#1b8b58]">
                          {getFileIcon(file.content_type)}
                          <span className="text-[9px] font-black uppercase text-[#1b8b58] tracking-wider">PDF SCAN</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 text-left truncate">
                      <span className="text-[11px] font-bold text-slate-800 truncate block w-full" title={file.file_name}>
                        {file.file_name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                        {(file.size_bytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                );
              })}

              {pendingFiles.map((file, idx) => (
                <div key={idx} className="relative bg-emerald-50 border border-emerald-200/50 p-3 rounded-2xl w-48 flex-shrink-0 flex flex-col justify-between group animate-pulse shadow-xs">
                  <button
                    type="button"
                    onClick={() => removePendingFile(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-[#d93025] text-white hover:bg-rose-700 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer border-2 border-white shadow-sm font-bold text-xs"
                  >
                    ×
                  </button>
                  
                  <div className="w-full h-24 bg-white border border-emerald-100/50 rounded-xl overflow-hidden flex items-center justify-center self-center">
                    {file.type.startsWith('image/') && previews[file.name] ? (
                      <img 
                        src={previews[file.name]} 
                        alt="preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        {getFileIcon(file.type)}
                        <span className="text-[8px] font-bold text-slate-400">PENDING</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 text-left">
                    <span className="text-[11px] font-bold text-emerald-800 truncate block w-full">
                      {file.name}
                    </span>
                    <span className="text-[9px] text-emerald-500 font-bold block mt-0.5">
                      Uploading...
                    </span>
                  </div>
                </div>
              ))}

              {attachments.length === 0 && pendingFiles.length === 0 && (
                <div className="w-full py-8 border border-dashed border-slate-200 rounded-2xl text-center bg-white/50">
                  <span className="text-2xl block mb-1.5">📄</span>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No active document scans attached</p>
                </div>
              )}
            </div>
          </div>

          {/* Core Biodata Form Parameters */}
          <div className="pt-6 border-t border-slate-100 space-y-5 text-left">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              REGISTRY BIODATA SECTION
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Identification Name</label>
                <input
                  required
                  placeholder="e.g. Hasan Abdu"
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sex</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
                    value={formData.sex}
                    onChange={e => setFormData({ ...formData, sex: e.target.value as any })}
                  >
                    <option value="Male">MALE</option>
                    <option value="Female">FEMALE</option>
                    <option value="Other">OTHER</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Citizenship</label>
                  <input
                    required
                    list="citizenships-list"
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                    value={formData.citizenship}
                    onChange={e => setFormData({ ...formData, citizenship: e.target.value })}
                    placeholder="Search..."
                  />
                  <datalist id="citizenships-list">
                    {CITIZENSHIPS.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Passport Number</label>
                <input
                  required
                  placeholder="e.g. EP0192837"
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                  value={formData.passport_number}
                  onChange={e => setFormData({ ...formData, passport_number: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Request / Reference Number</label>
                <input
                  required
                  placeholder="e.g. REQ-00122"
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                  value={formData.request_number}
                  onChange={e => setFormData({ ...formData, request_number: e.target.value })}
                />
              </div>

              {/* Dynamic Module Conditional Parameters */}
              {type === 'EOID' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOID Number</label>
                  <input
                    required
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                    value={formData.eoid_number}
                    onChange={e => setFormData({ ...formData, eoid_number: e.target.value })}
                  />
                </div>
              )}
              {type === 'Residence ID' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Residence ID No.</label>
                  <input
                    required
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                    value={formData.residence_id_no}
                    onChange={e => setFormData({ ...formData, residence_id_no: e.target.value })}
                  />
                </div>
              )}
              {type === 'ETD' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ETD Reference Code</label>
                  <input
                    required
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                    value={formData.etd}
                    onChange={e => setFormData({ ...formData, etd: e.target.value })}
                  />
                </div>
              )}
              {type === 'Yellow Card' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Yellow Card Registration ID</label>
                    <input
                      required
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                      value={formData.letter_number}
                      onChange={e => setFormData({ ...formData, letter_number: e.target.value })}
                      placeholder="ETH-YC-XXXXX"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Document Classification Type</label>
                    <select
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
                      value={formData.document_type}
                      onChange={e => setFormData({ ...formData, document_type: e.target.value })}
                    >
                      <option value="Yellow Card Scan">Yellow Card Scan</option>
                      <option value="Origin ID Card">Origin ID Card</option>
                      <option value="Diaspora Clearance Certificate">Diaspora Clearance Certificate</option>
                      <option value="Temporary Diaspora Permit">Temporary Diaspora Permit</option>
                    </select>
                  </div>
                </>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Division File Box ID</label>
                <input
                  readOnly
                  className="w-full px-4 py-3 bg-slate-100 border border-transparent rounded-xl text-xs font-bold text-slate-400 font-mono outline-none cursor-not-allowed"
                  value={MODULE_BOX_MAP[type]}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-3 shadow-xs text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs font-bold leading-tight">{error}</p>
            </div>
          )}
        </form>

        <footer className="px-8 py-5 bg-white border-t border-slate-100 flex items-center justify-end gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-extrabold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all cursor-pointer border-none bg-transparent"
          >
            Cancel
          </button>
          
          <button
            form="record-form"
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-[#2b825a] hover:bg-[#206243] text-white rounded-lg text-xs font-extrabold transition-all shadow-sm flex items-center gap-2 cursor-pointer border-none outline-none"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>Save Record</span>
            )}
          </button>
        </footer>
      </motion.div>

      {/* Modern React Custom Confirmation Modal for Attachments */}
      <AnimatePresence>
        {attachmentToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAttachmentToDelete(null)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative z-10"
            >
              <div className="flex items-center gap-3.5 mb-5">
                <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Remove Attachment?</h3>
                  <p className="text-xs text-slate-500 font-medium">This deletes the digitized scan file permanently.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mb-5 text-xs text-slate-700 font-medium truncate">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Filename:</span>
                <span className="font-bold text-slate-900 truncate block">{attachmentToDelete.file_name}</span>
              </div>

              <div className="flex items-center gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setAttachmentToDelete(null)}
                  className="px-4 py-2.5 hover:bg-slate-100 rounded-full text-xs font-black uppercase text-slate-500 transition-colors"
                >
                  Keep File
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteAttachment(attachmentToDelete)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-black uppercase transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
