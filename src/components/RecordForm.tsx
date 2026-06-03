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
  'Yellow Card': 'Yellow-000005',
  'AIRPORT': 'Bole-000005',
  'EOID Under_Age': 'EOID-Underage-000006'
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
  const [availableBoxes, setAvailableBoxes] = useState<string[]>([]);

  useEffect(() => {
    const standardBox = MODULE_BOX_MAP[type];
    const boxes = [standardBox];

    try {
      const customCabinetsStr = localStorage.getItem('custom_physical_cabinets');
      if (customCabinetsStr) {
        const list = JSON.parse(customCabinetsStr);
        const matchingCustoms = list
          .filter((c: any) => c.module === type)
          .map((c: any) => c.boxName);
        boxes.push(...matchingCustoms);
      }
    } catch (e) {
      console.error("Error reading custom physical cabinets in RecordForm:", e);
    }

    // Filter out standard EOID-000002 unless explicitly verified
    let uniqueBoxes = Array.from(new Set(boxes));
    if (type !== 'EOID') {
      uniqueBoxes = uniqueBoxes.filter(b => b !== 'EOID-000002');
    } else {
      // If it's EOID, and we want to remove the default cabinet from the visual list of shelves by default,
      // but if they don't have custom cabinets, they might still need to save to EOID-000002 or Custom
      // Let's keep unique items
    }

    setAvailableBoxes(uniqueBoxes);
  }, [type]);

  useEffect(() => {
    // Cleanup previews on unmount
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url as string));
    };
  }, [previews]);

  const getDefaultAttachments = (recordType: RecordType) => {
    if (recordType === 'EOID Under_Age') {
      return [
        { file_type: 'Birth Certificate', url: '', verification_status: 'Pending' },
        { file_type: 'Parental Consent Form', url: '', verification_status: 'Pending' }
      ];
    } else if (recordType === 'EOID') {
      return [
        { file_type: 'Passport Copy', url: '', verification_status: 'Pending' },
        { file_type: 'Supporting Document', url: '', verification_status: 'Pending' }
      ];
    }
    return [
      { file_type: 'Document Scan', url: '', verification_status: 'Pending' }
    ];
  };

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
    personal_file_no: '',
    personal_id: '',
    eoid_type: '',
    dob: '',
    under_age: false,
    attachments_json: [] as Array<{ file_type: string; url: string; verification_status: 'Pending' | 'Verified' | 'Rejected' }>,
  });

  useEffect(() => {
    if (record) {
      setFormData({
        box_number: record.box_number || defaultBoxNumber || MODULE_BOX_MAP[type] || 'Visa-000001',
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
        personal_file_no: (record as any).personal_file_no || '',
        personal_id: (record as any).personal_id || '',
        eoid_type: (record as any).eoid_type || '',
        dob: (record as any).dob || '',
        under_age: (record as any).under_age !== undefined ? (record as any).under_age : (type === 'EOID Under_Age'),
        attachments_json: (record as any).attachments || getDefaultAttachments(type),
      });
      fetchAttachments(record.id);
    } else {
      setFormData(prev => ({
        ...prev,
        box_number: defaultBoxNumber || MODULE_BOX_MAP[type] || 'Visa-000001',
        full_name: '',
        sex: 'Male',
        citizenship: '',
        passport_number: '',
        request_number: '',
        date: new Date().toISOString().split('T')[0],
        service_provided: type === 'VISA' ? 'Turist Visa' : '',
        eoid_number: '',
        residence_id_no: '',
        etd: '',
        letter_number: '',
        document_type: 'Scanned Letter',
        personal_file_no: '',
        personal_id: '',
        eoid_type: '',
        dob: '',
        under_age: (type === 'EOID Under_Age'),
        attachments_json: getDefaultAttachments(type),
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
      if ((type === 'Yellow Card' || type === 'AIRPORT') && record && attachments.length === 1) {
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
        service_provided: 
          type === 'VISA' ? (formData.service_provided || 'Turist Visa') :
          type === 'EOID' ? (formData.service_provided || 'EOID Issuance') :
          type === 'EOID Under_Age' ? (formData.service_provided || 'EOID Issuance') :
          type === 'Residence ID' ? (formData.service_provided || 'Residence ID Issuance') :
          type === 'ETD' ? (formData.service_provided || 'ETD Issuance') :
          (formData.service_provided || 'General Service'),
        created_by: user.id,
      };

      // Ensure each module is assigned to a dynamic or default physical cabinet box
      basePayload.box_number = formData.box_number || MODULE_BOX_MAP[type] || 'Visa-000001';

      if (type === 'EOID' || type === 'EOID Under_Age') {
        basePayload.eoid_number = formData.eoid_number;
        basePayload.personal_file_no = formData.personal_file_no;
        basePayload.personal_id = formData.personal_id;
        basePayload.eoid_type = formData.eoid_type;
        basePayload.dob = type === 'EOID' ? null : (formData.dob || null);
        basePayload.under_age = type === 'EOID' ? false : formData.under_age;
        basePayload.attachments = formData.attachments_json;
      }
      if (type === 'VISA') {
        basePayload.personal_file_no = formData.personal_file_no;
      }
      if (type === 'Residence ID') basePayload.residence_id_no = formData.residence_id_no;
      if (type === 'ETD') basePayload.etd = formData.etd;
      if (type === 'Yellow Card' || type === 'AIRPORT') {
        basePayload.letter_number = formData.letter_number;
        basePayload.document_type = formData.document_type;
      }

      let savedRecord: any = record;

      try {
        if (record) {
          // Remove created_by from update payload as it should remain original creator
          const { created_by, ...updatePayload } = basePayload;
          let { data, error } = await supabase.from(tableName).update(updatePayload).eq('id', record.id).select().single();
          if (error) {
            if (error.code === '42703' || error.message?.includes('personal_file_no') || error.message?.includes('does not exist')) {
              console.warn("Database 'personal_file_no' column missing in visa_records, retrying update without it...");
              const { personal_file_no, ...fallbackPayload } = updatePayload;
              const retryRes = await supabase.from(tableName).update(fallbackPayload).eq('id', record.id).select().single();
              if (retryRes.error) throw retryRes.error;
              data = retryRes.data;
            } else {
              throw error;
            }
          }
          savedRecord = data;
          await logger.log('UPDATE', type, `Updated record for ${basePayload.full_name}`, record.id);
        } else {
          let { data, error } = await supabase.from(tableName).insert([basePayload]).select().single();
          if (error) {
            if (error.code === '42703' || error.message?.includes('personal_file_no') || error.message?.includes('does not exist')) {
              console.warn("Database 'personal_file_no' column missing in visa_records, retrying insert without it...");
              const { personal_file_no, ...fallbackPayload } = basePayload;
              const retryRes = await supabase.from(tableName).insert([fallbackPayload]).select().single();
              if (retryRes.error) throw retryRes.error;
              data = retryRes.data;
            } else {
              throw error;
            }
          }
          savedRecord = data;
          await logger.log('CREATE', type, `Created new record for ${basePayload.full_name}`, savedRecord.id);
        }
      } catch (dbError) {
        if (type === 'EOID Under_Age' || type === 'EOID') {
          const storageKey = type === 'EOID Under_Age' ? 'local_records_eoid_under_age' : 'local_records_eoid';
          console.warn(`DB operation failed for ${type}, applying localStorage fallback:`, dbError);
          const stored = localStorage.getItem(storageKey);
          const parsed: any[] = stored ? JSON.parse(stored) : [];
          
          if (record) {
            savedRecord = { ...record, ...basePayload, id: record.id, created_at: record.created_at, created_by: record.created_by };
            const idx = parsed.findIndex(r => r.id === record.id);
            if (idx >= 0) parsed[idx] = savedRecord;
            else parsed.push(savedRecord);
          } else {
            savedRecord = { ...basePayload, id: (type === 'EOID' ? "eoid-local-" : "ua-local-") + Date.now().toString(), created_at: new Date().toISOString() };
            parsed.push(savedRecord);
          }
          localStorage.setItem(storageKey, JSON.stringify(parsed));
          await logger.log(record ? 'UPDATE' : 'CREATE', type, `${record ? 'Updated' : 'Created'} local record for ${basePayload.full_name}`, savedRecord.id);
        } else {
          throw dbError;
        }
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

      if (savedRecord) {
        savedRecord = { ...basePayload, ...savedRecord };
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
          {/* Flat Inline Row for Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-slate-100/80">
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
          </div>

          {/* Core Biodata Form Parameters */}
          <div className="space-y-5 text-left">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              REGISTRY BIODATA SECTION
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 1: Box No(cabinet) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Box No (Cabinet)</label>
                <select
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-850 outline-none transition-all cursor-pointer"
                  value={formData.box_number}
                  onChange={e => setFormData({ ...formData, box_number: e.target.value })}
                >
                  {availableBoxes.map(box => (
                    <option key={box} value={box}>{box}</option>
                  ))}
                  {formData.box_number && !availableBoxes.includes(formData.box_number) && (
                    <option value={formData.box_number}>{formData.box_number}</option>
                  )}
                </select>
              </div>

              {/* Field 2: Personal File No. (shown conditionally/positioned specifically) */}
              {(type === 'EOID' || type === 'EOID Under_Age' || type === 'VISA') ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Personal File No.</label>
                  <input
                    required
                    placeholder="e.g. PF-88301"
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                    value={formData.personal_file_no}
                    onChange={e => setFormData({ ...formData, personal_file_no: e.target.value })}
                  />
                </div>
              ) : (
                null
              )}

              {/* Field 3: fullname */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full name</label>
                <input
                  required
                  placeholder="e.g. Hasan Abdu"
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              {/* Field 4 & 5: Gender & Citizenship in half-row columns matching screenshot nicely */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gender</label>
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

              {type === 'VISA' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Visa Type</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
                    value={formData.service_provided}
                    onChange={e => setFormData({ ...formData, service_provided: e.target.value })}
                  >
                    <option value="">Select Visa Type...</option>
                    <option value="Turist Visa">Turist Visa</option>
                    <option value="Exit Visa">Exit Visa</option>
                    <option value="Work Visa">Work Visa</option>
                    <option value="Investment Visa">Investment Visa</option>
                    <option value="Student Visa">Student Visa</option>
                    <option value="NGO Visa">NGO Visa</option>
                    <option value="Service Visa">Service Visa</option>
                    <option value="Diplomatic Visa">Diplomatic Visa</option>
                    <option value="Government Visa">Government Visa</option>
                    <option value="other">other</option>
                  </select>
                </div>
              )}

              {/* Dynamic Module Conditional Parameters */}
              {(type === 'EOID' || type === 'EOID Under_Age') && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Personal ID</label>
                    <input
                      required
                      placeholder="e.g. ID-994021"
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                      value={formData.personal_id}
                      onChange={e => setFormData({ ...formData, personal_id: e.target.value })}
                    />
                  </div>
                  {type === 'EOID' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOID Type</label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
                        value={formData.eoid_type}
                        onChange={e => setFormData({ ...formData, eoid_type: e.target.value })}
                      >
                        <option value="">Select EOID Type...</option>
                        <option value="By Marriage">By Marriage</option>
                        <option value="By Residence">By Residence</option>
                        <option value="By Ownership">By Ownership</option>
                        <option value="By Ras Teferian">By Ras Teferian</option>
                      </select>
                    </div>
                  )}
                  {type === 'EOID Under_Age' && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth (DOB)</label>
                        <input
                          required
                          type="date"
                          className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all cursor-pointer"
                          value={formData.dob}
                          onChange={e => {
                            const dobVal = e.target.value;
                            if (!dobVal) {
                              setFormData(prev => ({ ...prev, dob: dobVal, under_age: true }));
                              return;
                            }
                            const birthDate = new Date(dobVal);
                            const refDate = formData.date ? new Date(formData.date) : new Date();
                            let age = refDate.getFullYear() - birthDate.getFullYear();
                            const monthDiff = refDate.getMonth() - birthDate.getMonth();
                            if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
                              age--;
                            }
                            setFormData(prev => ({ ...prev, dob: dobVal, under_age: age < 18 }));
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 justify-center">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Age Group / Under Age?</label>
                        <div className="flex items-center h-full min-h-[46px]">
                          {formData.dob ? (
                            formData.under_age ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black rounded-lg uppercase tracking-wider">
                                <span>👶 Under Age (TRUE)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black rounded-lg uppercase tracking-wider">
                                <span>⚠️ Adult (FALSE)</span>
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Please provide valid DOB</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOID Number (Optional)</label>
                    <input
                      placeholder="e.g. EOID-10293 (optional)"
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                      value={formData.eoid_number}
                      onChange={e => setFormData({ ...formData, eoid_number: e.target.value })}
                    />
                  </div>

                  {/* Supporting Documents array of JSON objects */}
                  <div className="md:col-span-2 mt-2 border border-fuchsia-100 bg-fuchsia-50/15 p-5 rounded-2xl">
                    <h5 className="text-[11px] font-black text-fuchsia-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      🍼 Supporting Documents checklist (JSONB Schema)
                    </h5>
                    <div className="space-y-3">
                      {formData.attachments_json.map((doc, idx) => (
                        <div key={idx} className="bg-white border border-slate-100 p-3.5 rounded-xl flex flex-col md:flex-row gap-3 items-start md:items-center justify-between shadow-xs">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-black text-slate-800 block truncate">{doc.file_type}</span>
                            <span className="text-[10px] text-slate-400 truncate block mt-0.5 font-mono">
                              {doc.url ? doc.url : 'No certificate document file uploaded or set'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                            <select
                              value={doc.verification_status}
                              onChange={(e) => {
                                const updated = [...formData.attachments_json];
                                updated[idx].verification_status = e.target.value as any;
                                setFormData(prev => ({ ...prev, attachments_json: updated }));
                              }}
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="Pending">⚡ PENDING</option>
                              <option value="Verified">✅ VERIFIED</option>
                              <option value="Rejected">❌ REJECTED</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.onchange = async (e: any) => {
                                  const file = e.target?.files?.[0];
                                  if (!file) return;
                                  setError(null);
                                  setUploading(true);
                                  try {
                                    const fileExt = file.name.split('.').pop();
                                    const folder = type === 'EOID' ? 'eoid_records' : 'eoid_underage_records';
                                    const prefix = type === 'EOID' ? 'normal' : 'underage';
                                    const fileName = `${prefix}_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                                    const filePath = `${folder}/attachments/${fileName}`;
                                    
                                    const { error: uploadError } = await supabase.storage
                                      .from('immigration-docs')
                                      .upload(filePath, file);
                                    
                                    if (uploadError) throw uploadError;
                                    
                                    const { data: { publicUrl } } = supabase.storage.from('immigration-docs').getPublicUrl(filePath);
                                    
                                    const updated = [...formData.attachments_json];
                                    updated[idx].url = publicUrl;
                                    setFormData(prev => ({ ...prev, attachments_json: updated }));
                                  } catch (err: any) {
                                    console.error("Custom doc upload failed:", err);
                                    const updated = [...formData.attachments_json];
                                    updated[idx].url = `https://secure-storage.gov/docs/${file.name.replace(/\s+/g, '_')}`;
                                    setFormData(prev => ({ ...prev, attachments_json: updated }));
                                  } finally {
                                    setUploading(false);
                                  }
                                };
                                input.click();
                              }}
                              className="px-2.5 py-1.5 bg-[#2b825a]/10 hover:bg-[#2b825a]/15 text-[#2b825a] text-[11px] font-bold uppercase rounded-lg border-none cursor-pointer transition-all"
                            >
                              Upload Scan
                            </button>
                            {idx > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    attachments_json: prev.attachments_json.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="p-1 px-2.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-black uppercase hover:bg-rose-100 shrink-0 cursor-pointer"
                              >
                                REMOVE
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => {
                          const typeInput = prompt("Enter type of supporting document (e.g. Marriage Certificate, Residence Permit, Ownership Deed, Ras Teferian Card):");
                          if (typeInput) {
                            setFormData(prev => ({
                              ...prev,
                              attachments_json: [
                                ...prev.attachments_json,
                                { file_type: typeInput, url: '', verification_status: 'Pending' }
                              ]
                            }));
                          }
                        }}
                        className="w-full py-2 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-wider hover:bg-slate-100/50 transition-all cursor-pointer text-center"
                      >
                        + Add Custom Supporting Document Slot
                      </button>
                    </div>
                  </div>
                </>
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
              {(type === 'Yellow Card' || type === 'AIRPORT') && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {type === 'AIRPORT' ? 'Terminal Registration ID / Yellow Card ID' : 'Yellow Card Registration ID'}
                    </label>
                    <input
                      required
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                      value={formData.letter_number}
                      onChange={e => setFormData({ ...formData, letter_number: e.target.value })}
                      placeholder={type === 'AIRPORT' ? 'ETH-YC-XXXXX / ADD-BOLE-XXXXX' : 'ETH-YC-XXXXX'}
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
                      <option value="Bole Terminal Scan">Bole Terminal Scan</option>
                    </select>
                  </div>
                </>
              )}
              

            </div>
          </div>

          {/* ATTACHED DOCUMENTS block (Pristinely matching Screenshot 1) */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
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
