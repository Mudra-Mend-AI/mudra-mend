/*
# Fix: set stable search_path on set_updated_at trigger function

The advisor flagged set_updated_at for a mutable search_path. This function is used
by BEFORE UPDATE triggers on multiple tables. Setting search_path = public makes it
safe against schema injection.
*/

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;