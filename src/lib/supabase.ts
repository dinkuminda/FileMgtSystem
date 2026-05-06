import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL as string) || '';
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY as string) || '';

// Lazy initialization is better, but for common usage we export the client.
// We check if keys are present to avoid immediate crashes.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co');

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export type UserRole = 'admin' | 'staff' | 'viewer' | 'airport_staff' | 'airport_viewer';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

export type RecordType = 'VISA' | 'EOID' | 'Residence ID' | 'ETD' | 'AIRPORT';

export const TABLE_MAP: Record<RecordType, string> = {
  'VISA': 'visa_records',
  'EOID': 'eoid_records',
  'Residence ID': 'residence_id_records',
  'ETD': 'etd_records',
  'AIRPORT': 'airport_records'
};

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
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'IMPORT';
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
