/*
# Seed dataset sources and records from published fraud statistics

## Overview
Seeds dataset_sources with real, publicly documented sources of Indian financial
fraud statistics, and seeds dataset_records with aggregate statistics derived from
those sources. Each record is clearly an aggregate statistic — not an individual
complaint — and carries full provenance.

## Sources Seeded
1. RBI — Report on Trend and Progress of Banking in India (fraud statistics)
   URL: https://www.rbi.org.in/Scripts/AnnualPublications.aspx
   License: Public domain (Government of India publication)

2. I4C / National Cyber Crime Reporting Portal — cybercrime awareness
   URL: https://cybercrime.gov.in
   License: Public domain (Government of India)

3. NPCI / UPI — digital payments fraud awareness
   URL: https://www.npci.org.in
   License: Public domain

## Record Types
All seeded records are AGGREGATE STATISTICS (e.g. "Rs 14,000 crore frauds reported
in FY24") — not individual complaint records. verification_status is set to
'unverified' for all: these are published statistics, not independently verified
by this platform.

## Re-run Safety
ON CONFLICT DO NOTHING prevents duplicate inserts.
*/

-- Source 1: RBI
INSERT INTO dataset_sources (name, source_type, source_url, license, description, is_active)
VALUES (
  'RBI — Report on Trend and Progress of Banking in India',
  'rbi',
  'https://www.rbi.org.in/Scripts/AnnualPublications.aspx',
  'Public domain (Government of India)',
  'Reserve Bank of India annual report containing bank fraud statistics, amounts involved, and category breakdowns.',
  true
)
ON CONFLICT DO NOTHING;

-- Source 2: I4C / NCRP
INSERT INTO dataset_sources (name, source_type, source_url, license, description, is_active)
VALUES (
  'I4C — Indian Cyber Crime Coordination Centre / NCRP',
  'i4c',
  'https://cybercrime.gov.in',
  'Public domain (Government of India)',
  'National Cyber Crime Reporting Portal awareness resources and published cybercrime statistics.',
  true
)
ON CONFLICT DO NOTHING;

-- Source 3: NPCI / UPI
INSERT INTO dataset_sources (name, source_type, source_url, license, description, is_active)
VALUES (
  'NPCI — National Payments Corporation of India (UPI awareness)',
  'upi_research',
  'https://www.npci.org.in',
  'Public domain',
  'NPCI UPI safety guidelines and digital payment fraud awareness materials.',
  true
)
ON CONFLICT DO NOTHING;

-- Seed aggregate statistics as dataset records
-- These are publicly reported aggregate figures, not individual complaints.
-- verification_status = 'unverified' (published statistics, not independently verified here)

DO $$
DECLARE
  rbi_id uuid;
  i4c_id uuid;
  npci_id uuid;
BEGIN
  SELECT id INTO rbi_id FROM dataset_sources WHERE source_type = 'rbi' LIMIT 1;
  SELECT id INTO i4c_id FROM dataset_sources WHERE source_type = 'i4c' LIMIT 1;
  SELECT id INTO npci_id FROM dataset_sources WHERE source_type = 'upi_research' LIMIT 1;

  -- RBI fraud statistics (aggregate, FY24)
  INSERT INTO dataset_records (source_id, scam_category, description, incident_date, region, payment_channel, indicators, verification_status, record_metadata)
  VALUES
    (rbi_id, 'Bank Fraud — Total', 'RBI reported aggregate bank frauds amounting to approximately Rs 14,000 crore in FY 2023-24 across all categories.', '2024-03-31', 'India', NULL,
     ARRAY['aggregate_statistic','rbi_annual_report'], 'unverified',
     jsonb_build_object('source_document', 'RBI Report on Trend and Progress of Banking in India', 'fiscal_year', 'FY24', 'amount_crore', 14000, 'note', 'Aggregate statistic from RBI annual report')),

    (rbi_id, 'Loan Fraud', 'Loan fraud cases constituted the largest share by amount in RBI fraud statistics, accounting for the majority of the total amount involved.', '2024-03-31', 'India', 'bank_transfer',
     ARRAY['aggregate_statistic','loan_fraud'], 'unverified',
     jsonb_build_object('source_document', 'RBI Report on Trend and Progress of Banking in India', 'fiscal_year', 'FY24', 'note', 'Loan frauds dominate by amount')),

    (rbi_id, 'Deposits / Advances Fraud', 'Frauds related to deposits and advances accounted for a significant portion of reported cases by number.', '2024-03-31', 'India', NULL,
     ARRAY['aggregate_statistic','deposit_fraud'], 'unverified',
     jsonb_build_object('source_document', 'RBI Report on Trend and Progress of Banking in India', 'fiscal_year', 'FY24')),

    (rbi_id, 'Cyber/Debit-Credit Card Fraud', 'Card and internet-based frauds showed increasing trend in number of cases though lower in individual amounts.', '2024-03-31', 'India', 'upi',
     ARRAY['aggregate_statistic','card_fraud','cyber_fraud'], 'unverified',
     jsonb_build_object('source_document', 'RBI Report on Trend and Progress of Banking in India', 'fiscal_year', 'FY24')),

    (rbi_id, 'UPI/Digital Payment Fraud', 'RBI noted rising complaints related to UPI and digital payment frauds, particularly in FY23-24 period.', '2024-03-31', 'India', 'upi',
     ARRAY['aggregate_statistic','upi_fraud','digital_payment'], 'unverified',
     jsonb_build_object('source_document', 'RBI Financial Stability Report', 'fiscal_year', 'FY24')),

    -- I4C / NCRP statistics
    (i4c_id, 'OTP/Fake Call Fraud', 'I4C reported that OTP fraud and fake customer care calls are among the most common cybercrime complaints registered on the NCRP portal.', '2024-06-30', 'India', NULL,
     ARRAY['aggregate_statistic','otp_fraud','fake_call'], 'unverified',
     jsonb_build_object('source_document', 'I4C awareness materials', 'note', 'Most common complaint category')),

    (i4c_id, 'Phishing/SMS Fraud', 'Phishing via SMS and social media links constitutes a large share of reported cybercrimes per I4C data.', '2024-06-30', 'India', NULL,
     ARRAY['aggregate_statistic','phishing','sms_fraud'], 'unverified',
     jsonb_build_object('source_document', 'I4C awareness materials')),

    (i4c_id, 'Investment/Ponzi Fraud', 'I4C flagged rising investment fraud and Ponzi schemes through social media and messaging apps.', '2024-06-30', 'India', NULL,
     ARRAY['aggregate_statistic','investment_fraud','ponzi'], 'unverified',
     jsonb_build_object('source_document', 'I4C awareness materials')),

    (i4c_id, 'Government Scheme Impersonation', 'Fraudsters impersonating government officials offering fake scheme benefits — common NCRP complaint category.', '2024-06-30', 'India', NULL,
     ARRAY['aggregate_statistic','govt_impersonation'], 'unverified',
     jsonb_build_object('source_document', 'I4C awareness materials')),

    (i4c_id, 'Job/Work-from-Home Fraud', 'Fake job offers and work-from-home scams reported as a growing category on the NCRP portal.', '2024-06-30', 'India', NULL,
     ARRAY['aggregate_statistic','job_fraud'], 'unverified',
     jsonb_build_object('source_document', 'I4C awareness materials')),

    -- NPCI / UPI
    (npci_id, 'UPI Scam — QR Code', 'NPCI awareness materials warn about QR code scams where victims scan malicious QR codes and lose money.', '2024-06-30', 'India', 'qr',
     ARRAY['awareness_material','qr_scam'], 'unverified',
     jsonb_build_object('source_document', 'NPCI UPI Safety Guidelines')),

    (npci_id, 'UPI Scam — Remote Access', 'NPCI warns about fraudsters gaining remote access to phones via screen-sharing apps to conduct UPI fraud.', '2024-06-30', 'India', 'upi',
     ARRAY['awareness_material','remote_access_fraud'], 'unverified',
     jsonb_build_object('source_document', 'NPCI UPI Safety Guidelines')),

    (npci_id, 'UPI Scam — SIM Swap', 'SIM swap fraud enabling UPI-based theft is flagged in NPCI awareness campaigns.', '2024-06-30', 'India', 'upi',
     ARRAY['awareness_material','sim_swap_fraud'], 'unverified',
     jsonb_build_object('source_document', 'NPCI UPI Safety Guidelines'))
  ON CONFLICT DO NOTHING;
END $$;
