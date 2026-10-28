/*
# Beneficiary Referrals Table

## Summary
Adds a `beneficiary_referrals` table to track referrals from NGO outreach programs to
financial assistance beneficiaries. This supports Part 4's beneficiary referral workflow.

## New Table: beneficiary_referrals
- `id` (uuid, primary key)
- `program_id` (uuid, FK to ngo_programs) — which outreach program generated the referral
- `referrer_id` (uuid, NOT NULL DEFAULT auth.uid()) — the NGO coordinator who made the referral
- `beneficiary_name` (text) — name of the referred person (no sensitive PII like bank details)
- `contact` (text, nullable) — contact info for follow-up (phone/email)
- `region` (text, nullable) — geographic region
- `assistance_type` (text) — type of assistance needed (financial_aid, literacy, scheme_enrollment, other)
- `status` (text, default 'pending') — pending, contacted, enrolled, completed, closed
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamps)

## Security
- RLS enabled
- NGO coordinators and admins can INSERT/SELECT/UPDATE referrals
- Each referrer can see their own referrals; admins/coordinators can see all
- Beneficiary personal financial details are NOT stored — only name, contact, region, and assistance type
*/

CREATE TABLE IF NOT EXISTS beneficiary_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES ngo_programs(id) ON DELETE SET NULL,
  referrer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  beneficiary_name text NOT NULL,
  contact text,
  region text,
  assistance_type text NOT NULL DEFAULT 'financial_aid',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE beneficiary_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_referrals_own" ON beneficiary_referrals;
CREATE POLICY "select_referrals_own" ON beneficiary_referrals FOR SELECT
  TO authenticated USING (
    auth.uid() = referrer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ngo_coordinator', 'gov_official'))
  );

DROP POLICY IF EXISTS "insert_referrals_own" ON beneficiary_referrals;
CREATE POLICY "insert_referrals_own" ON beneficiary_referrals FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = referrer_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ngo_coordinator'))
  );

DROP POLICY IF EXISTS "update_referrals_own" ON beneficiary_referrals;
CREATE POLICY "update_referrals_own" ON beneficiary_referrals FOR UPDATE
  TO authenticated USING (
    auth.uid() = referrer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ngo_coordinator'))
  ) WITH CHECK (
    auth.uid() = referrer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ngo_coordinator'))
  );

DROP POLICY IF EXISTS "delete_referrals_own" ON beneficiary_referrals;
CREATE POLICY "delete_referrals_own" ON beneficiary_referrals FOR DELETE
  TO authenticated USING (auth.uid() = referrer_id);
