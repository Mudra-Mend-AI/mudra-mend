/*
# Restrict has_admin to authenticated only

## Purpose
The security advisor flagged that `has_admin()` is callable by the `anon` role.
The AccountPending page runs behind ProtectedRoute (authenticated users only),
so anon access is unnecessary. Tighten the grant.

## Changes
- Revoke EXECUTE on `has_admin()` from anon and PUBLIC.
- Grant EXECUTE only to authenticated.
*/

REVOKE ALL ON FUNCTION has_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION has_admin() FROM anon;
GRANT EXECUTE ON FUNCTION has_admin() TO authenticated;
