-- Enable RLS
-- Note: auth schema tables are managed by Supabase, we don't create them.

-- 1. Create Profiles table (for role-based access)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'viewer')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
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
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
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
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
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
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
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
CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 5. Policies for Records
-- Drop overlapping policies first
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

-- Helper Function for Admin Check (more performant in RLS)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VISA Policies
CREATE POLICY "visa_select" ON public.visa_records FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "visa_insert" ON public.visa_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "visa_update" ON public.visa_records FOR UPDATE TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "visa_delete" ON public.visa_records FOR DELETE TO authenticated USING (auth.uid() = created_by OR is_admin());

-- EOID Policies
CREATE POLICY "eoid_select" ON public.eoid_records FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "eoid_insert" ON public.eoid_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "eoid_update" ON public.eoid_records FOR UPDATE TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "eoid_delete" ON public.eoid_records FOR DELETE TO authenticated USING (auth.uid() = created_by OR is_admin());

-- Residence ID Policies
CREATE POLICY "residence_select" ON public.residence_id_records FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "residence_insert" ON public.residence_id_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "residence_update" ON public.residence_id_records FOR UPDATE TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "residence_delete" ON public.residence_id_records FOR DELETE TO authenticated USING (auth.uid() = created_by OR is_admin());

-- ETD Policies
CREATE POLICY "etd_select" ON public.etd_records FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "etd_insert" ON public.etd_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "etd_update" ON public.etd_records FOR UPDATE TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "etd_delete" ON public.etd_records FOR DELETE TO authenticated USING (auth.uid() = created_by OR is_admin());

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
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.record_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View attachments" ON public.record_attachments;
DROP POLICY IF EXISTS "Insert attachments" ON public.record_attachments;
DROP POLICY IF EXISTS "Delete attachments" ON public.record_attachments;

CREATE POLICY "attachments_select" ON public.record_attachments FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "attachments_insert" ON public.record_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "attachments_delete" ON public.record_attachments FOR DELETE TO authenticated USING (auth.uid() = created_by OR is_admin());

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_records_visa_name ON public.visa_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_eoid_name ON public.eoid_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_residence_name ON public.residence_id_records(full_name);
CREATE INDEX IF NOT EXISTS idx_records_etd_name ON public.etd_records(full_name);
CREATE INDEX IF NOT EXISTS idx_attachments_record ON public.record_attachments(record_id);
