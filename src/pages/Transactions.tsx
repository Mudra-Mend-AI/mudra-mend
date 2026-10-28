import { useState, useCallback, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, FlaskConical, X, ShieldCheck, AlertTriangle, Bot } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type Transaction } from '@/lib/supabase';
import { DEMO_TRANSACTIONS } from '@/lib/demoData';
import { Card, LoadingState, EmptyState, statusBadge, Badge } from '@/components/ui';
import { formatCurrency, formatDateTime, downloadCsv } from '@/lib/utils';

function riskLevelFromScore(score: number | null): 'low' | 'medium' | 'high' | 'blocked' | 'unknown' {
  if (score === null) return 'unknown';
  if (score >= 80) return 'blocked';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function riskBadge(score: number | null) {
  const level = riskLevelFromScore(score);
  if (level === 'unknown') return <Badge variant="neutral">—</Badge>;
  const map: Record<string, { variant: 'success' | 'warning' | 'error'; label: string }> = {
    low: { variant: 'success', label: 'Low' },
    medium: { variant: 'warning', label: 'Medium' },
    high: { variant: 'error', label: 'High' },
    blocked: { variant: 'error', label: 'Blocked' },
  };
  const cfg = map[level];
  return <Badge variant={cfg.variant}>{cfg.label} · {score}</Badge>;
}

export default function Transactions() {
  const { profile, isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [riskDetailTx, setRiskDetailTx] = useState<Transaction | null>(null);
  const [error, setError] = useState('');
  const [assessmentMap, setAssessmentMap] = useState<Record<string, { rules: { rule: string; detail: string; triggered: boolean }[]; recommendations: string[]; explanation: string }>>({});
  const pageSize = 10;

  const load = useCallback(async () => {
    if (!profile && !isDemoMode) return;
    if (isDemoMode) {
      let demo = [...DEMO_TRANSACTIONS] as unknown as Transaction[];
      if (statusFilter !== 'all') demo = demo.filter((tx) => tx.status === statusFilter);
      if (fromDate) demo = demo.filter((tx) => tx.created_at >= fromDate);
      if (toDate) demo = demo.filter((tx) => tx.created_at <= toDate + 'T23:59:59');
      setTransactions(demo);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    let q = supabase.from('transactions').select('*').or(`sender_id.eq.${profile!.id},receiver_id.eq.${profile!.id}`).order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (fromDate) q = q.gte('created_at', fromDate);
    if (toDate) q = q.lte('created_at', toDate + 'T23:59:59');
    if (search) q = q.ilike('reference_id', `%${search}%`);
    q = q.range(page * pageSize, (page + 1) * pageSize - 1);
    const { data, error: queryError } = await q;
    if (queryError) {
      setError(queryError.message);
      setTransactions([]);
    } else {
      const txns = (data ?? []) as Transaction[];
      setTransactions(txns);
      // Fetch fraud assessments for transactions that have assessment_id
      const assessmentIds = txns.map((tx) => tx.assessment_id).filter(Boolean) as string[];
      if (assessmentIds.length > 0) {
        const { data: assessments } = await supabase
          .from('fraud_assessments')
          .select('id, rules_evaluated, recommendations, explanation')
          .in('id', assessmentIds);
        if (assessments) {
          const map: Record<string, { rules: { rule: string; detail: string; triggered: boolean }[]; recommendations: string[]; explanation: string }> = {};
          for (const a of assessments) {
            map[a.id] = {
              rules: (a.rules_evaluated as { rule: string; detail: string; triggered: boolean }[]) ?? [],
              recommendations: (a.recommendations as string[]) ?? [],
              explanation: a.explanation ?? '',
            };
          }
          setAssessmentMap(map);
        }
      }
    }
    setLoading(false);
  }, [profile, statusFilter, page, isDemoMode, fromDate, toDate, search]);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter((tx) => {
    const name = (tx.recipient_ref as { name?: string }).name ?? '';
    return !search || name.toLowerCase().includes(search.toLowerCase()) || tx.reference_id.toLowerCase().includes(search.toLowerCase());
  });

  const handleExport = () => {
    downloadCsv('transactions.csv', filtered.map((tx) => ({
      reference: tx.reference_id, recipient: (tx.recipient_ref as { name?: string }).name ?? '', amount: tx.amount, status: tx.status, mode: tx.payment_mode, date: tx.created_at, simulated: tx.is_simulated, risk_score: tx.risk_score ?? '', ai_action: tx.ai_recommended_action ?? '',
    })));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('transactions')}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('transactions')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('transactionsSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw size={16} /></button>
          <button className="btn-secondary" onClick={handleExport}><Download size={16} /> CSV</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input pl-10" placeholder={t('search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="all">{t('all')}</option>
          <option value="success">{t('success')}</option>
          <option value="pending">{t('pending')}</option>
          <option value="failed">{t('failed')}</option>
          <option value="cancelled">{t('cancelled')}</option>
          <option value="reversed">{t('reversed')}</option>
        </select>
        <input type="date" className="input w-auto" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} placeholder={t('fromDate')} />
        <input type="date" className="input w-auto" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} placeholder={t('toDate')} />
        {(fromDate || toDate) && (
          <button className="btn-ghost text-sm" onClick={() => { setFromDate(''); setToDate(''); setPage(0); }}><X size={14} /></button>
        )}
      </div>

      <Card>
        {loading ? <LoadingState /> : error ? (
          <div className="px-4 py-8 text-center">
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">
              {error}
            </div>
            <button className="btn-secondary mt-4" onClick={load}><RefreshCw size={16} /> Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Filter size={40} />} title={t('noData')} subtitle={t('noTransactionsMatch')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-gray-800">
                  <th className="py-2 pr-4 font-medium">{t('recipient')}</th>
                  <th className="py-2 pr-4 font-medium">{t('amount')}</th>
                  <th className="py-2 pr-4 font-medium">{t('date')}</th>
                  <th className="py-2 pr-4 font-medium">{t('reference')}</th>
                  <th className="py-2 pr-4 font-medium">{t('status')}</th>
                  <th className="py-2 pr-4 font-medium">Risk Score</th>
                  <th className="py-2 pr-4 font-medium">AI Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="cursor-pointer border-b border-gray-50 table-row-hover dark:border-gray-800/50" onClick={() => setSelected(tx)}>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{(tx.recipient_ref as { name?: string }).name ?? '—'}</p>
                      {tx.is_simulated && <Badge variant="warning">{t('simulated')}</Badge>}
                    </td>
                    <td className="py-3 pr-4 font-semibold">{formatCurrency(tx.amount)}</td>
                    <td className="py-3 pr-4 text-gray-500">{formatDateTime(tx.created_at, lang)}</td>
                    <td className="py-3 pr-4 text-xs text-gray-400">{tx.reference_id}</td>
                    <td className="py-3 pr-4">{statusBadge(tx.status)}</td>
                    <td className="py-3 pr-4">
                      <button
                        className="hover:underline"
                        onClick={(e) => { e.stopPropagation(); setRiskDetailTx(tx); }}
                      >
                        {riskBadge(tx.risk_score)}
                      </button>
                    </td>
                    <td className="py-3 pr-4 max-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <Bot size={14} className="mt-0.5 flex-shrink-0 text-primary-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{tx.ai_recommended_action ?? '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isDemoMode && (
          <div className="mt-4 flex items-center justify-between">
            <button className="btn-secondary text-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('back')}</button>
            <span className="text-sm text-gray-500">{page + 1}</span>
            <button className="btn-secondary text-sm" disabled={transactions.length < pageSize} onClick={() => setPage(page + 1)}>{t('next')}</button>
          </div>
        )}
      </Card>

      {selected && <TransactionDetail tx={selected} onClose={() => setSelected(null)} lang={lang} />}
      {riskDetailTx && (
        <RiskScorePopup
          tx={riskDetailTx}
          assessment={riskDetailTx.assessment_id ? assessmentMap[riskDetailTx.assessment_id] : null}
          onClose={() => setRiskDetailTx(null)}
        />
      )}
    </div>
  );
}

function RiskScorePopup({ tx, assessment, onClose }: {
  tx: Transaction;
  assessment: { rules: { rule: string; detail: string; triggered: boolean }[]; recommendations: string[]; explanation: string } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const level = riskLevelFromScore(tx.risk_score);
  const levelLabel = level === 'unknown' ? 'Not assessed' : level.charAt(0).toUpperCase() + level.slice(1);
  const colors: Record<string, { bg: string; text: string; bar: string }> = {
    low: { bg: 'bg-success-50 dark:bg-success-900/20', text: 'text-success-700 dark:text-success-300', bar: 'bg-success-500' },
    medium: { bg: 'bg-warning-50 dark:bg-warning-900/20', text: 'text-warning-700 dark:text-warning-300', bar: 'bg-warning-500' },
    high: { bg: 'bg-error-50 dark:bg-error-900/20', text: 'text-error-700 dark:text-error-300', bar: 'bg-error-500' },
    blocked: { bg: 'bg-error-100 dark:bg-error-900/40', text: 'text-error-800 dark:text-error-200', bar: 'bg-error-700' },
    unknown: { bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400', bar: 'bg-gray-400' },
  };
  const c = colors[level];
  const triggeredRules = assessment?.rules.filter((r) => r.triggered) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck size={20} /> Risk Assessment</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <div className={`mt-4 rounded-lg p-4 ${c.bg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${c.text}`}>Risk Level: {levelLabel}</span>
            <span className={`text-2xl font-bold ${c.text}`}>{tx.risk_score ?? '—'}/100</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${tx.risk_score ?? 0}%` }} />
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">AI Recommended Action</h3>
          <div className="flex items-start gap-2 rounded-lg bg-primary-50 px-3 py-2.5 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
            <Bot size={16} className="mt-0.5 flex-shrink-0" />
            <span>{tx.ai_recommended_action ?? 'No recommendation available'}</span>
          </div>
        </div>

        {assessment && assessment.explanation && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Assessment Explanation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{assessment.explanation}</p>
          </div>
        )}

        {triggeredRules.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Reasons for Assessment</h3>
            <div className="space-y-1.5">
              {triggeredRules.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-warning-500" />
                  <span className="text-gray-700 dark:text-gray-300">{r.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {assessment && assessment.recommendations.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Recommendations</h3>
            <ul className="space-y-1.5">
              {assessment.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {level === 'unknown' && (
          <p className="mt-4 text-xs text-gray-400">This transaction was created before risk scoring was available.</p>
        )}

        <div className="mt-4 flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="text-xs text-gray-400">
            {t('reference')}: {tx.reference_id}
          </div>
          <div className="text-xs text-gray-400">
            {formatCurrency(tx.amount)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionDetail({ tx, onClose, lang }: { tx: Transaction; onClose: () => void; lang: 'en' | 'hi' | 'mr' }) {
  const { t } = useI18n();

  const handleDownloadReceipt = () => {
    const recipientName = (tx.recipient_ref as { name?: string }).name ?? '—';
    const rows = [
      { field: t('reference'), value: tx.reference_id },
      { field: t('recipient'), value: recipientName },
      { field: t('amount'), value: formatCurrency(tx.amount) },
      { field: t('paymentMode'), value: tx.payment_mode },
      { field: t('status'), value: tx.status },
      { field: t('date'), value: formatDateTime(tx.created_at, lang) },
      { field: 'Risk Score', value: tx.risk_score != null ? `${tx.risk_score}/100` : 'Not assessed' },
      { field: 'AI Action', value: tx.ai_recommended_action ?? '—' },
    ];
    downloadCsv(`receipt-${tx.reference_id}.csv`, rows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('transactionDetails')}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">{t('recipient')}</span><span className="font-medium">{(tx.recipient_ref as { name?: string }).name ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t('amount')}</span><span className="font-bold text-lg">{formatCurrency(tx.amount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t('reference')}</span><span className="font-mono text-xs">{tx.reference_id}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t('paymentMode')}</span><span className="capitalize">{tx.payment_mode}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t('status')}</span>{statusBadge(tx.status)}</div>
          <div className="flex justify-between"><span className="text-gray-500">{t('date')}</span><span className="text-gray-500">{formatDateTime(tx.created_at, lang)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Risk Score</span>{riskBadge(tx.risk_score)}</div>
          {tx.ai_recommended_action && (
            <div className="flex justify-between gap-4"><span className="text-gray-500 flex-shrink-0">AI Action</span><span className="text-xs text-right">{tx.ai_recommended_action}</span></div>
          )}
          {tx.is_simulated && <div className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:bg-warning-900/20 dark:text-warning-300"><Badge variant="warning">{t('simulated')}</Badge> — {t('simulatedPaymentWarning')}</div>}
        </div>
        <button className="btn-secondary mt-4 w-full" onClick={handleDownloadReceipt}><Download size={16} /> {t('downloadReceipt')}</button>
      </div>
    </div>
  );
}
