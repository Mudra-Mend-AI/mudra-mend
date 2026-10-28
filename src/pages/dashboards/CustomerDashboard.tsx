import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Banknote, ArrowLeftRight, AlertTriangle, ShieldCheck, TrendingUp, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type BankAccount, type Transaction, type Alert } from '@/lib/supabase';
import { DEMO_TRANSACTIONS, DEMO_ALERTS, DEMO_BANK_ACCOUNTS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, EmptyState, statusBadge } from '@/components/ui';
import { formatCurrency, formatDate, maskAccountNumberLast4 } from '@/lib/utils';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function CustomerDashboard() {
  const { profile, isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (isDemoMode) {
      setAccounts(DEMO_BANK_ACCOUNTS as unknown as BankAccount[]);
      setTransactions(DEMO_TRANSACTIONS as unknown as Transaction[]);
      setAlerts(DEMO_ALERTS.filter((a) => !a.is_read) as unknown as Alert[]);
      setLoading(false);
      return;
    }
    (async () => {
      const [acctsRes, txnsRes, altsRes] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('user_id', profile.id).order('linked_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('sender_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('alerts').select('*').eq('user_id', profile.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
      ]);
      if (acctsRes.error) console.error('Dashboard bank_accounts error:', acctsRes.error.message);
      if (txnsRes.error) console.error('Dashboard transactions error:', txnsRes.error.message);
      if (altsRes.error) console.error('Dashboard alerts error:', altsRes.error.message);
      setAccounts((acctsRes.data ?? []) as BankAccount[]);
      setTransactions((txnsRes.data ?? []) as Transaction[]);
      setAlerts((altsRes.data ?? []) as Alert[]);
      setLoading(false);
    })();
  }, [profile, isDemoMode]);

  if (loading) return <LoadingState />;
  if (!profile) return null;

  const totalBalance = accounts.length * 12500;

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('overview')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('welcomeUser')}, {profile.full_name}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('customerDashboardSubtitle')}</p>
        <StatCard label={t('linkedAccounts')} value={accounts.length} icon={<Banknote size={22} />} accent="success" to="/app/bank-accounts" />
        <StatCard label={t('recentTransactions')} value={transactions.length} icon={<ArrowLeftRight size={22} />} accent="secondary" to="/app/transactions" />
        <StatCard label={t('alerts')} value={alerts.length} icon={<AlertTriangle size={22} />} accent="warning" to="/app/alerts" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{t('recentTransactions')}</h2>
            <Link to="/app/transactions" className="text-sm font-medium text-primary-600 hover:text-primary-700">{t('viewAll')}</Link>
          </div>
          {transactions.length === 0 ? (
            <EmptyState title={t('noData')} subtitle={t('makeFirstPayment')} />
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{(tx.recipient_ref as { name?: string }).name ?? 'Recipient'}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.created_at, lang)} · {tx.is_simulated && <span className="text-accent-600">{t('simulated')}</span>}</p>
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

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{t('linkedAccounts')}</h2>
            <Link to="/app/bank-accounts" className="text-sm font-medium text-primary-600 hover:text-primary-700">{t('viewAll')}</Link>
          </div>
          {accounts.length === 0 ? (
            <EmptyState title={t('noData')} subtitle={t('linkBankAccount')} />
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium">{a.bank_name}</p>
                    <p className="text-xs text-gray-500">{maskAccountNumberLast4(a.account_number_last4)} · {a.account_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.is_preferred && <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{t('preferred')}</span>}
                    {statusBadge(a.verification_status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-white p-3 text-primary-600 shadow-sm dark:bg-gray-800">
            <ShieldCheck size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{t('safetyAssessment')}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('safetyCheckDesc')}</p>
            <Link to="/app/payments" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
              <TrendingUp size={16} /> {t('payAnyone')}
            </Link>
          </div>
        </div>
      </Card>
      <ScamAnalytics variant="customer" showCharts={true} />
    </div>
  );
}
