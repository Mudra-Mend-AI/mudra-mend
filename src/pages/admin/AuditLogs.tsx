import { useEffect, useState, useCallback } from 'react';
import { FileText, Search, FlaskConical } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DEMO_AUDIT_LOGS } from '@/lib/demoData';
import { Card, LoadingState, EmptyState } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

export default function AuditLogs() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [logs, setLogs] = useState<{ id: string; action: string; actor_id: string | null; target_type: string | null; target_id: string | null; metadata: Record<string, unknown>; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const load = useCallback(async () => {
    if (isDemoMode) {
      setLogs(DEMO_AUDIT_LOGS as unknown as { id: string; action: string; actor_id: string | null; target_type: string | null; target_id: string | null; metadata: Record<string, unknown>; created_at: string }[]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    setLogs((data ?? []) as { id: string; action: string; actor_id: string | null; target_type: string | null; target_id: string | null; metadata: Record<string, unknown>; created_at: string }[]);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter((l) => {
    const matchesSearch = !search || l.action.toLowerCase().includes(search.toLowerCase()) || (l.actor_id ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || l.action.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('demoAuditEntries')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('auditLogs')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('auditLogsSubtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input pl-10" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="all">{t('allActions')}</option>
          <option value="approve">{t('approvals')}</option>
          <option value="reject">{t('rejections')}</option>
          <option value="update">{t('updates')}</option>
          <option value="case">{t('caseChanges')}</option>
          <option value="user">{t('userChanges')}</option>
        </select>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<FileText size={40} />} title={t('noData')} /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-gray-800">
                  <th className="py-2 pr-4 font-medium">{t('action')}</th>
                  <th className="py-2 pr-4 font-medium">{t('actor')}</th>
                  <th className="py-2 pr-4 font-medium">{t('target')}</th>
                  <th className="py-2 pr-4 font-medium">{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 table-row-hover dark:border-gray-800/50">
                    <td className="py-3 pr-4 font-medium">{l.action}</td>
                    <td className="py-3 pr-4 text-xs text-gray-400">{l.actor_id ? l.actor_id.slice(0, 8) + '…' : 'system'}</td>
                    <td className="py-3 pr-4 text-xs text-gray-400">{l.target_type ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-500">{formatDateTime(l.created_at, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
