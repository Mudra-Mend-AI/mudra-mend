/*
# Add risk_score and ai_recommended_action to transactions

1. Changes to existing tables
- `transactions`: add `risk_score` (integer, 0-100, nullable) to store the fraud risk score
- `transactions`: add `ai_recommended_action` (text, nullable) to store the AI-recommended action

2. Security
- No new tables. Existing RLS policies on `transactions` already cover SELECT/INSERT/UPDATE/DELETE
  for authenticated users scoped to their own rows. The new columns inherit those policies.
- No new grants needed — existing table-level grants already cover all columns.

3. Notes
- These columns are nullable so existing transaction rows are not affected.
- The frontend will populate them at transaction creation time using the existing fraud engine.
- risk_score: 0-100 integer (0 = safe, 100 = maximum risk)
- ai_recommended_action: human-readable action string (e.g., "Monitor", "Additional verification required", "Contact bank", "Report suspected fraud")
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'risk_score'
  ) THEN
    ALTER TABLE transactions ADD COLUMN risk_score integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'ai_recommended_action'
  ) THEN
    ALTER TABLE transactions ADD COLUMN ai_recommended_action text;
  END IF;
END $$;
