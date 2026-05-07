import React, { useState, useEffect } from 'react';
import { Paperclip } from 'lucide-react';
import { supabase, TABLE_MAP, type RecordType } from '../lib/supabase';

export default function AttachmentIndicator({ recordId, type }: { recordId: string, type: RecordType }) {
  const [hasAttachments, setHasAttachments] = useState(false);

  useEffect(() => {
    const checkAttachments = async () => {
      const { count, error } = await supabase
        .from('record_attachments')
        .select('*', { count: 'exact', head: true })
        .eq('record_id', recordId)
        .eq('record_table', TABLE_MAP[type]);
      
      if (!error && count && count > 0) {
        setHasAttachments(true);
      }
    };
    checkAttachments();
  }, [recordId, type]);

  if (!hasAttachments) return null;

  return (
    <Paperclip className="w-3.5 h-3.5 text-blue-500 animate-pulse" title="Has attachments" />
  );
}
