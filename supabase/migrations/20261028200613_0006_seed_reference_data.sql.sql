/*
# Seed reference data: government schemes, bank branches, organizations, dataset sources
*/

INSERT INTO govt_schemes (name, department, category, eligibility, benefits, application_process, official_url, scam_warning, is_demo)
VALUES
  ('PM-Kisan Samman Nidhi', 'Ministry of Agriculture', 'Agriculture',
   'Small and marginal farmers with cultivable land',
   'Rs 6,000 per year in three instalments',
   'Apply at nearest CSC or online at pmkisan.gov.in',
   'https://pmkisan.gov.in',
   'No fee is required. Never share OTP for scheme enrollment.',
   true),
  ('Jan Dhan Yojana', 'Ministry of Finance', 'Financial Inclusion',
   'All Indian citizens above 10 years',
   'Zero-balance bank account, accident insurance, RuPay card',
   'Visit any bank branch with Aadhaar and photograph',
   'https://pmjdy.gov.in',
   'No agent can charge for account opening.',
   true),
  ('Pradhan Mantri Awas Yojana', 'Ministry of Housing', 'Housing',
   'EWS/LIG families without pucca house',
   'Interest subsidy on home loans up to Rs 2.67 lakh',
   'Apply through PMAY-G online portal or CSC',
   'https://pmaymis.gov.in',
   'Verify approval status only on official portal.',
   true)
ON CONFLICT DO NOTHING;

INSERT INTO bank_branches (ifsc, bank_name, branch_name, city, state)
VALUES
  ('SBIN0001234', 'State Bank of India', 'Mumbai Fort', 'Mumbai', 'Maharashtra'),
  ('HDFC0000456', 'HDFC Bank', 'Andheri West', 'Mumbai', 'Maharashtra'),
  ('ICIC0000789', 'ICICI Bank', 'Bengaluru MG Road', 'Bengaluru', 'Karnataka'),
  ('SBIN0005678', 'State Bank of India', 'Delhi Connaught Place', 'New Delhi', 'Delhi'),
  ('HDFC0000999', 'HDFC Bank', 'Pune FC Road', 'Pune', 'Maharashtra')
ON CONFLICT (ifsc) DO NOTHING;

INSERT INTO organizations (type, name, verification_status)
VALUES
  ('internal', 'Mudra-Mend', 'verified'),
  ('bank', 'State Bank of India', 'verified'),
  ('government', 'Cyber Cell Maharashtra', 'verified'),
  ('ngo', 'NGO Seva', 'verified'),
  ('government', 'Government of Maharashtra', 'verified')
ON CONFLICT DO NOTHING;

INSERT INTO dataset_sources (name, source_type, source_url, license, description, is_active)
VALUES
  ('RBI — Report on Trend and Progress of Banking in India', 'rbi',
   'https://www.rbi.org.in/Scripts/AnnualPublications.aspx',
   'Public domain (Government of India)',
   'Reserve Bank of India annual report containing bank fraud statistics.', true),
  ('I4C — Indian Cyber Crime Coordination Centre / NCRP', 'i4c',
   'https://cybercrime.gov.in',
   'Public domain (Government of India)',
   'National Cyber Crime Reporting Portal awareness resources.', true),
  ('NPCI — National Payments Corporation of India (UPI awareness)', 'upi_research',
   'https://www.npci.org.in',
   'Public domain',
   'NPCI UPI safety guidelines and digital payment fraud awareness materials.', true)
ON CONFLICT DO NOTHING;
