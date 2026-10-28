import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Shield, LayoutDashboard, CreditCard, ArrowLeftRight, Banknote, AlertTriangle,
  FileWarning, FolderKanban, Landmark, HeartHandshake, Lightbulb, BarChart3,
  Settings, LogOut, Bell, Menu, X, Users, CheckCircle, Activity,
  Brain, MessageSquare, FileText, ChevronDown, Database, Scan, BookOpen, Plug, TrendingUp, FileBarChart
} from 'lucide-react';
import { useAuth, roleLabel } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import type { TranslationKey } from '@/i18n/translations';
import { useTheme } from '@/context/ThemeContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase, type Role, type Alert } from '@/lib/supabase';
import { useEffect, useState as useReactState } from 'react';
import { formatDateTime } from '@/lib/utils';
import { statusBadge } from '@/components/ui';
import { FlaskConical, MoreHorizontal } from 'lucide-react';
import { DEMO_ALERTS } from '@/lib/demoData';

interface NavItem {
  to: string;
  icon: ReactNode;
  labelKey: 'dashboard' | 'payments' | 'bankAccounts' | 'transactions' | 'scamReports' | 'alerts' | 'cases' | 'schemes' | 'ngoOutreach' | 'recommendations' | 'reports' | 'settings' | 'help' | 'support' | 'auditLogs' | 'auditReports' | 'users' | 'approvals' | 'systemHealth' | 'aiMonitoring' | 'tickets' | 'evidence' | 'timeline' | 'profile' | 'datasets' | 'fraudIntelligence' | 'fraudScanner' | 'fraudPatterns' | 'learningCenter' | 'integrationSettings';
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  customer: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/payments', icon: <ArrowLeftRight size={20} />, labelKey: 'payments' },
    { to: '/app/bank-accounts', icon: <Banknote size={20} />, labelKey: 'bankAccounts' },
    { to: '/app/transactions', icon: <CreditCard size={20} />, labelKey: 'transactions' },
    { to: '/app/scam-reports', icon: <FileWarning size={20} />, labelKey: 'scamReports' },
    { to: '/app/alerts', icon: <AlertTriangle size={20} />, labelKey: 'alerts' },
    { to: '/app/schemes', icon: <Landmark size={20} />, labelKey: 'schemes' },
    { to: '/app/recommendations', icon: <Lightbulb size={20} />, labelKey: 'recommendations' },
    { to: '/app/fraud-intelligence', icon: <Shield size={20} />, labelKey: 'fraudIntelligence' },
    { to: '/app/fraud-scanner', icon: <Scan size={20} />, labelKey: 'fraudScanner' },
    { to: '/app/learning-center', icon: <BookOpen size={20} />, labelKey: 'learningCenter' },
    { to: '/app/support', icon: <MessageSquare size={20} />, labelKey: 'support' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
  admin: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/users', icon: <Users size={20} />, labelKey: 'users' },
    { to: '/app/approvals', icon: <CheckCircle size={20} />, labelKey: 'approvals' },
    { to: '/app/alerts', icon: <AlertTriangle size={20} />, labelKey: 'alerts' },
    { to: '/app/cases', icon: <FolderKanban size={20} />, labelKey: 'cases' },
    { to: '/app/ai-monitoring', icon: <Brain size={20} />, labelKey: 'aiMonitoring' },
    { to: '/app/audit-logs', icon: <FileText size={20} />, labelKey: 'auditLogs' },
    { to: '/app/audit-reports', icon: <FileBarChart size={20} />, labelKey: 'auditReports' },
    { to: '/app/system-health', icon: <Activity size={20} />, labelKey: 'systemHealth' },
    { to: '/app/datasets', icon: <Database size={20} />, labelKey: 'datasets' },
    { to: '/app/integration-settings', icon: <Plug size={20} />, labelKey: 'integrationSettings' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
  fraud_analyst: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/fraud-intelligence', icon: <Shield size={20} />, labelKey: 'fraudIntelligence' },
    { to: '/app/fraud-scanner', icon: <Scan size={20} />, labelKey: 'fraudScanner' },
    { to: '/app/fraud-patterns', icon: <TrendingUp size={20} />, labelKey: 'fraudPatterns' },
    { to: '/app/alerts', icon: <AlertTriangle size={20} />, labelKey: 'alerts' },
    { to: '/app/cases', icon: <FolderKanban size={20} />, labelKey: 'cases' },
    { to: '/app/transactions', icon: <CreditCard size={20} />, labelKey: 'transactions' },
    { to: '/app/recommendations', icon: <Lightbulb size={20} />, labelKey: 'recommendations' },
    { to: '/app/datasets', icon: <Database size={20} />, labelKey: 'datasets' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
  bank_officer: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/transactions', icon: <CreditCard size={20} />, labelKey: 'transactions' },
    { to: '/app/fraud-scanner', icon: <Scan size={20} />, labelKey: 'fraudScanner' },
    { to: '/app/alerts', icon: <AlertTriangle size={20} />, labelKey: 'alerts' },
    { to: '/app/cases', icon: <FolderKanban size={20} />, labelKey: 'cases' },
    { to: '/app/reports', icon: <BarChart3 size={20} />, labelKey: 'reports' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
  investigator: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/cases', icon: <FolderKanban size={20} />, labelKey: 'cases' },
    { to: '/app/evidence', icon: <FileText size={20} />, labelKey: 'evidence' },
    { to: '/app/scam-reports', icon: <FileWarning size={20} />, labelKey: 'scamReports' },
    { to: '/app/fraud-intelligence', icon: <Shield size={20} />, labelKey: 'fraudIntelligence' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
  auditor: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/audit-logs', icon: <FileText size={20} />, labelKey: 'auditLogs' },
    { to: '/app/audit-reports', icon: <FileBarChart size={20} />, labelKey: 'auditReports' },
    { to: '/app/cases', icon: <FolderKanban size={20} />, labelKey: 'cases' },
    { to: '/app/ai-monitoring', icon: <Brain size={20} />, labelKey: 'aiMonitoring' },
    { to: '/app/reports', icon: <BarChart3 size={20} />, labelKey: 'reports' },
    { to: '/app/datasets', icon: <Database size={20} />, labelKey: 'datasets' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
  customer_support: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/support', icon: <MessageSquare size={20} />, labelKey: 'tickets' },
    { to: '/app/alerts', icon: <AlertTriangle size={20} />, labelKey: 'alerts' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
  ngo_coordinator: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/ngo-outreach', icon: <HeartHandshake size={20} />, labelKey: 'ngoOutreach' },
    { to: '/app/schemes', icon: <Landmark size={20} />, labelKey: 'schemes' },
    { to: '/app/reports', icon: <BarChart3 size={20} />, labelKey: 'reports' },
    { to: '/app/datasets', icon: <Database size={20} />, labelKey: 'datasets' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
  gov_official: [
    { to: '/app', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
    { to: '/app/schemes', icon: <Landmark size={20} />, labelKey: 'schemes' },
    { to: '/app/scam-reports', icon: <FileWarning size={20} />, labelKey: 'scamReports' },
    { to: '/app/fraud-patterns', icon: <TrendingUp size={20} />, labelKey: 'fraudPatterns' },
    { to: '/app/reports', icon: <BarChart3 size={20} />, labelKey: 'reports' },
    { to: '/app/datasets', icon: <Database size={20} />, labelKey: 'datasets' },
    { to: '/app/settings', icon: <Settings size={20} />, labelKey: 'settings' },
  ],
};

const BOTTOM_NAV_ROLES: Role[] = ['customer'];

export default function AppLayout() {
  const { profile, signOut, isDemoMode } = useAuth();
  const { t } = useI18n();
  const { toggleTheme, theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const role = profile?.role ?? 'customer';
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.customer;
  const isBottomNav = BOTTOM_NAV_ROLES.includes(role);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (to: string) => to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="flex items-center justify-center gap-2 bg-secondary-600 px-4 py-1.5 text-xs font-medium text-white">
          <FlaskConical size={14} /> {t('demoModeBanner')} <button onClick={() => { signOut(); navigate('/login'); }} className="ml-2 underline hover:no-underline">{t('exitDemo')}</button>
        </div>
      )}

      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {!isBottomNav && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden btn-ghost p-2" aria-label="Toggle menu">
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
            <Link to="/app" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Shield size={18} />
              </div>
              <span className="font-bold">{t('appName')}</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            <LanguageSwitcher compact />
            <button onClick={toggleTheme} className="btn-ghost p-2 text-sm" aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <NotificationBell open={notifOpen} setOpen={setNotifOpen} />
            <UserMenu profile={profile} onSignOut={handleSignOut} t={t} />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar for professional roles */}
        {!isBottomNav && (
          <>
            {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
            <aside className={`fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <nav className="p-3">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(item.to)
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.icon}
                    {t(item.labelKey)}
                  </Link>
                ))}
              </nav>
            </aside>
          </>
        )}

        {/* Main content */}
        <main className={`min-h-[calc(100vh-3.5rem)] flex-1 ${!isBottomNav ? 'lg:ml-64' : ''} ${isBottomNav ? 'pb-16' : ''}`}>
          <div className="mx-auto max-w-6xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav for customer */}
      {isBottomNav && (
        <>
          <BottomNav navItems={navItems} isActive={isActive} t={t} moreOpen={sidebarOpen} setMoreOpen={setSidebarOpen} />
        </>
      )}
    </div>
  );
}

function BottomNav({ navItems, isActive, t, moreOpen, setMoreOpen }: {
  navItems: NavItem[];
  isActive: (to: string) => boolean;
  t: (k: TranslationKey) => string;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
}) {
  const mainItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);

  return (
    <>
      {moreOpen && moreItems.length > 0 && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMoreOpen(false)} />
      )}
      {moreOpen && moreItems.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 z-40 rounded-t-2xl border-t border-gray-200 bg-white p-4 animate-slide-up dark:border-gray-800 dark:bg-gray-900 lg:hidden">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('more')}</h3>
            <button onClick={() => setMoreOpen(false)} className="btn-ghost p-1"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {moreItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center gap-1.5 rounded-lg p-3 text-xs font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {item.icon}
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex">
          {mainItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-1 py-2.5 text-xs font-medium transition-colors ${
                isActive(item.to)
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-500'
              }`}
            >
              {item.icon}
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          ))}
          {moreItems.length > 0 && (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-1 py-2.5 text-xs font-medium transition-colors ${
                moreOpen ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-500'
              }`}
            >
              <MoreHorizontal size={20} />
              <span>{t('more')}</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

function NotificationBell({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { profile, isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [alerts, setAlerts] = useReactState<Alert[]>([]);
  const [loading, setLoading] = useReactState(true);
  const [categoryFilter, setCategoryFilter] = useReactState('all');

  useEffect(() => {
    if (isDemoMode) {
      setAlerts(DEMO_ALERTS as unknown as Alert[]);
      setLoading(false);
      return;
    }
    if (!profile) return;
    setLoading(true);
    supabase
      .from('alerts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setAlerts((data ?? []) as Alert[]);
        setLoading(false);
      });
  }, [profile, isDemoMode]);

  const unread = alerts.filter((a) => !a.is_read).length;

  const markAllRead = async () => {
    if (!isDemoMode && profile) await supabase.from('alerts').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setAlerts(alerts.map((a) => ({ ...a, is_read: true })));
  };

  const markOneRead = async (id: string) => {
    if (!isDemoMode) await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const filteredAlerts = categoryFilter === 'all'
    ? alerts
    : alerts.filter((a) => {
        if (categoryFilter === 'payment_safety') return a.category === 'payment_safety';
        if (categoryFilter === 'account') return a.category === 'account' || a.category === 'system';
        if (categoryFilter === 'general') return !['payment_safety', 'account', 'system'].includes(a.category);
        return true;
      });

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-ghost p-2" aria-label="Notifications">
        <div className="relative">
          <Bell size={20} />
          {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 animate-slide-up">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <h3 className="font-semibold text-sm">{t('notifications')}</h3>
              {unread > 0 && <button onClick={markAllRead} className="text-xs font-medium text-primary-600 hover:text-primary-700">{t('markAllRead')}</button>}
            </div>
            <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-700">
              <select className="input h-8 w-full text-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">{t('notifAll')}</option>
                <option value="payment_safety">{t('notifPaymentSafety')}</option>
                <option value="account">{t('notifAccount')}</option>
                <option value="general">{t('notifGeneral')}</option>
              </select>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="py-6 text-center text-sm text-gray-400">{t('loading')}</div>
              ) : filteredAlerts.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">{t('noData')}</div>
              ) : (
                filteredAlerts.map((a) => (
                  <div key={a.id} className={`border-b border-gray-50 px-4 py-3 dark:border-gray-700/50 ${!a.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{a.title}</p>
                      {!a.is_read && (
                        <button onClick={() => markOneRead(a.id)} className="mt-0.5 flex-shrink-0 text-[10px] font-medium text-primary-600 hover:text-primary-700" title={t('markRead')}>
                          <CheckCircle size={14} />
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{a.body}</p>
                    <p className="mt-1 text-[10px] text-gray-400">{formatDateTime(a.created_at, lang)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu({ profile, onSignOut, t }: { profile: { full_name: string; role: Role; status: string } | null; onSignOut: () => void; t: (k: TranslationKey) => string }) {
  const [open, setOpen] = useState(false);
  if (!profile) return null;
  const initials = profile.full_name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {initials}
        </div>
        <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 animate-slide-up">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-gray-500">{t(roleLabel(profile.role))}</p>
              <div className="mt-1">{statusBadge(profile.status)}</div>
            </div>
            <div className="py-1">
              <Link to="/app/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                <Settings size={16} /> {t('settings')}
              </Link>
              <button onClick={onSignOut} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20">
                <LogOut size={16} /> {t('logout')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
