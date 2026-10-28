import { useEffect, useState, useCallback } from 'react';
import { Brain, Activity, CheckCircle, AlertCircle, Database, Shield, FlaskConical } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DEMO_AI_VERSIONS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

interface RuleVersion {
  id: string;
  version: string;
  type: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const DEMO_VERSIONS: RuleVersion[] = [
  { id: 'rv1', version: 'rules-v2', type: 'deterministic', is_active: true, notes: '14 fraud signals with weighted scoring, IST time detection, scam DB matching', created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 'rv2', version: 'rules-v1', type: 'deterministic', is_active: false, notes: 'Initial rule set with 6 basic signals', created_at: new Date(Date.now() - 7776000000).toISOString() },
];

export default function AIMonitoring() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<RuleVersion[]>([]);
  const [assessmentCount, setAssessmentCount] = useState(0);

  const load = useCallback(async () => {
    if (isDemoMode) {
      setVersions(DEMO_VERSIONS);
      setAssessmentCount(24);
      setLoading(false);
      return;
    }
    const [{ data: v }, { count: a }] = await Promise.all([
      supabase.from('ai_rule_versions').select('*').order('created_at', { ascending: false }),
      supabase.from('fraud_assessments').select('*', { count: 'exact', head: true }),
    ]);
    setVersions((v ?? []) as RuleVersion[]);
    setAssessmentCount(a ?? 0);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('aiMonitoring')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('aiMonitoring')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('aiMonitoringSubtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('totalAssessments')} value={assessmentCount} icon={<Brain size={22} />} accent="primary" />
        <StatCard label={t('activeVersion')} value={versions.find((v) => v.is_active)?.version ?? '—'} icon={<Activity size={22} />} accent="success" />
        <StatCard label={t('totalVersions')} value={versions.length} icon={<CheckCircle size={22} />} accent="secondary" />
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">{t('versionHistory')}</h2>
        {versions.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">{t('noData')}</p> : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-3 dark:border-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{v.version}</p>
                    <Badge variant="info">{v.type}</Badge>
                    {v.is_active && <Badge variant="success">{t('activeBadge')}</Badge>}
                  </div>
                  {v.notes && <p className="mt-0.5 text-xs text-gray-500">{v.notes}</p>}
                  <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(v.created_at, lang)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-start gap-3">
          <Shield className="text-success-500 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold">{t('securitySeparation')}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('aiSecurityDesc')}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <AlertCircle className="text-warning-500 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold">{t('evaluationNote')}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('aiEvaluationDesc')}</p>
          </div>
        </Card>
      </div>

      <Card className="flex items-center gap-3">
        <Database className="text-primary-500" size={24} />
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('aiRlsDesc')}</p>
      </Card>
    </div>
  );
}
