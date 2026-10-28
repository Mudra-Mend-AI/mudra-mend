import { useEffect, useState } from 'react';
import { HeartHandshake, Users, MapPin, TrendingUp, FlaskConical, Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type NgoProgram } from '@/lib/supabase';
import { DEMO_PROGRAMS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, statusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function NgoCoordinatorDashboard() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<NgoProgram[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      setPrograms(DEMO_PROGRAMS as unknown as NgoProgram[]);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from('ngo_programs').select('*').order('created_at', { ascending: false });
      setPrograms((data ?? []) as NgoProgram[]);
      setLoading(false);
    })();
  }, [isDemoMode]);

  if (loading) return <LoadingState />;

  const active = programs.filter((p) => p.status === 'active').length;
  const totalBeneficiaries = programs.reduce((s, p) => s + p.beneficiaries_reached, 0);
  const totalEvents = programs.reduce((s, p) => s + p.outreach_events_count, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('overview')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('overview')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('ngoCoordinatorDashboardSubtitle2')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('activePrograms')} value={active} icon={<HeartHandshake size={22} />} accent="secondary" to="/app/ngo-outreach" />
        <StatCard label={t('beneficiaries')} value={totalBeneficiaries} icon={<Users size={22} />} accent="primary" to="/app/ngo-outreach" />
        <StatCard label={t('events')} value={totalEvents} icon={<MapPin size={22} />} accent="success" to="/app/ngo-outreach" />
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">{t('ngoOutreach')}</h2>
        {programs.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
          <div className="space-y-2">
            {programs.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.region ?? '—'} · {formatDateTime(p.created_at, lang)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{p.beneficiaries_reached} {t('reached')}</span>
                  {statusBadge(p.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-3">
          <TrendingUp className="text-secondary-500" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('ngoInsightsNote')}</p>
        </Card>
        <Card className="flex items-center gap-3">
          <Target className="text-success-500" size={24} />
          <div><p className="text-sm font-medium">{t('sdg1Contribution')}</p><p className="text-xs text-gray-500">{isDemoMode ? `${totalBeneficiaries} ${t('reached')} · ${totalEvents} ${t('events')}` : t('noDataShort')}</p></div>
        </Card>
      </div>
      <ScamAnalytics variant="ngo_coordinator" showCharts={true} />
    </div>
  );
}
