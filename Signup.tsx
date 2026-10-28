import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/context/ThemeContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Spinner } from '@/components/ui';
import { validateEmail, validatePassword, generateOtp, sleep } from '@/lib/utils';

export default function Signup() {
  const { t, lang, setLang } = useI18n();
  const { toggleTheme, theme } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [preferredLang, setPreferredLang] = useState<'en' | 'hi' | 'mr'>(lang);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [otpUsed, setOtpUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email address'); return; }
    const pwdErr = validatePassword(password);
    if (pwdErr) { setError(pwdErr); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!acceptedTerms) { setError('Please accept the Terms and Privacy Policy'); return; }

    setLoading(true);
    const demoOtp = generateOtp();
    setGeneratedOtp(demoOtp);
    setOtpExpiresAt(Date.now() + 5 * 60 * 1000);
    setOtpUsed(false);
    setInfo(`Demo OTP (email confirmation is off): ${demoOtp}`);
    setStep('otp');
    setLoading(false);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otpUsed) { setError(t('otpExpired')); return; }
    if (Date.now() > otpExpiresAt) { setError(t('otpExpired')); return; }
    if (!otp.trim() || otp !== generatedOtp) { setError(t('otpExpired')); return; }

    setLoading(true);
    setOtpUsed(true);
    setLang(preferredLang);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, preferred_language: preferredLang } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      setOtpUsed(false);
      return;
    }

    if (data.user) {
      await sleep(300);
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        role: 'customer',
        status: 'active',
        full_name: fullName,
        preferred_language: preferredLang,
        theme: theme,
      });
      if (profileError) {
        setError(`Account created but profile setup failed: ${profileError.message}. Please log in.`);
        setLoading(false);
        setOtpUsed(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(`Account created. Please log in: ${signInError.message}`);
        setLoading(false);
        return;
      }
      navigate('/app');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-primary-50/30 px-4 py-8 dark:from-gray-950 dark:to-primary-950/20">
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
          <h1 className="text-2xl font-bold">{t('createAccount')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('signupSubtitle')}</p>
        </div>

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="card space-y-4 p-6">
            {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}

            <div>
              <label className="label">{t('fullName')}</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                <input className="input pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rajesh Kumar" autoFocus />
              </div>
            </div>

            <div>
              <label className="label">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="label">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type={showPwd ? 'text' : 'password'} className="input pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">{t('confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type={showPwd ? 'text' : 'password'} className="input pl-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>

            <div>
              <label className="label">{t('preferredLanguage')}</label>
              <select className="input" value={preferredLang} onChange={(e) => setPreferredLang(e.target.value as 'en' | 'hi' | 'mr')}>
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              {t('acceptTerms')}
            </label>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner /> : <>{t('sendOtp')} <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="card space-y-4 p-6">
            {info && (
              <div className="rounded-lg bg-warning-50 px-3 py-2.5 text-sm text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
                {info}
              </div>
            )}
            {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}

            <div>
              <label className="label">{t('otp')}</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 text-gray-400" size={18} />
                <input className="input pl-10 text-center text-lg tracking-widest" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" autoFocus />
              </div>
              <p className="mt-2 text-xs text-gray-500">{t('otpSent')}</p>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner /> : <>{t('verifyOtp')} <ArrowRight size={16} /></>}
            </button>
            <button type="button" className="btn-ghost w-full" onClick={() => setStep('details')}>{t('back')}</button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          {t('haveAccount')} <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">{t('login')}</Link>
        </p>
      </div>
    </div>
  );
}
