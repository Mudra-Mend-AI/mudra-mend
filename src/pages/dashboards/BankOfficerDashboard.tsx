import { useEffect, useState } from 'react';
import { CreditCard, AlertTriangle, FolderKanban, Building2, TrendingUp, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type Transaction, type Alert, type Case } from '@/lib/supabase';
import { DEMO_TRANSACTIONS, DEMO_ALERTS, DEMO_CASES } from '@/lib/demoData';
import { Card, StatCard, LoadingState, statusBadge } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function BankOfficerDashboard() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      setTransactions(DEMO_TRANSACTIONS as unknown as Transaction[]);
      setAlerts(DEMO_ALERTS as unknown as Alert[]);
      setCases(DEMO_CASES as unknown as Case[]);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: tx }, { data: a }, { data: c }] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('cases').select('*').neq('status', 'closed').order('created_at', { ascending: false }).limit(5),
      ]);
      setTransactions((tx ?? []) as Transaction[]);
      setAlerts((a ?? []) as Alert[]);
      setCases((c ?? []) as Case[]);
      setLoading(false);
    })();
  }, [isDemoMode]);

  if (loading) return <LoadingState />;

  const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('overview')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('overview')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('bankOfficerDashboardSubtitle2')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('transactionVolume')} value={formatCurrency(totalVolume)} icon={<CreditCard size={22} />} accent="primary" trend={`${transactions.length} ${t('transactions')}`} to="/app/transactions" />
        <StatCard label={t('alerts')} value={alerts.length} icon={<AlertTriangle size={22} />} accent="warning" to="/app/alerts" />
        <StatCard label={t('cases')} value={cases.length} icon={<FolderKanban size={22} />} accent="error" to="/app/cases" />
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-primary-500" />
          <h2 className="font-semibold">{t('bankScopeTransactions')}</h2>
        </div>
        {transactions.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium">{(tx.recipient_ref as { name?: string }).name ?? 'Recipient'}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(tx.created_at, lang)} · {tx.reference_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{formatCurrency(tx.amount)}</span>
                  {statusBadge(tx.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t('activeAlerts')}</h2>
          {alerts.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{a.title}</p>
                    <span className="badge bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300">{a.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="flex items-center gap-3">
          <TrendingUp className="text-secondary-500" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('bankAccessScope')}</p>
        </Card>
      </div>
      <ScamAnalytics variant="bank_officer" showCharts={true} />
    </div>
  );
}
