import { useState, useEffect } from 'react';
import { User as UserIcon, Globe, Moon, Sun, Bell, Shield, LogOut, Check, Lock, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

const NOTIF_KEY = 'mm_notif_prefs';

interface NotifPrefs {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw) as NotifPrefs;
  } catch { /* ignore */ }
  return { inApp: true, email: true, sms: false };
}

function saveNotifPrefs(p: NotifPrefs) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(p));
}

export default function Settings() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [mobile, setMobile] = useState(profile?.mobile ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(loadNotifPrefs);

  useEffect(() => { setNotifPrefs(loadNotifPrefs()); }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveError('');
    setSaved(false);
    const { error: updateError } = await supabase.from('profiles').update({
      full_name: fullName,
      mobile: mobile || null,
      preferred_language: lang,
      theme,
    }).eq('id', profile.id);
    if (updateError) {
      setSaveError(updateError.message);
      setSaving(false);
      return;
    }
    await refreshProfile();
    saveNotifPrefs(notifPrefs);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleNotif = (key: keyof NotifPrefs) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotifPrefs(next);
      return next;
    });
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t('settings')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('settingsSubtitle')}</p>
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><UserIcon size={20} className="text-primary-500" /> {t('profile')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">{t('fullName')}</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><label className="label">{t('mobile')}</label><input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t('mobilePlaceholder')} /></div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><Globe size={20} className="text-primary-500" /> {t('language')}</h2>
        <div className="flex gap-3">
          {[{ v: 'en' as const, l: 'English' }, { v: 'hi' as const, l: 'हिन्दी' }, { v: 'mr' as const, l: 'मराठी' }].map((o) => (
            <button key={o.v} onClick={() => setLang(o.v)} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${lang === o.v ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          {theme === 'light' ? <Sun size={20} className="text-accent-500" /> : <Moon size={20} className="text-primary-500" />} {t('theme')}
        </h2>
        <div className="flex gap-3">
          <button onClick={() => setTheme('light')} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${theme === 'light' ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}>
            {t('light')}
          </button>
          <button onClick={() => setTheme('dark')} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${theme === 'dark' ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}>
            {t('dark')}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><Bell size={20} className="text-primary-500" /> {t('notifications')}</h2>
        <div className="space-y-3">
          <NotifRow icon={<MessageSquare size={16} />} label={t('inAppAlerts')} checked={notifPrefs.inApp} onToggle={() => toggleNotif('inApp')} />
          <NotifRow icon={<Mail size={16} />} label={t('emailNotifications')} checked={notifPrefs.email} onToggle={() => toggleNotif('email')} />
          <NotifRow icon={<Smartphone size={16} />} label={t('smsNotifications')} checked={notifPrefs.sms} onToggle={() => toggleNotif('sms')} />
        </div>
        <p className="mt-3 text-xs text-gray-400">{t('notifConfigNote')}</p>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><Shield size={20} className="text-primary-500" /> {t('privacySecurity')}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">{t('role')}</span><span className="font-medium">{t(`role${profile.role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as 'roleCustomer' | 'roleAdmin' | 'roleFraudAnalyst' | 'roleBankOfficer' | 'roleInvestigator' | 'roleAuditor' | 'roleCustomerSupport' | 'roleNgoCoordinator' | 'roleGovOfficial')}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t('status')}</span><span className="font-medium">{profile.status}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t('accountId')}</span><span className="font-mono text-xs">{profile.id.slice(0, 8)}…</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t('dataIsolation')}</span><span className="flex items-center gap-1 font-medium text-success-600"><Lock size={12} /> RLS</span></div>
        </div>
      </Card>

      <div className="flex gap-3">
        <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
          {saved ? <><Check size={18} /> {t('save')}</> : saving ? '…' : t('save')}
        </button>
        <button className="btn-danger" onClick={handleSignOut}><LogOut size={18} /> {t('logout')}</button>
      </div>
      {saveError && <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{saveError}</div>}
    </div>
  );
}

function NotifRow({ icon, label, checked, onToggle }: { icon: React.ReactNode; label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm" onClick={(e) => { e.preventDefault(); onToggle(); }}>
      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">{icon} {label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </label>
  );
}
