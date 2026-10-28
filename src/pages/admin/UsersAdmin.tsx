import { useEffect, useState, useCallback } from 'react';
import { Users, Search, FlaskConical, ChevronDown, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Profile, type Role } from '@/lib/supabase';
import { DEMO_USERS } from '@/lib/demoData';
import { Card, LoadingState, EmptyState, statusBadge, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

const ROLES: Role[] = ['customer', 'admin', 'fraud_analyst', 'bank_officer', 'investigator', 'auditor', 'customer_support', 'ngo_coordinator', 'gov_official'];
const STATUSES = ['active', 'pending', 'suspended', 'deactivated'];

export default function UsersAdmin() {
  const { t, lang } = useI18n();
  const { profile, isDemoMode } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isAdmin = profile?.role === 'admin' && !isDemoMode;

  const load = useCallback(async () => {
    if (isDemoMode) {
      setProfiles(DEMO_USERS as unknown as Profile[]);
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (loadError) { setError(loadError.message); }
    setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const filtered = profiles.filter((p) => {
    const matchesSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.role.includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (!isAdmin || userId === profile?.id) return;
    setUpdating(userId);
    setError('');
    const { error: rpcError } = await supabase.rpc('admin_update_profile_role', {
      target_user_id: userId, new_role: newRole, new_status: 'active',
    });
    if (rpcError) { setError(rpcError.message); setUpdating(null); return; }
    setProfiles(profiles.map((p) => p.id === userId ? { ...p, role: newRole } : p));
    setUpdating(null);
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (!isAdmin || userId === profile?.id) return;
    setUpdating(userId);
    setError('');
    const { error: updateError } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
    if (updateError) { setError(updateError.message); setUpdating(null); return; }
    setProfiles(profiles.map((p) => p.id === userId ? { ...p, status: newStatus } : p));
    setUpdating(null);
  };

  const roleLabel = (role: string) => {
    const key = `role${role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as 'roleCustomer' | 'roleAdmin' | 'roleFraudAnalyst' | 'roleBankOfficer' | 'roleInvestigator' | 'roleAuditor' | 'roleCustomerSupport' | 'roleNgoCoordinator' | 'roleGovOfficial';
    return t(key);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('demoUserProfiles')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('users')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('usersSubtitle')}</p>
      </div>

      {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input pl-10" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">{t('allRoles')}</option>
          {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<Users size={40} />} title={t('noData')} /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-gray-800">
                  <th className="py-2 pr-4 font-medium">{t('name')}</th>
                  <th className="py-2 pr-4 font-medium">{t('role')}</th>
                  <th className="py-2 pr-4 font-medium">{t('status')}</th>
                  <th className="py-2 pr-4 font-medium">{t('joined')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 table-row-hover dark:border-gray-800/50">
                    <td className="py-3 pr-4 font-medium">{p.full_name || '—'}</td>
                    <td className="py-3 pr-4">
                      {isAdmin && p.id !== profile?.id ? (
                        <div className="relative inline-flex items-center">
                          <select
                            className="appearance-none rounded-md border border-gray-200 bg-transparent py-1 pl-2 pr-7 text-xs dark:border-gray-700"
                            value={p.role}
                            onChange={(e) => handleRoleChange(p.id, e.target.value as Role)}
                            disabled={updating === p.id}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                          </select>
                          <ChevronDown size={12} className="pointer-events-none absolute right-1.5 text-gray-400" />
                          {updating === p.id && <Loader2 size={12} className="ml-1 animate-spin" />}
                        </div>
                      ) : (
                        <Badge variant="info">{roleLabel(p.role)}</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {isAdmin && p.id !== profile?.id ? (
                        <div className="relative inline-flex items-center">
                          <select
                            className="appearance-none rounded-md border border-gray-200 bg-transparent py-1 pl-2 pr-7 text-xs dark:border-gray-700"
                            value={p.status}
                            onChange={(e) => handleStatusChange(p.id, e.target.value)}
                            disabled={updating === p.id}
                          >
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown size={12} className="pointer-events-none absolute right-1.5 text-gray-400" />
                        </div>
                      ) : (
                        statusBadge(p.status)
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(p.created_at, lang)}</td>
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
