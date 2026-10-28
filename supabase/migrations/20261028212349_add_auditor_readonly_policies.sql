/*
# Add Auditor Read-Only RLS Policies

## Purpose
The auditor role needs read-only access to transactions, alerts, and fraud_assessments
across all users for compliance auditing and report generation. Currently these tables
only allow users to see their own records. This migration adds SELECT policies that
allow users with the 'auditor' role to read all rows in these tables.

## Changes
1. New SELECT policies on `transactions` for auditor role (read all rows)
2. New SELECT policies on `alerts` for auditor role (read all rows)
3. New SELECT policies on `fraud_assessments` for auditor role (read all rows)

## Security
- All new policies are SELECT-only (read-only) — no INSERT, UPDATE, or DELETE
- Policies use a security helper function to check if the caller has the auditor role
- The `audit_logs` table already has a permissive SELECT policy for all authenticated users
- The `profiles` table already has a permissive SELECT policy for all authenticated users
- The `cases` table already has a permissive SELECT policy for all authenticated users

## Notes
- The auditor function `is_auditor()` checks `auth.jwt() ->> 'role'` is 'auditor'
  Since the app stores role in the profiles table (not JWT claims), we use a
  subquery to check profiles.role instead.
- Existing policies remain unchanged — auditor policies are additive
*/

-- Helper function: check if the current user has the auditor role
CREATE OR REPLACE FUNCTION public.is_auditor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'auditor'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_auditor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_auditor() TO authenticated;

-- Transactions: auditor can read all rows
DROP POLICY IF EXISTS "txn_select_auditor" ON transactions;
CREATE POLICY "txn_select_auditor"
ON transactions FOR SELECT
TO authenticated
USING (public.is_auditor());

-- Alerts: auditor can read all rows
DROP POLICY IF EXISTS "alerts_select_auditor" ON alerts;
CREATE POLICY "alerts_select_auditor"
ON alerts FOR SELECT
TO authenticated
USING (public.is_auditor());

-- Fraud assessments: auditor can read all rows
DROP POLICY IF EXISTS "assess_select_auditor" ON fraud_assessments;
CREATE POLICY "assess_select_auditor"
ON fraud_assessments FOR SELECT
TO authenticated
USING (public.is_auditor());
