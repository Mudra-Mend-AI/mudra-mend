/*
# Financial core: transactions, fraud assessments, AI rule versions

Tables for simulated payments, the fraud-safety assessment engine output, and
configurable AI rule versions. These power the Payments flow and fraud dashboards.

## New Tables
1. ai_rule_versions — configurable fraud rule versions (config jsonb holds thresholds)
2. transactions — simulated payment records
3. fraud_assessments — output of the rule-based fraud engine for a transaction

## Security
- RLS enabled on all three tables.
- transactions: owner can read their own (sender_id or receiver_id).
- fraud_assessments: owner can read their own assessments.
- ai_rule_versions: read for all authenticated (dashboards display versions).
*/

-- AI rule versions
CREATE TABLE IF NOT EXISTS ai_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text UNIQUE NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_rule_versions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_rule_versions TO authenticated;
DROP POLICY IF EXISTS "ai_rules_select_authenticated" ON ai_rule_versions;
CREATE POLICY "ai_rules_select_authenticated" ON ai_rule_versions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ai_rules_insert_authenticated" ON ai_rule_versions;
CREATE POLICY "ai_rules_insert_authenticated" ON ai_rule_versions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ai_rules_update_authenticated" ON ai_rule_versions;
CREATE POLICY "ai_rules_update_authenticated" ON ai_rule_versions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed','cancelled','reversed')),
  payment_mode text NOT NULL DEFAULT 'upi' CHECK (payment_mode IN ('upi','qr','bank_transfer','request')),
  purpose text,
  reference_id text UNIQUE NOT NULL,
  provider_ref text,
  is_simulated boolean NOT NULL DEFAULT true,
  assessment_id uuid,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;
DROP POLICY IF EXISTS "txn_select_own" ON transactions;
CREATE POLICY "txn_select_own" ON transactions FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "txn_insert_own" ON transactions;
CREATE POLICY "txn_insert_own" ON transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "txn_update_own" ON transactions;
CREATE POLICY "txn_update_own" ON transactions FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "txn_delete_own" ON transactions;
CREATE POLICY "txn_delete_own" ON transactions FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender_id ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_id ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency_key ON transactions(idempotency_key);

-- Fraud assessments
CREATE TABLE IF NOT EXISTS fraud_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  risk_level text NOT NULL CHECK (risk_level IN ('low','medium','high','blocked')),
  rules_evaluated jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text NOT NULL DEFAULT '',
  explanation_hi text,
  explanation_mr text,
  missing_info text,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  restrictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version text NOT NULL DEFAULT 'rules-v2',
  is_simulated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fraud_assessments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON fraud_assessments TO authenticated;
DROP POLICY IF EXISTS "assess_select_own" ON fraud_assessments;
CREATE POLICY "assess_select_own" ON fraud_assessments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "assess_insert_own" ON fraud_assessments;
CREATE POLICY "assess_insert_own" ON fraud_assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "assess_update_own" ON fraud_assessments;
CREATE POLICY "assess_update_own" ON fraud_assessments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_user_id ON fraud_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_transaction_id ON fraud_assessments(transaction_id);

-- Link transactions.assessment_id now that fraud_assessments exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_assessment_id_fkey') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_assessment_id_fkey
      FOREIGN KEY (assessment_id) REFERENCES fraud_assessments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- updated_at trigger for transactions
DROP TRIGGER IF EXISTS transactions_set_updated_at ON transactions;
CREATE TRIGGER transactions_set_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed a default active rule version
INSERT INTO ai_rule_versions (version, config, is_active)
VALUES ('rules-v2', '{
  "maxRepeatedAttempts": 3,
  "velocityWindowMinutes": 10,
  "maxTxnPerWindow": 5,
  "newRecipientRisk": "medium",
  "unverifiedRecipientRisk": "medium",
  "amountThresholdHigh": 50000,
  "amountThresholdVeryHigh": 200000
}'::jsonb, true)
ON CONFLICT (version) DO NOTHING;
