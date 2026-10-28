import { useEffect, useState } from 'react';
import { Landmark, FileWarning, BarChart3, TrendingDown, FlaskConical, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type GovtScheme, type ScamReport } from '@/lib/supabase';
import { DEMO_SCHEMES, DEMO_SCAM_REPORTS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, statusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function GovOfficialDashboard() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState<GovtScheme[]>([]);
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [schemeCount, setSchemeCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [beneficiaryCount, setBeneficiaryCount] = useState(0);

  useEffect(() => {
    if (isDemoMode) {
      setSchemes(DEMO_SCHEMES as unknown as GovtScheme[]);
      setReports(DEMO_SCAM_REPORTS as unknown as ScamReport[]);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: s }, { data: r }, { count: sc }, { count: rc }, { data: progSum }] = await Promise.all([
        supabase.from('govt_schemes').select('*').order('last_updated', { ascending: false }).limit(5),
        supabase.from('scam_reports').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('govt_schemes').select('*', { count: 'exact', head: true }),
        supabase.from('scam_reports').select('*', { count: 'exact', head: true }),
        supabase.from('ngo_programs').select('beneficiaries_reached'),
      ]);
      setSchemes((s ?? []) as GovtScheme[]);
      setReports((r ?? []) as ScamReport[]);
      setSchemeCount(sc ?? 0);
      setReportCount(rc ?? 0);
      const progData = (progSum ?? []) as { beneficiaries_reached: number }[];
      setBeneficiaryCount(progData.reduce((sum, p) => sum + (p.beneficiaries_reached ?? 0), 0));
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
        <p className="mt-1 text-sm text-gray-500">{t('govOfficialDashboardSubtitle2')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('schemes')} value={schemeCount} icon={<Landmark size={22} />} accent="primary" to="/app/schemes" />
        <StatCard label={t('scamReports')} value={reportCount} icon={<FileWarning size={22} />} accent="error" to="/app/scam-reports" />
        <StatCard label={t('sdg1Indicators')} value="5" icon={<BarChart3 size={22} />} accent="success" trend={t('trackedMetrics')} to="/app/reports" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t('schemeDirectory')}</h2>
          {schemes.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {schemes.map((s) => (
                <div key={s.id} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.department}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">{t('schemeRelatedScams')}</h2>
          {reports.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.category}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(r.created_at, lang)}</p>
                  </div>
                  {statusBadge(r.status)}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-3">
          <TrendingDown className="text-success-500" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('govAccessNote')}</p>
        </Card>
        <Card className="flex items-center gap-3">
          <Users className="text-primary-500" size={24} />
          <div><p className="text-sm font-medium">{t('beneficiariesEnrolled')}</p><p className="text-xs text-gray-500">{beneficiaryCount > 0 ? `${beneficiaryCount.toLocaleString()} ${t('viaPartnerNgos')}` : t('noDataShort')}</p></div>
        </Card>
      </div>
      <ScamAnalytics variant="gov_official" showCharts={true} />
    </div>
  );
}
