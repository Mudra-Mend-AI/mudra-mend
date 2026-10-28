/*
# Support, outreach, government schemes, professional apps, audit logs, datasets
Combines support_outreach_schemes, professional_apps_audit, and dataset tables.
*/

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','escalated','closed')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_authenticated" ON support_tickets;
CREATE POLICY "tickets_select_authenticated" ON support_tickets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tickets_insert_own" ON support_tickets;
CREATE POLICY "tickets_insert_own" ON support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tickets_update_authenticated" ON support_tickets;
CREATE POLICY "tickets_update_authenticated" ON support_tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE TABLE IF NOT EXISTS ticket_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  body text NOT NULL DEFAULT '',
  is_ai_draft boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "responses_select_authenticated" ON ticket_responses;
CREATE POLICY "responses_select_authenticated" ON ticket_responses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "responses_insert_authenticated" ON ticket_responses;
CREATE POLICY "responses_insert_authenticated" ON ticket_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);

DROP TRIGGER IF EXISTS support_tickets_set_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_set_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS govt_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  eligibility text NOT NULL DEFAULT '',
  benefits text NOT NULL DEFAULT '',
  application_process text NOT NULL DEFAULT '',
  official_url text,
  scam_warning text,
  is_demo boolean NOT NULL DEFAULT false,
  last_updated timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE govt_schemes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schemes_select_authenticated" ON govt_schemes;
CREATE POLICY "schemes_select_authenticated" ON govt_schemes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "schemes_insert_authenticated" ON govt_schemes;
CREATE POLICY "schemes_insert_authenticated" ON govt_schemes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "schemes_update_authenticated" ON govt_schemes;
CREATE POLICY "schemes_update_authenticated" ON govt_schemes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS ngo_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  region text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','paused')),
  outreach_events_count int NOT NULL DEFAULT 0,
  beneficiaries_reached int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ngo_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "programs_select_authenticated" ON ngo_programs;
CREATE POLICY "programs_select_authenticated" ON ngo_programs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "programs_insert_authenticated" ON ngo_programs;
CREATE POLICY "programs_insert_authenticated" ON ngo_programs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "programs_update_authenticated" ON ngo_programs;
CREATE POLICY "programs_update_authenticated" ON ngo_programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ngo_programs_organization_id ON ngo_programs(organization_id);

DROP TRIGGER IF EXISTS ngo_programs_set_updated_at ON ngo_programs;
CREATE TRIGGER ngo_programs_set_updated_at BEFORE UPDATE ON ngo_programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS beneficiary_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES ngo_programs(id) ON DELETE SET NULL,
  referrer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  beneficiary_name text NOT NULL,
  contact text,
  region text,
  assistance_type text NOT NULL DEFAULT 'financial_aid' CHECK (assistance_type IN ('financial_aid','literacy','scheme_enrollment','other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','enrolled','completed','closed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE beneficiary_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_select_authenticated" ON beneficiary_referrals;
CREATE POLICY "referrals_select_authenticated" ON beneficiary_referrals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "referrals_insert_authenticated" ON beneficiary_referrals;
CREATE POLICY "referrals_insert_authenticated" ON beneficiary_referrals FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "referrals_update_authenticated" ON beneficiary_referrals;
CREATE POLICY "referrals_update_authenticated" ON beneficiary_referrals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_beneficiary_referrals_program_id ON beneficiary_referrals(program_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_referrals_referrer_id ON beneficiary_referrals(referrer_id);

DROP TRIGGER IF EXISTS beneficiary_referrals_set_updated_at ON beneficiary_referrals;
CREATE TRIGGER beneficiary_referrals_set_updated_at BEFORE UPDATE ON beneficiary_referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS professional_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('customer','admin','fraud_analyst','bank_officer','investigator','auditor','customer_support','ngo_coordinator','gov_official')),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  submission_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE professional_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prof_apps_select_authenticated" ON professional_applications;
CREATE POLICY "prof_apps_select_authenticated" ON professional_applications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "prof_apps_insert_own" ON professional_applications;
CREATE POLICY "prof_apps_insert_own" ON professional_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "prof_apps_update_authenticated" ON professional_applications;
CREATE POLICY "prof_apps_update_authenticated" ON professional_applications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_prof_apps_user_id ON professional_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_prof_apps_status ON professional_applications(status);

DROP TRIGGER IF EXISTS prof_apps_set_updated_at ON professional_applications;
CREATE TRIGGER prof_apps_set_updated_at BEFORE UPDATE ON professional_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select_authenticated" ON audit_logs;
CREATE POLICY "audit_select_authenticated" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "audit_insert_authenticated" ON audit_logs;
CREATE POLICY "audit_insert_authenticated" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);

CREATE TABLE IF NOT EXISTS dataset_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'other' CHECK (source_type IN ('rbi','i4c','ncrp','academic','kaggle','upi_research','other')),
  source_url text,
  license text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dataset_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ds_sources_select_auth" ON dataset_sources;
CREATE POLICY "ds_sources_select_auth" ON dataset_sources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ds_sources_insert_auth" ON dataset_sources;
CREATE POLICY "ds_sources_insert_auth" ON dataset_sources FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ds_sources_update_auth" ON dataset_sources;
CREATE POLICY "ds_sources_update_auth" ON dataset_sources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS dataset_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES dataset_sources(id) ON DELETE CASCADE,
  imported_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_format text NOT NULL DEFAULT 'csv' CHECK (file_format IN ('csv','json')),
  total_rows int NOT NULL DEFAULT 0,
  accepted_rows int NOT NULL DEFAULT 0,
  rejected_rows int NOT NULL DEFAULT 0,
  duplicate_rows int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','partial','failed')),
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dataset_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ds_imports_select_auth" ON dataset_imports;
CREATE POLICY "ds_imports_select_auth" ON dataset_imports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ds_imports_insert_own" ON dataset_imports;
CREATE POLICY "ds_imports_insert_own" ON dataset_imports FOR INSERT TO authenticated WITH CHECK (auth.uid() = imported_by);
DROP POLICY IF EXISTS "ds_imports_update_own" ON dataset_imports;
CREATE POLICY "ds_imports_update_own" ON dataset_imports FOR UPDATE TO authenticated USING (auth.uid() = imported_by) WITH CHECK (auth.uid() = imported_by);

CREATE TABLE IF NOT EXISTS dataset_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES dataset_sources(id) ON DELETE CASCADE,
  import_id uuid REFERENCES dataset_imports(id) ON DELETE SET NULL,
  scam_category text NOT NULL,
  description text NOT NULL DEFAULT '',
  incident_date date,
  region text,
  payment_channel text,
  indicators text[] NOT NULL DEFAULT '{}',
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','reviewed','verified')),
  record_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  import_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dataset_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ds_records_select_auth" ON dataset_records;
CREATE POLICY "ds_records_select_auth" ON dataset_records FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ds_records_insert_auth" ON dataset_records;
CREATE POLICY "ds_records_insert_auth" ON dataset_records FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ds_records_update_auth" ON dataset_records;
CREATE POLICY "ds_records_update_auth" ON dataset_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_dataset_records_source_id ON dataset_records(source_id);
CREATE INDEX IF NOT EXISTS idx_dataset_records_category ON dataset_records(scam_category);
CREATE INDEX IF NOT EXISTS idx_dataset_records_incident_date ON dataset_records(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_dataset_imports_source_id ON dataset_imports(source_id);

DROP TRIGGER IF EXISTS ds_sources_set_updated_at ON dataset_sources;
CREATE TRIGGER ds_sources_set_updated_at BEFORE UPDATE ON dataset_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
