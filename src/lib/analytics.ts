import { supabase } from '@/lib/supabase';
import { DEMO_SCAM_REPORTS } from '@/lib/demoData';

export interface DatasetSource {
  id: string;
  name: string;
  source_type: string;
  source_url: string | null;
  license: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  publisher?: string | null;
  geographic_coverage?: string | null;
  reporting_period?: string | null;
  publication_date?: string | null;
  last_synced_at?: string | null;
  update_frequency?: string | null;
  dataset_identifier?: string | null;
  data_format?: string | null;
  limitations?: string | null;
  record_count?: number | null;
  validation_status?: string | null;
  data_category?: string | null;
}

export interface DatasetRecord {
  id: string;
  source_id: string;
  import_id: string | null;
  scam_category: string;
  description: string;
  incident_date: string | null;
  region: string | null;
  payment_channel: string | null;
  indicators: string[];
  verification_status: 'unverified' | 'reviewed' | 'verified';
  record_metadata: Record<string, unknown>;
  import_timestamp: string;
  created_at: string;
}

export interface DatasetImport {
  id: string;
  source_id: string;
  imported_by: string;
  filename: string;
  file_format: 'csv' | 'json';
  total_rows: number;
  accepted_rows: number;
  rejected_rows: number;
  duplicate_rows: number;
  status: 'pending' | 'completed' | 'partial' | 'failed';
  error_summary: string | null;
  created_at: string;
}

export interface ScamReportWithMeta {
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

export interface CategoryBreakdown {
  category: string;
  count: number;
  sourceType: 'dataset' | 'user_report' | 'demo';
}

export interface PaymentChannelBreakdown {
  channel: string;
  count: number;
  sourceType: 'dataset' | 'user_report' | 'demo';
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

export interface UnifiedAnalytics {
  datasetRecords: DatasetRecord[];
  userReports: ScamReportWithMeta[];
  demoReports: typeof DEMO_SCAM_REPORTS;
  categoryBreakdown: CategoryBreakdown[];
  paymentChannelBreakdown: PaymentChannelBreakdown[];
  statusBreakdown: StatusBreakdown[];
  sourceBreakdown: { source: string; count: number }[];
  totalDatasetRecords: number;
  totalUserReports: number;
  totalDemoReports: number;
  totalAll: number;
}

const DEMO_DATASET_RECORDS: DatasetRecord[] = [
  { id: 'ds-r1', source_id: 'ds-rbi', import_id: null, scam_category: 'Bank Fraud — Total', description: 'RBI reported aggregate bank frauds amounting to approx Rs 14,000 crore in FY24.', incident_date: '2024-03-31', region: 'India', payment_channel: null, indicators: ['aggregate_statistic'], verification_status: 'unverified', record_metadata: { amount_crore: 14000 }, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ds-r2', source_id: 'ds-rbi', import_id: null, scam_category: 'Loan Fraud', description: 'Loan fraud cases dominated by amount in RBI FY24 statistics.', incident_date: '2024-03-31', region: 'India', payment_channel: 'bank_transfer', indicators: ['aggregate_statistic'], verification_status: 'unverified', record_metadata: {}, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ds-r3', source_id: 'ds-rbi', import_id: null, scam_category: 'UPI/Digital Payment Fraud', description: 'Rising UPI and digital payment fraud complaints per RBI.', incident_date: '2024-03-31', region: 'India', payment_channel: 'upi', indicators: ['aggregate_statistic'], verification_status: 'unverified', record_metadata: {}, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ds-i1', source_id: 'ds-i4c', import_id: null, scam_category: 'OTP/Fake Call Fraud', description: 'OTP fraud and fake customer care calls are most common NCRP complaints.', incident_date: '2024-06-30', region: 'India', payment_channel: null, indicators: ['aggregate_statistic'], verification_status: 'unverified', record_metadata: {}, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ds-i2', source_id: 'ds-i4c', import_id: null, scam_category: 'Phishing/SMS Fraud', description: 'Phishing via SMS and social media links.', incident_date: '2024-06-30', region: 'India', payment_channel: null, indicators: ['aggregate_statistic'], verification_status: 'unverified', record_metadata: {}, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ds-i3', source_id: 'ds-i4c', import_id: null, scam_category: 'Investment/Ponzi Fraud', description: 'Investment fraud via social media and messaging apps.', incident_date: '2024-06-30', region: 'India', payment_channel: null, indicators: ['aggregate_statistic'], verification_status: 'unverified', record_metadata: {}, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ds-i4', source_id: 'ds-i4c', import_id: null, scam_category: 'Government Scheme Impersonation', description: 'Fraudsters impersonating government officials for fake schemes.', incident_date: '2024-06-30', region: 'India', payment_channel: null, indicators: ['aggregate_statistic'], verification_status: 'unverified', record_metadata: {}, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ds-n1', source_id: 'ds-npci', import_id: null, scam_category: 'UPI Scam — QR Code', description: 'QR code scams where victims scan malicious codes.', incident_date: '2024-06-30', region: 'India', payment_channel: 'qr', indicators: ['awareness_material'], verification_status: 'unverified', record_metadata: {}, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ds-n2', source_id: 'ds-npci', import_id: null, scam_category: 'UPI Scam — Remote Access', description: 'Fraudsters gaining remote access via screen-sharing apps.', incident_date: '2024-06-30', region: 'India', payment_channel: 'upi', indicators: ['awareness_material'], verification_status: 'unverified', record_metadata: {}, import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
];

const DEMO_DATASET_SOURCES: DatasetSource[] = [
  { id: 'ds-rbi', name: 'RBI — Report on Trend and Progress of Banking in India', source_type: 'rbi', source_url: 'https://www.rbi.org.in', license: 'Public domain (Govt of India)', description: 'RBI annual report with bank fraud statistics.', is_active: true, created_at: new Date().toISOString() },
  { id: 'ds-i4c', name: 'I4C — Indian Cyber Crime Coordination Centre / NCRP', source_type: 'i4c', source_url: 'https://cybercrime.gov.in', license: 'Public domain (Govt of India)', description: 'NCRP awareness resources and published cybercrime statistics.', is_active: true, created_at: new Date().toISOString() },
  { id: 'ds-npci', name: 'NPCI — National Payments Corporation of India (UPI awareness)', source_type: 'upi_research', source_url: 'https://www.npci.org.in', license: 'Public domain', description: 'NPCI UPI safety guidelines and digital payment fraud awareness.', is_active: true, created_at: new Date().toISOString() },
];

export async function fetchDatasetSources(isDemoMode: boolean): Promise<DatasetSource[]> {
  if (isDemoMode) return DEMO_DATASET_SOURCES;
  const { data, error } = await supabase.from('dataset_sources').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as DatasetSource[];
}

export async function fetchDatasetRecords(isDemoMode: boolean, limit?: number): Promise<DatasetRecord[]> {
  if (isDemoMode) return DEMO_DATASET_RECORDS;
  let query = supabase.from('dataset_records').select('*').order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as DatasetRecord[];
}

export async function fetchUserScamReports(profileId: string | null, isDemoMode: boolean): Promise<ScamReportWithMeta[]> {
  if (isDemoMode) return DEMO_SCAM_REPORTS as unknown as ScamReportWithMeta[];
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('scam_reports')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as ScamReportWithMeta[];
}

export async function fetchAllScamReports(isDemoMode: boolean, limit?: number): Promise<ScamReportWithMeta[]> {
  if (isDemoMode) return DEMO_SCAM_REPORTS as unknown as ScamReportWithMeta[];
  let query = supabase.from('scam_reports').select('*').order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as ScamReportWithMeta[];
}

export async function fetchDatasetImports(isDemoMode: boolean): Promise<DatasetImport[]> {
  if (isDemoMode) return [];
  const { data, error } = await supabase.from('dataset_imports').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as DatasetImport[];
}

export function computeCategoryBreakdown(
  datasetRecords: DatasetRecord[],
  userReports: ScamReportWithMeta[],
  demoReports: typeof DEMO_SCAM_REPORTS,
): CategoryBreakdown[] {
  const map = new Map<string, { count: number; sourceType: 'dataset' | 'user_report' | 'demo' }>();
  for (const r of datasetRecords) {
    const existing = map.get(r.scam_category) ?? { count: 0, sourceType: 'dataset' };
    map.set(r.scam_category, { count: existing.count + 1, sourceType: 'dataset' });
  }
  for (const r of userReports) {
    const existing = map.get(r.category) ?? { count: 0, sourceType: 'user_report' };
    map.set(r.category, { count: existing.count + 1, sourceType: 'user_report' });
  }
  for (const r of demoReports) {
    const existing = map.get(r.category) ?? { count: 0, sourceType: 'demo' };
    map.set(r.category, { count: existing.count + 1, sourceType: 'demo' });
  }
  return Array.from(map.entries())
    .map(([category, { count, sourceType }]) => ({ category, count, sourceType }))
    .sort((a, b) => b.count - a.count);
}

export function computePaymentChannelBreakdown(
  datasetRecords: DatasetRecord[],
  userReports: ScamReportWithMeta[],
): PaymentChannelBreakdown[] {
  const map = new Map<string, { count: number; sourceType: 'dataset' | 'user_report' }>();
  for (const r of datasetRecords) {
    if (!r.payment_channel) continue;
    const existing = map.get(r.payment_channel) ?? { count: 0, sourceType: 'dataset' };
    map.set(r.payment_channel, { count: existing.count + 1, sourceType: 'dataset' });
  }
  for (const r of userReports) {
    if (!r.payment_channel) continue;
    const existing = map.get(r.payment_channel) ?? { count: 0, sourceType: 'user_report' };
    map.set(r.payment_channel, { count: existing.count + 1, sourceType: 'user_report' });
  }
  return Array.from(map.entries())
    .map(([channel, { count, sourceType }]) => ({ channel, count, sourceType }))
    .sort((a, b) => b.count - a.count);
}

export function computeStatusBreakdown(reports: ScamReportWithMeta[]): StatusBreakdown[] {
  const map = new Map<string, number>();
  for (const r of reports) {
    map.set(r.status, (map.get(r.status) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
}

export function computeSourceBreakdown(datasetRecords: DatasetRecord[], sources: DatasetSource[]): { source: string; count: number }[] {
  const sourceMap = new Map<string, string>();
  for (const s of sources) sourceMap.set(s.id, s.name);
  const map = new Map<string, number>();
  for (const r of datasetRecords) {
    const name = sourceMap.get(r.source_id) ?? 'Unknown';
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
}

export interface GovtStatistic {
  id: string;
  source_id: string;
  import_id: string | null;
  indicator_name: string;
  indicator_category: string;
  geography_level: string;
  geography_name: string;
  state_code: string | null;
  district_code: string | null;
  reporting_period: string;
  period_start: string | null;
  period_end: string | null;
  indicator_value: number | null;
  indicator_unit: string | null;
  indicator_value_text: string | null;
  disaggregation: Record<string, unknown>;
  data_category: string;
  verification_status: string;
  notes: string | null;
  import_timestamp: string;
  created_at: string;
}

export interface DatasetSyncHistory {
  id: string;
  source_id: string;
  initiated_by: string | null;
  sync_type: string;
  status: string;
  rows_fetched: number;
  rows_inserted: number;
  rows_updated: number;
  rows_rejected: number;
  error_summary: string | null;
  started_at: string;
  completed_at: string | null;
}

const DEMO_GOVT_STATS: GovtStatistic[] = [
  { id: 'gs-1', source_id: 'ds-rbi', import_id: null, indicator_name: 'MPI Headcount Ratio (H)', indicator_category: 'poverty', geography_level: 'national', geography_name: 'India', state_code: null, district_code: null, reporting_period: 'NFHS-5 (2019-21)', period_start: '2019-04-01', period_end: '2021-03-31', indicator_value: 14.96, indicator_unit: '%', indicator_value_text: null, disaggregation: { survey: 'NFHS-5' }, data_category: 'official', verification_status: 'unverified', notes: 'Demo data', import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'gs-2', source_id: 'ds-rbi', import_id: null, indicator_name: 'MPI Headcount Ratio (H)', indicator_category: 'poverty', geography_level: 'national', geography_name: 'India', state_code: null, district_code: null, reporting_period: 'NFHS-4 (2015-16)', period_start: '2015-04-01', period_end: '2016-03-31', indicator_value: 24.85, indicator_unit: '%', indicator_value_text: null, disaggregation: { survey: 'NFHS-4' }, data_category: 'official', verification_status: 'unverified', notes: 'Demo data', import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'gs-3', source_id: 'ds-rbi', import_id: null, indicator_name: 'SDG Composite Score', indicator_category: 'sdg', geography_level: 'national', geography_name: 'India', state_code: null, district_code: null, reporting_period: '2023-24', period_start: '2023-04-01', period_end: '2024-03-31', indicator_value: 71, indicator_unit: 'score (0-100)', indicator_value_text: null, disaggregation: {}, data_category: 'official', verification_status: 'unverified', notes: 'Demo data', import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'gs-4', source_id: 'ds-npci', import_id: null, indicator_name: 'UPI Transaction Volume', indicator_category: 'digital_payments', geography_level: 'national', geography_name: 'India', state_code: null, district_code: null, reporting_period: 'Jan 2025', period_start: '2025-01-01', period_end: '2025-01-31', indicator_value: 16140, indicator_unit: 'million', indicator_value_text: null, disaggregation: { note: 'National UPI — NOT Mudra-Mend' }, data_category: 'official', verification_status: 'unverified', notes: 'Demo data', import_timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
];

export async function fetchGovtStatistics(
  isDemoMode: boolean,
  filters?: { category?: string; geographyLevel?: string; geographyName?: string; indicatorName?: string },
): Promise<GovtStatistic[]> {
  if (isDemoMode) {
    let result = [...DEMO_GOVT_STATS];
    if (filters?.category) result = result.filter((r) => r.indicator_category === filters.category);
    if (filters?.geographyLevel) result = result.filter((r) => r.geography_level === filters.geographyLevel);
    if (filters?.geographyName) result = result.filter((r) => r.geography_name === filters.geographyName);
    if (filters?.indicatorName) result = result.filter((r) => r.indicator_name === filters.indicatorName);
    return result;
  }
  let query = supabase.from('govt_statistics').select('*').order('period_start', { ascending: false });
  if (filters?.category) query = query.eq('indicator_category', filters.category);
  if (filters?.geographyLevel) query = query.eq('geography_level', filters.geographyLevel);
  if (filters?.geographyName) query = query.eq('geography_name', filters.geographyName);
  if (filters?.indicatorName) query = query.eq('indicator_name', filters.indicatorName);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as GovtStatistic[];
}

export async function fetchDatasetSyncHistory(isDemoMode: boolean, sourceId?: string): Promise<DatasetSyncHistory[]> {
  if (isDemoMode) return [];
  let query = supabase.from('dataset_sync_history').select('*').order('started_at', { ascending: false });
  if (sourceId) query = query.eq('source_id', sourceId);
  const { data, error } = await query.limit(50);
  if (error) return [];
  return (data ?? []) as DatasetSyncHistory[];
}

export async function fetchUnifiedAnalytics(
  profileId: string | null,
  isDemoMode: boolean,
  options?: { userReportsOnly?: boolean; allReports?: boolean },
): Promise<UnifiedAnalytics> {
  const [datasetRecords, sources] = await Promise.all([
    fetchDatasetRecords(isDemoMode),
    fetchDatasetSources(isDemoMode),
  ]);

  let userReports: ScamReportWithMeta[];
  if (options?.allReports) {
    userReports = await fetchAllScamReports(isDemoMode);
  } else if (options?.userReportsOnly && profileId) {
    userReports = await fetchUserScamReports(profileId, isDemoMode);
  } else {
    userReports = await fetchAllScamReports(isDemoMode);
  }

  const demoReports = isDemoMode ? DEMO_SCAM_REPORTS : [];

  return {
    datasetRecords,
    userReports,
    demoReports,
    categoryBreakdown: computeCategoryBreakdown(datasetRecords, userReports, demoReports),
    paymentChannelBreakdown: computePaymentChannelBreakdown(datasetRecords, userReports),
    statusBreakdown: computeStatusBreakdown(userReports),
    sourceBreakdown: computeSourceBreakdown(datasetRecords, sources),
    totalDatasetRecords: datasetRecords.length,
    totalUserReports: userReports.length,
    totalDemoReports: demoReports.length,
    totalAll: datasetRecords.length + userReports.length + demoReports.length,
  };
}
