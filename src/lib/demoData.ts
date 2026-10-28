import type { Role } from '@/lib/supabase';

export interface DemoProfile {
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

const now = new Date().toISOString();

export const DEMO_PROFILES: Record<Role, DemoProfile> = {
  customer: {
    id: 'demo-customer', role: 'customer', status: 'active', full_name: 'Rajesh Kumar',
    mobile: '+91 98765 43210', preferred_language: 'en', theme: 'light',
    organization_id: null, scope: {}, created_at: now, updated_at: now,
  },
  admin: {
    id: 'demo-admin', role: 'admin', status: 'active', full_name: 'Priya Sharma',
    mobile: null, preferred_language: 'en', theme: 'light',
    organization_id: 'org-mudramend', scope: { level: 'super_admin' }, created_at: now, updated_at: now,
  },
  fraud_analyst: {
    id: 'demo-fraud', role: 'fraud_analyst', status: 'active', full_name: 'Arjun Mehta',
    mobile: null, preferred_language: 'en', theme: 'light',
    organization_id: 'org-mudramend', scope: { department: 'fraud_analysis' }, created_at: now, updated_at: now,
  },
  bank_officer: {
    id: 'demo-bank', role: 'bank_officer', status: 'active', full_name: 'Sneha Patel',
    mobile: null, preferred_language: 'en', theme: 'light',
    organization_id: 'org-sbi', scope: { bank: 'SBI', branch: 'Mumbai Fort' }, created_at: now, updated_at: now,
  },
  investigator: {
    id: 'demo-investigator', role: 'investigator', status: 'active', full_name: 'Vikram Singh',
    mobile: null, preferred_language: 'en', theme: 'light',
    organization_id: 'org-cyber-cell', scope: { region: 'Maharashtra' }, created_at: now, updated_at: now,
  },
  auditor: {
    id: 'demo-auditor', role: 'auditor', status: 'active', full_name: 'Anita Desai',
    mobile: null, preferred_language: 'en', theme: 'light',
    organization_id: 'org-mudramend', scope: { audit_scope: 'full' }, created_at: now, updated_at: now,
  },
  customer_support: {
    id: 'demo-support', role: 'customer_support', status: 'active', full_name: 'Kavya Reddy',
    mobile: null, preferred_language: 'en', theme: 'light',
    organization_id: 'org-mudramend', scope: { team: 'tier_2' }, created_at: now, updated_at: now,
  },
  ngo_coordinator: {
    id: 'demo-ngo', role: 'ngo_coordinator', status: 'active', full_name: 'Rohan Joshi',
    mobile: null, preferred_language: 'en', theme: 'light',
    organization_id: 'org-ngo-seva', scope: { region: 'Rural Maharashtra' }, created_at: now, updated_at: now,
  },
  gov_official: {
    id: 'demo-gov', role: 'gov_official', status: 'active', full_name: 'Deepak Nair',
    mobile: null, preferred_language: 'en', theme: 'light',
    organization_id: 'org-gov-mah', scope: { department: 'Finance', region: 'Maharashtra' }, created_at: now, updated_at: now,
  },
};

// Demo transaction data
export const DEMO_TRANSACTIONS = [
  { id: 't1', recipient_ref: { name: 'Rajesh K.' }, amount: 25000, status: 'pending' as const, reference_id: 'SIM-A1B2C', is_simulated: true, created_at: new Date(Date.now() - 3600000).toISOString(), payment_mode: 'upi' as const, risk_score: 45, ai_recommended_action: 'Monitor — verify recipient through a trusted channel and confirm transaction details' },
  { id: 't2', recipient_ref: { name: 'Priya S.' }, amount: 5000, status: 'success' as const, reference_id: 'SIM-D4E5F', is_simulated: true, created_at: new Date(Date.now() - 7200000).toISOString(), payment_mode: 'upi' as const, risk_score: 12, ai_recommended_action: 'Monitor — standard processing, no additional action required' },
  { id: 't3', recipient_ref: { name: 'Amit G.' }, amount: 75000, status: 'failed' as const, reference_id: 'SIM-G7H8I', is_simulated: true, created_at: new Date(Date.now() - 10800000).toISOString(), payment_mode: 'bank_transfer' as const, risk_score: 68, ai_recommended_action: 'Additional verification required — contact the bank and verify recipient identity before proceeding' },
  { id: 't4', recipient_ref: { name: 'Sneha P.' }, amount: 1200, status: 'success' as const, reference_id: 'SIM-J9K0L', is_simulated: true, created_at: new Date(Date.now() - 86400000).toISOString(), payment_mode: 'qr' as const, risk_score: 8, ai_recommended_action: 'Monitor — standard processing, no additional action required' },
  { id: 't5', recipient_ref: { name: 'Unknown' }, amount: 48000, status: 'cancelled' as const, reference_id: 'BLK-M1N2O', is_simulated: true, created_at: new Date(Date.now() - 172800000).toISOString(), payment_mode: 'upi' as const, risk_score: 92, ai_recommended_action: 'Block transaction — report suspected fraud and freeze recipient contact' },
];

export const DEMO_ALERTS = [
  { id: 'a1', title: 'High-risk payment blocked', body: 'Payment of Rs 48,000 to unknown recipient was blocked by safety rules.', priority: 'critical' as const, category: 'payment_safety', is_read: false, created_at: new Date(Date.now() - 1800000).toISOString(), related_transaction_id: 't5', related_case_id: null },
  { id: 'a2', title: 'New recipient + large amount', body: 'Rs 25,000 to a new recipient flagged as medium risk.', priority: 'high' as const, category: 'payment_safety', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString(), related_transaction_id: 't1', related_case_id: null },
  { id: 'a3', title: 'Unusual time transaction', body: 'Transaction attempted at 2:30 AM IST.', priority: 'medium' as const, category: 'anomaly', is_read: false, created_at: new Date(Date.now() - 7200000).toISOString(), related_transaction_id: null, related_case_id: null },
  { id: 'a4', title: 'Duplicate payment detected', body: 'Same amount to same recipient within 5 minutes.', priority: 'medium' as const, category: 'anomaly', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString(), related_transaction_id: null, related_case_id: null },
  { id: 'a5', title: 'Scam report match found', body: 'Recipient name matches a submitted scam report.', priority: 'high' as const, category: 'scam_match', is_read: true, created_at: new Date(Date.now() - 172800000).toISOString(), related_transaction_id: null, related_case_id: 'c1' },
];

export const DEMO_CASES = [
  { id: 'c1', title: 'UPI scam — fake beneficiary', status: 'open' as const, priority: 'high' as const, assigned_to: 'demo-fraud', organization_id: null, related_alert_id: 'a5', related_scam_report_id: 's1', notes: 'Suspected social engineering via phone call.', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: now },
  { id: 'c2', title: 'Duplicate payment investigation', status: 'under_investigation' as const, priority: 'medium' as const, assigned_to: 'demo-investigator', organization_id: null, related_alert_id: 'a4', related_scam_report_id: null, notes: 'Customer claims duplicate was accidental.', created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: now },
  { id: 'c3', title: 'Government scheme impersonation', status: 'escalated' as const, priority: 'critical' as const, assigned_to: 'demo-investigator', organization_id: null, related_alert_id: null, related_scam_report_id: 's2', notes: 'Fake subsidy offer via SMS.', created_at: new Date(Date.now() - 259200000).toISOString(), updated_at: now },
  { id: 'c4', title: 'Late-night high-value transfer', status: 'pending_review' as const, priority: 'medium' as const, assigned_to: 'demo-fraud', organization_id: null, related_alert_id: 'a3', related_scam_report_id: null, notes: 'Awaiting customer confirmation.', created_at: new Date(Date.now() - 345600000).toISOString(), updated_at: now },
  { id: 'c5', title: 'Resolved: false positive on travel', status: 'closed' as const, priority: 'low' as const, assigned_to: 'demo-fraud', organization_id: null, related_alert_id: null, related_scam_report_id: null, notes: 'Customer confirmed legitimate travel.', created_at: new Date(Date.now() - 604800000).toISOString(), updated_at: now },
];

export const DEMO_SCAM_REPORTS = [
  { id: 's1', category: 'Fake Bank Representative', description: 'Caller claimed to be from SBI and asked for OTP.', suspect_contact: '+91 90000 11111', status: 'verified' as const, transaction_id: null, evidence_url: null, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 's2', category: 'Government Impersonation', description: 'SMS offering fake PM-Kisan subsidy approval.', suspect_contact: 'pmkisan-verify.xyz', status: 'under_review' as const, transaction_id: null, evidence_url: null, created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 's3', category: 'Investment Scam', description: 'WhatsApp group promising 2x returns in 7 days.', suspect_contact: '+91 80000 22222', status: 'submitted' as const, transaction_id: null, evidence_url: null, created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 's4', category: 'Prize/Refund Scam', description: 'Email claiming lottery win, asking for processing fee.', suspect_contact: 'claims@win-intl.xyz', status: 'escalated' as const, transaction_id: null, evidence_url: null, created_at: new Date(Date.now() - 345600000).toISOString() },
  { id: 's5', category: 'QR Code Scam', description: 'Merchant QR did not match displayed name.', suspect_contact: 'merchant@unknownupi', status: 'rejected' as const, transaction_id: null, evidence_url: null, created_at: new Date(Date.now() - 604800000).toISOString() },
];

export const DEMO_TICKETS = [
  { id: 'tk1', subject: 'Payment not received by recipient', category: 'Payment Issue', status: 'open' as const, priority: 'high' as const, assigned_to: 'demo-support', ai_summary: 'Customer reports Rs 5,000 UPI transfer not credited to recipient.', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: now },
  { id: 'tk2', subject: 'Unable to link bank account', category: 'Bank Account', status: 'in_progress' as const, priority: 'medium' as const, assigned_to: 'demo-support', ai_summary: 'IFSC lookup failing for HDFC branch.', created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: now },
  { id: 'tk3', subject: 'Safety check blocked legitimate payment', category: 'False Positive', status: 'resolved' as const, priority: 'low' as const, assigned_to: 'demo-support', ai_summary: 'Customer on travel, location anomaly was legitimate.', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: now },
  { id: 'tk4', subject: 'Suspected scam — need help reporting', category: 'Scam Report', status: 'escalated' as const, priority: 'critical' as const, assigned_to: 'demo-support', ai_summary: 'Customer received fake government scheme SMS.', created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: now },
  { id: 'tk5', subject: 'Transaction history not loading', category: 'Technical', status: 'closed' as const, priority: 'low' as const, assigned_to: 'demo-support', ai_summary: 'Resolved after page refresh.', created_at: new Date(Date.now() - 259200000).toISOString(), updated_at: now },
];

export const DEMO_PROGRAMS = [
  { id: 'p1', name: 'Rural Financial Literacy Camp', description: 'Financial education workshops in rural Maharashtra villages.', region: 'Pune District', status: 'active' as const, outreach_events_count: 12, beneficiaries_reached: 480, created_at: new Date(Date.now() - 2592000000).toISOString(), updated_at: now },
  { id: 'p2', name: 'Scam Prevention Awareness Drive', description: 'Door-to-door awareness about OTP and UPI scams.', region: 'Nashik District', status: 'active' as const, outreach_events_count: 8, beneficiaries_reached: 320, created_at: new Date(Date.now() - 5184000000).toISOString(), updated_at: now },
  { id: 'p3', name: 'Government Scheme Enrollment Help', description: 'Assisting eligible beneficiaries with PM-Kisan and other schemes.', region: 'Aurangabad', status: 'planned' as const, outreach_events_count: 0, beneficiaries_reached: 0, created_at: new Date(Date.now() - 864000000).toISOString(), updated_at: now },
  { id: 'p4', name: 'Women Self-Help Group Training', description: 'Digital payments training for women SHGs.', region: 'Nagpur', status: 'completed' as const, outreach_events_count: 15, beneficiaries_reached: 225, created_at: new Date(Date.now() - 7776000000).toISOString(), updated_at: now },
];

export const DEMO_SCHEMES = [
  { id: 'sc1', name: 'PM-Kisan Samman Nidhi', department: 'Ministry of Agriculture', category: 'Agriculture', eligibility: 'Small and marginal farmers with cultivable land', benefits: 'Rs 6,000 per year in three instalments', application_process: 'Apply at nearest CSC or online at pmkisan.gov.in', official_url: 'https://pmkisan.gov.in', scam_warning: 'No fee is required. Never share OTP for scheme enrollment.', is_demo: true, last_updated: now },
  { id: 'sc2', name: 'Jan Dhan Yojana', department: 'Ministry of Finance', category: 'Financial Inclusion', eligibility: 'All Indian citizens above 10 years', benefits: 'Zero-balance bank account, accident insurance, RuPay card', application_process: 'Visit any bank branch with Aadhaar and photograph', official_url: 'https://pmjdy.gov.in', scam_warning: 'No agent can charge for account opening.', is_demo: true, last_updated: now },
  { id: 'sc3', name: 'Pradhan Mantri Awas Yojana', department: 'Ministry of Housing', category: 'Housing', eligibility: 'EWS/LIG families without pucca house', benefits: 'Interest subsidy on home loans up to Rs 2.67 lakh', application_process: 'Apply through PMAY-G online portal or CSC', official_url: 'https://pmaymis.gov.in', scam_warning: 'Verify approval status only on official portal.', is_demo: true, last_updated: now },
];

export const DEMO_AUDIT_LOGS = [
  { id: 'al1', action: 'approve_professional_application', actor_id: 'demo-admin', target_type: 'professional_applications', target_id: 'pa1', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'al2', action: 'update_ai_rule_version', actor_id: 'demo-admin', target_type: 'ai_rule_versions', target_id: 'rv1', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'al3', action: 'reject_professional_application', actor_id: 'demo-admin', target_type: 'professional_applications', target_id: 'pa2', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'al4', action: 'case_status_change', actor_id: 'demo-fraud', target_type: 'cases', target_id: 'c2', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'al5', action: 'user_role_change', actor_id: 'demo-admin', target_type: 'profiles', target_id: 'u3', created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 'al6', action: 'system_config_update', actor_id: 'demo-admin', target_type: 'system_config', target_id: 'cfg1', created_at: new Date(Date.now() - 345600000).toISOString() },
];

export const DEMO_PROFESSIONAL_APPS = [
  { id: 'pa1', user_id: 'u-prospective-1', requested_role: 'fraud_analyst' as Role, organization_id: null, submission_data: { fullName: 'Meera Iyer', email: 'meera@bank.com', Organization: 'Mudra-Mend', 'Employee ID': 'EMP-001', Department: 'Fraud', Designation: 'Analyst', 'Analysis Scope': 'Retail' }, status: 'pending' as const, reviewed_by: null, reviewed_at: null, review_notes: null, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: now },
  { id: 'pa2', user_id: 'u-prospective-2', requested_role: 'bank_officer' as Role, organization_id: null, submission_data: { fullName: 'Karthik Rao', email: 'karthik@sbi.co.in', 'Bank Name': 'SBI', Branch: 'Bengaluru MG Road', 'Employee ID': 'SBI-2025', 'Official Email': 'karthik@sbi.co.in', Designation: 'Officer' }, status: 'pending' as const, reviewed_by: null, reviewed_at: null, review_notes: null, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: now },
  { id: 'pa3', user_id: 'u-prospective-3', requested_role: 'investigator' as Role, organization_id: null, submission_data: { fullName: 'Suresh Pillai', email: 'suresh@cyber.gov.in', Agency: 'Cyber Cell Kerala', 'Employee ID': 'CC-456', Department: 'Investigation', Designation: 'SI', 'Assigned Region': 'Kerala' }, status: 'approved' as const, reviewed_by: 'demo-admin', reviewed_at: new Date(Date.now() - 86400000).toISOString(), review_notes: 'Verified', created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: now },
];

export const DEMO_AI_VERSIONS = [
  { version: 'rules-v1', is_active: true, created_at: new Date(Date.now() - 2592000000).toISOString() },
  { version: 'rules-v0.9-beta', is_active: false, created_at: new Date(Date.now() - 5184000000).toISOString() },
];

export const DEMO_BANK_ACCOUNTS = [
  { id: 'ba1', user_id: 'demo-customer', holder_name: 'Rajesh Kumar', account_number: 'XXXX1234', account_number_last4: '1234', ifsc: 'SBIN0001234', bank_name: 'State Bank of India', branch_name: 'Mumbai Fort', account_type: 'savings' as const, verification_status: 'verified' as const, is_preferred: true, linked_at: new Date(Date.now() - 2592000000).toISOString(), verified_at: new Date(Date.now() - 2505600000).toISOString() },
  { id: 'ba2', user_id: 'demo-customer', holder_name: 'Rajesh Kumar', account_number: 'XXXX5678', account_number_last4: '5678', ifsc: 'HDFC0000456', bank_name: 'HDFC Bank', branch_name: 'Andheri West', account_type: 'current' as const, verification_status: 'pending' as const, is_preferred: false, linked_at: new Date(Date.now() - 86400000).toISOString(), verified_at: null },
];

export const DEMO_USERS: { id: string; full_name: string; role: Role; status: string; mobile: string | null; preferred_language: 'en' | 'hi' | 'mr'; theme: 'light' | 'dark'; organization_id: string | null; scope: Record<string, unknown>; created_at: string; updated_at: string }[] = [
  { id: 'u1', full_name: 'Rajesh Kumar', role: 'customer', status: 'active', mobile: '+91 98765 43210', preferred_language: 'en', theme: 'light', organization_id: null, scope: {}, created_at: new Date(Date.now() - 2592000000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'u2', full_name: 'Priya Sharma', role: 'admin', status: 'active', mobile: null, preferred_language: 'en', theme: 'light', organization_id: 'org-mudramend', scope: { level: 'super_admin' }, created_at: new Date(Date.now() - 5184000000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'u3', full_name: 'Arjun Mehta', role: 'fraud_analyst', status: 'active', mobile: null, preferred_language: 'en', theme: 'light', organization_id: 'org-mudramend', scope: { dept: 'fraud' }, created_at: new Date(Date.now() - 7776000000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'u4', full_name: 'Sneha Patel', role: 'bank_officer', status: 'active', mobile: null, preferred_language: 'en', theme: 'light', organization_id: 'org-sbi', scope: { bank: 'SBI' }, created_at: new Date(Date.now() - 10368000000).toISOString(), updated_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'u5', full_name: 'Vikram Singh', role: 'investigator', status: 'active', mobile: null, preferred_language: 'en', theme: 'light', organization_id: 'org-cyber-cell', scope: { region: 'Maharashtra' }, created_at: new Date(Date.now() - 12960000000).toISOString(), updated_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 'u6', full_name: 'Anita Desai', role: 'auditor', status: 'active', mobile: null, preferred_language: 'en', theme: 'light', organization_id: 'org-mudramend', scope: {}, created_at: new Date(Date.now() - 15552000000).toISOString(), updated_at: new Date(Date.now() - 345600000).toISOString() },
  { id: 'u7', full_name: 'Kavya Reddy', role: 'customer_support', status: 'active', mobile: null, preferred_language: 'en', theme: 'light', organization_id: 'org-mudramend', scope: {}, created_at: new Date(Date.now() - 18144000000).toISOString(), updated_at: new Date(Date.now() - 432000000).toISOString() },
  { id: 'u8', full_name: 'Rohan Joshi', role: 'ngo_coordinator', status: 'active', mobile: null, preferred_language: 'en', theme: 'light', organization_id: 'org-ngo-seva', scope: { region: 'Rural Maharashtra' }, created_at: new Date(Date.now() - 20736000000).toISOString(), updated_at: new Date(Date.now() - 518400000).toISOString() },
  { id: 'u9', full_name: 'Deepak Nair', role: 'gov_official', status: 'active', mobile: null, preferred_language: 'en', theme: 'light', organization_id: 'org-gov-mah', scope: { dept: 'Finance' }, created_at: new Date(Date.now() - 23328000000).toISOString(), updated_at: new Date(Date.now() - 604800000).toISOString() },
  { id: 'u10', full_name: 'Meera Iyer', role: 'customer', status: 'pending', mobile: '+91 90000 12345', preferred_language: 'en', theme: 'light', organization_id: null, scope: {}, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'u11', full_name: 'Karthik Rao', role: 'customer', status: 'active', mobile: '+91 80000 67890', preferred_language: 'hi', theme: 'light', organization_id: null, scope: {}, created_at: new Date(Date.now() - 432000000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'u12', full_name: 'Suresh Pillai', role: 'investigator', status: 'active', mobile: null, preferred_language: 'en', theme: 'dark', organization_id: 'org-cyber-cell', scope: { region: 'Kerala' }, created_at: new Date(Date.now() - 2592000000).toISOString(), updated_at: new Date(Date.now() - 172800000).toISOString() },
];

export const DEMO_ROLE_LABELS: Record<Role, string> = {
  customer: 'Customer Demo',
  admin: 'Administrator Demo',
  fraud_analyst: 'Fraud Analyst Demo',
  bank_officer: 'Bank Officer Demo',
  investigator: 'Investigator Demo',
  auditor: 'Auditor Demo',
  customer_support: 'Customer Support Demo',
  ngo_coordinator: 'NGO Coordinator Demo',
  gov_official: 'Government Official Demo',
};
