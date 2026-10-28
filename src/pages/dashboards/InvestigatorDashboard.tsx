import { useEffect, useState } from 'react';
import { FolderKanban, FileText, FileWarning, Search, FlaskConical, MapPin, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type Case, type ScamReport } from '@/lib/supabase';
import { DEMO_CASES, DEMO_SCAM_REPORTS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, statusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function InvestigatorDashboard() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [reports, setReports] = useState<ScamReport[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      setCases(DEMO_CASES as unknown as Case[]);
      setReports(DEMO_SCAM_REPORTS as unknown as ScamReport[]);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from('cases').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('scam_reports').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
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
        <p className="mt-1 text-sm text-gray-500">{t('investigatorDashboardSubtitle2')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('cases')} value={cases.length} icon={<FolderKanban size={22} />} accent="primary" to="/app/cases" />
        <StatCard label={t('openCases')} value={cases.filter((c) => c.status !== 'closed').length} icon={<Search size={22} />} accent="warning" to="/app/cases" />
        <StatCard label={t('scamReports')} value={reports.length} icon={<FileWarning size={22} />} accent="error" to="/app/scam-reports" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t('caseQueue')}</h2>
          {cases.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {cases.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(c.created_at, lang)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{c.priority}</span>
                    {statusBadge(c.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">{t('relatedScamReports')}</h2>
          {reports.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{r.category}</p>
                    {statusBadge(r.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{r.suspect_contact ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3"><FileText className="text-primary-500" size={24} /><div><p className="text-sm font-medium">{t('evidenceVault')}</p><p className="text-xs text-gray-500">{isDemoMode ? '12' : '0'} {t('itemsCatalogued')}</p></div></Card>
        <Card className="flex items-center gap-3"><MapPin className="text-secondary-500" size={24} /><div><p className="text-sm font-medium">{t('assignedRegion')}</p><p className="text-xs text-gray-500">{isDemoMode ? 'Maharashtra' : '—'}</p></div></Card>
        <Card className="flex items-center gap-3"><Clock className="text-warning-500" size={24} /><div><p className="text-sm font-medium">{t('avgResolution')}</p><p className="text-xs text-gray-500">{isDemoMode ? '4.2 days' : '—'}</p></div></Card>
      </div>
      <ScamAnalytics variant="investigator" showCharts={false} />
    </div>
  );
}
