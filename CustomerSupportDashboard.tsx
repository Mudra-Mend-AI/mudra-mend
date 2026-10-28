import { useEffect, useState } from 'react';
import { MessageSquare, AlertTriangle, Clock, CheckCircle, FlaskConical, Brain } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type SupportTicket } from '@/lib/supabase';
import { DEMO_TICKETS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, statusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function CustomerSupportDashboard() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      setTickets(DEMO_TICKETS as unknown as SupportTicket[]);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(10);
      setTickets((data ?? []) as SupportTicket[]);
      setLoading(false);
    })();
  }, [isDemoMode]);

  if (loading) return <LoadingState />;

  const open = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const escalated = tickets.filter((t) => t.status === 'escalated').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('overview')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('overview')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('customerSupportDashboardSubtitle2')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('openTickets')} value={open} icon={<Clock size={22} />} accent="warning" to="/app/support" />
        <StatCard label={t('resolved')} value={resolved} icon={<CheckCircle size={22} />} accent="success" to="/app/support" />
        <StatCard label={t('escalated')} value={escalated} icon={<AlertTriangle size={22} />} accent="error" to="/app/support" />
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">{t('recentTickets')}</h2>
        {tickets.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
          <div className="space-y-2">
            {tickets.map((tkt) => (
              <div key={tkt.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tkt.subject}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(tkt.created_at, lang)} · {tkt.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-800">{tkt.priority}</span>
                  {statusBadge(tkt.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3">
            <Brain className="flex-shrink-0 text-primary-500" size={24} />
            <div>
              <h3 className="font-semibold">{t('aiAssistedSummaries')}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">AI-generated ticket summaries and suggested responses are available for review. All AI drafts require human approval before sending.</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <MessageSquare className="flex-shrink-0 text-secondary-500" size={24} />
            <div>
              <h3 className="font-semibold">{t('responseTime')}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{isDemoMode ? 'Avg. first response: 12 min · Resolution: 2.5 hrs' : 'No data available yet'}</p>
            </div>
          </div>
        </Card>
      </div>
      <ScamAnalytics variant="customer_support" showCharts={false} />
    </div>
  );
}
