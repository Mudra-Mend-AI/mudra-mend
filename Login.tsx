import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, FlaskConical, ChevronDown } from 'lucide-react';
import { supabase, type Role } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth, roleLabel } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Spinner } from '@/components/ui';
import { validateEmail } from '@/lib/utils';
import { DEMO_ROLE_LABELS } from '@/lib/demoData';

const DEMO_ROLES: Role[] = ['customer', 'admin', 'fraud_analyst', 'bank_officer', 'investigator', 'auditor', 'customer_support', 'ngo_coordinator', 'gov_official'];

export default function Login() {
  const { t } = useI18n();
  const { toggleTheme, theme } = useTheme();
  const { enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const from = (location.state as { from?: string })?.from ?? '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) { setError('Please enter a valid email address'); return; }
    if (!password) { setError('Please enter your password'); return; }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Invalid email or password' : authError.message);
      return;
    }
    if (data.user) navigate(from);
  };

  const handleDemoLogin = (role: Role) => {
    enterDemoMode(role);
    navigate('/app');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-primary-50/30 px-4 dark:from-gray-950 dark:to-primary-950/20">
      <div className="absolute left-4 top-4">
        <Link to="/" className="btn-ghost text-sm">
          <ArrowLeft size={16} /> {t('back')}
        </Link>
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher compact />
        <button onClick={toggleTheme} className="btn-ghost px-2.5 py-2 text-sm" aria-label="Toggle theme">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold">{t('welcomeBack')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}

          <div>
            <label className="label">{t('email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus />
            </div>
          </div>

          <div>
            <label className="label">{t('password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type={showPwd ? 'text' : 'password'} className="input pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">{t('forgotPassword')}</Link>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner /> : <>{t('login')} <ArrowRight size={16} /></>}
          </button>
        </form>

        {/* Demo Login Section */}
        <div className="mt-4">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="flex w-full items-center justify-between rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-100 dark:border-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-300 dark:hover:bg-secondary-900/30"
          >
            <span className="flex items-center gap-2"><FlaskConical size={16} /> Demo Mode — Try any role instantly</span>
            <ChevronDown size={16} className={`transition-transform ${showDemo ? 'rotate-180' : ''}`} />
          </button>
          {showDemo && (
            <div className="mt-3 card p-4 animate-fade-in">
              <p className="mb-3 text-xs text-gray-500">
                Select a role to instantly explore that dashboard with sample demo data. No real account needed. All data is clearly labelled DEMO.
              </p>
              <div className="grid gap-2">
                {DEMO_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleDemoLogin(role)}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-primary-900/20"
                  >
                    {t(roleLabel(role))}
                    <span className="text-xs text-gray-400">{DEMO_ROLE_LABELS[role]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          {t('noAccount')} <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-700">{t('signup')}</Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          <Link to="/professional-apply" className="font-medium text-secondary-600 hover:text-secondary-700">{t('applyAsProfessional')}</Link>
        </p>
      </div>
    </div>
  );
}
