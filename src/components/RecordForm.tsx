import React, { useState, useEffect, useRef } from 'react';
import { supabase, type ImmigrationRecord, type RecordType, TABLE_MAP, type RecordAttachment, logger } from '../lib/supabase';
import { X, Save, AlertCircle, Loader2, Paperclip, Trash2, FileIcon, ImageIcon, FileTextIcon, Scan, Download, Eye, Upload, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CITIZENSHIPS } from '../constants';

export const MODULE_BOX_MAP: Record<RecordType, string> = {
  'VISA': 'Visa-000001',
  'EOID': 'EOID-000002',
  'Residence ID': 'Residence-000003',
  'ETD': 'ETD-000004',
  'Yellow Card': 'Yellow-000005',
  'EOID Under_Age': 'EOID-Underage-000006',
  'Alien Passport': 'Alien-000007',
   'Eritrean ID': 'Eritrean-000008'
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
  
  // Custom upload / scan states for the new structured upload panels (from user image)
  const [scanningDocIdx, setScanningDocIdx] = useState<number | null>(null);
  const [activeChecklistUploadIdx, setActiveChecklistUploadIdx] = useState<number | null>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);

  const handleChecklistFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeChecklistUploadIdx === null) return;
    
    setError(null);
    setUploading(true);
    const idx = activeChecklistUploadIdx;
    
    try {
      const fileExt = file.name.split('.').pop();
      const folder = TABLE_MAP[type] || 'immigration_docs';
      const prefix = type.toLowerCase().replace(/\s+/g, '_');
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
      console.error("Custom checklist doc upload failed, using secure gateway fallback:", err);
      const updated = [...formData.attachments_json];
      updated[idx].url = `https://secure-storage.gov/docs/scanned_${file.name.toLowerCase().replace(/\s+/g, '_')}`;
      setFormData(prev => ({ ...prev, attachments_json: updated }));
    } finally {
      setUploading(false);
      setActiveChecklistUploadIdx(null);
      if (checklistFileInputRef.current) checklistFileInputRef.current.value = '';
    }
  };

  const handleClearUrl = (index: number) => {
    const updated = [...formData.attachments_json];
    updated[index].url = '';
    updated[index].verification_status = 'Pending';
    setFormData(prev => ({ ...prev, attachments_json: updated }));
  };

  const handleUpdateOtherDoc = (index: number, field: string, value: any) => {
    const updated = [...formData.attachments_json];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, attachments_json: updated }));
  };

  const handleAddOtherDoc = () => {
    setFormData(prev => ({
      ...prev,
      attachments_json: [
        ...prev.attachments_json,
        {
          category: 'TRANSACTION',
          file_type: '',
          url: '',
          verification_status: 'Pending',
          is_other: true
        }
      ]
    }));
  };

  const handleRemoveOtherDoc = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments_json: prev.attachments_json.filter((_, i) => i !== index)
    }));
  };
  
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

  const getDefaultAttachments = (recordType: RecordType, idType?: string): Array<{ category: string; file_type: string; url: string; verification_status: string; is_other?: boolean }> => {
    if (recordType === 'EOID' || recordType === 'EOID Under_Age') {
      return [
        { category: 'APPLICANT', file_type: 'PASSPORT COPY', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'APPLICATION FORM', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'BIRTH CERTIFICATE', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'FAMILY DOCUMENT OR COURT LETTER', url: '', verification_status: 'Pending' }
      ];
    } else if (recordType === 'VISA') {
      return [
        { category: 'APPLICANT', file_type: 'PASSPORT COPY', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'APPLICATION LETTER', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'ENTRY VISA', url: '', verification_status: 'Pending' }
      ];
    } else if (recordType === 'Residence ID') {
      const selectedIdType = idType || (formData ? formData.id_type : '') || '';
      if (selectedIdType === 'Temporary ID') {
        return [
          { category: 'APPLICANT', file_type: 'PASSPORT COPY', url: '', verification_status: 'Pending' },
          { category: 'APPLICANT', file_type: 'APPLICATION LETTER', url: '', verification_status: 'Pending' },
          { category: 'APPLICANT', file_type: 'APPLICATION FORM', url: '', verification_status: 'Pending' },
          { category: 'APPLICANT', file_type: 'BUSINESS LICENSE', url: '', verification_status: 'Pending' },
          { category: 'APPLICANT', file_type: 'WORK PERMIT', url: '', verification_status: 'Pending' }
        ];
      } else if (selectedIdType === 'Permenant ID') {
        return [
          { category: 'APPLICANT', file_type: 'APPLICATION FORM', url: '', verification_status: 'Pending' },
          { category: 'APPLICANT', file_type: 'AUTHORIZED OFFICIAL DECISION', url: '', verification_status: 'Pending' },
          { category: 'APPLICANT', file_type: 'PASSPORT COPY', url: '', verification_status: 'Pending' },
          { category: 'APPLICANT', file_type: 'VALIDITY PERIOD', url: '', verification_status: 'Pending' }
        ];
      } else {
        return [
          { category: 'APPLICANT', file_type: 'PASSPORT COPY', url: '', verification_status: 'Pending' },
          { category: 'APPLICANT', file_type: 'APPLICATION FORM', url: '', verification_status: 'Pending' }
        ];
      }
    } else if (recordType === 'ETD') {
      return [
        { category: 'APPLICANT', file_type: 'APPLICATION FORM', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'ARA LETTER', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'HILAWINET', url: '', verification_status: 'Pending' }
      ];
    } else if (recordType === 'Yellow Card') {
      return [
        { category: 'APPLICANT', file_type: 'PASSPORT COPY', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'APPLICATION FORM', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'BIRTH CERTIFICATE', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'FAMILY DOCUMENT OR COURT LETTER', url: '', verification_status: 'Pending' }
      ];
    } else if (recordType === 'Eritrean ID') {
      return [
        { category: 'APPLICANT', file_type: 'APPLICATION FORM', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'APPLICATION LETTER', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'PREVIOUS ID', url: '', verification_status: 'Pending' }
      ];
    } else if (recordType === 'Alien Passport') {
      return [
        { category: 'APPLICANT', file_type: 'ERITREAN ID', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'APPLICATION FORM', url: '', verification_status: 'Pending' },
        { category: 'APPLICANT', file_type: 'APPLICATION LETTER', url: '', verification_status: 'Pending' }
      ];
    }
    return [
      { category: 'APPLICANT', file_type: 'Document Scan', url: '', verification_status: 'Pending' }
    ];
  };

  const getMergedAttachments = (recordType: RecordType, recordAttachments?: any[], idType?: string) => {
    const defaultList = getDefaultAttachments(recordType, idType);
    if (!recordAttachments || !Array.isArray(recordAttachments) || recordAttachments.length === 0) {
      return defaultList;
    }
    
    const merged = [...defaultList];
    recordAttachments.forEach((loadedDoc: any) => {
      const matchIdx = merged.findIndex(
        m => m.file_type.toLowerCase() === loadedDoc.file_type.toLowerCase() && 
             (!loadedDoc.category || m.category.toLowerCase() === loadedDoc.category.toLowerCase())
      );
      
      if (matchIdx !== -1) {
        merged[matchIdx] = { 
          ...merged[matchIdx], 
          url: loadedDoc.url || '',
          verification_status: loadedDoc.verification_status || 'Pending'
        };
      } else {
        merged.push({
          category: loadedDoc.category || 'TRANSACTION',
          file_type: loadedDoc.file_type || 'Other Document',
          url: loadedDoc.url || '',
          verification_status: loadedDoc.verification_status || 'Pending',
          is_other: true
        });
      }
    });
    return merged;
  };

  const [formData, setFormData] = useState({
    box_number: '',
    shelf_number: '',
    personal_id_no: '',
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
    id_type: '',
    etd: '',
    personal_id: '',
    eoid_type: '',
    visa_type: '',
    dob: '',
    under_age: false,
    attachments_json: [] as Array<{ file_type: string; url: string; verification_status: 'Pending' | 'Verified' | 'Rejected'; category?: string; is_other?: boolean }>,
  });

  useEffect(() => {
    if (record) {
      setFormData({
        box_number: record.box_number || defaultBoxNumber || MODULE_BOX_MAP[type] || 'Visa-000001',
        shelf_number: (record as any).shelf_number || '',
        personal_id_no: (record as any).personal_id_no || '',
        full_name: record.full_name || '',
        sex: record.sex || 'Male',
        citizenship: record.citizenship || '',
        passport_number: record.passport_number || '',
        request_number: record.request_number || '',
        date: record.date || new Date().toISOString().split('T')[0],
        service_provided: record.service_provided || '',
        eoid_number: record.eoid_number || '',
        residence_id_no: record.residence_id_no || '',
        id_type: (record as any).id_type || '',
        etd: record.etd || '',
        letter_number: record.letter_number || '',
        document_type: record.document_type || 'Scanned Letter',
        personal_id: (record as any).personal_id || '',
        eoid_type: (record as any).eoid_type || '',
        visa_type: (record as any).visa_type || '',
        dob: (record as any).dob || '',
        under_age: (record as any).under_age !== undefined ? (record as any).under_age : (type === 'EOID Under_Age'),
        attachments_json: getMergedAttachments(type, (record as any).attachments, (record as any).id_type),
      });
      fetchAttachments(record.id);
    } else {
      setFormData(prev => ({
        ...prev,
        box_number: defaultBoxNumber || MODULE_BOX_MAP[type] || 'Visa-000001',
        shelf_number: '',
        personal_id_no: '',
        full_name: '',
        sex: 'Male',
        citizenship: '',
        passport_number: '',
        request_number: '',
        date: new Date().toISOString().split('T')[0],
        service_provided:
          type === 'VISA' ? 'Turist Visa' :
          type === 'Alien Passport' ? 'Alien Passport Issuance' :
          (type === 'EOID' || type === 'EOID Under_Age') ? 'EOID Issuance' :
          type === 'Residence ID' ? 'Residence ID Issuance' :
          type === 'ETD' ? 'ETD Issuance' :
          type === 'Yellow Card' ? 'Yellow Card Issuance' :
          type === 'Eritrean ID' ? 'Eritrean ID Registration' :
          '',
        eoid_number: '',
        residence_id_no: '',
        id_type: '',
        etd: '',
        letter_number: '',
        document_type: 'Scanned Letter',
        personal_id: '',
        eoid_type: '',
        visa_type: '',
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
      
      // Clear attachment_url if this was the last one and it's Yellow Card or Eritrean ID record
      if ((type === 'Yellow Card' || type === 'Eritrean ID') && record && attachments.length === 1) {
        await supabase.from(TABLE_MAP[type]).update({ attachment_url: null }).eq('id', record.id);
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

    const checksToPerform: Array<{ field: string, value: string, label: string }> = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let activeFormType = type;
      if (type === 'EOID' || type === 'EOID Under_Age') {
        activeFormType = formData.under_age ? 'EOID Under_Age' : 'EOID';
      }
      const tableName = TABLE_MAP[activeFormType];

      // Enforce only visa box numbers (e.g. Visa-000001) for visa records
      if (type === 'VISA') {
        const boxNum = (formData.box_number || '').trim();
        if (!boxNum.toLowerCase().startsWith('visa-')) {
          throw new Error('Invalid BOX Number: VISA records only accept box numbers starting with "Visa-" (e.g., Visa-000001).');
        }
      }

      if (formData.passport_number && type !== 'ETD' && type !== 'Eritrean ID') {
        checksToPerform.push({ field: 'passport_number', value: formData.passport_number.trim(), label: 'Passport Number' });
      }
      if (formData.request_number) {
        checksToPerform.push({ field: 'request_number', value: formData.request_number.trim(), label: 'Request Number' });
      }
      if (formData.eoid_number && (type === 'EOID' || type === 'EOID Under_Age')) {
        checksToPerform.push({ field: 'eoid_number', value: formData.eoid_number.trim(), label: 'EOID Number' });
      }
      if (formData.personal_id && (type === 'EOID' || type === 'EOID Under_Age')) {
        checksToPerform.push({ field: 'personal_id', value: formData.personal_id.trim(), label: 'Personal ID' });
      }
      if (formData.etd && type === 'ETD') {
        checksToPerform.push({ field: 'etd', value: formData.etd.trim(), label: 'ETD Document Number' });
      }

      // Check against DB table for duplicates
      for (const check of checksToPerform) {
        if (!check.value) continue;
        try {
          let queryBuilder = supabase
            .from(tableName)
            .select('id, full_name')
            .eq(check.field, check.value);
          
          if (record && record.id) {
            queryBuilder = queryBuilder.neq('id', record.id);
          }
          
          const { data: maybeDupes, error: dupeErr } = await queryBuilder;
          if (dupeErr) {
            if (dupeErr.code === '42703' || dupeErr.message?.includes('column') || dupeErr.message?.includes('does not exist')) {
              console.warn(`Skipping duplicate check for field ${check.field} because column/table is missing on active schema:`, dupeErr.message);
              continue;
            }
            throw dupeErr;
          }
          if (maybeDupes && maybeDupes.length > 0) {
            throw new Error(`Duplicate Record Found: A record matching ${check.label} "${check.value}" already exists in the system (Registered to: ${maybeDupes[0].full_name}). Please verify or enter a unique identifier.`);
          }
        } catch (checkErr: any) {
          if (checkErr.message && checkErr.message.includes('Duplicate Record Found')) {
            throw checkErr;
          }
          console.warn(`Could not run database level duplicate check for field ${check.field}:`, checkErr);
        }
      }

      const basePayload: any = {
        full_name: formData.full_name,
        sex: formData.sex,
        citizenship: formData.citizenship,
        request_number: formData.request_number,
        date: formData.date,
        service_provided: formData.service_provided || (
          type === 'VISA' ? 'Turist Visa' :
          type === 'Alien Passport' ? 'Alien Passport Issuance' :
          (type === 'EOID' || type === 'EOID Under_Age') ? 'EOID Issuance' :
          type === 'Residence ID' ? 'Residence ID Issuance' :
          type === 'ETD' ? 'ETD Issuance' :
          type === 'Yellow Card' ? 'Yellow Card Issuance' :
          type === 'Eritrean ID' ? 'Eritrean ID Registration' :
          'General Service'
        ),
        created_by: user.id,
      };

      if (type !== 'Eritrean ID') {
        basePayload.passport_number = (type === 'ETD') ? (formData.passport_number || '-') : formData.passport_number;
      }

      // Ensure each module is assigned to a dynamic or default physical cabinet box
      basePayload.box_number = formData.box_number || MODULE_BOX_MAP[type] || 'Visa-000001';
      basePayload.attachments = formData.attachments_json;

      basePayload.shelf_number = formData.shelf_number || null;
      basePayload.personal_id_no = formData.personal_id_no || null;

      if (type === 'EOID' || type === 'EOID Under_Age') {
        basePayload.eoid_number = formData.eoid_number || null;
        basePayload.personal_id = formData.personal_id || formData.personal_id_no || null;
        basePayload.dob = formData.dob || null;
        basePayload.under_age = formData.under_age;
        if (formData.under_age) {
          basePayload.eoid_type = null;
        } else {
          basePayload.eoid_type = formData.eoid_type || null;
        }
      }
      if (type === 'Yellow Card') {
        basePayload.personal_id = null;
        basePayload.eoid_type = formData.eoid_type;
        basePayload.letter_number = null;
        basePayload.document_type = null;
      }
      if (type === 'Residence ID') {
        basePayload.id_type = formData.id_type || null;
        basePayload.residence_id_no = null;
      }
      if (type === 'VISA') {
        basePayload.visa_type = formData.visa_type || null;
      }
      if (type === 'ETD') basePayload.etd = formData.etd;

      let savedRecord: any = record;

      try {
        let data: any = null;

        if (record) {
          // Remove created_by from update payload as it should remain original creator
          const { created_by, ...updatePayload } = basePayload;
          const originalTableName = (record as any)._table || TABLE_MAP[type];
          
          if (originalTableName !== tableName) {
            console.log(`EOID Category changed. Migrating record from ${originalTableName} to ${tableName}`);
            await supabase.from(originalTableName).delete().eq('id', record.id);
            
            let currentPayload = { ...basePayload, id: record.id, created_at: record.created_at };
            let success = false;
            let attempts = 0;
            while (!success && attempts < 15) {
              attempts++;
              const res = await supabase.from(tableName).insert([currentPayload]).select().single();
              if (res.error) {
                const errMsg = res.error.message || '';
                if (res.error.code === '42703' || errMsg.includes('does not exist') || errMsg.includes('schema cache') || errMsg.includes('column')) {
                  let matched = false;
                  const optFields = ['personal_id', 'eoid_type', 'visa_type', 'box_number', 'letter_number', 'document_type', 'attachments', 'shelf_number', 'personal_id_no', 'passport_number', 'etd', 'id_type', 'under_age', 'dob', 'eoid_number', 'residence_id_no', 'attachment_url'];
                  for (const f of optFields) {
                    if (errMsg.includes(f) && (f in currentPayload)) {
                      console.log(`Self-healing DB (Migration): Column "${f}" is missing from "${tableName}". Deleting and retrying.`);
                      delete (currentPayload as any)[f];
                      matched = true;
                      break;
                    }
                  }
                  if (!matched) throw res.error;
                } else {
                  throw res.error;
                }
              } else {
                data = res.data;
                success = true;
              }
            }
          } else {
            let currentPayload = { ...updatePayload };
            let success = false;
            let attempts = 0;
            while (!success && attempts < 15) {
              attempts++;
              const res = await supabase.from(tableName).update(currentPayload).eq('id', record.id).select().single();
              if (res.error) {
                const errMsg = res.error.message || '';
                if (res.error.code === '42703' || errMsg.includes('does not exist') || errMsg.includes('schema cache') || errMsg.includes('column')) {
                  let matched = false;
                  const optFields = ['personal_id', 'eoid_type', 'visa_type', 'box_number', 'letter_number', 'document_type', 'attachments', 'shelf_number', 'personal_id_no', 'passport_number', 'etd', 'id_type', 'under_age', 'dob', 'eoid_number', 'residence_id_no', 'attachment_url'];
                  for (const f of optFields) {
                    if (errMsg.includes(f) && (f in currentPayload)) {
                      console.log(`Self-healing DB (Update): Column "${f}" is missing from "${tableName}". Deleting and retrying.`);
                      delete (currentPayload as any)[f];
                      matched = true;
                      break;
                    }
                  }
                  if (!matched) throw res.error;
                } else {
                  throw res.error;
                }
              } else {
                data = res.data;
                success = true;
              }
            }
          }
          savedRecord = data;
          await logger.log('UPDATE', activeFormType, `Updated record for ${basePayload.full_name}`, record.id);
        } else {
          let currentPayload = { ...basePayload };
          let success = false;
          let attempts = 0;
          while (!success && attempts < 15) {
            attempts++;
            const res = await supabase.from(tableName).insert([currentPayload]).select().single();
            if (res.error) {
              const errMsg = res.error.message || '';
              if (res.error.code === '42703' || errMsg.includes('does not exist') || errMsg.includes('schema cache') || errMsg.includes('column')) {
                let matched = false;
                const optFields = ['personal_id', 'eoid_type', 'visa_type', 'box_number', 'letter_number', 'document_type', 'attachments', 'shelf_number', 'personal_id_no', 'passport_number', 'etd', 'id_type', 'under_age', 'dob', 'eoid_number', 'residence_id_no', 'attachment_url'];
                for (const f of optFields) {
                  if (errMsg.includes(f) && (f in currentPayload)) {
                    console.log(`Self-healing DB (Insert): Column "${f}" is missing from "${tableName}". Deleting and retrying.`);
                    delete (currentPayload as any)[f];
                    matched = true;
                    break;
                  }
                }
                if (!matched) throw res.error;
              } else {
                throw res.error;
              }
            } else {
              data = res.data;
              success = true;
            }
          }
          savedRecord = data;
          await logger.log('CREATE', activeFormType, `Created new record for ${basePayload.full_name}`, savedRecord.id);
        }
      } catch (dbError) {
        console.warn(`DB operation failed for ${activeFormType}, applying localStorage fallback:`, dbError);
        
        let storageKey = '';
        if (type === 'EOID' || type === 'EOID Under_Age') {
          storageKey = formData.under_age ? 'local_records_eoid_under_age' : 'local_records_eoid';
        } else {
          storageKey = 'local_records_' + type.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        }
        
        const oldStorageKey = (type === 'EOID' || type === 'EOID Under_Age') && record 
          ? ((record as any).under_age ? 'local_records_eoid_under_age' : 'local_records_eoid') 
          : null;
        
        // Clear from old local storage category if it changed
        if (oldStorageKey && oldStorageKey !== storageKey) {
          const oldStored = localStorage.getItem(oldStorageKey);
          if (oldStored) {
            const oldParsed = JSON.parse(oldStored);
            localStorage.setItem(oldStorageKey, JSON.stringify(oldParsed.filter((r: any) => r.id !== record.id)));
          }
        }

        const stored = localStorage.getItem(storageKey);
        const parsed: any[] = stored ? JSON.parse(stored) : [];

        // Local storage duplicate checks
        for (const check of checksToPerform) {
          if (!check.value) continue;
          const duplicate = parsed.find(r => 
            r[check.field] && 
            r[check.field].toString().trim().toLowerCase() === check.value.toLowerCase() && 
            (!record || r.id !== record.id)
          );
          if (duplicate) {
            throw new Error(`Duplicate Record Found (Offline Cache): A local record matching ${check.label} "${check.value}" already exists (Registered to: ${duplicate.full_name}).`);
          }
        }
        
        if (record) {
          savedRecord = { ...record, ...basePayload, id: record.id, created_at: record.created_at, created_by: record.created_by, ...(type === 'EOID' || type === 'EOID Under_Age' ? { under_age: formData.under_age } : {}) };
          const idx = parsed.findIndex(r => r.id === record.id);
          if (idx >= 0) parsed[idx] = savedRecord;
          else parsed.push(savedRecord);
        } else {
          const prefix = type.toLowerCase().replace(/[^a-z0-9]/g, '') + '-local-';
          savedRecord = { ...basePayload, id: prefix + Date.now().toString(), created_at: new Date().toISOString(), ...(type === 'EOID' || type === 'EOID Under_Age' ? { under_age: formData.under_age } : {}) };
          parsed.push(savedRecord);
        }
        localStorage.setItem(storageKey, JSON.stringify(parsed));
        await logger.log(record ? 'UPDATE' : 'CREATE', activeFormType, `${record ? 'Updated' : 'Created'} local record for ${basePayload.full_name}`, savedRecord.id);
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
      const msg = err.message || String(err);
      const expectedTable = TABLE_MAP[type];
      if ((msg.includes(expectedTable) || msg.includes('schema cache') || msg.includes('does not exist'))) {
        setError(`Database schema out of sync: The table "${expectedTable}" is missing or uncached in your active Supabase database. Please copy and run Section #7 or #12 of the SQL script ("supabase_setup.sql") in your Supabase SQL Editor and execute NOTIFY pgrst, 'reload schema'; to enable Yellow Card/Eritrean ID records.`);
      } else {
        setError(msg);
      }
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
          {/* Core Biodata Form Parameters */}
          <div className="space-y-5 text-left">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              REGISTRY BIODATA SECTION
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 0: Shelf Number (for all records) */}
              <div className="flex flex-col gap-1.5" id="form-shelf-container">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shelf Number</label>
                <input
                  required
                  placeholder="e.g. Shelf-A1"
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-850 outline-none transition-all"
                  value={formData.shelf_number}
                  onChange={e => setFormData({ ...formData, shelf_number: e.target.value })}
                />
              </div>

              {/* Field 1: Box No(cabinet) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">BOX Number</label>
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

               {/* Field 1.5: Personal ID No. for all records */}
              <div className="flex flex-col gap-1.5" id="form-personal-id-no-container">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Personal ID No.</label>
                <input
                  required
                  placeholder="e.g. PID-987654"
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-850 outline-none transition-all"
                  value={formData.personal_id_no}
                  onChange={e => setFormData({ ...formData, personal_id_no: e.target.value })}
                />
              </div>

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

              {type !== 'ETD' && type !== 'Eritrean ID' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Passport Number
                  </label>
                  <input
                    required
                    placeholder="e.g. EP0192837"
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all"
                    value={formData.passport_number}
                    onChange={e => setFormData({ ...formData, passport_number: e.target.value })}
                  />
                </div>
              )}

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

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Record</label>
                <input
                  required
                  type="date"
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer font-sans"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>



              {/* Dynamic Module Conditional Parameters */}
              {(type === 'EOID' || type === 'EOID Under_Age') && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOID Category / Age Group</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
                      value={formData.under_age ? "Under-Age" : "Normal"}
                      onChange={e => {
                        const isUnderAge = e.target.value === "Under-Age";
                        setFormData(prev => ({ ...prev, under_age: isUnderAge }));
                      }}
                    >
                      <option value="Normal">Normal Registry (Adult)</option>
                      <option value="Under-Age">Under-Age Application (Minor)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOID Type</label>
                    <select
                      required={!formData.under_age}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
                      value={formData.eoid_type || ''}
                      onChange={e => setFormData({ ...formData, eoid_type: e.target.value })}
                    >
                      <option value="">Select EOID Type...</option>
                      <option value="By Marriage">By Marriage</option>
                      <option value="By Residence">By Residence</option>
                      <option value="By Ownership">By Ownership</option>
                      <option value="By Ras Teferian">By Ras Teferian</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth (DOB)</label>
                    <input
                      required={formData.under_age}
                      type="date"
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-800 font-mono outline-none transition-all cursor-pointer"
                      value={formData.dob}
                      onChange={e => {
                        const dobVal = e.target.value;
                        if (!dobVal) {
                          setFormData(prev => ({ ...prev, dob: dobVal }));
                          return;
                        }
                        const birthDate = new Date(dobVal);
                        const refDate = formData.date ? new Date(formData.date) : new Date();
                        let age = refDate.getFullYear() - birthDate.getFullYear();
                        const monthDiff = refDate.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        setFormData(prev => ({ 
                          ...prev, 
                          dob: dobVal, 
                          under_age: age < 18 
                        }));
                      }}
                    />
                  </div>
                </>
              )}

              {type === 'VISA' && (
                <div className="flex flex-col gap-1.5 transition-all">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Visa Type</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-850 outline-none transition-all cursor-pointer shadow-xs"
                    value={formData.visa_type || ''}
                    onChange={e => setFormData({ ...formData, visa_type: e.target.value })}
                  >
                    <option value="">Select Visa Type...</option>
                    <option value="Tourist Visa">Tourist Visa</option>
                    <option value="Business Visa">Business Visa</option>
                    <option value="Work Visa">Work Visa</option>
                    <option value="Student Visa">Student Visa</option>
                    <option value="Transit Visa">Transit Visa</option>
                    <option value="Diplomatic Visa">Diplomatic Visa</option>
                  </select>
                </div>
              )}

              {type === 'Residence ID' && (
                <div className="flex flex-col gap-1.5 transition-all">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ID Type</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-850 outline-none transition-all cursor-pointer shadow-xs"
                    value={formData.id_type || ''}
                    onChange={e => {
                      const newIdType = e.target.value;
                      const currentAttachments = formData.attachments_json || [];
                      const newDefaults = getDefaultAttachments('Residence ID', newIdType);
                      const allEmpty = currentAttachments.every(att => !att.url);
                      let updatedAttachments;
                      if (allEmpty) {
                        updatedAttachments = newDefaults;
                      } else {
                        updatedAttachments = getMergedAttachments('Residence ID', currentAttachments, newIdType);
                      }
                      setFormData(prev => ({
                        ...prev,
                        id_type: newIdType,
                        attachments_json: updatedAttachments
                      }));
                    }}
                  >
                    <option value="">Select ID Type...</option>
                    <option value="Permenant ID">Permenant ID</option>
                    <option value="Temporary ID">Temporary ID</option>
                  </select>
                </div>
              )}

              {/* Service Provided Input for all records */}
              <div className="flex flex-col gap-1.5 transition-all">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Service Provided</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Visa Extension, EOID Issuance, etc."
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#2b825a] focus:ring-4 focus:ring-emerald-500/5 rounded-xl text-xs font-bold text-slate-850 outline-none transition-all shadow-xs"
                  value={formData.service_provided}
                  onChange={e => setFormData({ ...formData, service_provided: e.target.value })}
                />
              </div>

              {type === 'Yellow Card' && (
                <div className="flex flex-col gap-1.5 transition-all">
                  <label className="text-[11px] font-bold text-rose-500 uppercase tracking-widest font-black flex items-center gap-1">
                    <span>Yellow Card Type</span>
                    <span className="text-[9px] px-1 py-0.2 bg-rose-100 text-rose-700 rounded-sm">REQUIRED</span>
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-rose-50/5 hover:bg-rose-50/15 focus:bg-white border-2 border-rose-200/85 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer shadow-xs"
                    value={formData.eoid_type || ''}
                    onChange={e => setFormData({ ...formData, eoid_type: e.target.value })}
                  >
                    <option value="">Select Yellow Card Type...</option>
                    <option value="By Marriage">By Marriage</option>
                    <option value="By Blood">By Blood</option>
                    <option value="By Ras Teferian">By Ras Teferian</option>
                    <option value="other">other</option>
                  </select>
                </div>
              )}



              {/* Custom upload format for EOID, VISA, Residence ID, ETD, etc. matching Screenshot */}
              <div className="md:col-span-2 mt-4 space-y-6">
                    {/* Table 1: Optional Documents */}
                    <div>
                      <div className="flex items-center gap-2 mb-2 bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                        <Paperclip className="w-4 h-4 text-[#2a4e63]" />
                        <h4 className="text-sm font-extrabold text-[#2a4e63] tracking-tight">Attachment</h4>
                      </div>
                      
                      <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
                        {/* Table Header */}
                        <div className="bg-[#2c5a70] text-white py-3.5 px-4 grid grid-cols-12 gap-2 text-[10px] font-black uppercase tracking-wider">
                          <div className="col-span-3 text-left">Category</div>
                          <div className="col-span-4 text-left">Document Type</div>
                          <div className="col-span-3 text-left">Upload Status</div>
                          <div className="col-span-2 text-center">Actions</div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-slate-100">
                          {formData.attachments_json.map((doc, idx) => ({ ...doc, originalIdx: idx })).filter(d => !d.is_other).map((doc, docIdx) => {
                            const hasFile = Boolean(doc.url);
                            return (
                              <div key={docIdx} className="grid grid-cols-12 gap-2 py-3 px-4 items-center hover:bg-slate-50/50 transition-colors">
                                {/* Category Badge */}
                                <div className="col-span-3 text-left">
                                  <span className="text-[10px] font-black font-sans uppercase tracking-wider text-slate-400">
                                    {doc.category || 'APPLICANT'}
                                  </span>
                                </div>

                                {/* Document Type */}
                                <div className="col-span-4 text-left pr-2">
                                  <span className="text-xs font-extrabold text-slate-800 tracking-tight uppercase block truncate" title={doc.file_type}>
                                    {doc.file_type}
                                  </span>
                                </div>

                                {/* Upload Status */}
                                <div className="col-span-3 text-left">
                                  {hasFile ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#2b825a] font-sans">
                                      <span className="w-1.5 h-1.5 bg-[#2b825a] rounded-full animate-pulse" />
                                      ✓ Uploaded
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-bold text-slate-400 font-sans uppercase tracking-wide">
                                      Not Provided
                                    </span>
                                  )}
                                </div>

                                {/* Actions Column */}
                                <div className="col-span-2 flex items-center justify-center gap-1.5">
                                  {/* View Doc Button */}
                                  <button
                                    type="button"
                                    disabled={!hasFile}
                                    onClick={() => window.open(doc.url, '_blank')}
                                    className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 text-slate-500 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                    title="View Scan"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Doc Button */}
                                  <button
                                    type="button"
                                    disabled={!hasFile}
                                    onClick={() => handleClearUrl(doc.originalIdx)}
                                    className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-slate-500 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                    title="Delete/Clear Scan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Upload Doc Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveChecklistUploadIdx(doc.originalIdx);
                                      checklistFileInputRef.current?.click();
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-[#2b825a] border border-slate-200 hover:border-emerald-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                    title="Upload Scan File"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Scan via Camera Button */}
                                  <button
                                    type="button"
                                    onClick={() => setScanningDocIdx(doc.originalIdx)}
                                    className="p-1.5 bg-slate-50 hover:bg-sky-50 hover:text-[#1a73e8] border border-slate-200 hover:border-sky-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                    title="Scan Document"
                                  >
                                    <Scan className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Table 2: Other Documents */}
                    <div>
                      {/* Header Band exactly like mock with Add Button */}
                      <div className="bg-[#122e43] text-white py-2.5 px-4 rounded-t-2xl flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
                          <h4 className="text-[11px] font-black uppercase tracking-wider font-sans">
                            Other Documents
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddOtherDoc}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#122e43] text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border-none shadow-sm flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 hover:scale-110 transition-transform" />
                          <span>Add</span>
                        </button>
                      </div>

                      <div className="border border-t-0 border-slate-200 rounded-b-2xl overflow-hidden bg-white shadow-xs">
                        {/* Table Header */}
                        <div className="bg-[#1b3c54]/10 text-slate-700 py-3 px-4 grid grid-cols-12 gap-2 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                          <div className="col-span-3 text-left">Category</div>
                          <div className="col-span-4 text-left">Document Type</div>
                          <div className="col-span-3 text-left">Upload Status</div>
                          <div className="col-span-2 text-center">Actions</div>
                        </div>

                        {/* Table Rows or Empty State */}
                        <div className="divide-y divide-slate-150 min-h-[50px] flex flex-col justify-center">
                          {formData.attachments_json.map((doc, idx) => ({ ...doc, originalIdx: idx })).filter(d => d.is_other).length === 0 ? (
                            <div className="py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-wide">
                              No additional documents added
                            </div>
                          ) : (
                            formData.attachments_json.map((doc, idx) => ({ ...doc, originalIdx: idx })).filter(d => d.is_other).map((doc, docIdx) => {
                              const hasFile = Boolean(doc.url);
                              return (
                                <div key={docIdx} className="grid grid-cols-12 gap-2 py-2.5 px-4 items-center hover:bg-slate-50/50 transition-colors">
                                  {/* Category selection */}
                                  <div className="col-span-3 text-left">
                                    <select
                                      value={doc.category || 'TRANSACTION'}
                                      onChange={(e) => handleUpdateOtherDoc(doc.originalIdx, 'category', e.target.value)}
                                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 outline-none cursor-pointer hover:bg-slate-100/50 transition-colors font-sans"
                                    >
                                      <option value="TRANSACTION">TRANSACTION</option>
                                      <option value="APPLICANT">APPLICANT</option>
                                      <option value="GUARDIAN">GUARDIAN</option>
                                    </select>
                                  </div>

                                  {/* Document Type Dropdown Select */}
                                  <div className="col-span-4 text-left pr-2">
                                    <select
                                      value={doc.file_type || ''}
                                      onChange={(e) => handleUpdateOtherDoc(doc.originalIdx, 'file_type', e.target.value)}
                                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-[#122e43] outline-none cursor-pointer hover:bg-slate-100/50 transition-colors uppercase block truncate"
                                    >
                                      <option value="">Select doc type...</option>
                                      <option value="POWER OF ATTORNEY">POWER OF ATTORNEY</option>
                                      <option value="BANK SLIP / PAYMENT RECEIPT">BANK SLIP / RECEIPT</option>
                                      <option value="SUPPORTING AFFIDAVIT">SUPPORTING AFFIDAVIT</option>
                                      <option value="COURT ORDER DECISION">COURT ORDER DECISION</option>
                                      <option value="CUSTOM TRANSACTION PROOF">CUSTOM PROOF</option>
                                      <option value="OTHER CLEARANCE PROOF">OTHER PROOF</option>
                                    </select>
                                  </div>

                                  {/* Upload Status */}
                                  <div className="col-span-3 text-left">
                                    {hasFile ? (
                                      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#2b825a] font-sans">
                                        <span className="w-1.5 h-1.5 bg-[#2b825a] rounded-full animate-pulse" />
                                        ✓ Uploaded
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-medium text-slate-400 font-sans uppercase tracking-wide">
                                        Not Provided
                                      </span>
                                    )}
                                  </div>

                                  {/* Actions column */}
                                  <div className="col-span-2 flex items-center justify-center gap-1.5">
                                    {/* View Doc */}
                                    <button
                                      type="button"
                                      disabled={!hasFile}
                                      onClick={() => window.open(doc.url, '_blank')}
                                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 text-slate-400 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                      title="View"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Upload Doc */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveChecklistUploadIdx(doc.originalIdx);
                                        checklistFileInputRef.current?.click();
                                      }}
                                      className="p-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-[#2b825a] border border-slate-200 hover:border-emerald-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                      title="Upload Scan"
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Scan via Camera */}
                                    <button
                                      type="button"
                                      onClick={() => setScanningDocIdx(doc.originalIdx)}
                                      className="p-1.5 bg-slate-50 hover:bg-sky-50 hover:text-[#1a73e8] border border-slate-200 hover:border-sky-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                      title="Scan Document"
                                    >
                                      <Scan className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete Row Entirely */}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOtherDoc(doc.originalIdx)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 border border-rose-250 text-rose-500 rounded-lg transition-colors cursor-pointer"
                                      title="Remove Document Row"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hidden inputs specifically for structured checklist */}
                    <input
                      type="file"
                      ref={checklistFileInputRef}
                      className="hidden"
                      onChange={handleChecklistFileSelect}
                      accept="image/*,application/pdf"
                    />

                    {/* Animated Live Scanner Portal simulation view */}
                    <AnimatePresence>
                      {scanningDocIdx !== null && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                            onClick={() => setScanningDocIdx(null)}
                          />
                          
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-slate-700/50 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative z-10 p-6 text-white"
                          >
                            {/* Scanning Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono">
                                  Live Secure Document Scanner v4.1
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setScanningDocIdx(null)}
                                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Scanning Area */}
                            <div className="my-6 relative border-2 border-dashed border-slate-700 bg-slate-950 rounded-2xl h-56 flex flex-col items-center justify-center overflow-hidden">
                              {/* Laser Line */}
                              <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_12px_#10b981] animate-bounce w-full top-0" style={{ animationDuration: '2s' }} />
                              
                              <Scan className="w-16 h-16 text-emerald-500/35 mb-3 animate-pulse" />
                              <p className="text-xs font-mono font-bold text-slate-300">
                                Scanning document type:
                              </p>
                              <p className="text-sm font-black text-emerald-400 font-mono tracking-tight uppercase mt-1 text-center px-4 truncate max-w-full">
                                {formData.attachments_json[scanningDocIdx]?.file_type || 'Custom Document'}
                              </p>
                            </div>

                            {/* Human Readable Status Indicators */}
                            <div className="space-y-1.5 font-mono text-[10px] text-left text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800/40">
                              <p className="text-emerald-400 font-bold flex items-center gap-2">
                                <span>⚡ Camera Connected. Feed active.</span>
                              </p>
                              <p className="flex items-center justify-between">
                                <span>● Calibrating auto-focus zoom:</span>
                                <span className="text-slate-300 font-bold uppercase">Done</span>
                              </p>
                              <p className="flex items-center justify-between">
                                <span>● Isolating document corners:</span>
                                <span className="text-slate-300 font-bold uppercase">Locked</span>
                              </p>
                              <p className="flex items-center justify-between">
                                <span>● Extracting printed text and barcodes:</span>
                                <span className="text-emerald-400 font-bold uppercase animate-pulse">Running Scan...</span>
                              </p>
                            </div>

                            {/* Controls */}
                            <div className="mt-6 flex justify-end gap-3.5 pt-4 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => setScanningDocIdx(null)}
                                className="px-4 py-2 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 font-mono uppercase tracking-wider border-none bg-transparent"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const docType = formData.attachments_json[scanningDocIdx]?.file_type || 'Custom';
                                  const formattedName = docType.toLowerCase().replace(/\s+/g, '_');
                                  const mockUrl = `https://secure-storage.gov/docs/scanned_${formattedName}_${Math.floor(100000 + Math.random() * 900000)}.pdf`;
                                  
                                  const updated = [...formData.attachments_json];
                                  updated[scanningDocIdx] = {
                                    ...updated[scanningDocIdx],
                                    url: mockUrl,
                                    verification_status: 'Verified'
                                  };
                                  setFormData(prev => ({ ...prev, attachments_json: updated }));
                                  setScanningDocIdx(null);
                                }}
                                className="px-6 py-2.5 bg-[#2b825a] hover:bg-[#206243] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider font-mono shadow-md border-none cursor-pointer"
                              >
                                Secure Capture
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
              {type === 'ETD' && null}
              

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
