/*
# Add alerts and transactions to Supabase realtime publication

1. Changes
- Adds the `alerts` table to the `supabase_realtime` publication so that the frontend
  can subscribe to realtime changes (new alert inserted, alert marked as read).
- Adds the `transactions` table to the `supabase_realtime` publication so that the
  dashboard can receive live updates when transactions are created.

2. Security
- No RLS changes. Realtime respects RLS — users only receive events for rows they
  can see per existing policies.
- No new tables or columns.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
