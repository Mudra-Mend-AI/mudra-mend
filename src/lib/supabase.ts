import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars missing. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Role = 'customer' | 'admin' | 'fraud_analyst' | 'bank_officer' | 'investigator' | 'auditor' | 'customer_support' | 'ngo_coordinator' | 'gov_official';

export interface Profile {
  id: string;
  role: Role;
  status: string;
  full_name: string;
  mobile: string | null;
  preferred_language: 'en' | 'hi' | 'mr';
  theme: 'light' | 'dark';
  organization_id: string | null;
  scope: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BankBranch {
  id: string;
  ifsc: string;
  bank_name: string;
  branch_name: string;
  city: string | null;
  state: string | null;
}

export interface BankAccount {
  id: string;
  user_id: string;
  holder_name: string;
  account_number: string;
  account_number_last4: string;
  ifsc: string;
  bank_name: string;
  branch_name: string;
  account_type: 'savings' | 'current' | 'nre' | 'nro';
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_preferred: boolean;
  linked_at: string;
  verified_at: string | null;
}

export interface Recipient {
  id: string;
  user_id: string;
  name: string;
  account_number: string | null;
  ifsc: string | null;
  upi_id: string | null;
  note: string | null;
  verified: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  recipient_ref: Record<string, unknown>;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'reversed';
  payment_mode: 'upi' | 'qr' | 'bank_transfer' | 'request';
  purpose: string | null;
  reference_id: string;
  provider_ref: string | null;
  is_simulated: boolean;
  assessment_id: string | null;
  idempotency_key: string | null;
  gateway: string | null;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  risk_score: number | null;
  ai_recommended_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface FraudAssessment {
  id: string;
  transaction_id: string | null;
  user_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'blocked';
  rules_evaluated: unknown[];
  evidence: Record<string, unknown>;
  explanation: string;
  explanation_hi: string | null;
  explanation_mr: string | null;
  missing_info: string | null;
  recommendations: unknown[];
  restrictions: unknown[];
  model_version: string;
  is_simulated: boolean;
  created_at: string;
}

export interface ScamReport {
  id: string;
  user_id: string;
  category: string;
  description: string;
  transaction_id: string | null;
  suspect_contact: string | null;
  evidence_url: string | null;
  status: 'submitted' | 'under_review' | 'verified' | 'rejected' | 'escalated';
  created_at: string;
  incident_date: string | null;
  amount: number | null;
  payment_channel: string | null;
  assigned_to: string | null;
  investigation_notes: string | null;
}

export interface Alert {
  id: string;
  user_id: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  body: string;
  related_transaction_id: string | null;
  related_case_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Case {
  id: string;
  title: string;
  status: 'open' | 'under_investigation' | 'pending_review' | 'closed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string | null;
  organization_id: string | null;
  related_alert_id: string | null;
  related_scam_report_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed';
  assigned_to: string | null;
  priority: 'low' | 'medium' | 'high';
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface GovtScheme {
  id: string;
  name: string;
  department: string;
  category: string;
  eligibility: string;
  benefits: string;
  application_process: string;
  official_url: string | null;
  scam_warning: string | null;
  is_demo: boolean;
  last_updated: string;
}

export interface NgoProgram {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  region: string | null;
  status: 'planned' | 'active' | 'completed' | 'paused';
  outreach_events_count: number;
  beneficiaries_reached: number;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalApplication {
  id: string;
  user_id: string;
  requested_role: Role;
  organization_id: string | null;
  submission_data: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryReferral {
  id: string;
  program_id: string | null;
  referrer_id: string;
  beneficiary_name: string;
  contact: string | null;
  region: string | null;
  assistance_type: 'financial_aid' | 'literacy' | 'scheme_enrollment' | 'other';
  status: 'pending' | 'contacted' | 'enrolled' | 'completed' | 'closed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}
