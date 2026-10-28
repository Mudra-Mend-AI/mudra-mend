import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Clock, ArrowLeft, LogOut, AlertCircle, Loader2, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase } from '@/lib/supabase';

interface PendingApp {
  id: string;
  requested_role: string;
  status: string;
}

export default function AccountPending() {
  const { t } = useI18n();
  const { signOut, refreshProfile, profile } = useAuth();
  const navigate = useNavigate();
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [myApp, setMyApp] = useState<PendingApp | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState('');
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!profile) return;
    const { data: adminData } = await supabase.rpc('has_admin');
    setAdminExists(Boolean(adminData));
    const { data: appData } = await supabase
      .from('professional_applications')
      .select('id, requested_role, status')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setMyApp((appData as PendingApp | null) ?? null);
  }, [profile]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleRefresh = async () => {
    await refreshProfile();
    checkStatus();
  };

  const handleBootstrap = async () => {
    setBootstrapError('');
    setBootstrapping(true);
    const { error } = await supabase.rpc('bootstrap_initial_admin');
    setBootstrapping(false);
    if (error) {
      setBootstrapError(error.message);
      return;
    }
    setBootstrapSuccess(true);
    await refreshProfile();
  };

  const canBootstrap = adminExists === false && myApp?.requested_role === 'admin' && myApp?.status === 'pending';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-warning-50/30 px-4 dark:from-gray-950 dark:to-warning-950/20">
      <div className="absolute left-4 top-4">
        <Link to="/" className="btn-ghost text-sm">
          <ArrowLeft size={16} /> {t('back')}
        </Link>
      </div>
      <div className="w-full max-w-md animate-slide-up text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400">
          <Clock size={28} />
        </div>
        <h1 className="text-2xl font-bold">{t('accountPendingTitle')}</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {t('accountPendingDesc')}
        </p>

        {adminExists === false && (
          <div className="mt-5 rounded-lg border border-error-200 bg-error-50 p-4 text-left dark:border-error-800 dark:bg-error-900/20">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-error-600 dark:text-error-400" />
              <div>
                <p className="text-sm font-semibold text-error-700 dark:text-error-300">{t('setupRequired')}</p>
                <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                  {t('activateAsAdminDesc')}
                </p>
              </div>
            </div>
            {canBootstrap ? (
              <div className="mt-3">
                {bootstrapError && <p className="mb-2 text-xs text-error-600 dark:text-error-400">{bootstrapError}</p>}
                {bootstrapSuccess ? (
                  <p className="text-xs font-medium text-success-600 dark:text-success-400">Administrator account activated. Redirecting...</p>
                ) : (
                  <button onClick={handleBootstrap} disabled={bootstrapping} className="btn-primary w-full text-sm">
                    {bootstrapping ? <Loader2 size={16} className="animate-spin" /> : <><UserCheck size={16} /> {t('activateAsAdmin')}</>}
                  </button>
                )}
                <p className="mt-2 text-xs text-error-500 dark:text-error-400">
                  This is only available because no admin exists. Once activated, this option is permanently disabled.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-error-500 dark:text-error-400">
                To become the initial administrator, submit a professional application with the Administrator role, then return here.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <button onClick={handleRefresh} className="btn-primary">
            <Shield size={16} /> {t('checkAdminApproval')}
          </button>
          <button onClick={handleSignOut} className="btn-secondary">
            <LogOut size={16} /> {t('logout')}
          </button>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
