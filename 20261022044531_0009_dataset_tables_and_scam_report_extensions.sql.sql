/*
# Dataset storage tables and scam_reports investigation extensions

## Overview
Adds three new tables for fraud-dataset storage (sources, records, import history)
and extends the existing `scam_reports` table with investigation fields.

## New Tables

1. `dataset_sources` — registered dataset sources with provenance metadata
   - id (uuid, PK)
   - name (text) — e.g. "RBI Annual Fraud Report"
   - source_type (text: rbi | i4c | ncrp | academic | kaggle | upi_research | other)
   - source_url (text)
   - license (text)
   - description (text)
   - is_active (boolean)
   - created_at, updated_at

2. `dataset_records` — individual normalized records from imported datasets
   - id (uuid, PK)
   - source_id (uuid, FK dataset_sources)
   - import_id (uuid, FK dataset_imports, nullable)
   - scam_category (text) — normalized category
   - description (text)
   - incident_date (date, nullable) — when the incident occurred, if known
   - region (text, nullable)
   - payment_channel (text, nullable) — UPI, QR, bank_transfer, etc.
   - indicators (text[]) — fraud indicators/flags
   - verification_status (text: unverified | reviewed | verified) — NEVER auto-verified
   - record_metadata (jsonb) — extra fields from the source
   - import_timestamp (timestamptz)
   - created_at

3. `dataset_imports` — log of each dataset import operation
   - id (uuid, PK)
   - source_id (uuid, FK dataset_sources)
   - imported_by (uuid, FK profiles)
   - filename (text)
   - file_format (text: csv | json)
   - total_rows (int)
   - accepted_rows (int)
   - rejected_rows (int)
   - duplicate_rows (int)
   - status (text: pending | completed | partial | failed)
   - error_summary (text, nullable)
   - created_at

## Modified Tables
- `scam_reports` — ADD columns: incident_date (date, nullable), amount (numeric, nullable),
  payment_channel (text, nullable), assigned_to (uuid, FK profiles, nullable),
  investigation_notes (text, nullable)

## Security
- RLS enabled on all new tables.
- dataset_sources: authenticated SELECT (all roles can see sources). INSERT/UPDATE
  admin-only (app enforces via role check; policy allows authenticated for flexibility).
- dataset_records: authenticated SELECT (role-gating in app layer). INSERT/UPDATE
  authenticated (admin/fraud_analyst manage records).
- dataset_imports: authenticated SELECT (audit trail). INSERT authenticated.
- scam_reports extended columns: existing owner-scoped policies still apply; new
  columns are accessible under the same policies. Staff (investigators, analysts)
  read scam_reports through the existing SELECT policy.
*/

-- Dataset sources
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

-- Dataset imports
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

-- Dataset records
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

-- updated_at trigger for dataset_sources
DROP TRIGGER IF EXISTS ds_sources_set_updated_at ON dataset_sources;
CREATE TRIGGER ds_sources_set_updated_at BEFORE UPDATE ON dataset_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Extend scam_reports with investigation fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scam_reports' AND column_name = 'incident_date') THEN
    ALTER TABLE scam_reports ADD COLUMN incident_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scam_reports' AND column_name = 'amount') THEN
    ALTER TABLE scam_reports ADD COLUMN amount numeric CHECK (amount IS NULL OR amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scam_reports' AND column_name = 'payment_channel') THEN
    ALTER TABLE scam_reports ADD COLUMN payment_channel text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scam_reports' AND column_name = 'assigned_to') THEN
    ALTER TABLE scam_reports ADD COLUMN assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scam_reports' AND column_name = 'investigation_notes') THEN
    ALTER TABLE scam_reports ADD COLUMN investigation_notes text;
  END IF;
END $$;
