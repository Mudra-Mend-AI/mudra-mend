import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase, type Role } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/context/ThemeContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Spinner } from '@/components/ui';
import { validateEmail, validatePassword } from '@/lib/utils';

const PRO_ROLES: { value: Role; labelKey: 'roleAdmin' | 'roleFraudAnalyst' | 'roleBankOfficer' | 'roleInvestigator' | 'roleAuditor' | 'roleCustomerSupport' | 'roleNgoCoordinator' | 'roleGovOfficial'; fields: string[] }[] = [
  { value: 'admin', labelKey: 'roleAdmin', fields: ['Official Email', 'Administrator ID', 'Designation', 'Requested Permission Level'] },
  { value: 'fraud_analyst', labelKey: 'roleFraudAnalyst', fields: ['Organization', 'Employee ID', 'Department', 'Designation', 'Analysis Scope'] },
  { value: 'bank_officer', labelKey: 'roleBankOfficer', fields: ['Bank Name', 'Branch', 'Employee ID', 'Official Email', 'Designation'] },
  { value: 'investigator', labelKey: 'roleInvestigator', fields: ['Agency', 'Employee ID', 'Department', 'Designation', 'Assigned Region'] },
  { value: 'auditor', labelKey: 'roleAuditor', fields: ['Organization', 'Auditor ID', 'Department', 'Audit Scope', 'Access Expiry'] },
  { value: 'customer_support', labelKey: 'roleCustomerSupport', fields: ['Employee ID', 'Support Team', 'Supervisor', 'Ticket Permissions'] },
  { value: 'ngo_coordinator', labelKey: 'roleNgoCoordinator', fields: ['NGO Name', 'Registration Number', 'Official Contact', 'Designation', 'Program/Region'] },
  { value: 'gov_official', labelKey: 'roleGovOfficial', fields: ['Government Department', 'Official Email', 'Designation', 'Employee ID', 'Scheme/Region Scope'] },
];

export default function ProfessionalApply() {
  const { t } = useI18n();
  const { toggleTheme, theme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('fraud_analyst');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const roleConfig = PRO_ROLES.find((r) => r.value === selectedRole)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email'); return; }
    const pwdErr = validatePassword(password);
    if (pwdErr) { setError(pwdErr); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    for (const f of roleConfig.fields) {
      if (!fieldValues[f]?.trim()) { setError(`Please fill in: ${f}`); return; }
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, preferred_language: 'en' } },
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    if (data.user) {
      // Create a pending profile (professional accounts stay pending until admin approval)
      await supabase.from('profiles').upsert({
        id: data.user.id,
        role: 'customer', // stays as customer until approved, but profile status is pending
        status: 'pending',
        full_name: fullName,
        preferred_language: 'en',
        theme: theme,
      });

      // Submit professional application
      await supabase.from('professional_applications').insert({
        user_id: data.user.id,
        requested_role: selectedRole,
        submission_data: { fullName, email, ...fieldValues },
        status: 'pending',
      });

      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-primary-50/30 px-4 dark:from-gray-950 dark:to-primary-950/20">
        <div className="w-full max-w-md animate-slide-up text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-bold">Application Submitted</h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Your professional account application has been received. An administrator will review it.
            You will be notified when your account is approved. Until then, you can log in as a customer.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/login" className="btn-primary">{t('login')}</Link>
            <Link to="/" className="btn-secondary">{t('back')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30 px-4 py-8 dark:from-gray-950 dark:to-primary-950/20">
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

      <div className="mx-auto max-w-2xl animate-slide-up">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-600 text-white">
            <Building2 size={24} />
          </div>
          <h1 className="text-2xl font-bold">{t('applyAsProfessional')}</h1>
          <p className="mt-1 text-sm text-gray-500">Submit your details for administrator review. Accounts remain pending until approved.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('fullName')}</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">{t('password')}</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('confirmPassword')}</label>
              <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Role</label>
            <select className="input" value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value as Role); setFieldValues({}); }}>
              {PRO_ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.labelKey)}</option>)}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {roleConfig.fields.map((f) => (
              <div key={f}>
                <label className="label">{f}</label>
                <input className="input" value={fieldValues[f] ?? ''} onChange={(e) => setFieldValues({ ...fieldValues, [f]: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-warning-50 px-3 py-2.5 text-sm text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
            Submitted information alone is not proof of employment or authority. Your account will remain pending until verified by an administrator.
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner /> : <>{t('submit')} <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">{t('login')}</Link>
          {' · '}
          <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-700">{t('signup')}</Link>
        </p>
      </div>
    </div>
  );
}
