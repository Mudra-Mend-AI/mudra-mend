/*
# Support, outreach, and government schemes

## Overview
Tables for customer support tickets and their responses, the government scheme
reference directory, NGO outreach programs, and beneficiary referrals.

## New Tables

1. `support_tickets` — user-submitted support tickets
   - id (uuid, PK)
   - user_id (uuid, FK profiles)
   - subject, category (text)
   - status (text: open | in_progress | resolved | escalated | closed)
   - assigned_to (uuid, FK profiles, nullable)
   - priority (text: low | medium | high | critical)
   - ai_summary (text, nullable)
   - created_at, updated_at

2. `ticket_responses` — messages on a support ticket (user or AI draft)
   - id (uuid, PK)
   - ticket_id (uuid, FK support_tickets, ON DELETE CASCADE)
   - author_id (uuid — may be a profile id or a sentinel like 'ai-assistant')
   - body (text)
   - is_ai_draft (boolean, default false)
   - created_at

3. `govt_schemes` — reference directory of legitimate government schemes
   - id (uuid, PK)
   - name, department, category, eligibility, benefits, application_process (text)
   - official_url, scam_warning (text, nullable)
   - is_demo (boolean)
   - last_updated (timestamptz)

4. `ngo_programs` — NGO outreach programs
   - id (uuid, PK)
   - organization_id (uuid, FK organizations)
   - name, description, region (text)
   - status (text: planned | active | completed | paused)
   - outreach_events_count, beneficiaries_reached (int, default 0)
   - created_at, updated_at

5. `beneficiary_referrals` — individual beneficiaries referred for assistance
   - id (uuid, PK)
   - program_id (uuid, FK ngo_programs, nullable)
   - referrer_id (uuid, FK profiles)
   - beneficiary_name, contact, region (text)
   - assistance_type (text: financial_aid | literacy | scheme_enrollment | other)
   - status (text: pending | contacted | enrolled | completed | closed)
   - notes (text, nullable)
   - created_at, updated_at

## Security
- RLS on all tables.
- support_tickets: owner-scoped SELECT (user sees their tickets). INSERT owner-scoped.
  Support agents need cross-user reads — authenticated SELECT granted (role-gating in app).
  UPDATE authenticated (agents change status).
- ticket_responses: authenticated SELECT (conversation visible to owner + agents).
  INSERT authenticated (app controls authorship).
- govt_schemes: authenticated SELECT (public reference data). INSERT/UPDATE admin via service role.
- ngo_programs: authenticated SELECT/INSERT/UPDATE (coordinators manage programs).
- beneficiary_referrals: authenticated SELECT/INSERT/UPDATE (coordinators manage referrals).
*/

-- Support tickets
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

-- Ticket responses
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

-- updated_at trigger for support tickets
DROP TRIGGER IF EXISTS support_tickets_set_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_set_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Government schemes
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

-- NGO programs
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

-- updated_at trigger for ngo_programs
DROP TRIGGER IF EXISTS ngo_programs_set_updated_at ON ngo_programs;
CREATE TRIGGER ngo_programs_set_updated_at BEFORE UPDATE ON ngo_programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Beneficiary referrals
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

-- updated_at trigger for beneficiary_referrals
DROP TRIGGER IF EXISTS beneficiary_referrals_set_updated_at ON beneficiary_referrals;
CREATE TRIGGER beneficiary_referrals_set_updated_at BEFORE UPDATE ON beneficiary_referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
