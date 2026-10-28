import { useEffect, useState } from 'react';
import { FileText, FolderKanban, Brain, BarChart3, ShieldCheck, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase } from '@/lib/supabase';
import { DEMO_AUDIT_LOGS, DEMO_AI_VERSIONS, DEMO_CASES } from '@/lib/demoData';
import { Card, StatCard, LoadingState } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { ScamAnalytics } from '@/components/ScamAnalytics';

export default function AuditorDashboard() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [auditCount, setAuditCount] = useState(0);
  const [caseCount, setCaseCount] = useState(0);
  const [aiVersions, setAiVersions] = useState<{ version: string; is_active: boolean; created_at: string }[]>([]);
  const [recentAudits, setRecentAudits] = useState<{ id: string; action: string; actor_id: string | null; created_at: string }[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      setAuditCount(DEMO_AUDIT_LOGS.length);
      setCaseCount(DEMO_CASES.length);
      setAiVersions(DEMO_AI_VERSIONS);
      setRecentAudits(DEMO_AUDIT_LOGS);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ count: ac }, { count: cc }, { data: ai }, { data: audits }] = await Promise.all([
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
        supabase.from('cases').select('*', { count: 'exact', head: true }),
        supabase.from('ai_rule_versions').select('version,is_active,created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('audit_logs').select('id,action,actor_id,created_at').order('created_at', { ascending: false }).limit(8),
      ]);
      setAuditCount(ac ?? 0);
      setCaseCount(cc ?? 0);
      setAiVersions((ai ?? []) as { version: string; is_active: boolean; created_at: string }[]);
      setRecentAudits((audits ?? []) as { id: string; action: string; actor_id: string | null; created_at: string }[]);
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
        <p className="mt-1 text-sm text-gray-500">{t('auditorDashboardSubtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('auditLogs')} value={auditCount} icon={<FileText size={22} />} accent="primary" to="/app/audit-logs" />
        <StatCard label={t('cases')} value={caseCount} icon={<FolderKanban size={22} />} accent="secondary" to="/app/cases" />
        <StatCard label={t('aiVersions')} value={aiVersions.length} icon={<Brain size={22} />} accent="warning" to="/app/ai-monitoring" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t('recentAuditEntries')}</h2>
          {recentAudits.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {recentAudits.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-gray-500">Actor: {a.actor_id ?? 'system'}</p>
                  </div>
                  <p className="text-xs text-gray-500">{formatDateTime(a.created_at, lang)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">{t('aiVersions')}</h2>
          {aiVersions.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
            <div className="space-y-2">
              {aiVersions.map((v) => (
                <div key={v.version} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium">{v.version}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(v.created_at, lang)}</p>
                  </div>
                  {v.is_active ? <span className="badge bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300">{t('activeBadge')}</span> : <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-800">{t('inactiveBadge')}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-3">
          <ShieldCheck className="text-success-500" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('auditorAccessNote')}</p>
        </Card>
        <Card className="flex items-center gap-3">
          <BarChart3 className="text-primary-500" size={24} />
          <div><p className="text-sm font-medium">{t('complianceScore')}</p><p className="text-xs text-gray-500">{isDemoMode ? `98.5% — ${t('noCriticalFindings')}` : t('awaitingData')}</p></div>
        </Card>
      </div>
      <ScamAnalytics variant="auditor" showCharts={false} showSources={true} />
    </div>
  );
}
