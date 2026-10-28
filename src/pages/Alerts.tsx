import { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Check, Filter, Search, X, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type Alert } from '@/lib/supabase';
import { DEMO_ALERTS } from '@/lib/demoData';
import { Card, LoadingState, EmptyState, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

export default function Alerts() {
  const { profile, isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Alert | null>(null);

  const load = useCallback(async () => {
    if (!profile && !isDemoMode) return;
    if (isDemoMode) {
      setAlerts(DEMO_ALERTS as unknown as Alert[]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('alerts').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false });
    setAlerts((data ?? []) as Alert[]);
    setLoading(false);
  }, [profile, isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    if (!isDemoMode && profile) {
      const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', id).eq('user_id', profile.id);
      if (error) { console.error('Mark read error:', error.message); return; }
    }
    setAlerts(alerts.map((a) => a.id === id ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    if (!isDemoMode && profile) {
      const { error } = await supabase.from('alerts').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
      if (error) { console.error('Mark all read error:', error.message); return; }
    }
    setAlerts(alerts.map((a) => ({ ...a, is_read: true })));
  };

  const filtered = alerts.filter((a) => {
    const matchesFilter = filter === 'unread' ? !a.is_read : filter === 'critical' ? a.priority === 'critical' || a.priority === 'high' : filter === 'payment_safety' ? a.category === 'payment_safety' : filter === 'anomaly' ? a.category === 'anomaly' : true;
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.body.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });
  const unread = alerts.filter((a) => !a.is_read).length;

  const priorityBadge = (p: string) => {
    const map: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = { critical: 'error', high: 'error', medium: 'warning', low: 'info' };
    return <Badge variant={map[p] ?? 'neutral'}>{p}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('alerts')}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('alerts')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('unread')} {t('alerts')}</p>
        </div>
        {unread > 0 && <button className="btn-secondary" onClick={markAllRead}><Check size={16} /> {t('markAllRead')}</button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input pl-10" placeholder={t('searchAlerts')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{t('all')}</option>
            <option value="unread">{t('unread')}</option>
            <option value="critical">{t('highPriority')}</option>
            <option value="payment_safety">{t('paymentSafetyCheck')}</option>
            <option value="anomaly">{t('anomaly')}</option>
          </select>
        </div>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<AlertTriangle size={40} />} title={t('noData')} subtitle={t('noAlertsMatchFilters')} /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <Card key={a.id} className={`cursor-pointer hover:shadow-card-hover ${!a.is_read ? 'border-l-4 border-l-primary-500' : ''}`} onClick={() => setSelected(a)}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.title}</p>
                    {priorityBadge(a.priority)}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{a.body}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatDateTime(a.created_at, lang)} · {a.category}</p>
                </div>
                {!a.is_read && <button onClick={(e) => { e.stopPropagation(); markRead(a.id); }} className="btn-ghost p-2 text-sm" aria-label={t('markRead')}><Check size={16} /></button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <AlertDetail alert={selected} onClose={() => setSelected(null)} onMarkRead={() => { markRead(selected.id); setSelected(null); }} lang={lang} />}
    </div>
  );
}

function AlertDetail({ alert, onClose, onMarkRead, lang }: { alert: Alert; onClose: () => void; onMarkRead: () => void; lang: 'en' | 'hi' | 'mr' }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{alert.title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={alert.priority === 'critical' || alert.priority === 'high' ? 'error' : alert.priority === 'medium' ? 'warning' : 'info'}>{alert.priority}</Badge>
          <Badge variant="neutral">{alert.category}</Badge>
          {!alert.is_read && <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{t('unread')}</span>}
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{alert.body}</p>
        <p className="mt-2 text-xs text-gray-400">{formatDateTime(alert.created_at, lang)}</p>
        {alert.related_transaction_id && <p className="mt-2 text-xs text-primary-600">{t('relatedTransaction')}: {alert.related_transaction_id}</p>}
        {alert.related_case_id && <p className="mt-2 text-xs text-primary-600">{t('relatedCase')}: {alert.related_case_id}</p>}
        {!alert.is_read && <button className="btn-primary mt-4 w-full" onClick={onMarkRead}><Check size={16} /> {t('markRead')}</button>}
      </div>
    </div>
  );
}
