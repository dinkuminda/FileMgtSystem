-- Enable RLS
-- Note: auth schema tables are managed by Supabase, we don't create them.

-- 1. Create Profiles table (for role-based access)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'viewer', 'airport_staff', 'airport_viewer')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure full_name exists (in case table was created without it previously)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='full_name') THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
  END IF;
END $$;

-- Helper Function for Admin Check (more performant in RLS)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New Helper for checking authorized staff roles
CREATE OR REPLACE FUNCTION public.is_auth_staff() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff', 'airport_staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New Helper for checking any authorized user (including viewers)
CREATE OR REPLACE FUNCTION public.is_authorized() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.1 Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create the 4 distinct records tables
-- VISA Table
CREATE TABLE IF NOT EXISTS public.visa_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  box_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- EOID Table
CREATE TABLE IF NOT EXISTS public.eoid_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  box_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  eoid_number TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Residence ID Table
CREATE TABLE IF NOT EXISTS public.residence_id_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  box_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  residence_id_no TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- ETD Table
CREATE TABLE IF NOT EXISTS public.etd_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  box_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  etd TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.visa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eoid_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residence_id_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etd_records ENABLE ROW LEVEL SECURITY;

-- 3. Functions and Triggers for Auth Sync
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN new.email = 'dinkuh12@gmail.com' THEN 'admin'
      ELSE 'staff'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Policies for Profiles
DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 5. Policies for Records
-- Drop older/overlapping policies
DROP POLICY IF EXISTS "View visa" ON public.visa_records;
DROP POLICY IF EXISTS "Insert visa" ON public.visa_records;
DROP POLICY IF EXISTS "Modify visa" ON public.visa_records;
DROP POLICY IF EXISTS "View eoid" ON public.eoid_records;
DROP POLICY IF EXISTS "Insert eoid" ON public.eoid_records;
DROP POLICY IF EXISTS "Modify eoid" ON public.eoid_records;
DROP POLICY IF EXISTS "View residence" ON public.residence_id_records;
DROP POLICY IF EXISTS "Insert residence" ON public.residence_id_records;
DROP POLICY IF EXISTS "Modify residence" ON public.residence_id_records;
DROP POLICY IF EXISTS "View etd" ON public.etd_records;
DROP POLICY IF EXISTS "Insert etd" ON public.etd_records;
DROP POLICY IF EXISTS "Modify etd" ON public.etd_records;

-- VISA Policies
DROP POLICY IF EXISTS "visa_select" ON public.visa_records;
DROP POLICY IF EXISTS "visa_insert" ON public.visa_records;
DROP POLICY IF EXISTS "visa_update" ON public.visa_records;
DROP POLICY IF EXISTS "visa_delete" ON public.visa_records;
CREATE POLICY "visa_select" ON public.visa_records FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "visa_insert" ON public.visa_records FOR INSERT TO authenticated WITH CHECK (public.is_auth_staff());
CREATE POLICY "visa_update" ON public.visa_records FOR UPDATE TO authenticated USING (public.is_auth_staff());
CREATE POLICY "visa_delete" ON public.visa_records FOR DELETE TO authenticated USING (public.is_admin() OR auth.uid() = created_by);

-- EOID Policies
DROP POLICY IF EXISTS "eoid_select" ON public.eoid_records;
DROP POLICY IF EXISTS "eoid_insert" ON public.eoid_records;
DROP POLICY IF EXISTS "eoid_update" ON public.eoid_records;
DROP POLICY IF EXISTS "eoid_delete" ON public.eoid_records;
CREATE POLICY "eoid_select" ON public.eoid_records FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "eoid_insert" ON public.eoid_records FOR INSERT TO authenticated WITH CHECK (public.is_auth_staff());
CREATE POLICY "eoid_update" ON public.eoid_records FOR UPDATE TO authenticated USING (public.is_auth_staff());
CREATE POLICY "eoid_delete" ON public.eoid_records FOR DELETE TO authenticated USING (public.is_admin() OR auth.uid() = created_by);

-- Residence ID Policies
DROP POLICY IF EXISTS "residence_select" ON public.residence_id_records;
DROP POLICY IF EXISTS "residence_insert" ON public.residence_id_records;
DROP POLICY IF EXISTS "residence_update" ON public.residence_id_records;
DROP POLICY IF EXISTS "residence_delete" ON public.residence_id_records;
CREATE POLICY "residence_select" ON public.residence_id_records FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "residence_insert" ON public.residence_id_records FOR INSERT TO authenticated WITH CHECK (public.is_auth_staff());
CREATE POLICY "residence_update" ON public.residence_id_records FOR UPDATE TO authenticated USING (public.is_auth_staff());
CREATE POLICY "residence_delete" ON public.residence_id_records FOR DELETE TO authenticated USING (public.is_admin() OR auth.uid() = created_by);

-- ETD Policies
DROP POLICY IF EXISTS "etd_select" ON public.etd_records;
DROP POLICY IF EXISTS "etd_insert" ON public.etd_records;
DROP POLICY IF EXISTS "etd_update" ON public.etd_records;
DROP POLICY IF EXISTS "etd_delete" ON public.etd_records;
CREATE POLICY "etd_select" ON public.etd_records FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "etd_insert" ON public.etd_records FOR INSERT TO authenticated WITH CHECK (public.is_auth_staff());
CREATE POLICY "etd_update" ON public.etd_records FOR UPDATE TO authenticated USING (public.is_auth_staff());
CREATE POLICY "etd_delete" ON public.etd_records FOR DELETE TO authenticated USING (public.is_admin() OR auth.uid() = created_by);

-- 6. Attachments Table
CREATE TABLE IF NOT EXISTS public.record_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL,
  record_table TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE public.record_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments_select" ON public.record_attachments;
DROP POLICY IF EXISTS "attachments_insert" ON public.record_attachments;
DROP POLICY IF EXISTS "attachments_delete" ON public.record_attachments;
DROP POLICY IF EXISTS "View attachments" ON public.record_attachments;
DROP POLICY IF EXISTS "Insert attachments" ON public.record_attachments;
DROP POLICY IF EXISTS "Delete attachments" ON public.record_attachments;

CREATE POLICY "attachments_select" ON public.record_attachments FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "attachments_insert" ON public.record_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR public.is_auth_staff());
CREATE POLICY "attachments_delete" ON public.record_attachments FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin());

-- 7. Airport Records Table (Specialized for Bole Airport Letters/Docs)
CREATE TABLE IF NOT EXISTS public.airport_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  letter_number TEXT,
  document_type TEXT NOT NULL DEFAULT 'Scanned Letter',
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE public.airport_records ENABLE ROW LEVEL SECURITY;

-- 7. Policies for Airport Records
DROP POLICY IF EXISTS "airport_select" ON public.airport_records;
DROP POLICY IF EXISTS "airport_insert" ON public.airport_records;
DROP POLICY IF EXISTS "airport_update" ON public.airport_records;
DROP POLICY IF EXISTS "airport_delete" ON public.airport_records;

CREATE POLICY "airport_select" ON public.airport_records FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "airport_insert" ON public.airport_records FOR INSERT TO authenticated WITH CHECK (public.is_auth_staff());
CREATE POLICY "airport_update" ON public.airport_records FOR UPDATE TO authenticated USING (public.is_auth_staff());
CREATE POLICY "airport_delete" ON public.airport_records FOR DELETE TO authenticated USING (public.is_admin() OR auth.uid() = created_by);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_records_visa_name ON public.visa_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_eoid_name ON public.eoid_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_residence_name ON public.residence_id_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_etd_name ON public.etd_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_airport_name ON public.airport_records(full_name);
CREATE INDEX IF NOT EXISTS idx_attachments_record ON public.record_attachments(record_id);

-- 9. Storage Setup (immigration-docs bucket)
-- We attempt to insert the bucket. In some Supabase environments, you might need to use the dashboard.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('immigration-docs', 'immigration-docs', false, 10485760, ARRAY['image/*', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Note: These policies target the storage.objects table
-- We use a single policy for ALL operations in the specific bucket for authenticated users
DROP POLICY IF EXISTS "Allow authenticated access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

CREATE POLICY "Allow authenticated access" ON storage.objects 
  FOR ALL TO authenticated 
  USING (bucket_id = 'immigration-docs')
  WITH CHECK (bucket_id = 'immigration-docs');

-- 10. Admin Profile Boost
-- Ensure the primary admin email always has admin role regardless of when they signed up
INSERT INTO public.profiles (id, email, role, full_name)
SELECT id, email, 'admin', 'Primary Admin'
FROM auth.users
WHERE email = 'dinkuh12@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
