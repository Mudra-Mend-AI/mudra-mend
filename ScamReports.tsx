import { useEffect, useState, useCallback } from 'react';
import { FileWarning, Plus, X, Search, Filter, FlaskConical, Database, TrendingUp, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type ScamReport } from '@/lib/supabase';
import { DEMO_SCAM_REPORTS } from '@/lib/demoData';
import { fetchUnifiedAnalytics, type UnifiedAnalytics } from '@/lib/analytics';
import { Card, LoadingState, EmptyState, statusBadge, Badge, ConfirmDialog } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

const CATEGORIES = ['Phishing', 'Fake App/Website', 'Impersonation', 'Investment Fraud', 'Loan Fraud', 'OTP Fraud', 'QR Fraud', 'Job Fraud', 'Other'];

export default function ScamReports() {
  const { profile, isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [analytics, setAnalytics] = useState<UnifiedAnalytics | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode) {
      setReports(DEMO_SCAM_REPORTS as unknown as ScamReport[]);
      const a = await fetchUnifiedAnalytics(profile?.id ?? null, true, { userReportsOnly: true });
      setAnalytics(a);
      setLoading(false);
      return;
    }
    if (!profile) return;
    const { data } = await supabase.from('scam_reports').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
    setReports((data ?? []) as ScamReport[]);
    const a = await fetchUnifiedAnalytics(profile.id, false, { userReportsOnly: true });
    setAnalytics(a);
    setLoading(false);
  }, [profile, isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const filtered = reports.filter((r) => {
    const matchesSearch = !search || r.category.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('scamReports')}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('scamReports')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('scamReportsSubtitle')}</p>
        </div>
        {!isDemoMode && <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> {t('add')}</button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input pl-10" placeholder={t('searchReports')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t('all')}</option>
            <option value="submitted">{t('submitted')}</option>
            <option value="under_review">{t('underReview')}</option>
            <option value="verified">{t('verified')}</option>
            <option value="rejected">{t('rejected')}</option>
            <option value="escalated">{t('escalated')}</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-900/20 dark:text-warning-300">
        Submitted reports are unverified allegations. Do not publish accusations or declare an individual criminal based on an unverified report.
      </div>

      {analytics && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-3">
            <Database size={20} className="text-primary-500" />
            <div><p className="text-xs text-gray-500">{t('datasetRecords')}</p><p className="text-lg font-bold">{analytics.totalDatasetRecords}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <FileWarning size={20} className="text-error-500" />
            <div><p className="text-xs text-gray-500">{t('yourReports')}</p><p className="text-lg font-bold">{analytics.totalUserReports}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <TrendingUp size={20} className="text-secondary-500" />
            <div><p className="text-xs text-gray-500">{t('knownScamCategories')}</p><p className="text-lg font-bold">{analytics.categoryBreakdown.length}</p></div>
          </Card>
        </div>
      )}

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<FileWarning size={40} />} title={t('noData')} subtitle={t('noScamReportsYet')} /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="error">{r.category}</Badge>
                    {statusBadge(r.status)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{r.description}</p>
                  {r.suspect_contact && <p className="mt-1 text-xs text-gray-400">Suspect: {r.suspect_contact}</p>}
                  <p className="mt-1 text-xs text-gray-400">{formatDateTime(r.created_at, lang)}</p>
                </div>
                {!isDemoMode && r.status === 'submitted' && (
                  <button onClick={() => setDeleteId(r.id)} className="btn-ghost p-2 text-error-500" aria-label="Delete"><Trash2 size={16} /></button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && profile && <ScamReportForm userId={profile.id} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {!isDemoMode && <ConfirmDialog
        open={!!deleteId}
        title={t('delete')}
        message="Are you sure you want to delete this scam report? This cannot be undone."
        confirmLabel={t('delete')}
        danger
        onConfirm={async () => {
          if (!deleteId || !profile) return;
          const { error } = await supabase.from('scam_reports').delete().eq('id', deleteId).eq('user_id', profile.id);
          if (error) { console.error('Delete scam report error:', error.message); return; }
          setDeleteId(null);
          load();
        }}
        onCancel={() => setDeleteId(null)}
      />}
    </div>
  );
}

function ScamReportForm({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [suspectContact, setSuspectContact] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentChannel, setPaymentChannel] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) { setError('Description is required'); return; }
    if (!consent) { setError('You must declare the information is accurate to your knowledge'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('scam_reports').insert({
      user_id: userId, category, description: description.trim(), suspect_contact: suspectContact || null,
      incident_date: incidentDate || null, amount: amount ? Number(amount) : null,
      payment_channel: paymentChannel || null, status: 'submitted',
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('reportScam')}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
          <div>
            <label className="label">{t('category')}</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('description')}</label>
            <textarea className="input min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('describeWhatHappened')} />
          </div>
          <div>
            <label className="label">{t('suspectContactOptional')}</label>
            <input className="input" value={suspectContact} onChange={(e) => setSuspectContact(e.target.value)} placeholder={t('phoneEmailUpi')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">{t('incidentDate')}</label>
              <input type="date" className="input" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('amount')} ({t('rs')})</label>
              <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">{t('paymentChannel')}</label>
              <select className="input" value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)}>
                <option value="">—</option>
                <option value="upi">UPI</option>
                <option value="qr">QR Code</option>
                <option value="bank_transfer">{t('bankTransfer')}</option>
                <option value="sms">SMS</option>
                <option value="phone">{t('phoneCall')}</option>
                <option value="email">{t('email')}</option>
                <option value="social_media">{t('socialMedia')}</option>
              </select>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            I declare that the information provided is accurate to the best of my knowledge. I understand this is an unverified allegation.
          </label>
          <button type="submit" className="btn-primary w-full" disabled={saving}>{t('submit')}</button>
        </form>
      </div>
    </div>
  );
}
