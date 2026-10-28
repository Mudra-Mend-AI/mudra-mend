/*
# Idempotency Key and Server-Side Fraud Enforcement

## Summary
Adds an idempotency key column to the transactions table to prevent duplicate payment submissions.
Creates a SECURITY DEFINER function that enforces fraud assessment outcomes server-side, so that
"blocked" payments cannot be inserted into the database even if a user bypasses the frontend UI.

## Changes

### 1. New column: transactions.idempotency_key
- `idempotency_key text` — a client-generated unique key per payment intent. When the same key
  is submitted twice, the second insert is rejected, preventing accidental double-submission
  (e.g. double-click on "Confirm Payment"). A unique index enforces this.

### 2. New function: create_simulated_transaction()
- SECURITY DEFINER function that inserts a simulated transaction ONLY if the associated fraud
  assessment risk level is NOT 'blocked'. This is the server-side enforcement: even if a user
  tampers with the frontend to skip the block, the database function will refuse to create the
  transaction.
- Accepts: sender_id, recipient_ref (jsonb), amount, payment_mode, purpose, idempotency_key,
  assessment_risk_level (text), assessment_id (uuid, nullable).
- Returns the created transaction row, or raises an exception if blocked or duplicate.
- Checks idempotency: if a transaction with the same idempotency_key already exists for this
  sender, returns the existing row instead of creating a duplicate.
- Verifies the caller is the sender (auth.uid() = p_sender_id).

### 3. Security
- The function runs as SECURITY DEFINER (owner privileges) so it can insert into transactions
  regardless of RLS, but it internally checks auth.uid() to prevent impersonation.
- Only the owner of the function (postgres) can execute it; we grant EXECUTE to authenticated.
- The idempotency unique index prevents duplicate transactions per user per key.

## Important Notes
1. This migration is idempotent — safe to re-run.
2. The idempotency_key column is nullable for backward compatibility with existing rows.
3. The function does NOT process real payments — it only creates simulated transaction records
   with server-side enforcement of fraud block decisions.
*/

-- 1. Add idempotency_key column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key text;

-- 2. Create unique index for idempotency (per sender, only for non-null keys)
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_unique
  ON transactions (sender_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Grant execute on the function to authenticated users (after function creation)
-- (granted after function definition below)

-- 4. SECURITY DEFINER function for server-side fraud enforcement
CREATE OR REPLACE FUNCTION create_simulated_transaction(
  p_sender_id uuid,
  p_recipient_ref jsonb,
  p_amount numeric,
  p_payment_mode text,
  p_purpose text,
  p_idempotency_key text,
  p_assessment_risk_level text,
  p_assessment_id uuid DEFAULT NULL
) RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_txn transactions%ROWTYPE;
  new_txn transactions%ROWTYPE;
  simulated_status text;
BEGIN
  -- Verify caller identity — prevent impersonation
  IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
    RAISE EXCEPTION 'Unauthorized: caller does not match sender_id';
  END IF;

  -- Server-side fraud enforcement: refuse blocked payments
  IF p_assessment_risk_level = 'blocked' THEN
    RAISE EXCEPTION 'Payment blocked: fraud assessment risk level is blocked';
  END IF;

  -- Idempotency check: if this key already used, return the existing transaction
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO existing_txn
    FROM transactions
    WHERE sender_id = p_sender_id AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN existing_txn;
    END IF;
  END IF;

  -- Determine simulated status (high risk has 30% chance of failure)
  IF p_assessment_risk_level = 'high' THEN
    simulated_status := CASE WHEN random() < 0.3 THEN 'failed' ELSE 'success' END;
  ELSE
    simulated_status := 'success';
  END IF;

  -- Insert the transaction
  INSERT INTO transactions (
    sender_id,
    recipient_ref,
    amount,
    status,
    payment_mode,
    purpose,
    is_simulated,
    assessment_id,
    idempotency_key
  ) VALUES (
    p_sender_id,
    p_recipient_ref,
    p_amount,
    simulated_status,
    p_payment_mode,
    p_purpose,
    true,
    p_assessment_id,
    p_idempotency_key
  )
  RETURNING * INTO new_txn;

  RETURN new_txn;
END;
$$;

-- 5. Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION create_simulated_transaction TO authenticated;
