/*
# Initial admin bootstrap and self-approval guard

## Purpose
Fixes the administrator verification workflow deadlock: when no admin exists,
all professional applications are permanently stuck because only an admin can
approve them. This migration provides a secure server-side bootstrap mechanism
and adds a database-level guard against self-approval.

## Changes

### 1. New SECURITY DEFINER function: `bootstrap_initial_admin`
- Promotes a user to the admin role with active status, BUT only if NO admin
  currently exists in the profiles table.
- This is a one-shot bootstrap: once any admin exists, the function refuses to
  run, preventing privilege escalation.
- Callable by any authenticated user (the caller must have a valid auth session).
  This is safe because it only works when there are zero admins — the first
  person to call it becomes the initial admin, and all subsequent calls fail.
- Also auto-approves any pending professional_application for that user with
  requested_role = 'admin'.

### 2. New SECURITY DEFINER function: `has_admin`
- Returns true if at least one active admin profile exists.
- Used by the frontend to show a "setup required" message when no admin exists.
- Callable by authenticated users (read-only check).

### 3. Updated `admin_update_profile_role` function
- Added a self-approval guard: the function now refuses if
  target_user_id = auth.uid() (an admin cannot change their own role this way,
  and more importantly cannot approve their own application).
- The existing admin check is preserved.

### 4. Grants
- Revoke EXECUTE from anon/PUBLIC on both new functions.
- Grant EXECUTE to authenticated only.

## Security
- `bootstrap_initial_admin` only works when zero admins exist — it cannot be
  used to escalate privileges once an admin is provisioned.
- `admin_update_profile_role` now blocks self-targeting (target = caller).
- No hardcoded credentials: the bootstrap uses an existing authenticated user.
- The frontend shows a "setup required" screen when no admin exists, with a
  secure bootstrap button visible only to authenticated users with a pending
  admin application.
*/

-- 1. Bootstrap function: promote the first user to admin when no admin exists
CREATE OR REPLACE FUNCTION bootstrap_initial_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  admin_exists boolean;
  pending_app_id uuid;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if any active admin already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin' AND status = 'active'
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE EXCEPTION 'An administrator already exists. Bootstrap is no longer available.';
  END IF;

  -- Verify the caller has a profile and a pending admin application
  SELECT id INTO pending_app_id
  FROM professional_applications
  WHERE user_id = caller_id AND requested_role = 'admin' AND status = 'pending'
  LIMIT 1;

  IF pending_app_id IS NULL THEN
    RAISE EXCEPTION 'No pending administrator application found for this user. Submit a professional application with the Administrator role first.';
  END IF;

  -- Promote the caller to active admin
  UPDATE profiles
  SET role = 'admin', status = 'active', updated_at = now()
  WHERE id = caller_id;

  -- Auto-approve their admin application
  UPDATE professional_applications
  SET status = 'approved', reviewed_by = caller_id, reviewed_at = now(),
      review_notes = 'Self-bootstrap (initial admin provisioning)'
  WHERE id = pending_app_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION bootstrap_initial_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION bootstrap_initial_admin() FROM anon;
GRANT EXECUTE ON FUNCTION bootstrap_initial_admin() TO authenticated;

-- 2. Helper: check if any active admin exists
CREATE OR REPLACE FUNCTION has_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin' AND status = 'active'
  );
END;
$$;

REVOKE ALL ON FUNCTION has_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_admin() TO authenticated;

-- 3. Update admin_update_profile_role to block self-targeting
CREATE OR REPLACE FUNCTION admin_update_profile_role(target_user_id uuid, new_role text, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an active admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admins can update profile roles';
  END IF;

  -- Block self-targeting: an admin cannot change their own role or approve themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Self-modification is not allowed: you cannot change your own role';
  END IF;

  -- Validate the new_role
  IF new_role NOT IN ('customer', 'admin', 'fraud_analyst', 'bank_officer', 'investigator', 'auditor', 'customer_support', 'ngo_coordinator', 'gov_official') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Validate the new_status
  IF new_status NOT IN ('active', 'pending', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'Invalid status: %', new_status;
  END IF;

  -- Update the target user's profile
  UPDATE profiles
  SET role = new_role, status = new_status, updated_at = now()
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_update_profile_role(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_update_profile_role(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_update_profile_role(uuid, text, text) TO authenticated;
