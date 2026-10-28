/*
# Core profiles, roles, and professional applications

## Purpose
Establishes the foundational auth-linked schema for Mudra-Mend: user profiles
with role assignment, language/theme preferences, and the professional-account
application pipeline used to onboard the 8 professional roles.

## New Tables

1. `profiles`
   - One row per authenticated user (id matches auth.users.id).
   - `role` — the active role: customer, admin, fraud_analyst, bank_officer,
     investigator, auditor, customer_support, ngo_coordinator, gov_official.
   - `status` — active, pending, suspended, revoked.
   - `full_name`, `mobile`, `preferred_language` (en/hi/mr), `theme` (light/dark).
   - `organization_id` — optional link to an organization (bank, ngo, agency).
   - `scope` — JSONB for role-specific scope (branch ids, regions, case ids).

2. `organizations`
   - Banks, NGOs, government departments, agencies, support orgs.
   - `type` — bank, ngo, government, agency, support.
   - `name`, `verification_status`, `contact_email`, `metadata` (JSONB).

3. `professional_applications`
   - Onboarding requests for professional roles.
   - Links applicant user_id, requested role, organization, submitted data (JSONB).
   - `status` — pending, approved, rejected, revoked.
   - `reviewed_by` — admin who approved/rejected.
   - `reviewed_at`, `review_notes`.

## Security
- RLS enabled on all tables.
- profiles: each user reads/updates only their own row.
- organizations: readable by authenticated; insert/update by admins only via service role (RLS denies anon).
- professional_applications: applicant can read their own; admins can read all.
- Owner columns default to auth.uid() so inserts from the client succeed.
*/

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('bank','ngo','government','agency','support')),
  name text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  contact_email text,
  contact_phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_authenticated" ON organizations;
CREATE POLICY "org_select_authenticated" ON organizations FOR SELECT
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','fraud_analyst','bank_officer','investigator','auditor','customer_support','ngo_coordinator','gov_official')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended','revoked')),
  full_name text NOT NULL DEFAULT '',
  mobile text,
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','hi','mr')),
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark')),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_select_own" ON profiles;
CREATE POLICY "profile_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profile_insert_own" ON profiles;
CREATE POLICY "profile_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profile_update_own" ON profiles;
CREATE POLICY "profile_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS professional_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('admin','fraud_analyst','bank_officer','investigator','auditor','customer_support','ngo_coordinator','gov_official')),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  submission_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE professional_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pa_select_own_or_admin" ON professional_applications;
CREATE POLICY "pa_select_own_or_admin" ON professional_applications FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "pa_insert_own" ON professional_applications;
CREATE POLICY "pa_insert_own" ON professional_applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pa_update_admin" ON professional_applications;
CREATE POLICY "pa_update_admin" ON professional_applications FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_prof_apps_status ON professional_applications(status);
CREATE INDEX IF NOT EXISTS idx_prof_apps_user ON professional_applications(user_id);