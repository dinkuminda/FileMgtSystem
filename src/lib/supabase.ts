import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Fallback for server-side where import.meta.env might not be available in some contexts,
// or for the define plugin in vite.config.ts
const finalUrl = supabaseUrl || (process.env.SUPABASE_URL as string) || '';
const finalAnonKey = supabaseAnonKey || (process.env.SUPABASE_ANON_KEY as string) || '';

// Lazy initialization is better, but for common usage we export the client.
// We check if keys are present to avoid immediate crashes.
export const isSupabaseConfigured = Boolean(finalUrl && finalAnonKey && finalUrl !== 'https://your-project.supabase.co');

export const supabase = createClient(
  finalUrl || 'https://placeholder.supabase.co',
  finalAnonKey || 'placeholder'
);

export type UserRole = 'admin' | 'staff' | 'viewer' | 'airport_staff' | 'airport_viewer';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  modules?: string[];
}

export type RecordType = 'VISA' | 'EOID' | 'Residence ID' | 'ETD' | 'AIRPORT';

export const TABLE_MAP: Record<RecordType, string> = {
  'VISA': 'visa_records',
  'EOID': 'eoid_records',
  'Residence ID': 'residence_id_records',
  'ETD': 'etd_records',
  'AIRPORT': 'airport_records'
};

export const REVERSE_TABLE_MAP: Record<string, RecordType> = Object.entries(TABLE_MAP).reduce((acc, [key, value]) => {
  acc[value] = key as RecordType;
  return acc;
}, {} as Record<string, RecordType>);

export interface ImmigrationRecord {
  id: string;
  box_number: string;
  full_name: string;
  sex: 'Male' | 'Female' | 'Other';
  citizenship: string;
  passport_number: string;
  request_number: string;
  date: string;
  service_provided: string;
  created_at: string;
  created_by: string;
  // Specific fields
  eoid_number?: string;
  residence_id_no?: string;
  etd?: string;
  letter_number?: string;
  document_type?: string;
  attachment_url?: string;
}

export interface RecordAttachment {
  id: string;
  record_id: string;
  record_table: string;
  file_name: string;
  file_path: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  created_by: string;
  user_id?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'IMPORT' | 'ADMIN_ACTION';
  entity_type: string;
  entity_id?: string;
  details: string;
  created_at: string;
}

export const logger = {
  log: async (action: AuditLog['action'], entity_type: string, details: string, entity_id?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: user.id,
        user_email: user.email,
        action,
        entity_type,
        entity_id,
        details,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      console.error('Audit Log Error:', error);
    }
  }
};
