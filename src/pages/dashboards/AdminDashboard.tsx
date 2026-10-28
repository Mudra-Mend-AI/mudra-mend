import { useEffect, useState } from 'react';
import { Users, CheckCircle, AlertTriangle, FolderKanban, Brain, Activity, Shield, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase } from '@/lib/supabase';
import { DEMO_ALERTS, DEMO_CASES, DEMO_PROFESSIONAL_APPS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, statusBadge } from '@/components/ui';
import type { ProfessionalApplication, Alert as AlertType } from '@/lib/supabase';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function AdminDashboard() {
  const { t } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, pendingApps: 0, openCases: 0, activeAlerts: 0 });
  const [recentApps, setRecentApps] = useState<ProfessionalApplication[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertType[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      const pendingApps = DEMO_PROFESSIONAL_APPS.filter((a) => a.status === 'pending');
      const openCases = DEMO_CASES.filter((c) => c.status !== 'closed');
      const activeAlerts = DEMO_ALERTS.filter((a) => !a.is_read);
      setStats({ users: 156, pendingApps: pendingApps.length, openCases: openCases.length, activeAlerts: activeAlerts.length });
      setRecentApps(DEMO_PROFESSIONAL_APPS as unknown as ProfessionalApplication[]);
      setRecentAlerts(DEMO_ALERTS as unknown as AlertType[]);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ count: users }, { count: pending }, { count: cases }, { count: alerts }, { data: apps }, { data: alts }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('professional_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('cases').select('*', { count: 'exact', head: true }).neq('status', 'closed'),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('professional_applications').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      setStats({ users: users ?? 0, pendingApps: pending ?? 0, openCases: cases ?? 0, activeAlerts: alerts ?? 0 });
      setRecentApps((apps ?? []) as ProfessionalApplication[]);
      setRecentAlerts((alts ?? []) as AlertType[]);
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
        <p className="mt-1 text-sm text-gray-500">{t('adminDashboardSubtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('users')} value={stats.users} icon={<Users size={22} />} accent="primary" to="/app/users" />
        <StatCard label={t('approvals')} value={stats.pendingApps} icon={<CheckCircle size={22} />} accent="warning" trend={t('pendingApps')} to="/app/approvals" />
        <StatCard label={t('cases')} value={stats.openCases} icon={<FolderKanban size={22} />} accent="error" trend={t('openCases')} to="/app/cases" />
        <StatCard label={t('alerts')} value={stats.activeAlerts} icon={<AlertTriangle size={22} />} accent="warning" trend={t('unreadAlerts')} to="/app/alerts" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t('recentProfessionalApps')}</h2>
          {recentApps.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {recentApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium">{t(`role${app.requested_role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as 'roleAdmin' | 'roleFraudAnalyst' | 'roleBankOfficer' | 'roleInvestigator' | 'roleAuditor' | 'roleCustomerSupport' | 'roleNgoCoordinator' | 'roleGovOfficial' | 'roleCustomer')}</p>
                    <p className="text-xs text-gray-500">{new Date(app.created_at).toLocaleDateString()}</p>
                  </div>
                  {statusBadge(app.status)}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">{t('recentAlerts')}</h2>
          {recentAlerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{a.title}</p>
                    <span className="badge bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300">{a.priority}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3"><Brain className="text-primary-500" /><div><p className="text-sm font-medium">{t('aiMonitoring')}</p><p className="text-xs text-gray-500">{t('rulesActive')}</p></div></Card>
        <Card className="flex items-center gap-3"><Activity className="text-success-500" /><div><p className="text-sm font-medium">{t('systemHealth')}</p><p className="text-xs text-gray-500">{t('allSystemsOperational')}</p></div></Card>
        <Card className="flex items-center gap-3"><Shield className="text-secondary-500" /><div><p className="text-sm font-medium">{t('rlsEnabled')}</p><p className="text-xs text-gray-500">{t('allTablesProtected')}</p></div></Card>
      </div>
      <ScamAnalytics variant="admin" showCharts={true} showSources={true} />
    </div>
  );
}
