import React, { useState, useEffect, useRef } from 'react';
import { supabase, type ImmigrationRecord, type RecordType, TABLE_MAP, type RecordAttachment, logger } from '../lib/supabase';
import { X, Save, AlertCircle, Loader2, Paperclip, Trash2, FileIcon, ImageIcon, FileTextIcon, Scan, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { CITIZENSHIPS } from '../constants';

interface RecordFormProps {
  type: RecordType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: ImmigrationRecord) => void;
  record?: ImmigrationRecord | null;
}

export default function RecordForm({ type, onClose, onSuccess, record }: RecordFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<RecordAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        box_number: record.box_number || '',
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
    }
  }, [record]);

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

  const deleteAttachment = async (attachment: RecordAttachment) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      await supabase.storage.from('immigration-docs').remove([attachment.file_path]);
      await supabase.from('record_attachments').delete().eq('id', attachment.id);
      
      // Clear attachment_url if this was the last one and it's an AIRPORT record
      if (type === 'AIRPORT' && record && attachments.length === 1) {
        await supabase.from('airport_records').update({ attachment_url: null }).eq('id', record.id);
      }
      
      setAttachments(attachments.filter(a => a.id !== attachment.id));
    } catch (err: any) {
      setError('Delete failed: ' + err.message);
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

      if (type !== 'AIRPORT') {
        basePayload.box_number = formData.box_number;
      }

      if (type === 'EOID') basePayload.eoid_number = formData.eoid_number;
      if (type === 'Residence ID') basePayload.residence_id_no = formData.residence_id_no;
      if (type === 'ETD') basePayload.etd = formData.etd;
      if (type === 'AIRPORT') {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--m3-surface)]/80 backdrop-blur-xl transition-all">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        className="bg-[var(--m3-surface-container-high)] w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-[var(--m3-outline-variant)]/30 transition-all font-sans"
      >
        <header className="px-8 py-6 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-[var(--m3-on-surface)] tracking-tight">
              {record ? 'Review & Edit' : 'New Registration'} 
            </h3>
            <p className="text-xs font-medium text-[var(--m3-on-surface-variant)] uppercase tracking-widest">{type} MODULE</p>
          </div>
          <button onClick={onClose} className="p-3 text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-highest)] rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <form id="record-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-8 space-y-10 scrollbar-hide">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {type !== 'AIRPORT' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Box Number</label>
                <input
                  required
                  className="m3-input font-mono"
                  value={formData.box_number}
                  onChange={e => setFormData({ ...formData, box_number: e.target.value })}
                  placeholder="BOX-2024-XXX"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Full Name</label>
              <input
                required
                className="m3-input"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Sex</label>
                <select
                  className="m3-input"
                  value={formData.sex}
                  onChange={e => setFormData({ ...formData, sex: e.target.value as any })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Citizenship</label>
                <input
                  required
                  list="citizenships-list"
                  className="m3-input"
                  value={formData.citizenship}
                  onChange={e => setFormData({ ...formData, citizenship: e.target.value })}
                  placeholder="Search..."
                />
                <datalist id="citizenships-list">
                  {CITIZENSHIPS.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Passport Number</label>
              <input
                required
                className="m3-input font-mono"
                value={formData.passport_number}
                onChange={e => setFormData({ ...formData, passport_number: e.target.value })}
              />
            </div>

            {type === 'EOID' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">EOID Number</label>
                <input
                  required
                  className="m3-input font-mono"
                  value={formData.eoid_number}
                  onChange={e => setFormData({ ...formData, eoid_number: e.target.value })}
                />
              </div>
            )}
            {type === 'Residence ID' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Residence ID No.</label>
                <input
                  required
                  className="m3-input font-mono"
                  value={formData.residence_id_no}
                  onChange={e => setFormData({ ...formData, residence_id_no: e.target.value })}
                />
              </div>
            )}
            {type === 'ETD' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">ETD</label>
                <input
                  required
                  className="m3-input font-mono"
                  value={formData.etd}
                  onChange={e => setFormData({ ...formData, etd: e.target.value })}
                />
              </div>
            )}
            {type === 'AIRPORT' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Letter Number</label>
                  <input
                    required
                    className="m3-input font-mono"
                    value={formData.letter_number}
                    onChange={e => setFormData({ ...formData, letter_number: e.target.value })}
                    placeholder="ICS/BOLE/XXX"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Document Type</label>
                  <select
                    className="m3-input"
                    value={formData.document_type}
                    onChange={e => setFormData({ ...formData, document_type: e.target.value })}
                  >
                    <option value="Scanned Letter">Scanned Letter</option>
                    <option value="Official Document">Official Document</option>
                    <option value="Evidence Scan">Evidence Scan</option>
                    <option value="Airport Clearance">Airport Clearance</option>
                  </select>
                </div>
              </>
            )}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Request Number</label>
              <input
                required
                className="m3-input font-mono"
                value={formData.request_number}
                onChange={e => setFormData({ ...formData, request_number: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Date</label>
              <input
                required
                type="date"
                className="m3-input"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[var(--m3-on-surface-variant)] px-1">Service Details</label>
            <textarea
              required
              rows={4}
              className="m3-input resize-none"
              value={formData.service_provided}
              onChange={e => setFormData({ ...formData, service_provided: e.target.value })}
              placeholder="Record any critical service information here..."
            />
          </div>

          {/* Attachments Section */}
          <div className="pt-10 border-t border-[var(--m3-outline)]/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[var(--m3-primary-container)] rounded-2xl text-[var(--m3-on-primary-container)]">
                  <Paperclip className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--m3-on-surface)]">Document Attachments</h4>
                  <p className="text-xs text-[var(--m3-on-surface-variant)] font-medium">Scanned copies & legal evidence</p>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect}
                accept="image/*,application/pdf"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)] rounded-full text-sm font-bold hover:opacity-90 transition-all active:scale-95"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                <span>{uploading ? 'Processing...' : 'Upload File'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attachments.map((file) => (
                <div key={file.id} className="m3-card group p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-14 h-14 bg-[var(--m3-surface-container)] rounded-2xl flex items-center justify-center overflow-hidden border border-[var(--m3-outline)]/5">
                      {file.content_type?.startsWith('image/') ? (
                        <img 
                          src={supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl} 
                          alt="preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : getFileIcon(file.content_type)}
                    </div>
                    <div className="truncate pr-2">
                      <p className="text-sm font-bold text-[var(--m3-on-surface)] truncate">{file.file_name}</p>
                      <p className="text-xs text-[var(--m3-on-surface-variant)] font-black uppercase tracking-tighter opacity-50">{(file.size_bytes / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => window.open(supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl)}
                      className="p-2 text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-highest)] rounded-full transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAttachment(file)}
                      className="p-2 text-[var(--m3-error)] hover:bg-[var(--m3-error-container)]/20 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {pendingFiles.map((file, idx) => (
                <div key={idx} className="m3-card bg-[var(--m3-primary-container)]/10 border-[var(--m3-primary)]/20 group p-3 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-14 h-14 bg-[var(--m3-surface-container)] rounded-2xl flex items-center justify-center overflow-hidden border border-[var(--m3-primary)]/10">
                      {file.type.startsWith('image/') && previews[file.name] ? (
                        <img 
                          src={previews[file.name]} 
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      ) : getFileIcon(file.type)}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-[var(--m3-primary)] truncate">{file.name}</p>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--m3-primary)] opacity-70">Enqueuing...</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingFile(idx)}
                    className="p-2 text-[var(--m3-error)] hover:bg-[var(--m3-error-container)]/20 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {attachments.length === 0 && pendingFiles.length === 0 && (
              <div className="py-10 border-2 border-dashed border-[var(--m3-outline)]/10 rounded-[2rem] text-center">
                <div className="inline-flex p-4 bg-[var(--m3-surface-container)] rounded-2xl mb-4">
                  <Scan className="w-8 h-8 text-[var(--m3-on-surface-variant)] opacity-20" />
                </div>
                <p className="text-sm font-bold text-[var(--m3-on-surface-variant)] opacity-50">Drag files here or use upload button</p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-5 bg-[var(--m3-error-container)] text-[var(--m3-on-error-container)] rounded-[1.5rem] flex items-start gap-4 shadow-sm">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-bold leading-tight">{error}</p>
            </div>
          )}
        </form>

        <footer className="px-8 py-6 bg-[var(--m3-surface-container)] border-t border-[var(--m3-outline-variant)]/30 flex items-center justify-end gap-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 text-sm font-bold text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-highest)] rounded-full transition-colors"
          >
            Discard
          </button>
          <button
            form="record-form"
            type="submit"
            disabled={loading}
            className="m3-button-filled flex items-center gap-3 px-12 py-3 shadow-xl shadow-[var(--m3-primary)]/20"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{record ? 'Apply Changes' : 'Finalize Record'}</span>
              </>
            )}
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
