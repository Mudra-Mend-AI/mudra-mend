import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, TrendingUp, Clock, AlertTriangle, Activity, BarChart3, FlaskConical, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type Transaction, type FraudAssessment, type ScamReport } from '@/lib/supabase';
import { Card, Badge, LoadingState, EmptyState, StatCard } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface DetectedPattern {
  id: string;
  patternName: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedCount: number;
  relatedTransactions: Transaction[];
  detectionMethod: string;
  recommendation: string;
  detectedAt: string;
}

export default function FraudPatternExplorer() {
  const { profile, isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selected, setSelected] = useState<DetectedPattern | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode || !profile) {
      setPatterns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [txnsRes, assessRes, scamRes] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('fraud_assessments').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('scam_reports').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      const txns = (txnsRes.data ?? []) as Transaction[];
      const assessments = (assessRes.data ?? []) as FraudAssessment[];
      const scamReports = (scamRes.data ?? []) as ScamReport[];
      const detected: DetectedPattern[] = [];

      // Pattern 1: Rapid payment succession
      const now = Date.now();
      const twoMinAgo = new Date(now - 2 * 60 * 1000).toISOString();
      const rapidTxns = txns.filter((tx) => tx.created_at >= twoMinAgo);
      if (rapidTxns.length >= 3) {
        detected.push({
          id: 'rapid-succession',
          patternName: 'Rapid Payment Succession',
          description: `${rapidTxns.length} payments within 2 minutes — burst pattern may indicate automated fraud or card testing.`,
          severity: 'high',
          detectedCount: rapidTxns.length,
          relatedTransactions: rapidTxns,
          detectionMethod: 'Velocity analysis — 3+ transactions in 2-minute window',
          recommendation: 'Review the transactions and verify with the account holder. Consider temporary velocity limits.',
          detectedAt: new Date().toISOString(),
        });
      }

      // Pattern 2: High-amount first transactions
      const firstHighTxns = txns.filter((tx) => {
        const isHigh = tx.amount >= 50000;
        const txTime = new Date(tx.created_at).getTime();
        const userTxns = txns.filter((t) => t.sender_id === tx.sender_id && new Date(t.created_at).getTime() < txTime);
        return isHigh && userTxns.length === 0;
      });
      if (firstHighTxns.length > 0) {
        detected.push({
          id: 'first-high-amount',
          patternName: 'High-Amount First Transaction',
          description: `${firstHighTxns.length} high-value transactions that are the first-ever for their senders — possible account takeover.`,
          severity: 'high',
          detectedCount: firstHighTxns.length,
          relatedTransactions: firstHighTxns,
          detectionMethod: 'First transaction + high amount (>=Rs 50,000) compound rule',
          recommendation: 'Contact the account holder to verify. Flag for investigation if unreachable.',
          detectedAt: new Date().toISOString(),
        });
      }

      // Pattern 3: Repeated failed transactions
      const failedTxns = txns.filter((tx) => tx.status === 'failed');
      if (failedTxns.length >= 3) {
        const byRecipient = new Map<string, Transaction[]>();
        for (const tx of failedTxns) {
          const name = (tx.recipient_ref as { name?: string })?.name ?? 'unknown';
          const key = `${tx.sender_id}-${name}`;
          if (!byRecipient.has(key)) byRecipient.set(key, []);
          byRecipient.get(key)!.push(tx);
        }
        for (const [key, group] of byRecipient) {
          if (group.length >= 3) {
            detected.push({
              id: 'repeated-failures-' + key.slice(0, 20),
              patternName: 'Repeated Failed Transactions',
              description: `${group.length} failed payments to the same recipient — may indicate card testing or account compromise attempt.`,
              severity: 'medium',
              detectedCount: group.length,
              relatedTransactions: group,
              detectionMethod: '3+ failed transactions to same recipient',
              recommendation: 'Review the recipient and transaction attempts. Consider blocking if pattern persists.',
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Pattern 4: High-risk assessments cluster
      const highRiskAssess = assessments.filter((a) => a.risk_level === 'high' || a.risk_level === 'blocked');
      if (highRiskAssess.length >= 2) {
        detected.push({
          id: 'high-risk-cluster',
          patternName: 'High-Risk Assessment Cluster',
          description: `${highRiskAssess.length} high/blocked risk assessments detected — elevated fraud activity in recent transactions.`,
          severity: 'high',
          detectedCount: highRiskAssess.length,
          relatedTransactions: [],
          detectionMethod: '2+ high/blocked risk assessments in recent history',
          recommendation: 'Review all high-risk transactions. Investigate common recipients or patterns.',
          detectedAt: new Date().toISOString(),
        });
      }

      // Pattern 5: Repeated scam report categories
      if (scamReports.length >= 2) {
        const byCategory = new Map<string, ScamReport[]>();
        for (const r of scamReports) {
          if (!byCategory.has(r.category)) byCategory.set(r.category, []);
          byCategory.get(r.category)!.push(r);
        }
        for (const [cat, group] of byCategory) {
          if (group.length >= 2) {
            detected.push({
              id: 'scam-category-' + cat.slice(0, 20),
              patternName: `Repeated Scam Reports: ${cat}`,
              description: `${group.length} scam reports filed in the "${cat}" category — trending fraud type in recent activity.`,
              severity: 'medium',
              detectedCount: group.length,
              relatedTransactions: [],
              detectionMethod: '2+ scam reports in same category',
              recommendation: 'Monitor this fraud type. Consider targeted awareness campaigns for affected users.',
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Pattern 6: Unusual amount pattern
      const allAmounts = txns.map((tx) => tx.amount).filter((a) => a > 0);
      if (allAmounts.length > 5) {
        const avg = allAmounts.reduce((s, a) => s + a, 0) / allAmounts.length;
        const outliers = txns.filter((tx) => tx.amount > avg * 5 && tx.amount > 10000);
        if (outliers.length > 0) {
          detected.push({
            id: 'unusual-amount',
            patternName: 'Unusual Transaction Amounts',
            description: `${outliers.length} transactions significantly above average (avg: ${formatCurrency(avg)}) — amounts 5x the average may indicate fraud.`,
            severity: 'medium',
            detectedCount: outliers.length,
            relatedTransactions: outliers,
            detectionMethod: 'Statistical outlier detection — amounts 5x above average',
            recommendation: 'Review high-amount transactions for legitimacy. Verify with account holder if needed.',
            detectedAt: new Date().toISOString(),
          });
        }
      }

      setPatterns(detected);
    } catch {
      setPatterns([]);
    }
    setLoading(false);
  }, [profile, isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const filtered = patterns.filter((p) => severityFilter === 'all' || p.severity === severityFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — Pattern detection requires live transaction data.
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Fraud Pattern Explorer</h1>
        <p className="mt-1 text-sm text-gray-500">Detect and analyze patterns in transaction and fraud data</p>
      </div>

      <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
        Patterns are detected from real transaction, assessment, and scam report data. A detected pattern is not proof of fraud — it indicates activity worth reviewing.
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Patterns Detected" value={patterns.length} icon={<Activity size={22} />} accent="primary" />
        <StatCard label="High Severity" value={patterns.filter((p) => p.severity === 'high').length} icon={<AlertTriangle size={22} />} accent="error" />
        <StatCard label="Medium Severity" value={patterns.filter((p) => p.severity === 'medium').length} icon={<TrendingUp size={22} />} accent="warning" />
      </div>

      <div className="flex items-center gap-2">
        <Filter size={18} className="text-gray-400" />
        <select className="input w-auto" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">All Severity</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<BarChart3 size={40} />} title="No patterns detected" subtitle="No suspicious patterns found in current data. This may indicate low activity or that thresholds have not been reached." /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setSelected(p)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={p.severity === 'high' ? 'error' : p.severity === 'medium' ? 'warning' : 'info'}>{p.severity}</Badge>
                    <Badge variant="neutral">{p.detectedCount} detected</Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{p.patternName}</h3>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{p.description}</p>
                  <p className="mt-2 text-xs text-gray-400">Method: {p.detectionMethod}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <PatternDetailModal pattern={selected} onClose={() => setSelected(null)} lang={lang} />}
    </div>
  );
}

function PatternDetailModal({ pattern, onClose, lang }: { pattern: DetectedPattern; onClose: () => void; lang: 'en' | 'hi' | 'mr' }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={pattern.severity === 'high' ? 'error' : pattern.severity === 'medium' ? 'warning' : 'info'}>{pattern.severity}</Badge>
              <Badge variant="neutral">{pattern.detectedCount} detected</Badge>
            </div>
            <h2 className="mt-2 text-lg font-bold">{pattern.patternName}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-gray-400">✕</button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{pattern.description}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detection Method</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{pattern.detectionMethod}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recommended Action</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{pattern.recommendation}</p>
          </div>

          {pattern.relatedTransactions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Related Transactions ({pattern.relatedTransactions.length})</h3>
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-3 py-2 font-medium">Recipient</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pattern.relatedTransactions.slice(0, 10).map((tx) => (
                      <tr key={tx.id} className="border-t border-gray-100 dark:border-gray-800/50">
                        <td className="px-3 py-2">{(tx.recipient_ref as { name?: string })?.name ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(tx.amount)}</td>
                        <td className="px-3 py-2 text-gray-500">{formatDateTime(tx.created_at, lang)}</td>
                        <td className="px-3 py-2 capitalize">{tx.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
            <Clock size={12} /> Detected: {formatDateTime(pattern.detectedAt, lang)}
          </div>
        </div>
      </div>
    </div>
  );
}
