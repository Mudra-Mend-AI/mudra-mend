/*
# Admin role-update function and profile access policy fix

## Purpose
Fixes a critical bug where administrators cannot approve professional applications
because the existing `profile_update_own` RLS policy only allows users to update
their OWN profile row. When an admin tries to set a professional applicant's role
to their requested role (e.g. fraud_analyst), the update silently fails because
RLS blocks it — the admin does not own that user's profile row.

Also fixes the routing bug where pending professional applicants see the Customer
dashboard instead of an "Account Pending Verification" screen.

## Changes

### 1. New SECURITY DEFINER function: `admin_update_profile_role`
- Allows an admin user to update another user's profile role and status.
- Verifies the caller is an admin before performing the update.
- This bypasses RLS safely — only admins can call it, and only for role/status updates.

### 2. Grant execute to authenticated role
- Only authenticated users can call the function.
- The function itself checks that the caller is an admin.

### 3. Updated professional_applications update policy
- The existing policy already allows admins to update applications (checks `profiles.role = 'admin'`).
- No change needed here — the policy is correct.

## Security
- The SECURITY DEFINER function is the ONLY way a non-owner can change a profile's role.
- The function checks `auth.uid()` against the profiles table to verify admin role.
- The function only updates `role`, `status`, and `updated_at` — no other fields.
- This prevents privilege escalation: a regular user cannot call this function to elevate themselves.
*/

-- Create a SECURITY DEFINER function that allows admins to update profile roles
CREATE OR REPLACE FUNCTION admin_update_profile_role(target_user_id uuid, new_role text, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admins can update profile roles';
  END IF;

  -- Validate the new_role is a valid role
  IF new_role NOT IN ('customer', 'admin', 'fraud_analyst', 'bank_officer', 'investigator', 'auditor', 'customer_support', 'ngo_coordinator', 'gov_official') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Validate the new_status is a valid status
  IF new_status NOT IN ('active', 'pending', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'Invalid status: %', new_status;
  END IF;

  -- Update the target user's profile
  UPDATE profiles
  SET role = new_role, status = new_status, updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- Grant execute to authenticated role only
REVOKE ALL ON FUNCTION admin_update_profile_role(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_profile_role(uuid, text, text) TO authenticated;
