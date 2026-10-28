import { useEffect, useState, useCallback } from 'react';
import { Lightbulb, ShieldCheck, BookOpen, AlertTriangle, HeartHandshake, Landmark, TrendingUp, UserPlus, Activity, FileWarning, Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui';

interface DynamicInsight {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export default function Recommendations() {
  const { t } = useI18n();
  const { profile, isDemoMode } = useAuth();
  const [insights, setInsights] = useState<DynamicInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const staticRecs: DynamicInsight[] = [
    { icon: <ShieldCheck size={22} />, title: t('recVerifyRecipients'), desc: t('recVerifyRecipientsDesc') },
    { icon: <AlertTriangle size={22} />, title: t('recUrgencyScams'), desc: t('recUrgencyScamsDesc') },
    { icon: <BookOpen size={22} />, title: t('recNeverShareOtp'), desc: t('recNeverShareOtpDesc') },
    { icon: <Landmark size={22} />, title: t('recCheckSchemeSources'), desc: t('recCheckSchemeSourcesDesc') },
    { icon: <HeartHandshake size={22} />, title: t('recReportSuspicious'), desc: t('recReportSuspiciousDesc') },
    { icon: <Lightbulb size={22} />, title: t('recEnableSafety'), desc: t('recEnableSafetyDesc') },
  ];

  const loadInsights = useCallback(async () => {
    if (isDemoMode || !profile) {
      setInsights([
        { icon: <TrendingUp size={22} />, title: t('highRiskRecipients'), desc: t('highRiskRecipientsDesc') },
        { icon: <UserPlus size={22} />, title: t('newRecipientWarning'), desc: t('newRecipientWarningDesc') },
      ]);
      setLoadingInsights(false);
      return;
    }

    try {
      const [txnsRes, assessmentsRes, scamReportsRes] = await Promise.all([
        supabase.from('transactions').select('id,amount,status,created_at,recipient_ref').eq('sender_id', profile.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('fraud_assessments').select('risk_level,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('scam_reports').select('id,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(10),
      ]);

      const txns = (txnsRes.data ?? []) as { id: string; amount: number; status: string; created_at: string; recipient_ref: Record<string, unknown> }[];
      const assessments = (assessmentsRes.data ?? []) as { risk_level: string; created_at: string }[];
      const scamReports = (scamReportsRes.data ?? []) as { id: string; created_at: string }[];
      const generated: DynamicInsight[] = [];

      const highRiskCount = assessments.filter((a) => a.risk_level === 'high' || a.risk_level === 'blocked').length;
      if (highRiskCount >= 2) {
        generated.push({ icon: <TrendingUp size={22} />, title: t('highRiskRecipients'), desc: t('highRiskRecipientsDesc') });
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentTxns = txns.filter((tx) => new Date(tx.created_at) > thirtyDaysAgo);
      const uniqueRecipients = new Set(recentTxns.map((tx) => JSON.stringify(tx.recipient_ref)));
      if (recentTxns.length >= 3 && uniqueRecipients.size >= recentTxns.length * 0.7) {
        generated.push({ icon: <UserPlus size={22} />, title: t('newRecipientWarning'), desc: t('newRecipientWarningDesc') });
      }

      if (recentTxns.length >= 8) {
        generated.push({ icon: <Activity size={22} />, title: t('frequentPayments'), desc: t('frequentPaymentsDesc') });
      }

      if (scamReports.length >= 1) {
        generated.push({ icon: <FileWarning size={22} />, title: t('scamReportsFiled'), desc: t('scamReportsFiledDesc') });
      }

      setInsights(generated);
    } catch {
      setInsights([]);
    }
    setLoadingInsights(false);
  }, [profile, isDemoMode, t]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t('recommendations')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('recommendationsSubtitle')}</p>
      </div>

      <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
        {t('recommendationsDisclaimer')}
      </div>

      {profile?.role === 'customer' && (
        <Card className="border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-primary-500" />
            <h3 className="font-semibold">{t('dynamicRecsTitle')}</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">{t('dynamicRecsDesc')}</p>
          {loadingInsights ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" /> {t('loading')}
            </div>
          ) : insights.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              {t('noDynamicRecs')}
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-primary-50/50 p-3 dark:bg-primary-900/10">
                  <div className="rounded-lg bg-primary-100 p-2 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">{ins.icon}</div>
                  <div>
                    <h4 className="text-sm font-semibold">{ins.title}</h4>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{ins.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {staticRecs.map((r, i) => (
          <Card key={i} className="hover:shadow-card-hover transition-shadow">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">{r.icon}</div>
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{r.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {profile?.role === 'customer' && (
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
          <h3 className="font-semibold">{t('aiRecommendationCenter')}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('aiRecommendationDesc')}</p>
        </Card>
      )}
    </div>
  );
}
