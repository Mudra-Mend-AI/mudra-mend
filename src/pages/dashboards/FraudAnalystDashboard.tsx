import { useEffect, useState } from 'react';
import { AlertTriangle, FolderKanban, FileWarning, Brain, Target, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type Alert, type Case, type ScamReport } from '@/lib/supabase';
import { DEMO_ALERTS, DEMO_CASES, DEMO_SCAM_REPORTS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, statusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function FraudAnalystDashboard() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [reports, setReports] = useState<ScamReport[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      setAlerts(DEMO_ALERTS as unknown as Alert[]);
      setCases(DEMO_CASES as unknown as Case[]);
      setReports(DEMO_SCAM_REPORTS as unknown as ScamReport[]);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: a }, { data: c }, { data: r }] = await Promise.all([
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('cases').select('*').neq('status', 'closed').order('created_at', { ascending: false }).limit(5),
        supabase.from('scam_reports').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      setAlerts((a ?? []) as Alert[]);
      setCases((c ?? []) as Case[]);
      setReports((r ?? []) as ScamReport[]);
      setLoading(false);
    })();
  }, [isDemoMode]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('overview')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('overview')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('fraudAnalystDashboardSubtitle2')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('alerts')} value={alerts.length} icon={<AlertTriangle size={22} />} accent="error" to="/app/alerts" />
        <StatCard label={t('cases')} value={cases.length} icon={<FolderKanban size={22} />} accent="warning" to="/app/cases" />
        <StatCard label={t('scamReports')} value={reports.length} icon={<FileWarning size={22} />} accent="primary" to="/app/scam-reports" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t('priorityAlerts')}</h2>
          {alerts.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{a.title}</p>
                    <span className="badge bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300">{a.priority}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(a.created_at, lang)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">{t('openCases')}</h2>
          {cases.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {cases.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-gray-500">{formatDateTime(c.created_at, lang)}</p></div>
                  {statusBadge(c.status)}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t('recentScamReports')}</h2>
          {reports.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {reports.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div><p className="text-sm font-medium">{r.category}</p><p className="text-xs text-gray-500">{formatDateTime(r.created_at, lang)}</p></div>
                  {statusBadge(r.status)}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="flex items-start gap-4">
            <Brain className="flex-shrink-0 text-primary-500" size={24} />
            <div>
              <h3 className="font-semibold">{t('aiAnalysisSummary')}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('aiAnalysisDesc')}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <Target size={14} /> {t('rulesActive')} · {isDemoMode ? t('demoModeShort') : t('productionShort')}
              </div>
            </div>
          </div>
        </Card>
      </div>
      <ScamAnalytics variant="fraud_analyst" showCharts={true} />
    </div>
  );
}
