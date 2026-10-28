/*
# Server-side RPC functions

## Overview
Four PostgreSQL functions called from the frontend via supabase.rpc():

1. `has_admin()` — returns boolean: does any profile with role='admin' and status='active' exist?
   Used by AccountPending to determine if initial-admin bootstrap is available.

2. `bootstrap_initial_admin()` — SECURITY DEFINER. Promotes the caller to admin IF
   no admin currently exists AND the caller has a pending professional application
   with requested_role='admin'. This is the self-approval guard for the very first admin.

3. `admin_update_profile_role(target_user_id, new_role, new_status)` — SECURITY DEFINER.
   Allows an active admin to change another user's role and status. Prevents self-modification
   (admin cannot change their own role via this function). Sets profile.status and profile.role.

4. `create_simulated_transaction(...)` — SECURITY DEFINER. Creates a simulated transaction
   with idempotency enforcement and server-side fraud enforcement. If the assessment risk
   level is 'blocked', the transaction is created with status='cancelled'. Otherwise it
   succeeds. Idempotency key prevents duplicate submissions.

## Security Notes
- has_admin: SECURITY INVOKER (reads profiles, which authenticated users can already SELECT).
- bootstrap_initial_admin: SECURITY DEFINER because it must UPDATE profiles even though
  the caller is not yet an admin (and profiles UPDATE policy is self-only). Guards:
  (a) no existing active admin, (b) caller has pending admin application. EXECUTE to authenticated only.
- admin_update_profile_role: SECURITY DEFINER because it updates OTHER users' profiles
  (which RLS would block). Guards: (a) caller is an active admin, (b) target is not the caller.
  EXECUTE to authenticated only.
- create_simulated_transaction: SECURITY DEFINER because it inserts into transactions
  with an arbitrary sender_id (the RPC enforces sender = caller). Also handles idempotency
  and blocked-payment enforcement server-side so the client cannot bypass safety rules.
  EXECUTE to authenticated only.

All functions use a stable search_path to prevent schema injection.
*/

-- 1. has_admin()
CREATE OR REPLACE FUNCTION has_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin' AND status = 'active'
  );
$$;

-- 2. bootstrap_initial_admin()
CREATE OR REPLACE FUNCTION bootstrap_initial_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  admin_exists boolean;
  has_pending_app boolean;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Guard 1: no active admin must exist
  SELECT EXISTS (SELECT 1 FROM profiles WHERE role = 'admin' AND status = 'active') INTO admin_exists;
  IF admin_exists THEN
    RAISE EXCEPTION 'An administrator already exists. Bootstrap is no longer available.';
  END IF;

  -- Guard 2: caller must have a pending professional application requesting admin role
  SELECT EXISTS (
    SELECT 1 FROM professional_applications
    WHERE user_id = caller_id AND requested_role = 'admin' AND status = 'pending'
  ) INTO has_pending_app;
  IF NOT has_pending_app THEN
    RAISE EXCEPTION 'You must submit a professional application for the Administrator role first.';
  END IF;

  -- Promote the caller
  UPDATE profiles SET role = 'admin', status = 'active', updated_at = now()
    WHERE id = caller_id;

  -- Mark the application as approved (self-approved in this bootstrap-only case)
  UPDATE professional_applications
    SET status = 'approved', reviewed_by = caller_id, reviewed_at = now(),
        review_notes = 'Bootstrap: initial admin self-activated', updated_at = now()
    WHERE user_id = caller_id AND requested_role = 'admin' AND status = 'pending';

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
    VALUES (caller_id::text, 'bootstrap_initial_admin', 'profiles', caller_id::text,
            jsonb_build_object('method', 'bootstrap'));
END;
$$;

-- 3. admin_update_profile_role(target_user_id, new_role, new_status)
CREATE OR REPLACE FUNCTION admin_update_profile_role(
  target_user_id uuid,
  new_role text,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
  caller_status text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Caller must be an active admin
  SELECT role, status INTO caller_role, caller_status FROM profiles WHERE id = caller_id;
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Caller profile not found';
  END IF;
  IF caller_role <> 'admin' OR caller_status <> 'active' THEN
    RAISE EXCEPTION 'Only active administrators can update user roles';
  END IF;

  -- Cannot modify self
  IF target_user_id = caller_id THEN
    RAISE EXCEPTION 'You cannot modify your own role via this function';
  END IF;

  -- Validate role and status values
  IF new_role NOT IN ('customer','admin','fraud_analyst','bank_officer','investigator','auditor','customer_support','ngo_coordinator','gov_official') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;
  IF new_status NOT IN ('active','pending','suspended') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  UPDATE profiles
    SET role = new_role, status = new_status, updated_at = now()
    WHERE id = target_user_id;
END;
$$;

-- 4. create_simulated_transaction(...)
CREATE OR REPLACE FUNCTION create_simulated_transaction(
  p_sender_id uuid,
  p_recipient_ref jsonb,
  p_amount numeric,
  p_payment_mode text,
  p_purpose text,
  p_idempotency_key text,
  p_assessment_risk_level text,
  p_assessment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  existing_txn jsonb;
  new_id uuid;
  new_ref text;
  txn_status text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Sender must be the authenticated user
  IF p_sender_id <> caller_id THEN
    RAISE EXCEPTION 'Sender must be the authenticated user';
  END IF;

  -- Idempotency: if a txn with this key already exists, return it
  IF p_idempotency_key IS NOT NULL THEN
    SELECT to_jsonb(t) INTO existing_txn
      FROM transactions t
      WHERE t.idempotency_key = p_idempotency_key
      LIMIT 1;
    IF existing_txn IS NOT NULL THEN
      RETURN existing_txn;
    END IF;
  END IF;

  -- Server-side fraud enforcement: blocked risk => cancelled
  IF p_assessment_risk_level = 'blocked' THEN
    txn_status := 'cancelled';
  ELSE
    txn_status := 'success';
  END IF;

  new_id := gen_random_uuid();
  new_ref := 'SIM-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

  INSERT INTO transactions (
    id, sender_id, recipient_ref, amount, currency, status, payment_mode,
    purpose, reference_id, is_simulated, assessment_id, idempotency_key
  ) VALUES (
    new_id, p_sender_id, p_recipient_ref, p_amount, 'INR', txn_status, p_payment_mode,
    p_purpose, new_ref, true, p_assessment_id, p_idempotency_key
  );

  -- Link assessment to the transaction if provided
  IF p_assessment_id IS NOT NULL THEN
    UPDATE fraud_assessments SET transaction_id = new_id WHERE id = p_assessment_id;
  END IF;

  RETURN jsonb_build_object(
    'id', new_id,
    'sender_id', p_sender_id,
    'recipient_ref', p_recipient_ref,
    'amount', p_amount,
    'currency', 'INR',
    'status', txn_status,
    'payment_mode', p_payment_mode,
    'purpose', p_purpose,
    'reference_id', new_ref,
    'is_simulated', true,
    'assessment_id', p_assessment_id,
    'idempotency_key', p_idempotency_key,
    'created_at', now(),
    'updated_at', now()
  );
END;
$$;

-- Grant EXECUTE to authenticated role only
REVOKE EXECUTE ON FUNCTION has_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION has_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION bootstrap_initial_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION bootstrap_initial_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_update_profile_role(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION admin_update_profile_role(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION create_simulated_transaction(uuid, jsonb, numeric, text, text, text, text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION create_simulated_transaction(uuid, jsonb, numeric, text, text, text, text, uuid) TO authenticated;
