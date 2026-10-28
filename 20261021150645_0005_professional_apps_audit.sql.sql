/*
# Professional applications and audit logs

## Overview
Tables for professional-role applications (submitted by users wanting non-customer roles,
reviewed by admins) and the append-only audit log of admin actions.

## New Tables

1. `professional_applications` — applications for professional roles
   - id (uuid, PK)
   - user_id (uuid, FK profiles)
   - requested_role (text — one of the 9 roles)
   - organization_id (uuid, FK organizations, nullable)
   - submission_data (jsonb — dynamic form fields)
   - status (text: pending | approved | rejected | revoked)
   - reviewed_by (uuid, FK profiles, nullable)
   - reviewed_at (timestamptz, nullable)
   - review_notes (text, nullable)
   - created_at, updated_at

2. `audit_logs` — append-only log of administrative actions
   - id (uuid, PK)
   - actor_id (uuid — the profile id of the actor)
   - action (text — e.g. "approve_professional_application")
   - target_type (text — e.g. "professional_applications")
   - target_id (text — the id of the affected record)
   - metadata (jsonb, nullable)
   - created_at

## Security
- RLS on both tables.
- professional_applications: authenticated SELECT (admins need to see all; users see
  their own — app layer filters). INSERT owner-scoped (user submits their own).
  UPDATE authenticated (admin approves/rejects).
- audit_logs: authenticated SELECT (auditors/admins view). INSERT authenticated
  (app layer records actions). No UPDATE or DELETE — audit logs are immutable.
*/

-- Professional applications
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

-- updated_at trigger
DROP TRIGGER IF EXISTS prof_apps_set_updated_at ON professional_applications;
CREATE TRIGGER prof_apps_set_updated_at BEFORE UPDATE ON professional_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit logs
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
