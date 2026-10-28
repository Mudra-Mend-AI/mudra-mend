/*
# Tighten admin_update_profile_role execute permissions

## Purpose
The Supabase security advisor flagged that `admin_update_profile_role` is callable
by the `anon` role. Although the function body checks `auth.uid()` against the
profiles table (so a non-admin call would raise an exception), the `anon` role
should not have execute permission at all — defense in depth.

## Changes
1. Revoke EXECUTE on `admin_update_profile_role` from `anon` and `PUBLIC`.
2. Grant EXECUTE only to `authenticated` (the function body still verifies admin role).
*/

REVOKE EXECUTE ON FUNCTION admin_update_profile_role(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_update_profile_role(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_update_profile_role(uuid, text, text) TO authenticated;
