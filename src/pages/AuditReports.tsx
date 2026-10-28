import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Loader2, Calendar, Filter, ShieldCheck, AlertTriangle, ArrowLeftRight, Users, Activity, FileBarChart, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type Transaction, type Alert, type FraudAssessment, type Case, type AuditLog, type Profile } from '@/lib/supabase';
import { Card, LoadingState, EmptyState, Badge, StatCard, statusBadge } from '@/components/ui';
import { formatCurrency, formatDateTime, formatDate, downloadCsv } from '@/lib/utils';

type ReportTab = 'summary' | 'transactions' | 'alerts' | 'assessments' | 'audit_logs' | 'users';

interface ReportData {
  transactions: Transaction[];
  alerts: Alert[];
  assessments: FraudAssessment[];
  auditLogs: AuditLog[];
  profiles: Profile[];
  cases: Case[];
}

interface SummaryStats {
  totalTransactions: number;
  totalVolume: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  cancelledCount: number;
  totalAlerts: number;
  highPriorityAlerts: number;
  criticalAlerts: number;
  totalAssessments: number;
  highRiskAssessments: number;
  blockedAssessments: number;
  totalAuditLogs: number;
  totalUsers: number;
  totalCases: number;
  openCases: number;
}

export default function AuditReports() {
  const { isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : now;
      const fromIso = from.toISOString();
      const toIso = to.toISOString();

      const [txnResp, alertResp, assessResp, auditResp, profileResp, caseResp] = await Promise.all([
        supabase.from('transactions').select('*').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
        supabase.from('alerts').select('*').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
        supabase.from('fraud_assessments').select('*').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
        supabase.from('audit_logs').select('*').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('cases').select('*').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(200),
      ]);

      if (txnResp.error) throw new Error(`Transactions: ${txnResp.error.message}`);
      if (alertResp.error) throw new Error(`Alerts: ${alertResp.error.message}`);
      if (assessResp.error) throw new Error(`Assessments: ${assessResp.error.message}`);
      if (auditResp.error) throw new Error(`Audit logs: ${auditResp.error.message}`);
      if (profileResp.error) throw new Error(`Profiles: ${profileResp.error.message}`);
      if (caseResp.error) throw new Error(`Cases: ${caseResp.error.message}`);

      const transactions = (txnResp.data ?? []) as Transaction[];
      const alerts = (alertResp.data ?? []) as Alert[];
      const assessments = (assessResp.data ?? []) as FraudAssessment[];
      const auditLogs = (auditResp.data ?? []) as AuditLog[];
      const profiles = (profileResp.data ?? []) as Profile[];
      const cases = (caseResp.data ?? []) as Case[];

      setData({ transactions, alerts, assessments, auditLogs, profiles, cases });

      setStats({
        totalTransactions: transactions.length,
        totalVolume: transactions.reduce((s, tx) => s + (tx.status === 'success' ? tx.amount : 0), 0),
        successfulCount: transactions.filter(tx => tx.status === 'success').length,
        failedCount: transactions.filter(tx => tx.status === 'failed').length,
        pendingCount: transactions.filter(tx => tx.status === 'pending' || tx.status === 'processing').length,
        cancelledCount: transactions.filter(tx => tx.status === 'cancelled').length,
        totalAlerts: alerts.length,
        highPriorityAlerts: alerts.filter(a => a.priority === 'high').length,
        criticalAlerts: alerts.filter(a => a.priority === 'critical').length,
        totalAssessments: assessments.length,
        highRiskAssessments: assessments.filter(a => a.risk_level === 'high').length,
        blockedAssessments: assessments.filter(a => a.risk_level === 'blocked').length,
        totalAuditLogs: auditLogs.length,
        totalUsers: profiles.length,
        totalCases: cases.length,
        openCases: cases.filter(c => c.status === 'open' || c.status === 'under_investigation').length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExportCsv = () => {
    if (!data || !stats) return;
    setExporting(true);
    try {
      const period = `${dateFrom || 'start'}_to_${dateTo || 'now'}`;
      const summaryRows = [{
        report_period: `${dateFrom || 'beginning'} to ${dateTo || 'now'}`,
        generated_at: new Date().toISOString(),
        total_transactions: stats.totalTransactions,
        total_volume_inr: stats.totalVolume,
        successful_transactions: stats.successfulCount,
        failed_transactions: stats.failedCount,
        pending_transactions: stats.pendingCount,
        cancelled_transactions: stats.cancelledCount,
        total_alerts: stats.totalAlerts,
        high_priority_alerts: stats.highPriorityAlerts,
        critical_alerts: stats.criticalAlerts,
        total_fraud_assessments: stats.totalAssessments,
        high_risk_assessments: stats.highRiskAssessments,
        blocked_assessments: stats.blockedAssessments,
        total_audit_log_entries: stats.totalAuditLogs,
        total_users: stats.totalUsers,
        total_cases: stats.totalCases,
        open_cases: stats.openCases,
      }];
      downloadCsv(`audit-summary-${period}.csv`, summaryRows);
    } finally {
      setExporting(false);
    }
  };

  const handleExportTabCsv = () => {
    if (!data) return;
    setExporting(true);
    try {
      const period = `${dateFrom || 'start'}_to_${dateTo || 'now'}`;
      switch (activeTab) {
        case 'transactions': {
          const rows = data.transactions.map(tx => ({
            id: tx.id,
            reference_id: tx.reference_id,
            sender_id: tx.sender_id,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            payment_mode: tx.payment_mode,
            gateway: tx.gateway ?? '',
            is_simulated: tx.is_simulated,
            risk_score: tx.risk_score ?? '',
            purpose: tx.purpose ?? '',
            created_at: tx.created_at,
          }));
          downloadCsv(`audit-transactions-${period}.csv`, rows);
          break;
        }
        case 'alerts': {
          const rows = data.alerts.map(a => ({
            id: a.id,
            user_id: a.user_id,
            category: a.category,
            priority: a.priority,
            title: a.title,
            is_read: a.is_read,
            related_transaction_id: a.related_transaction_id ?? '',
            related_case_id: a.related_case_id ?? '',
            created_at: a.created_at,
          }));
          downloadCsv(`audit-alerts-${period}.csv`, rows);
          break;
        }
        case 'assessments': {
          const rows = data.assessments.map(a => ({
            id: a.id,
            transaction_id: a.transaction_id ?? '',
            user_id: a.user_id,
            risk_level: a.risk_level,
            model_version: a.model_version,
            is_simulated: a.is_simulated,
            created_at: a.created_at,
          }));
          downloadCsv(`audit-assessments-${period}.csv`, rows);
          break;
        }
        case 'audit_logs': {
          const rows = data.auditLogs.map(l => ({
            id: l.id,
            actor_id: l.actor_id,
            action: l.action,
            target_type: l.target_type,
            target_id: l.target_id,
            created_at: l.created_at,
          }));
          downloadCsv(`audit-log-entries-${period}.csv`, rows);
          break;
        }
        case 'users': {
          const rows = data.profiles.map(p => ({
            id: p.id,
            full_name: p.full_name,
            role: p.role,
            status: p.status,
            mobile: p.mobile,
            preferred_language: p.preferred_language,
            created_at: p.created_at,
            updated_at: p.updated_at,
          }));
          downloadCsv(`audit-users-${period}.csv`, rows);
          break;
        }
        default:
          handleExportCsv();
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!data || !stats) return;
    setExporting(true);
    try {
      const period = `${dateFrom || 'beginning'} to ${dateTo || 'now'}`;
      const reportHtml = buildPdfHtml(stats, data, period, lang);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setError('Pop-up blocked. Please allow pop-ups to generate PDF reports.');
        return;
      }
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } finally {
      setExporting(false);
    }
  };

  const tabs: { key: ReportTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'summary', label: 'Summary', icon: <FileBarChart size={16} />, count: undefined },
    { key: 'transactions', label: 'Transactions', icon: <ArrowLeftRight size={16} />, count: data?.transactions.length },
    { key: 'alerts', label: 'Fraud Alerts', icon: <AlertTriangle size={16} />, count: data?.alerts.length },
    { key: 'assessments', label: 'Risk Assessments', icon: <ShieldCheck size={16} />, count: data?.assessments.length },
    { key: 'audit_logs', label: 'Audit Logs', icon: <FileText size={16} />, count: data?.auditLogs.length },
    { key: 'users', label: 'User Activities', icon: <Users size={16} />, count: data?.profiles.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Audit Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Generate downloadable compliance reports from real platform data</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleExportCsv} disabled={exporting || !data}>
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Summary CSV
          </button>
          <button className="btn-primary" onClick={handleExportPdf} disabled={exporting || !data}>
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Export PDF
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>Read-only audit access. All data is fetched live from Supabase with RLS-enforced role permissions.</span>
        </div>
      </div>

      {/* Date filter */}
      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="label flex items-center gap-1"><Calendar size={14} /> From Date</label>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo || undefined} />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Calendar size={14} /> To Date</label>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom || undefined} />
          </div>
          <button className="btn-primary" onClick={loadData} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />} Apply Filter
          </button>
          <button className="btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }} disabled={loading || (!dateFrom && !dateTo)}>
            <RefreshCw size={16} /> Clear
          </button>
        </div>
        {(dateFrom || dateTo) && (
          <p className="mt-2 text-xs text-gray-500">
            Filtering: {dateFrom ? formatDate(dateFrom, lang) : 'Beginning'} → {dateTo ? formatDate(dateTo, lang) : 'Now'}
          </p>
        )}
      </Card>

      {error && (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">
          {error}
          <button className="ml-2 text-xs underline" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading audit data..." />
      ) : data && stats ? (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab !== 'summary' && (
            <div className="flex justify-end">
              <button className="btn-secondary text-xs" onClick={handleExportTabCsv} disabled={exporting}>
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export {tabs.find(t => t.key === activeTab)?.label} CSV
              </button>
            </div>
          )}

          {/* Summary tab */}
          {activeTab === 'summary' && <SummaryView stats={stats} data={data} lang={lang} />}

          {/* Transactions tab */}
          {activeTab === 'transactions' && (
            <TransactionTable transactions={data.transactions} lang={lang} />
          )}

          {/* Alerts tab */}
          {activeTab === 'alerts' && (
            <AlertTable alerts={data.alerts} lang={lang} />
          )}

          {/* Assessments tab */}
          {activeTab === 'assessments' && (
            <AssessmentTable assessments={data.assessments} lang={lang} />
          )}

          {/* Audit logs tab */}
          {activeTab === 'audit_logs' && (
            <AuditLogTable logs={data.auditLogs} lang={lang} />
          )}

          {/* Users tab */}
          {activeTab === 'users' && (
            <UserActivityTable profiles={data.profiles} auditLogs={data.auditLogs} lang={lang} />
          )}
        </>
      ) : (
        <EmptyState icon={<FileBarChart size={40} />} title="No data available" subtitle="Adjust the date filter and try again" />
      )}
    </div>
  );
}

function SummaryView({ stats, data, lang }: { stats: SummaryStats; data: ReportData; lang: string }) {
  const successRate = stats.totalTransactions > 0 ? ((stats.successfulCount / stats.totalTransactions) * 100).toFixed(1) : '0.0';
  const blockRate = stats.totalAssessments > 0 ? ((stats.blockedAssessments / stats.totalAssessments) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Transactions" value={stats.totalTransactions} icon={<ArrowLeftRight size={22} />} accent="primary" />
        <StatCard label="Transaction Volume" value={formatCurrency(stats.totalVolume)} icon={<Activity size={22} />} accent="success" />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={<ShieldCheck size={22} />} accent="success" />
        <StatCard label="Failed Transactions" value={stats.failedCount} icon={<AlertTriangle size={22} />} accent="error" />
        <StatCard label="Fraud Alerts" value={stats.totalAlerts} icon={<AlertTriangle size={22} />} accent="warning" />
        <StatCard label="Critical Alerts" value={stats.criticalAlerts} icon={<AlertTriangle size={22} />} accent="error" />
        <StatCard label="Risk Assessments" value={stats.totalAssessments} icon={<ShieldCheck size={22} />} accent="primary" />
        <StatCard label="Blocked Transactions" value={stats.blockedAssessments} icon={<ShieldCheck size={22} />} accent="error" />
        <StatCard label="Audit Log Entries" value={stats.totalAuditLogs} icon={<FileText size={22} />} accent="secondary" />
        <StatCard label="Registered Users" value={stats.totalUsers} icon={<Users size={22} />} accent="primary" />
        <StatCard label="Open Cases" value={stats.openCases} icon={<FileText size={22} />} accent="warning" />
        <StatCard label="Block Rate" value={`${blockRate}%`} icon={<ShieldCheck size={22} />} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Transaction Status Breakdown</h3>
          <div className="space-y-2">
            <StatBar label="Successful" value={stats.successfulCount} total={stats.totalTransactions} color="bg-success-500" />
            <StatBar label="Failed" value={stats.failedCount} total={stats.totalTransactions} color="bg-error-500" />
            <StatBar label="Pending / Processing" value={stats.pendingCount} total={stats.totalTransactions} color="bg-warning-500" />
            <StatBar label="Cancelled" value={stats.cancelledCount} total={stats.totalTransactions} color="bg-gray-400" />
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Risk Assessment Distribution</h3>
          <div className="space-y-2">
            <StatBar label="High Risk" value={stats.highRiskAssessments} total={stats.totalAssessments} color="bg-error-500" />
            <StatBar label="Blocked" value={stats.blockedAssessments} total={stats.totalAssessments} color="bg-error-700" />
            <StatBar label="Medium Risk" value={data.assessments.filter(a => a.risk_level === 'medium').length} total={stats.totalAssessments} color="bg-warning-500" />
            <StatBar label="Low Risk" value={data.assessments.filter(a => a.risk_level === 'low').length} total={stats.totalAssessments} color="bg-success-500" />
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Alert Priority Distribution</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-error-50 p-3 text-center dark:bg-error-900/20">
            <p className="text-2xl font-bold text-error-600 dark:text-error-400">{stats.criticalAlerts}</p>
            <p className="text-xs text-gray-500">Critical</p>
          </div>
          <div className="rounded-lg bg-warning-50 p-3 text-center dark:bg-warning-900/20">
            <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">{stats.highPriorityAlerts}</p>
            <p className="text-xs text-gray-500">High</p>
          </div>
          <div className="rounded-lg bg-primary-50 p-3 text-center dark:bg-primary-900/20">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{data.alerts.filter(a => a.priority === 'medium').length}</p>
            <p className="text-xs text-gray-500">Medium</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800/50">
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{data.alerts.filter(a => a.priority === 'low').length}</p>
            <p className="text-xs text-gray-500">Low</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Recent Audit Activity</h3>
        {data.auditLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No audit log entries in this period</p>
        ) : (
          <div className="space-y-2">
            {data.auditLogs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{log.action}</Badge>
                  <span className="text-gray-500">{log.actor_id === 'system' ? 'System' : log.actor_id.slice(0, 8) + '...'}</span>
                  <span className="text-gray-400">→ {log.target_type}</span>
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(log.created_at, lang)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium">{value} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TransactionTable({ transactions, lang }: { transactions: Transaction[]; lang: string }) {
  if (transactions.length === 0) return <EmptyState icon={<ArrowLeftRight size={40} />} title="No transactions" subtitle="No transaction records in this period" />;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-700">
              <th className="pb-2 pr-4 font-medium">Reference</th>
              <th className="pb-2 pr-4 font-medium">Amount</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Mode</th>
              <th className="pb-2 pr-4 font-medium">Gateway</th>
              <th className="pb-2 pr-4 font-medium">Risk</th>
              <th className="pb-2 pr-4 font-medium">Sim</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 font-mono text-xs">{tx.reference_id}</td>
                <td className="py-2 pr-4">{formatCurrency(tx.amount)}</td>
                <td className="py-2 pr-4">{statusBadge(tx.status)}</td>
                <td className="py-2 pr-4 text-xs uppercase">{tx.payment_mode}</td>
                <td className="py-2 pr-4 text-xs">{tx.gateway ?? '—'}</td>
                <td className="py-2 pr-4 text-xs">{tx.risk_score !== null ? `${tx.risk_score}/100` : '—'}</td>
                <td className="py-2 pr-4">{tx.is_simulated ? <Badge variant="warning">Sim</Badge> : <Badge variant="success">Real</Badge>}</td>
                <td className="py-2 text-xs text-gray-400">{formatDateTime(tx.created_at, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AlertTable({ alerts, lang }: { alerts: Alert[]; lang: string }) {
  if (alerts.length === 0) return <EmptyState icon={<AlertTriangle size={40} />} title="No alerts" subtitle="No fraud alerts in this period" />;
  const priorityBadge = (p: string) => {
    if (p === 'critical') return <Badge variant="error">Critical</Badge>;
    if (p === 'high') return <Badge variant="error">High</Badge>;
    if (p === 'medium') return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="neutral">Low</Badge>;
  };
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-700">
              <th className="pb-2 pr-4 font-medium">Priority</th>
              <th className="pb-2 pr-4 font-medium">Category</th>
              <th className="pb-2 pr-4 font-medium">Title</th>
              <th className="pb-2 pr-4 font-medium">User</th>
              <th className="pb-2 pr-4 font-medium">Read</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(a => (
              <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">{priorityBadge(a.priority)}</td>
                <td className="py-2 pr-4 text-xs">{a.category}</td>
                <td className="py-2 pr-4 max-w-xs truncate">{a.title}</td>
                <td className="py-2 pr-4 font-mono text-xs">{a.user_id.slice(0, 8)}...</td>
                <td className="py-2 pr-4">{a.is_read ? <Badge variant="success">Read</Badge> : <Badge variant="warning">Unread</Badge>}</td>
                <td className="py-2 text-xs text-gray-400">{formatDateTime(a.created_at, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AssessmentTable({ assessments, lang }: { assessments: FraudAssessment[]; lang: string }) {
  if (assessments.length === 0) return <EmptyState icon={<ShieldCheck size={40} />} title="No assessments" subtitle="No fraud risk assessments in this period" />;
  const riskBadge = (level: string) => {
    if (level === 'blocked') return <Badge variant="error">Blocked</Badge>;
    if (level === 'high') return <Badge variant="error">High</Badge>;
    if (level === 'medium') return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="success">Low</Badge>;
  };
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-700">
              <th className="pb-2 pr-4 font-medium">Risk Level</th>
              <th className="pb-2 pr-4 font-medium">Category</th>
              <th className="pb-2 pr-4 font-medium">Model</th>
              <th className="pb-2 pr-4 font-medium">Simulated</th>
              <th className="pb-2 pr-4 font-medium">User</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map(a => (
              <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">{riskBadge(a.risk_level)}</td>
                <td className="py-2 pr-4 text-xs">{a.risk_level}</td>
                <td className="py-2 pr-4 text-xs">{a.model_version}</td>
                <td className="py-2 pr-4">{a.is_simulated ? <Badge variant="warning">Sim</Badge> : <Badge variant="success">Real</Badge>}</td>
                <td className="py-2 pr-4 font-mono text-xs">{a.user_id.slice(0, 8)}...</td>
                <td className="py-2 text-xs text-gray-400">{formatDateTime(a.created_at, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AuditLogTable({ logs, lang }: { logs: AuditLog[]; lang: string }) {
  if (logs.length === 0) return <EmptyState icon={<FileText size={40} />} title="No audit logs" subtitle="No audit log entries in this period" />;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-700">
              <th className="pb-2 pr-4 font-medium">Action</th>
              <th className="pb-2 pr-4 font-medium">Actor</th>
              <th className="pb-2 pr-4 font-medium">Target Type</th>
              <th className="pb-2 pr-4 font-medium">Target ID</th>
              <th className="pb-2 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4"><Badge variant="neutral">{log.action}</Badge></td>
                <td className="py-2 pr-4 font-mono text-xs">{log.actor_id === 'system' ? 'System' : log.actor_id.slice(0, 8) + '...'}</td>
                <td className="py-2 pr-4 text-xs">{log.target_type}</td>
                <td className="py-2 pr-4 font-mono text-xs">{log.target_id || '—'}</td>
                <td className="py-2 text-xs text-gray-400">{formatDateTime(log.created_at, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function UserActivityTable({ profiles, auditLogs, lang }: { profiles: Profile[]; auditLogs: AuditLog[]; lang: string }) {
  if (profiles.length === 0) return <EmptyState icon={<Users size={40} />} title="No users" subtitle="No registered users found" />;
  const activityMap = new Map<string, number>();
  for (const log of auditLogs) {
    if (log.actor_id && log.actor_id !== 'system') {
      activityMap.set(log.actor_id, (activityMap.get(log.actor_id) ?? 0) + 1);
    }
  }
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-700">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Activity Count</th>
              <th className="pb-2 pr-4 font-medium">Registered</th>
              <th className="pb-2 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 font-medium">{p.full_name}</td>
                <td className="py-2 pr-4"><Badge variant="info">{p.role}</Badge></td>
                <td className="py-2 pr-4">{statusBadge(p.status)}</td>
                <td className="py-2 pr-4 text-center">
                  <span className="font-medium">{activityMap.get(p.id) ?? 0}</span>
                  <span className="ml-1 text-xs text-gray-400">actions</span>
                </td>
                <td className="py-2 pr-4 text-xs text-gray-400">{formatDate(p.created_at, lang)}</td>
                <td className="py-2 text-xs text-gray-400">{formatDate(p.updated_at, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function buildPdfHtml(stats: SummaryStats, data: ReportData, period: string, lang: string): string {
  const generatedAt = formatDateTime(new Date().toISOString(), lang);
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const txnRows = data.transactions.slice(0, 50).map(tx => `
    <tr>
      <td>${escape(tx.reference_id)}</td>
      <td>${formatCurrency(tx.amount)}</td>
      <td>${tx.status}</td>
      <td>${tx.payment_mode}</td>
      <td>${tx.is_simulated ? 'Sim' : 'Real'}</td>
      <td>${tx.risk_score ?? '—'}</td>
      <td>${formatDate(tx.created_at, lang)}</td>
    </tr>`).join('');

  const alertRows = data.alerts.slice(0, 30).map(a => `
    <tr>
      <td>${a.priority}</td>
      <td>${escape(a.category)}</td>
      <td>${escape(a.title)}</td>
      <td>${formatDate(a.created_at, lang)}</td>
    </tr>`).join('');

  const auditRows = data.auditLogs.slice(0, 50).map(l => `
    <tr>
      <td>${escape(l.action)}</td>
      <td>${l.actor_id === 'system' ? 'System' : escape(l.actor_id.slice(0, 8))}</td>
      <td>${escape(l.target_type)}</td>
      <td>${formatDate(l.created_at, lang)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Mudra-Mend Audit Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; padding: 40px; }
  .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 28px; color: #1d4ed8; }
  .header .subtitle { color: #6b7280; font-size: 14px; margin-top: 4px; }
  .meta { display: flex; gap: 32px; margin-bottom: 24px; font-size: 13px; color: #4b5563; }
  .meta div { display: flex; flex-direction: column; }
  .meta strong { color: #1f2937; }
  .section { margin-bottom: 32px; page-break-inside: avoid; }
  .section h2 { font-size: 18px; color: #1d4ed8; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .stat-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
  .stat-card .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 6px 8px; background: #f3f4f6; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; }
  td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) { background: #fafafa; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 20px; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="header">
    <h1>Mudra-Mend Compliance Audit Report</h1>
    <div class="subtitle">Read-only audit generated from live platform data</div>
  </div>
  <div class="meta">
    <div><span>Report Period</span><strong>${escape(period)}</strong></div>
    <div><span>Generated At</span><strong>${escape(generatedAt)}</strong></div>
    <div><span>Report Type</span><strong>Compliance Summary</strong></div>
  </div>

  <div class="section">
    <h2>Summary Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Transactions</div><div class="value">${stats.totalTransactions}</div></div>
      <div class="stat-card"><div class="label">Volume (INR)</div><div class="value">${formatCurrency(stats.totalVolume)}</div></div>
      <div class="stat-card"><div class="label">Successful</div><div class="value">${stats.successfulCount}</div></div>
      <div class="stat-card"><div class="label">Failed</div><div class="value">${stats.failedCount}</div></div>
      <div class="stat-card"><div class="label">Fraud Alerts</div><div class="value">${stats.totalAlerts}</div></div>
      <div class="stat-card"><div class="label">Critical Alerts</div><div class="value">${stats.criticalAlerts}</div></div>
      <div class="stat-card"><div class="label">Risk Assessments</div><div class="value">${stats.totalAssessments}</div></div>
      <div class="stat-card"><div class="label">Blocked</div><div class="value">${stats.blockedAssessments}</div></div>
      <div class="stat-card"><div class="label">Audit Logs</div><div class="value">${stats.totalAuditLogs}</div></div>
      <div class="stat-card"><div class="label">Users</div><div class="value">${stats.totalUsers}</div></div>
      <div class="stat-card"><div class="label">Open Cases</div><div class="value">${stats.openCases}</div></div>
      <div class="stat-card"><div class="label">Total Cases</div><div class="value">${stats.totalCases}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Transaction Records (Top 50)</h2>
    <table>
      <thead><tr><th>Reference</th><th>Amount</th><th>Status</th><th>Mode</th><th>Type</th><th>Risk</th><th>Date</th></tr></thead>
      <tbody>${txnRows || '<tr><td colspan="7">No transactions in this period</td></tr>'}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Fraud Alerts (Top 30)</h2>
    <table>
      <thead><tr><th>Priority</th><th>Category</th><th>Title</th><th>Date</th></tr></thead>
      <tbody>${alertRows || '<tr><td colspan="4">No alerts in this period</td></tr>'}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Audit Log Entries (Top 50)</h2>
    <table>
      <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Date</th></tr></thead>
      <tbody>${auditRows || '<tr><td colspan="4">No audit logs in this period</td></tr>'}</tbody>
    </table>
  </div>

  <div class="footer">
    <p>This report was auto-generated by the Mudra-Mend Audit Reports module. Data is fetched live from the Supabase database with RLS-enforced role-based access control. The auditor role has read-only access — no data was modified during report generation.</p>
  </div>
</body>
</html>`;
}
