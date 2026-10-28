/*
# Update create_simulated_transaction RPC to accept risk_score and ai_recommended_action

1. Changes
- Replaces the existing `create_simulated_transaction` function with a new version that
  accepts two additional parameters: `p_risk_score` (integer) and `p_ai_recommended_action` (text).
- These values are stored in the new `risk_score` and `ai_recommended_action` columns on the
  `transactions` table.
- The returned JSONB object now includes `risk_score` and `ai_recommended_action`.

2. Security
- The function remains SECURITY DEFINER with search_path set to 'public'.
- The caller authentication check (`caller_id := auth.uid()`, sender must match caller) is preserved.
- EXECUTE is revoked from PUBLIC/anon and granted to authenticated only (same as before).
*/

DROP FUNCTION IF EXISTS create_simulated_transaction(uuid, jsonb, numeric, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION create_simulated_transaction(
  p_sender_id uuid,
  p_recipient_ref jsonb,
  p_amount numeric,
  p_payment_mode text,
  p_purpose text,
  p_idempotency_key text,
  p_assessment_risk_level text,
  p_assessment_id uuid,
  p_risk_score integer DEFAULT NULL,
  p_ai_recommended_action text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF p_sender_id <> caller_id THEN
    RAISE EXCEPTION 'Sender must be the authenticated user';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT to_jsonb(t) INTO existing_txn
    FROM transactions t
    WHERE t.idempotency_key = p_idempotency_key
    LIMIT 1;
    IF existing_txn IS NOT NULL THEN
      RETURN existing_txn;
    END IF;
  END IF;

  IF p_assessment_risk_level = 'blocked' THEN
    txn_status := 'cancelled';
  ELSE
    txn_status := 'success';
  END IF;

  new_id := gen_random_uuid();
  new_ref := 'SIM-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

  INSERT INTO transactions (
    id, sender_id, recipient_ref, amount, currency, status, payment_mode,
    purpose, reference_id, is_simulated, assessment_id, idempotency_key,
    risk_score, ai_recommended_action
  ) VALUES (
    new_id, p_sender_id, p_recipient_ref, p_amount, 'INR', txn_status, p_payment_mode,
    p_purpose, new_ref, true, p_assessment_id, p_idempotency_key,
    p_risk_score, p_ai_recommended_action
  );

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
    'risk_score', p_risk_score,
    'ai_recommended_action', p_ai_recommended_action,
    'created_at', now(),
    'updated_at', now()
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION create_simulated_transaction(uuid, jsonb, numeric, text, text, text, text, uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_simulated_transaction(uuid, jsonb, numeric, text, text, text, text, uuid, integer, text) TO authenticated;
