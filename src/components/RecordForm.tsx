import React, { useState, useEffect, useRef } from 'react';
import { supabase, type ImmigrationRecord, type RecordType, TABLE_MAP, type RecordAttachment } from '../lib/supabase';
import { X, Save, AlertCircle, Loader2, Paperclip, Trash2, FileIcon, ImageIcon, FileTextIcon, Scan, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { CITIZENSHIPS } from '../constants';

interface RecordFormProps {
  type: RecordType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record?: ImmigrationRecord | null;
}

export default function RecordForm({ type, onClose, onSuccess, record }: RecordFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<RecordAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    box_number: '',
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

    if (record) {
      // Direct upload if record exists
      uploadFile(file, record.id);
    } else {
      // Queue for later if it's a new record
      setPendingFiles([...pendingFiles, file]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async (file: File, recordId: string) => {
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
      fetchAttachments(recordId);
    } catch (err: any) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachment: RecordAttachment) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      await supabase.storage.from('immigration-docs').remove([attachment.file_path]);
      await supabase.from('record_attachments').delete().eq('id', attachment.id);
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
        box_number: formData.box_number,
        full_name: formData.full_name,
        sex: formData.sex,
        citizenship: formData.citizenship,
        passport_number: formData.passport_number,
        request_number: formData.request_number,
        date: formData.date,
        service_provided: formData.service_provided,
        created_by: user.id,
      };

      if (type === 'EOID') basePayload.eoid_number = formData.eoid_number;
      if (type === 'Residence ID') basePayload.residence_id_no = formData.residence_id_no;
      if (type === 'ETD') basePayload.etd = formData.etd;

      let savedRecordId = record?.id;

      if (record) {
        const { error } = await supabase.from(tableName).update(basePayload).eq('id', record.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from(tableName).insert([basePayload]).select().single();
        if (error) throw error;
        savedRecordId = data.id;
      }

      // Handle pending uploads
      if (savedRecordId && pendingFiles.length > 0) {
        setUploading(true);
        for (const file of pendingFiles) {
          await uploadFile(file, savedRecordId);
        }
      }

      onSuccess();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-colors">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border dark:border-gray-800 transition-colors"
      >
        <header className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 transition-colors">
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {record ? 'Review/Edit' : 'Create New'} {type} Record
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form id="record-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-gray-900 transition-colors">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">BOX Number</label>
                <input
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium dark:text-gray-100"
                  value={formData.box_number}
                  onChange={e => setFormData({ ...formData, box_number: e.target.value })}
                  placeholder="BOX-2024-XXX"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium dark:text-gray-100"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Sex</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium dark:text-gray-100"
                    value={formData.sex}
                    onChange={e => setFormData({ ...formData, sex: e.target.value as any })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Citizenship</label>
                  <input
                    required
                    list="citizenships-list"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium dark:text-gray-100"
                    value={formData.citizenship}
                    onChange={e => setFormData({ ...formData, citizenship: e.target.value })}
                    placeholder="Search country..."
                  />
                  <datalist id="citizenships-list">
                    {CITIZENSHIPS.map(c => <option key={c} value={c} className="dark:bg-gray-800" />)}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Passport Number</label>
                <input
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium font-mono dark:text-gray-100"
                  value={formData.passport_number}
                  onChange={e => setFormData({ ...formData, passport_number: e.target.value })}
                />
              </div>
              {type === 'EOID' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">EOID Number</label>
                  <input
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium font-mono dark:text-gray-100"
                    value={formData.eoid_number}
                    onChange={e => setFormData({ ...formData, eoid_number: e.target.value })}
                  />
                </div>
              )}
              {type === 'Residence ID' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Residence ID No.</label>
                  <input
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium font-mono dark:text-gray-100"
                    value={formData.residence_id_no}
                    onChange={e => setFormData({ ...formData, residence_id_no: e.target.value })}
                  />
                </div>
              )}
              {type === 'ETD' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">ETD</label>
                  <input
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium font-mono dark:text-gray-100"
                    value={formData.etd}
                    onChange={e => setFormData({ ...formData, etd: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Request Number</label>
                <input
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium font-mono dark:text-gray-100"
                  value={formData.request_number}
                  onChange={e => setFormData({ ...formData, request_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  required
                  type="date"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium dark:text-gray-100 dark:color-scheme-dark"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Service Provided</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none shadow-inner dark:text-gray-100"
              value={formData.service_provided}
              onChange={e => setFormData({ ...formData, service_provided: e.target.value })}
              placeholder="Describe the immigration service rendered..."
            />
          </div>

          {/* Attachments Section */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <h4 className="font-bold text-gray-900 dark:text-white tracking-tight">Evidence & Scanned Documents</h4>
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
                className="flex items-center space-x-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                <span>{uploading ? 'Processing...' : 'Scan / Upload'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {attachments.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 group transition-colors">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      {getFileIcon(file.content_type)}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{file.file_name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{(file.size_bytes / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => window.open(supabase.storage.from('immigration-docs').getPublicUrl(file.file_path).data.publicUrl)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAttachment(file)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {pendingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 group animate-pulse">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-400 truncate">{file.name}</p>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-tight">Pending Save</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingFile(idx)}
                    className="p-1.5 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {attachments.length === 0 && pendingFiles.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                  <p className="text-sm text-gray-400 dark:text-gray-600 italic">No evidence documents attached yet</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-start space-x-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}
        </form>

        <footer className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-end space-x-3 transition-colors">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            form="record-form"
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{record ? 'Apply Changes' : 'Save Record'}</span>
              </>
            )}
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
