/*
# Core profiles, organizations, bank branches, accounts, and recipients

Establishes the foundational tables for the Mudra-Mend fraud-prevention banking app:
user profiles (linked to Supabase auth), organizations, bank branch directory,
user-linked bank accounts, and saved recipients.

## New Tables
1. organizations — entities professionals belong to (banks, NGOs, govt depts, etc.)
2. profiles — user profile row, one per auth user. Drives role-based access.
3. bank_branches — IFSC directory used for bank account linking
4. bank_accounts — user-linked bank accounts (masked account number)
5. recipients — saved payees for quick payments

## Security
- RLS enabled on all tables.
- profiles: authenticated users can read all profiles; update only their own.
- organizations, bank_branches: read access for authenticated (shared reference data).
- bank_accounts, recipients: owner-scoped CRUD via auth.uid() = user_id.
- Owner columns default to auth.uid() so client inserts omitting user_id still satisfy WITH CHECK.
*/

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('bank','ngo','government','internal')),
  name text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO authenticated;
DROP POLICY IF EXISTS "org_select_authenticated" ON organizations;
CREATE POLICY "org_select_authenticated" ON organizations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "org_insert_authenticated" ON organizations;
CREATE POLICY "org_insert_authenticated" ON organizations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "org_update_authenticated" ON organizations;
CREATE POLICY "org_update_authenticated" ON organizations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','fraud_analyst','bank_officer','investigator','auditor','customer_support','ngo_coordinator','gov_official')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended')),
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
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Bank branches (reference data)
CREATE TABLE IF NOT EXISTS bank_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ifsc text UNIQUE NOT NULL,
  bank_name text NOT NULL,
  branch_name text NOT NULL,
  city text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bank_branches ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON bank_branches TO authenticated;
DROP POLICY IF EXISTS "branches_select_authenticated" ON bank_branches;
CREATE POLICY "branches_select_authenticated" ON bank_branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "branches_insert_authenticated" ON bank_branches;
CREATE POLICY "branches_insert_authenticated" ON bank_branches FOR INSERT TO authenticated WITH CHECK (true);

-- Bank accounts (owner-scoped)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  account_number text NOT NULL,
  account_number_last4 text NOT NULL,
  ifsc text,
  bank_name text NOT NULL,
  branch_name text,
  account_type text NOT NULL DEFAULT 'savings' CHECK (account_type IN ('savings','current','nre','nro')),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  is_preferred boolean NOT NULL DEFAULT false,
  linked_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_accounts TO authenticated;
DROP POLICY IF EXISTS "bank_accts_select_own" ON bank_accounts;
CREATE POLICY "bank_accts_select_own" ON bank_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "bank_accts_insert_own" ON bank_accounts;
CREATE POLICY "bank_accts_insert_own" ON bank_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "bank_accts_update_own" ON bank_accounts;
CREATE POLICY "bank_accts_update_own" ON bank_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "bank_accts_delete_own" ON bank_accounts;
CREATE POLICY "bank_accts_delete_own" ON bank_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);

-- Recipients (owner-scoped)
CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_number text,
  ifsc text,
  upi_id text,
  note text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipients TO authenticated;
DROP POLICY IF EXISTS "recipients_select_own" ON recipients;
CREATE POLICY "recipients_select_own" ON recipients FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recipients_insert_own" ON recipients;
CREATE POLICY "recipients_insert_own" ON recipients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "recipients_update_own" ON recipients;
CREATE POLICY "recipients_update_own" ON recipients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "recipients_delete_own" ON recipients;
CREATE POLICY "recipients_delete_own" ON recipients FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients(user_id);

-- updated_at trigger function (with stable search_path)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS organizations_set_updated_at ON organizations;
CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
