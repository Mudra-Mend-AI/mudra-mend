import { useEffect, useState } from 'react';
import { Database, FileWarning, TrendingUp, AlertTriangle, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { fetchUnifiedAnalytics, type UnifiedAnalytics } from '@/lib/analytics';
import { Card, LoadingState, Badge } from '@/components/ui';

interface ScamAnalyticsProps {
  variant: 'customer' | 'admin' | 'fraud_analyst' | 'bank_officer' | 'investigator' | 'auditor' | 'customer_support' | 'ngo_coordinator' | 'gov_official';
  showCharts?: boolean;
  showSources?: boolean;
  maxItems?: number;
}

export function ScamAnalytics({ variant, showCharts = true, showSources = false, maxItems = 5 }: ScamAnalyticsProps) {
  const { profile, isDemoMode } = useAuth();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<UnifiedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opts = variant === 'customer' ? { userReportsOnly: true } : { allReports: true };
      const data = await fetchUnifiedAnalytics(profile?.id ?? null, isDemoMode, opts);
      if (!cancelled) { setAnalytics(data); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [profile, isDemoMode, variant]);

  if (loading) return <Card><LoadingState label="Loading analytics…" /></Card>;
  if (!analytics) return null;

  const totalRecords = analytics.totalAll;
  const topCategories = analytics.categoryBreakdown.slice(0, maxItems);
  const channelBreakdown = analytics.paymentChannelBreakdown.slice(0, maxItems);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <Database size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dataset Records</p>
            <p className="text-lg font-bold">{analytics.totalDatasetRecords}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="rounded-lg bg-error-50 p-2.5 text-error-600 dark:bg-error-900/30 dark:text-error-400">
            <FileWarning size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">User Scam Reports</p>
            <p className="text-lg font-bold">{analytics.totalUserReports}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="rounded-lg bg-warning-50 p-2.5 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
            <p className="text-lg font-bold">{totalRecords}</p>
          </div>
        </Card>
      </div>

      {showCharts && (
        <div className="grid gap-4 lg:grid-cols-2">
          {topCategories.length > 0 && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle size={16} className="text-error-500" /> Top Scam Categories
              </h3>
              <div className="space-y-2">
                {topCategories.map((cat) => {
                  const maxCount = topCategories[0]?.count ?? 1;
                  const pct = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
                  const color = cat.sourceType === 'dataset' ? 'bg-primary-500' : cat.sourceType === 'user_report' ? 'bg-error-500' : 'bg-secondary-500';
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400 truncate">{cat.category}</span>
                        <span className="font-medium flex items-center gap-1">
                          {cat.count}
                          <Badge variant={cat.sourceType === 'dataset' ? 'info' : cat.sourceType === 'user_report' ? 'error' : 'purple'}>
                            {cat.sourceType === 'dataset' ? 'Dataset' : cat.sourceType === 'user_report' ? 'Report' : 'Demo'}
                          </Badge>
                        </span>
                      </div>
                      <div className="h-4 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                        <div className={`h-full rounded transition-all duration-500 ${color}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {channelBreakdown.length > 0 && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Filter size={16} className="text-secondary-500" /> Payment Channel Distribution
              </h3>
              <div className="space-y-2">
                {channelBreakdown.map((ch) => {
                  const maxCount = channelBreakdown[0]?.count ?? 1;
                  const pct = maxCount > 0 ? (ch.count / maxCount) * 100 : 0;
                  return (
                    <div key={ch.channel}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">{ch.channel.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{ch.count}</span>
                      </div>
                      <div className="h-4 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded bg-secondary-500 transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {showSources && analytics.sourceBreakdown.length > 0 && (
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Database size={16} className="text-primary-500" /> Dataset Source Coverage
          </h3>
          <div className="space-y-2">
            {analytics.sourceBreakdown.map((s) => {
              const maxCount = analytics.sourceBreakdown[0]?.count ?? 1;
              const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
              return (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400 truncate">{s.source}</span>
                    <span className="font-medium">{s.count} records</span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded bg-primary-500 transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
