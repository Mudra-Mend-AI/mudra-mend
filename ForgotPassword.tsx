import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/context/ThemeContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Spinner } from '@/components/ui';
import { validateEmail } from '@/lib/utils';

export default function ForgotPassword() {
  const { t } = useI18n();
  const { toggleTheme, theme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) { setError('Please enter a valid email'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-primary-50/30 px-4 dark:from-gray-950 dark:to-primary-950/20">
      <div className="absolute left-4 top-4">
        <Link to="/login" className="btn-ghost text-sm">
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
          <h1 className="text-2xl font-bold">{t('resetPassword')}</h1>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Password reset instructions have been sent to your email.</p>
              <button onClick={() => navigate('/login')} className="btn-primary mt-4 w-full">{t('login')}</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
              <div>
                <label className="label">{t('email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input type="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? <Spinner /> : <>{t('resetPassword')} <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">{t('login')}</Link>
        </p>
      </div>
    </div>
  );
}
