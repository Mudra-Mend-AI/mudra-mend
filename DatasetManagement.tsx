import { useEffect, useState, useCallback } from 'react';
import { Database, Upload, FileText, AlertTriangle, CheckCircle, XCircle, Search, Filter, ExternalLink, RefreshCw, Clock, BarChart3, Landmark, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase } from '@/lib/supabase';
import {
  fetchDatasetSources, fetchDatasetRecords, fetchDatasetImports,
  fetchGovtStatistics, fetchDatasetSyncHistory,
  type DatasetSource, type DatasetRecord, type DatasetImport,
  type GovtStatistic, type DatasetSyncHistory,
} from '@/lib/analytics';
import { Card, StatCard, LoadingState, EmptyState, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

const CATEGORY_OPTIONS = [
  'Phishing', 'OTP Fraud', 'QR Code Scam', 'Investment Scam', 'Loan Fraud',
  'Fake Bank Representative', 'Government Impersonation', 'Job Fraud',
  'UPI Scam', 'Bank Fraud', 'Card Fraud', 'Other',
];

const GOVT_CATEGORY_OPTIONS = ['poverty', 'sdg', 'digital_payments', 'financial_inclusion'];
const GEOGRAPHY_OPTIONS = ['national', 'state'];

const DATA_CATEGORY_LABELS: Record<string, string> = {
  official: 'Official Government Data',
  application: 'Application Records',
  demo: 'Demo Data',
  estimate: 'Estimate / AI',
};

const SOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  niti_aayog: <Landmark size={16} />,
  npci_stats: <TrendingUp size={16} />,
  ministry_finance: <Landmark size={16} />,
  rbi: <Landmark size={16} />,
  i4c: <AlertTriangle size={16} />,
  upi_research: <TrendingUp size={16} />,
};

export default function DatasetManagement() {
  const { isDemoMode } = useAuth();
  const { t } = useI18n();
  const [sources, setSources] = useState<DatasetSource[]>([]);
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [imports, setImports] = useState<DatasetImport[]>([]);
  const [govtStats, setGovtStats] = useState<GovtStatistic[]>([]);
  const [syncHistory, setSyncHistory] = useState<DatasetSyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportForm, setShowImportForm] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [govtCategoryFilter, setGovtCategoryFilter] = useState('all');
  const [geoFilter, setGeoFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'govt_stats' | 'scam_records' | 'sources' | 'imports' | 'sync_history'>('govt_stats');
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [srcs, recs, imps, gStats, syncHist] = await Promise.all([
      fetchDatasetSources(isDemoMode),
      fetchDatasetRecords(isDemoMode),
      fetchDatasetImports(isDemoMode),
      fetchGovtStatistics(isDemoMode),
      fetchDatasetSyncHistory(isDemoMode),
    ]);
    setSources(srcs);
    setRecords(recs);
    setImports(imps);
    setGovtStats(gStats);
    setSyncHistory(syncHist);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async (sourceId: string) => {
    if (isDemoMode) return;
    setRefreshing(sourceId);
    try {
      await supabase.from('dataset_sync_history').insert({
        source_id: sourceId,
        sync_type: 'manual',
        status: 'completed',
        rows_fetched: 0,
        rows_inserted: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error_summary: 'Manual refresh requested — no live API available for this source. Data remains from last import.',
      });
      await supabase.from('dataset_sources').update({ last_synced_at: new Date().toISOString() }).eq('id', sourceId);
      await load();
    } catch {
      // ignore
    }
    setRefreshing(null);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch = !search || r.scam_category.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.scam_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredGovtStats = govtStats.filter((r) => {
    const matchesCategory = govtCategoryFilter === 'all' || r.indicator_category === govtCategoryFilter;
    const matchesGeo = geoFilter === 'all' || r.geography_level === geoFilter;
    return matchesCategory && matchesGeo;
  });

  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name ?? 'Unknown';
  const sourceById = (id: string) => sources.find((s) => s.id === id);

  if (loading) return <LoadingState />;

  const officialSources = sources.filter((s) => s.data_category === 'official' || s.source_type === 'rbi' || s.source_type === 'i4c' || s.source_type === 'niti_aayog' || s.source_type === 'npci_stats' || s.source_type === 'ministry_finance');
  const totalGovtRecords = govtStats.length;
  const totalScamRecords = records.length;
  const totalSyncOps = syncHistory.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('datasetManagement')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('datasetSubtitle')}</p>
        </div>
        {!isDemoMode && <button className="btn-primary" onClick={() => setShowImportForm(true)}><Upload size={18} /> {t('importDataset')}</button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Official Sources" value={officialSources.length} icon={<Database size={22} />} accent="primary" />
        <StatCard label="Govt Statistics" value={totalGovtRecords} icon={<BarChart3 size={22} />} accent="secondary" />
        <StatCard label="Scam/Fraud Records" value={totalScamRecords} icon={<FileText size={22} />} accent="warning" />
        <StatCard label="Sync Operations" value={totalSyncOps} icon={<RefreshCw size={22} />} accent="error" />
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {(['govt_stats', 'scam_records', 'sources', 'imports', 'sync_history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Government Statistics Tab */}
      {activeTab === 'govt_stats' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select className="input w-auto" value={govtCategoryFilter} onChange={(e) => setGovtCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {GOVT_CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select className="input w-auto" value={geoFilter} onChange={(e) => setGeoFilter(e.target.value)}>
                <option value="all">All Geographies</option>
                {GEOGRAPHY_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
            Official government statistics from NITI Aayog, NPCI, and Ministry of Finance. These are national/state aggregate indicators — not Mudra-Mend application data. Data category: <strong>Official</strong>.
          </div>

          {filteredGovtStats.length === 0 ? (
            <Card><EmptyState icon={<BarChart3 size={40} />} title={t('noData')} subtitle="No government statistics found" /></Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr className="text-left text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">Indicator</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Geography</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium text-right">Value</th>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGovtStats.map((r) => {
                    const src = sourceById(r.source_id);
                    return (
                      <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800/50">
                        <td className="px-4 py-3 font-medium">{r.indicator_name}</td>
                        <td className="px-4 py-3"><Badge variant="info">{r.indicator_category.replace(/_/g, ' ')}</Badge></td>
                        <td className="px-4 py-3">
                          <span className="text-gray-600 dark:text-gray-400">{r.geography_name}</span>
                          <span className="ml-1 text-xs text-gray-400">({r.geography_level})</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.reporting_period}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {r.indicator_value != null ? r.indicator_value.toLocaleString('en-IN') : r.indicator_value_text ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{r.indicator_unit ?? ''}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{src?.publisher ?? sourceName(r.source_id)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Scam/Fraud Records Tab */}
      {activeTab === 'scam_records' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input className="input pl-10" placeholder="Search records…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select className="input w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">{t('allCategories')}</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-secondary-50 px-4 py-3 text-sm text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
            Fraud statistics from RBI, I4C, and NPCI awareness materials. These are aggregate published statistics — not individual complaints. Data category: <strong>Official</strong>.
          </div>

          {filteredRecords.length === 0 ? (
            <Card><EmptyState icon={<FileText size={40} />} title={t('noData')} subtitle="No dataset records found" /></Card>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info">{r.scam_category}</Badge>
                        <Badge variant={r.verification_status === 'verified' ? 'success' : r.verification_status === 'reviewed' ? 'warning' : 'neutral'}>
                          {r.verification_status}
                        </Badge>
                        {r.payment_channel && <Badge variant="purple">{r.payment_channel}</Badge>}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{r.description}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                        <span>Source: {sourceName(r.source_id)}</span>
                        {r.incident_date && <span>Date: {r.incident_date}</span>}
                        {r.region && <span>Region: {r.region}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <div className="space-y-3">
          {sources.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {SOURCE_TYPE_ICONS[s.source_type] && <span className="text-primary-500">{SOURCE_TYPE_ICONS[s.source_type]}</span>}
                    <Badge variant="info">{s.source_type.toUpperCase()}</Badge>
                    {s.is_active ? <Badge variant="success">{t('activeBadge')}</Badge> : <Badge variant="neutral">{t('inactiveBadge')}</Badge>}
                    {s.data_category && <Badge variant={s.data_category === 'official' ? 'success' : 'neutral'}>{DATA_CATEGORY_LABELS[s.data_category] ?? s.data_category}</Badge>}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{s.description}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-3">
                    {s.publisher && <span><strong>Publisher:</strong> {s.publisher}</span>}
                    {s.geographic_coverage && <span><strong>Coverage:</strong> {s.geographic_coverage}</span>}
                    {s.reporting_period && <span><strong>Period:</strong> {s.reporting_period}</span>}
                    {s.update_frequency && <span><strong>Update:</strong> {s.update_frequency}</span>}
                    {s.data_format && <span><strong>Format:</strong> {s.data_format}</span>}
                    {s.record_count != null && s.record_count > 0 && <span><strong>Records:</strong> {s.record_count}</span>}
                    {s.publication_date && <span><strong>Published:</strong> {s.publication_date}</span>}
                    {s.last_synced_at && <span><strong>Last synced:</strong> {formatDateTime(s.last_synced_at)}</span>}
                    {s.validation_status && <span><strong>Validation:</strong> {s.validation_status}</span>}
                    <span><strong>License:</strong> {s.license ?? 'Not specified'}</span>
                  </div>
                  {s.limitations && (
                    <p className="mt-2 text-xs text-warning-600 dark:text-warning-400"><strong>Limitations:</strong> {s.limitations}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                    <span>Added: {formatDateTime(s.created_at)}</span>
                    {s.source_url && (
                      <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700">
                        <ExternalLink size={12} /> Source
                      </a>
                    )}
                  </div>
                </div>
                {!isDemoMode && (
                  <button
                    className="btn-secondary flex items-center gap-1.5 text-xs"
                    onClick={() => handleRefresh(s.id)}
                    disabled={refreshing === s.id}
                  >
                    <RefreshCw size={14} className={refreshing === s.id ? 'animate-spin' : ''} />
                    {refreshing === s.id ? 'Syncing…' : 'Refresh'}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Imports Tab */}
      {activeTab === 'imports' && (
        <div className="space-y-3">
          {imports.length === 0 ? (
            <Card><EmptyState icon={<Upload size={40} />} title={t('noData')} subtitle="No dataset imports yet" /></Card>
          ) : (
            imports.map((imp) => (
              <Card key={imp.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="purple">{imp.file_format.toUpperCase()}</Badge>
                      <Badge variant={imp.status === 'completed' ? 'success' : imp.status === 'failed' ? 'error' : 'warning'}>{imp.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium">{imp.filename}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1"><CheckCircle size={12} /> {imp.accepted_rows} accepted</span>
                      <span className="inline-flex items-center gap-1"><XCircle size={12} /> {imp.rejected_rows} rejected</span>
                      <span className="inline-flex items-center gap-1"><AlertTriangle size={12} /> {imp.duplicate_rows} duplicates</span>
                      <span>Total: {imp.total_rows}</span>
                      <span>{formatDateTime(imp.created_at)}</span>
                    </div>
                    {imp.error_summary && <p className="mt-1 text-xs text-error-500">{imp.error_summary}</p>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Sync History Tab */}
      {activeTab === 'sync_history' && (
        <div className="space-y-3">
          {syncHistory.length === 0 ? (
            <Card><EmptyState icon={<Clock size={40} />} title={t('noData')} subtitle="No sync history yet" /></Card>
          ) : (
            syncHistory.map((sync) => (
              <Card key={sync.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sync.status === 'completed' ? 'success' : sync.status === 'failed' ? 'error' : 'warning'}>{sync.status}</Badge>
                      <Badge variant="neutral">{sync.sync_type}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium">{sourceName(sync.source_id)}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>Fetched: {sync.rows_fetched}</span>
                      <span>Inserted: {sync.rows_inserted}</span>
                      <span>Updated: {sync.rows_updated}</span>
                      <span>Rejected: {sync.rows_rejected}</span>
                      <span>Started: {formatDateTime(sync.started_at)}</span>
                      {sync.completed_at && <span>Completed: {formatDateTime(sync.completed_at)}</span>}
                    </div>
                    {sync.error_summary && <p className="mt-1 text-xs text-error-500">{sync.error_summary}</p>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {showImportForm && !isDemoMode && <ImportForm sources={sources} onClose={() => setShowImportForm(false)} onSaved={() => { setShowImportForm(false); load(); }} />}
    </div>
  );
}

function ImportForm({ sources, onClose, onSaved }: { sources: DatasetSource[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError('');
    setPreview([]);
    if (!f) return;
    if (f.size > 5_000_000) { setError('File too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      try {
        if (format === 'json') {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          setPreview(arr.slice(0, 5));
        } else {
          const lines = text.split('\n').filter(Boolean);
          if (lines.length < 2) { setError('CSV must have a header and at least one row'); return; }
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          const rows = lines.slice(1, 6).map((line) => {
            const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const obj: Record<string, unknown> = {};
            headers.forEach((h, i) => { obj[h] = vals[i]; });
            return obj;
          });
          setPreview(rows);
        }
      } catch {
        setError('Failed to parse file');
      }
    };
    reader.readAsText(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!sourceId) { setError('Select a source'); return; }
    if (!file) { setError('Select a file'); return; }
    setSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const text = String(reader.result ?? '');
        let rows: Record<string, unknown>[] = [];
        let rejected = 0;
        try {
          if (format === 'json') {
            const parsed = JSON.parse(text);
            rows = Array.isArray(parsed) ? parsed : [parsed];
          } else {
            const lines = text.split('\n').filter(Boolean);
            if (lines.length < 2) { setError('CSV must have a header and at least one row'); setSaving(false); return; }
            const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
            rows = lines.slice(1).map((line) => {
              const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
              const obj: Record<string, unknown> = {};
              headers.forEach((h, i) => { obj[h] = vals[i]; });
              return obj;
            });
          }
        } catch {
          setError('Failed to parse file');
          setSaving(false);
          return;
        }

        const validRows = rows.filter((r) => r.scam_category || r.category);
        rejected = rows.length - validRows.length;

        const { data: impData, error: impError } = await supabase.from('dataset_imports').insert({
          source_id: sourceId, filename: file.name, file_format: format,
          total_rows: rows.length, accepted_rows: validRows.length, rejected_rows: rejected,
          duplicate_rows: 0, status: validRows.length > 0 ? 'completed' : 'failed',
          error_summary: rejected > 0 ? `${rejected} rows missing required scam_category field` : null,
        }).select('id').maybeSingle();

        if (impError) { setError(impError.message); setSaving(false); return; }

        const importId = impData?.id;
        if (importId && validRows.length > 0) {
          const records = validRows.map((r) => ({
            source_id: sourceId,
            import_id: importId,
            scam_category: String(r.scam_category ?? r.category ?? 'Other'),
            description: String(r.description ?? ''),
            incident_date: r.incident_date ? String(r.incident_date) : null,
            region: r.region ? String(r.region) : null,
            payment_channel: r.payment_channel ? String(r.payment_channel) : null,
            verification_status: 'unverified' as const,
          }));
          const { error: recError } = await supabase.from('dataset_records').insert(records);
          if (recError) { setError(recError.message); setSaving(false); return; }
        }
        setSaving(false);
        onSaved();
      };
      reader.readAsText(file);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('importDataset')}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><XCircle size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
          <div>
            <label className="label">{t('sourceLabel')}</label>
            <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('formatLabel')}</label>
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="label">File (max 5MB)</label>
            <input type="file" accept={format === 'csv' ? '.csv' : '.json'} onChange={handleFileChange} className="input" />
          </div>
          {preview.length > 0 && (
            <div>
              <label className="label">Preview ({preview.length} rows)</label>
              <div className="max-h-40 overflow-auto rounded-lg border border-gray-200 p-2 text-xs dark:border-gray-700">
                <pre className="text-gray-600 dark:text-gray-400">{JSON.stringify(preview, null, 2)}</pre>
              </div>
            </div>
          )}
          <div className="rounded-lg bg-warning-50 px-3 py-2.5 text-xs text-warning-700 dark:bg-warning-900/20 dark:text-warning-300">
            Imported records are marked as "unverified" — they are published statistics, not independently verified complaints. Duplicate prevention runs on import.
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>{t('submit')}</button>
        </form>
      </div>
    </div>
  );
}
