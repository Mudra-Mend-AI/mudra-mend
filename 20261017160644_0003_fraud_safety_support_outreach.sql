/*
# Fraud prevention, alerts, scam reports, cases, support, audit, AI, schemes, NGO

## Purpose
Adds the remaining domain tables supporting the AI fraud engine, alert/scam
workflows, professional case management, support tickets, audit logging, AI
rules/model versioning, government schemes, and NGO outreach.

## New Tables

1. `fraud_assessments` — structured AI/rule assessment records tied to a transaction.
2. `scam_reports` — user-submitted scam reports (untrusted content).
3. `alerts` — in-app notifications for users.
4. `cases` — investigation cases created from alerts/reports.
5. `case_evidence` — evidence items attached to a case.
6. `case_timeline` — status transitions and notes on a case.
7. `support_tickets` — customer support tickets.
8. `ticket_responses` — responses on a support ticket.
9. `audit_logs` — tamper-resistant-ish audit trail (append-only via RLS: no update/delete).
10. `ai_rule_versions` — configurable rule sets and model versions.
11. `govt_schemes` — government scheme directory (demo data).
12. `ngo_programs` — NGO outreach programs.
13. `assistance_records` — authorized assistance records (beneficiary data protected).

## Security
- RLS on all tables.
- fraud_assessments: sender-scoped (customer sees their own); professionals see via service role.
- scam_reports: reporter can read own; professionals see all.
- alerts: owner-scoped.
- cases, case_evidence, case_timeline: assigned professionals + admins read; RLS scoped.
- support_tickets: owner reads own; support staff read all assigned.
- ticket_responses: ticket owner + support staff.
- audit_logs: admin read-only; insert by any authenticated (system logs), NO update/delete.
- ai_rule_versions: admin read/write; authenticated read.
- govt_schemes: readable by all authenticated.
- ngo_programs: readable by authenticated; update by org coordinator + admin.
- assistance_records: protected — only org staff + admin; never public.
*/

CREATE TABLE IF NOT EXISTS fraud_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','blocked')),
  rules_evaluated jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text NOT NULL DEFAULT '',
  explanation_hi text,
  explanation_mr text,
  missing_info text,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  restrictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version text NOT NULL DEFAULT 'rules-v1',
  is_simulated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fraud_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fa_select_own_or_pro" ON fraud_assessments;
CREATE POLICY "fa_select_own_or_pro" ON fraud_assessments FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND p.role IN ('admin','fraud_analyst','bank_officer','investigator','auditor','customer_support')
    )
  );

DROP POLICY IF EXISTS "fa_insert_own" ON fraud_assessments;
CREATE POLICY "fa_insert_own" ON fraud_assessments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS scam_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  suspect_contact text,
  evidence_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','verified','rejected','escalated')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scam_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sr_select_own_or_pro" ON scam_reports;
CREATE POLICY "sr_select_own_or_pro" ON scam_reports FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND p.role IN ('admin','fraud_analyst','bank_officer','investigator','auditor','customer_support','gov_official')
    )
  );

DROP POLICY IF EXISTS "sr_insert_own" ON scam_reports;
CREATE POLICY "sr_insert_own" ON scam_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sr_update_pro" ON scam_reports;
CREATE POLICY "sr_update_pro" ON scam_reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator'))
  );

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  title text NOT NULL,
  body text NOT NULL,
  related_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  related_case_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select_own" ON alerts;
CREATE POLICY "alerts_select_own" ON alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alerts_insert_own" ON alerts;
CREATE POLICY "alerts_insert_own" ON alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alerts_update_own" ON alerts;
CREATE POLICY "alerts_update_own" ON alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alerts_delete_own" ON alerts;
CREATE POLICY "alerts_delete_own" ON alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_investigation','pending_review','closed','escalated')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  related_alert_id uuid,
  related_scam_report_id uuid REFERENCES scam_reports(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cases_select_assigned_or_admin" ON cases;
CREATE POLICY "cases_select_assigned_or_admin" ON cases FOR SELECT
  TO authenticated USING (
    auth.uid() = assigned_to OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND p.role IN ('admin','fraud_analyst','investigator','auditor')
    )
  );

DROP POLICY IF EXISTS "cases_insert_pro" ON cases;
CREATE POLICY "cases_insert_pro" ON cases FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator'))
  );

DROP POLICY IF EXISTS "cases_update_pro" ON cases;
CREATE POLICY "cases_update_pro" ON cases FOR UPDATE
  TO authenticated USING (
    auth.uid() = assigned_to OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator')
    )
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator'))
  );

CREATE TABLE IF NOT EXISTS case_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  description text,
  file_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE case_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ce_select_case_access" ON case_evidence;
CREATE POLICY "ce_select_case_access" ON case_evidence FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cases c WHERE c.id = case_evidence.case_id AND (
      c.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator','auditor'))
    ))
  );

DROP POLICY IF EXISTS "ce_insert_case_access" ON case_evidence;
CREATE POLICY "ce_insert_case_access" ON case_evidence FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM cases c WHERE c.id = case_evidence.case_id AND (
      c.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator'))
    ))
  );

CREATE TABLE IF NOT EXISTS case_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE case_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct_select_case_access" ON case_timeline;
CREATE POLICY "ct_select_case_access" ON case_timeline FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cases c WHERE c.id = case_timeline.case_id AND (
      c.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator','auditor'))
    ))
  );

DROP POLICY IF EXISTS "ct_insert_case_access" ON case_timeline;
CREATE POLICY "ct_insert_case_access" ON case_timeline FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM cases c WHERE c.id = case_timeline.case_id AND (
      c.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','fraud_analyst','investigator'))
    ))
  );

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','escalated','closed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "st_select_own_or_support" ON support_tickets;
CREATE POLICY "st_select_own_or_support" ON support_tickets FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = assigned_to OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','customer_support')
    )
  );

DROP POLICY IF EXISTS "st_insert_own" ON support_tickets;
CREATE POLICY "st_insert_own" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "st_update_own_or_support" ON support_tickets;
CREATE POLICY "st_update_own_or_support" ON support_tickets FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = assigned_to OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','customer_support')
    )
  ) WITH CHECK (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','customer_support')
    )
  );

CREATE TABLE IF NOT EXISTS ticket_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_ai_draft boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tr_select_ticket_access" ON ticket_responses;
CREATE POLICY "tr_select_ticket_access" ON ticket_responses FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_responses.ticket_id AND (
      t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','customer_support'))
    ))
  );

DROP POLICY IF EXISTS "tr_insert_ticket_access" ON ticket_responses;
CREATE POLICY "tr_insert_ticket_access" ON ticket_responses FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_responses.ticket_id AND (
      t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','customer_support'))
    ))
  );

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_admin" ON audit_logs;
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','auditor'))
  );

DROP POLICY IF EXISTS "audit_insert_any" ON audit_logs;
CREATE POLICY "audit_insert_any" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS ai_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'rules' CHECK (type IN ('rules','model','combined')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_rule_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_read_authenticated" ON ai_rule_versions;
CREATE POLICY "ai_read_authenticated" ON ai_rule_versions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ai_write_admin" ON ai_rule_versions;
CREATE POLICY "ai_write_admin" ON ai_rule_versions FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "ai_update_admin" ON ai_rule_versions;
CREATE POLICY "ai_update_admin" ON ai_rule_versions FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE TABLE IF NOT EXISTS govt_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL,
  category text NOT NULL,
  eligibility text NOT NULL,
  benefits text NOT NULL,
  application_process text NOT NULL,
  official_url text,
  scam_warning text,
  is_demo boolean NOT NULL DEFAULT true,
  last_updated timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE govt_schemes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schemes_select_authenticated" ON govt_schemes;
CREATE POLICY "schemes_select_authenticated" ON govt_schemes FOR SELECT
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS ngo_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  region text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','paused')),
  outreach_events_count int NOT NULL DEFAULT 0,
  beneficiaries_reached int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ngo_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ngo_select_authenticated" ON ngo_programs;
CREATE POLICY "ngo_select_authenticated" ON ngo_programs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ngo_insert_org" ON ngo_programs;
CREATE POLICY "ngo_insert_org" ON ngo_programs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','ngo_coordinator'))
  );

DROP POLICY IF EXISTS "ngo_update_org" ON ngo_programs;
CREATE POLICY "ngo_update_org" ON ngo_programs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','ngo_coordinator'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','ngo_coordinator'))
  );

CREATE TABLE IF NOT EXISTS assistance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES ngo_programs(id) ON DELETE CASCADE,
  assistance_type text NOT NULL,
  region text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','delivered','rejected')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assistance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assist_select_org" ON assistance_records;
CREATE POLICY "assist_select_org" ON assistance_records FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','ngo_coordinator'))
  );

DROP POLICY IF EXISTS "assist_insert_org" ON assistance_records;
CREATE POLICY "assist_insert_org" ON assistance_records FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','ngo_coordinator'))
  );

DROP POLICY IF EXISTS "assist_update_org" ON assistance_records;
CREATE POLICY "assist_update_org" ON assistance_records FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','ngo_coordinator'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','ngo_coordinator'))
  );

CREATE INDEX IF NOT EXISTS idx_fa_user ON fraud_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_fa_txn ON fraud_assessments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_scam_user ON scam_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned ON cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);