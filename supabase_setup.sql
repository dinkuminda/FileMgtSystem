-- Enable RLS
-- Note: auth schema tables are managed by Supabase, we don't create them.

-- 1. Create Profiles table (for role-based access)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'viewer', 'airport_staff', 'airport_viewer', 'airport_viewer')),
  modules TEXT[] DEFAULT ARRAY['OVERVIEW', 'REPORTS', 'VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT', 'AIRPORT_ADD', 'AIRPORT_VIEW', 'AIRPORT_EDIT', 'Alien Passport', 'Yellow Card', 'Eritrean ID'],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure modules column exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='modules') THEN
    ALTER TABLE public.profiles ADD COLUMN modules TEXT[] DEFAULT ARRAY['OVERVIEW', 'REPORTS', 'VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT', 'AIRPORT_ADD', 'AIRPORT_VIEW', 'AIRPORT_EDIT', 'Alien Passport', 'Yellow Card', 'Eritrean ID'];
  END IF;
END $$;

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

-- New Helper for checking authorized admin roles (aliases/compatibilities)
CREATE OR REPLACE FUNCTION public.is_authorized_admin() 
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
  shelf_number TEXT,
  box_number TEXT NOT NULL,
  personal_id_no TEXT,
  personal_file_no TEXT,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- EOID Table
CREATE TABLE IF NOT EXISTS public.eoid_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shelf_number TEXT,
  box_number TEXT NOT NULL,
  personal_id_no TEXT,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other', 'M', 'F')),
  citizenship TEXT NOT NULL,
  eoid_number TEXT, -- For backward-compatibility (optional now)
  personal_file_no TEXT,
  personal_id TEXT,
  eoid_type TEXT, -- By Marriage, By Residence, By Ownership, By Ras Teferian
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  dob DATE,
  under_age BOOLEAN NOT NULL DEFAULT FALSE,
  attachments JSONB DEFAULT '[]'::jsonb,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  service_provided TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Migration commands for existing eoid_records tables (Run these in your Supabase SQL editor):
-- ALTER TABLE public.eoid_records DROP CONSTRAINT IF EXISTS eoid_records_sex_check;
-- ALTER TABLE public.eoid_records ADD CONSTRAINT eoid_records_sex_check CHECK (sex IN ('Male', 'Female', 'Other', 'M', 'F'));
-- ALTER TABLE public.eoid_records ALTER COLUMN eoid_number DROP NOT NULL;
-- ALTER TABLE public.eoid_records ADD COLUMN IF NOT EXISTS personal_file_no TEXT;
-- ALTER TABLE public.eoid_records ADD COLUMN IF NOT EXISTS personal_id TEXT;
-- ALTER TABLE public.eoid_records ADD COLUMN IF NOT EXISTS eoid_type TEXT;
-- ALTER TABLE public.eoid_records ADD COLUMN IF NOT EXISTS dob DATE;
-- ALTER TABLE public.eoid_records ADD COLUMN IF NOT EXISTS under_age BOOLEAN NOT NULL DEFAULT FALSE;
-- ALTER TABLE public.eoid_records ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- EOID Under_Age Table
CREATE TABLE IF NOT EXISTS public.eoid_underage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shelf_number TEXT,
  box_number TEXT NOT NULL,
  personal_id_no TEXT,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other', 'M', 'F')),
  citizenship TEXT NOT NULL,
  personal_file_no TEXT NOT NULL,
  personal_id TEXT NOT NULL,
  eoid_number TEXT,  -- For backward-compatibility / alias
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  dob DATE NOT NULL,
  under_age BOOLEAN NOT NULL DEFAULT TRUE,
  attachments JSONB DEFAULT '[]'::jsonb,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  service_provided TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Residence ID Table
CREATE TABLE IF NOT EXISTS public.residence_id_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shelf_number TEXT,
  box_number TEXT NOT NULL,
  personal_id_no TEXT,
  personal_file_no TEXT,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  residence_id_no TEXT,
  id_type TEXT,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- ETD Table
CREATE TABLE IF NOT EXISTS public.etd_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shelf_number TEXT,
  box_number TEXT NOT NULL,
  personal_id_no TEXT,
  personal_file_no TEXT,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  etd TEXT NOT NULL,
  passport_number TEXT,
  request_number TEXT NOT NULL,
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Alien Passport Table
CREATE TABLE IF NOT EXISTS public.alien_passport_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shelf_number TEXT,
  box_number TEXT NOT NULL,
  personal_id_no TEXT,
  personal_file_no TEXT,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.visa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eoid_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eoid_underage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residence_id_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etd_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alien_passport_records ENABLE ROW LEVEL SECURITY;

-- 3. Functions and Triggers for Auth Sync
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, modules)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN new.email = 'dinkuh12@gmail.com' THEN 'admin'
      WHEN new.email = 'demebirhanu@gmail.com' THEN 'staff'
      WHEN new.email = 'dinku_staff@gmail.com' THEN 'airport_staff'
      WHEN new.email LIKE '%weleba%' THEN 'airport_staff'
      WHEN new.email = 'mohammedturi@gmail.com' THEN 'airport_viewer'
      ELSE 'viewer'
    END,
    CASE
      WHEN new.email = 'dinkuh12@gmail.com' THEN ARRAY['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'AIRPORT', 'AIRPORT_ADD', 'AIRPORT_VIEW', 'AIRPORT_EDIT', 'Yellow Card', 'Eritrean ID', 'AUDIT']
      WHEN new.email = 'dinku_staff@gmail.com' THEN ARRAY['OVERVIEW', 'AIRPORT', 'AIRPORT_ADD', 'AIRPORT_VIEW', 'AIRPORT_EDIT']
      WHEN new.email LIKE '%weleba%' THEN ARRAY['OVERVIEW', 'AIRPORT', 'AIRPORT_ADD', 'AIRPORT_VIEW', 'AIRPORT_EDIT']
      WHEN new.email = 'mohammedturi@gmail.com' THEN ARRAY['OVERVIEW', 'AIRPORT', 'AIRPORT_VIEW']
      ELSE ARRAY['OVERVIEW']
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
-- VISA Policies
DROP POLICY IF EXISTS "visa_select" ON public.visa_records;
DROP POLICY IF EXISTS "visa_insert" ON public.visa_records;
DROP POLICY IF EXISTS "visa_update" ON public.visa_records;
DROP POLICY IF EXISTS "visa_delete" ON public.visa_records;
CREATE POLICY "visa_select" ON public.visa_records FOR SELECT TO authenticated 
  USING (public.is_admin() OR (public.is_authorized() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('airport_staff', 'airport_viewer')));
CREATE POLICY "visa_insert" ON public.visa_records FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "visa_update" ON public.visa_records FOR UPDATE TO authenticated 
  USING (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "visa_delete" ON public.visa_records FOR DELETE TO authenticated 
  USING (public.is_admin() OR auth.uid() = created_by);

-- EOID Policies
DROP POLICY IF EXISTS "eoid_select" ON public.eoid_records;
DROP POLICY IF EXISTS "eoid_insert" ON public.eoid_records;
DROP POLICY IF EXISTS "eoid_update" ON public.eoid_records;
DROP POLICY IF EXISTS "eoid_delete" ON public.eoid_records;
CREATE POLICY "eoid_select" ON public.eoid_records FOR SELECT TO authenticated 
  USING (public.is_admin() OR (public.is_authorized() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('airport_staff', 'airport_viewer')));
CREATE POLICY "eoid_insert" ON public.eoid_records FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "eoid_update" ON public.eoid_records FOR UPDATE TO authenticated 
  USING (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "eoid_delete" ON public.eoid_records FOR DELETE TO authenticated 
  USING (public.is_admin() OR auth.uid() = created_by);

-- EOID Under_Age Policies
DROP POLICY IF EXISTS "eoid_underage_select" ON public.eoid_underage_records;
DROP POLICY IF EXISTS "eoid_underage_insert" ON public.eoid_underage_records;
DROP POLICY IF EXISTS "eoid_underage_update" ON public.eoid_underage_records;
DROP POLICY IF EXISTS "eoid_underage_delete" ON public.eoid_underage_records;
CREATE POLICY "eoid_underage_select" ON public.eoid_underage_records FOR SELECT TO authenticated 
  USING (public.is_admin() OR (public.is_authorized() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('airport_staff', 'airport_viewer')));
CREATE POLICY "eoid_underage_insert" ON public.eoid_underage_records FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "eoid_underage_update" ON public.eoid_underage_records FOR UPDATE TO authenticated 
  USING (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "eoid_underage_delete" ON public.eoid_underage_records FOR DELETE TO authenticated 
  USING (public.is_admin() OR auth.uid() = created_by);

-- Residence ID Policies
DROP POLICY IF EXISTS "residence_select" ON public.residence_id_records;
DROP POLICY IF EXISTS "residence_insert" ON public.residence_id_records;
DROP POLICY IF EXISTS "residence_update" ON public.residence_id_records;
DROP POLICY IF EXISTS "residence_delete" ON public.residence_id_records;
CREATE POLICY "residence_select" ON public.residence_id_records FOR SELECT TO authenticated 
  USING (public.is_admin() OR (public.is_authorized() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('airport_staff', 'airport_viewer')));
CREATE POLICY "residence_insert" ON public.residence_id_records FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "residence_update" ON public.residence_id_records FOR UPDATE TO authenticated 
  USING (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "residence_delete" ON public.residence_id_records FOR DELETE TO authenticated 
  USING (public.is_admin() OR auth.uid() = created_by);

-- ETD Policies
DROP POLICY IF EXISTS "etd_select" ON public.etd_records;
DROP POLICY IF EXISTS "etd_insert" ON public.etd_records;
DROP POLICY IF EXISTS "etd_update" ON public.etd_records;
DROP POLICY IF EXISTS "etd_delete" ON public.etd_records;
CREATE POLICY "etd_select" ON public.etd_records FOR SELECT TO authenticated 
  USING (public.is_admin() OR (public.is_authorized() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('airport_staff', 'airport_viewer')));
CREATE POLICY "etd_insert" ON public.etd_records FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "etd_update" ON public.etd_records FOR UPDATE TO authenticated 
  USING (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "etd_delete" ON public.etd_records FOR DELETE TO authenticated 
  USING (public.is_admin() OR auth.uid() = created_by);

-- Alien Passport Policies
DROP POLICY IF EXISTS "alien_passport_select" ON public.alien_passport_records;
DROP POLICY IF EXISTS "alien_passport_insert" ON public.alien_passport_records;
DROP POLICY IF EXISTS "alien_passport_update" ON public.alien_passport_records;
DROP POLICY IF EXISTS "alien_passport_delete" ON public.alien_passport_records;
CREATE POLICY "alien_passport_select" ON public.alien_passport_records FOR SELECT TO authenticated 
  USING (public.is_admin() OR (public.is_authorized() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('airport_staff', 'airport_viewer')));
CREATE POLICY "alien_passport_insert" ON public.alien_passport_records FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "alien_passport_update" ON public.alien_passport_records FOR UPDATE TO authenticated 
  USING (public.is_admin() OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'));
CREATE POLICY "alien_passport_delete" ON public.alien_passport_records FOR DELETE TO authenticated 
  USING (public.is_admin() OR auth.uid() = created_by);

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

-- 7. Yellow Card Records Table (Specialized for Yellow Card Checkpoint Letters/Docs)
DROP TABLE IF EXISTS public.airport_records CASCADE;

CREATE TABLE IF NOT EXISTS public.yellow_card_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shelf_number TEXT,
  box_number TEXT,
  personal_id_no TEXT,
  personal_file_no TEXT,
  personal_id TEXT,
  eoid_type TEXT,
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  request_number TEXT NOT NULL,
  letter_number TEXT,
  document_type TEXT NOT NULL DEFAULT 'Scanned Letter',
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE public.yellow_card_records ENABLE ROW LEVEL SECURITY;

-- 7. Policies for Yellow Card Records
DROP POLICY IF EXISTS "yellow_card_select" ON public.yellow_card_records;
DROP POLICY IF EXISTS "yellow_card_insert" ON public.yellow_card_records;
DROP POLICY IF EXISTS "yellow_card_update" ON public.yellow_card_records;
DROP POLICY IF EXISTS "yellow_card_delete" ON public.yellow_card_records;

-- Select logic: Admin always, Deme blocked, Dinku (airport user) ok, others ok if not deme.
CREATE POLICY "yellow_card_select" ON public.yellow_card_records FOR SELECT TO authenticated 
  USING (
    public.is_admin() OR (
      public.is_authorized() AND 
      (SELECT email FROM public.profiles WHERE id = auth.uid()) != 'demebirhanu@gmail.com'
    )
  );

CREATE POLICY "yellow_card_insert" ON public.yellow_card_records FOR INSERT TO authenticated 
  WITH CHECK (
    public.is_admin() OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('staff', 'airport_staff')
  );

CREATE POLICY "yellow_card_update" ON public.yellow_card_records FOR UPDATE TO authenticated 
  USING (
    public.is_admin() OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('staff', 'airport_staff')
  );

CREATE POLICY "yellow_card_delete" ON public.yellow_card_records FOR DELETE TO authenticated 
  USING (public.is_admin() OR auth.uid() = created_by);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_records_visa_name ON public.visa_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_eoid_name ON public.eoid_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_eoid_underage_name ON public.eoid_underage_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_residence_name ON public.residence_id_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_etd_name ON public.etd_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_alien_passport_name ON public.alien_passport_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_yellow_card_name ON public.yellow_card_records(full_name);
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
INSERT INTO public.profiles (id, email, role, full_name, modules)
SELECT id, email, 'admin', 'Primary Admin', ARRAY['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'AIRPORT', 'Yellow Card', 'Eritrean ID', 'AUDIT', 'Alien Passport']
FROM auth.users
WHERE email = 'dinkuh12@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', modules = ARRAY['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'AIRPORT', 'Yellow Card', 'Eritrean ID', 'AUDIT', 'Alien Passport'];

-- Boost for Ephrem (Airport Only)
INSERT INTO public.profiles (id, email, role, full_name, modules)
SELECT id, email, 'airport_staff', 'Ephrem (Airport)', ARRAY['OVERVIEW', 'AIRPORT']
FROM auth.users
WHERE email = 'ephremweleba94@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'airport_staff', modules = ARRAY['OVERVIEW', 'AIRPORT'];

-- Boost for Mohammed Turi (Airport Viewer Only)
INSERT INTO public.profiles (id, email, role, full_name, modules)
SELECT id, email, 'airport_viewer', 'Mohammed Turi', ARRAY['OVERVIEW', 'AIRPORT', 'AIRPORT_VIEW']
FROM auth.users
WHERE email = 'mohammedturi@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'airport_viewer', modules = ARRAY['OVERVIEW', 'AIRPORT', 'AIRPORT_VIEW'];

-- 11. Custom permission matrix configuration table
CREATE TABLE IF NOT EXISTS public.permission_rules (
  module TEXT PRIMARY KEY,
  view_roles TEXT[] NOT NULL DEFAULT '{}',
  create_roles TEXT[] NOT NULL DEFAULT '{}',
  update_roles TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.permission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can select rules" ON public.permission_rules;
DROP POLICY IF EXISTS "Admins can manage rules" ON public.permission_rules;

CREATE POLICY "Anyone can select rules" ON public.permission_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage rules" ON public.permission_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Prepopulate permission rules with defaults
INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('VISA', ARRAY['admin', 'staff'], ARRAY['admin'], ARRAY[]::text[])
  ON CONFLICT (module) DO NOTHING;
INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('EOID', ARRAY['admin', 'staff'], ARRAY['admin'], ARRAY[]::text[])
  ON CONFLICT (module) DO NOTHING;
INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('EOID Under_Age', ARRAY['admin', 'staff'], ARRAY['admin'], ARRAY[]::text[])
  ON CONFLICT (module) DO NOTHING;
INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('Residence ID', ARRAY['admin', 'staff'], ARRAY['admin', 'staff'], ARRAY['admin'])
  ON CONFLICT (module) DO NOTHING;
INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('ETD', ARRAY['admin'], ARRAY[]::text[], ARRAY[]::text[])
  ON CONFLICT (module) DO NOTHING;
INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('Yellow Card', ARRAY['admin', 'staff'], ARRAY['admin', 'staff'], ARRAY['admin'])
  ON CONFLICT (module) DO UPDATE SET view_roles = EXCLUDED.view_roles, create_roles = EXCLUDED.create_roles, update_roles = EXCLUDED.update_roles;

INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('Eritrean ID', ARRAY['admin', 'staff'], ARRAY['admin', 'staff'], ARRAY['admin'])
  ON CONFLICT (module) DO UPDATE SET view_roles = EXCLUDED.view_roles, create_roles = EXCLUDED.create_roles, update_roles = EXCLUDED.update_roles;
INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('CABINETS', ARRAY['admin', 'staff'], ARRAY['admin', 'staff'], ARRAY[]::text[])
  ON CONFLICT (module) DO NOTHING;
INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('AIRPORT', ARRAY['admin', 'staff', 'airport_staff', 'airport_viewer'], ARRAY['admin', 'staff', 'airport_staff'], ARRAY[]::text[])
  ON CONFLICT (module) DO NOTHING;

INSERT INTO public.permission_rules (module, view_roles, create_roles, update_roles) VALUES
  ('Alien Passport', ARRAY['admin', 'staff'], ARRAY['admin', 'staff'], ARRAY['admin'])
  ON CONFLICT (module) DO NOTHING;

-- 12. Eritrean ID Records Table
CREATE TABLE IF NOT EXISTS public.eritrean_id_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shelf_number TEXT,
  box_number TEXT NOT NULL,
  personal_id_no TEXT,
  personal_file_no TEXT,
  personal_id TEXT, -- Personal ID No.
  eoid_type TEXT, -- Yellow Card Type / Eritrean Card Type
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  citizenship TEXT NOT NULL,
  passport_number TEXT NOT NULL, -- Displays as "Id No." in the frontend
  request_number TEXT NOT NULL,
  letter_number TEXT,
  document_type TEXT NOT NULL DEFAULT 'Scanned Letter',
  date DATE NOT NULL,
  service_provided TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE public.eritrean_id_records ENABLE ROW LEVEL SECURITY;

-- Policies for Eritrean ID Records Table
DROP POLICY IF EXISTS "eritrean_select" ON public.eritrean_id_records;
DROP POLICY IF EXISTS "eritrean_insert" ON public.eritrean_id_records;
DROP POLICY IF EXISTS "eritrean_update" ON public.eritrean_id_records;
DROP POLICY IF EXISTS "eritrean_delete" ON public.eritrean_id_records;

-- Select logic: Admin always, Deme blocked, others ok if authorized
CREATE POLICY "eritrean_select" ON public.eritrean_id_records FOR SELECT TO authenticated 
  USING (
    public.is_admin() OR (
      public.is_authorized() AND 
      (SELECT email FROM public.profiles WHERE id = auth.uid()) != 'demebirhanu@gmail.com'
    )
  );

CREATE POLICY "eritrean_insert" ON public.eritrean_id_records FOR INSERT TO authenticated 
  WITH CHECK (
    public.is_admin() OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('staff', 'airport_staff')
  );

CREATE POLICY "eritrean_update" ON public.eritrean_id_records FOR UPDATE TO authenticated 
  USING (
    public.is_admin() OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('staff', 'airport_staff')
  );

CREATE POLICY "eritrean_delete" ON public.eritrean_id_records FOR DELETE TO authenticated 
  USING (public.is_admin() OR auth.uid() = created_by);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_records_eritrean_name ON public.eritrean_id_records(full_name);

-- Dynamic migration columns for any pre-constructed tables
ALTER TABLE public.residence_id_records ADD COLUMN IF NOT EXISTS personal_file_no TEXT;
ALTER TABLE public.etd_records ADD COLUMN IF NOT EXISTS personal_file_no TEXT;
ALTER TABLE public.residence_id_records ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE public.residence_id_records ALTER COLUMN residence_id_no DROP NOT NULL;
ALTER TABLE public.etd_records ALTER COLUMN passport_number DROP NOT NULL;
ALTER TABLE public.etd_records ALTER COLUMN etd DROP NOT NULL;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
