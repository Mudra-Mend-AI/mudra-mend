import { useEffect, useState, useCallback } from 'react';
import { Banknote, Plus, Check, Loader2, Trash2, Star, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type BankAccount, type BankBranch } from '@/lib/supabase';
import { DEMO_BANK_ACCOUNTS } from '@/lib/demoData';
import { validateIfsc, maskAccountNumberLast4, formatDateTime } from '@/lib/utils';
import { Card, StatCard, LoadingState, EmptyState, statusBadge, ConfirmDialog, Badge } from '@/components/ui';

export default function BankAccounts() {
  const { profile, isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (isDemoMode) {
      setAccounts(DEMO_BANK_ACCOUNTS as unknown as BankAccount[]);
      setLoading(false);
      return;
    }
    if (!profile) return;
    const { data, error } = await supabase.from('bank_accounts').select('*').eq('user_id', profile.id).order('linked_at', { ascending: false });
    if (error) {
      setLoadError(error.message);
      setAccounts([]);
    } else {
      setLoadError('');
      setAccounts((data ?? []) as BankAccount[]);
    }
    setLoading(false);
  }, [profile, isDemoMode]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  if (loading) return <LoadingState />;
  if (!profile) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('bankAccounts')}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('bankAccounts')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('bankAccountsSubtitle')}</p>
        </div>
        {!isDemoMode && <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> {t('addBankAccount')}
        </button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('linkedAccounts')} value={accounts.length} icon={<Banknote size={22} />} accent="primary" />
        <StatCard label={t('verified')} value={accounts.filter((a) => a.verification_status === 'verified').length} icon={<Check size={22} />} accent="success" />
        <StatCard label={t('preferred')} value={accounts.filter((a) => a.is_preferred).length} icon={<Star size={22} />} accent="warning" />
      </div>

      {loadError && !isDemoMode && (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">
          {loadError}
          <button className="ml-2 text-xs underline" onClick={() => loadAccounts()}>Retry</button>
        </div>
      )}

      {accounts.length === 0 && !showForm ? (
        <Card><EmptyState icon={<Banknote size={40} />} title={t('noData')} subtitle={t('linkFirstBankAccount')} /></Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    <Banknote size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{a.bank_name}</p>
                    <p className="text-sm text-gray-500">{maskAccountNumberLast4(a.account_number_last4)} · {a.branch_name} · {a.account_type === 'savings' ? t('savings') : t('current')}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{t('linkedOn')}: {formatDateTime(a.linked_at, lang)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.is_preferred && <Badge variant="info">{t('preferred')}</Badge>}
                  {statusBadge(a.verification_status)}
                  {!isDemoMode && <button onClick={() => setDeleteId(a.id)} className="btn-ghost p-2 text-error-500" aria-label="Delete"><Trash2 size={16} /></button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && profile && !isDemoMode && <AddBankAccountForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadAccounts(); }} userId={profile.id} />}

      {!isDemoMode && <ConfirmDialog
        open={!!deleteId}
        title={t('removeBankAccount')}
        message={t('removeBankAccountConfirm')}
        confirmLabel={t('delete')}
        danger
        onConfirm={async () => {
          if (!deleteId) return;
          const { error } = await supabase.from('bank_accounts').delete().eq('id', deleteId).eq('user_id', profile!.id);
          if (error) { console.error('Delete bank account error:', error.message); return; }
          setDeleteId(null);
          loadAccounts();
        }}
        onCancel={() => setDeleteId(null)}
      />}
    </div>
  );
}

function AddBankAccountForm({ onClose, onSaved, userId }: { onClose: () => void; onSaved: () => void; userId: string }) {
  const { t } = useI18n();
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState<'savings' | 'current'>('savings');
  const [isPreferred, setIsPreferred] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState('');
  const [ifscResolved, setIfscResolved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleIfscLookup = async (code: string) => {
    setIfsc(code.toUpperCase());
    setBankName('');
    setBranchName('');
    setIfscResolved(false);
    setIfscError('');
    if (!validateIfsc(code)) {
      if (code.length >= 11) setIfscError(t('ifscInvalid'));
      return;
    }
    setIfscLoading(true);
    // Query the bank_branches directory (demo data seeded in DB)
    const { data } = await supabase.from('bank_branches').select('*').eq('ifsc', code.toUpperCase()).maybeSingle();
    setIfscLoading(false);
    if (data) {
      const branch = data as BankBranch;
      setBankName(branch.bank_name);
      setBranchName(branch.branch_name);
      setIfscResolved(true);
    } else {
      setIfscError(t('ifscNotFound'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!holderName.trim()) { setError('Account holder name is required'); return; }
    if (!accountNumber || accountNumber.length < 9) { setError('Valid account number is required'); return; }
    if (accountNumber !== confirmAccount) { setError('Account numbers do not match'); return; }
    if (!validateIfsc(ifsc)) { setError(t('ifscInvalid')); return; }
    if (!branchName) { setError('Branch name is required — enter a valid IFSC to autofill'); return; }

    setSaving(true);
    const last4 = accountNumber.slice(-4);
    const { error: insertError } = await supabase.from('bank_accounts').insert({
      user_id: userId,
      holder_name: holderName,
      account_number: accountNumber,
      account_number_last4: last4,
      ifsc: ifsc.toUpperCase(),
      bank_name: bankName,
      branch_name: branchName,
      account_type: accountType,
      verification_status: 'unverified',
      is_preferred: isPreferred,
    });

    if (!insertError) {
      const { data: newAcct } = await supabase.from('bank_accounts').select('id').eq('user_id', userId).order('linked_at', { ascending: false }).limit(1).maybeSingle();
      if (isPreferred && newAcct?.id) {
        await supabase.from('bank_accounts').update({ is_preferred: false }).neq('id', newAcct.id).eq('user_id', userId);
      }
    }

    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">{t('addBankAccount')}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}

          <div>
            <label className="label">{t('holderName')}</label>
            <input className="input" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder={t('asPerBankRecords')} />
          </div>

          <div>
            <label className="label">{t('accountNumber')}</label>
            <input className="input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\s/g, ''))} placeholder={t('accountNumberPlaceholder')} inputMode="numeric" />
          </div>

          <div>
            <label className="label">{t('confirmAccountNumber')}</label>
            <input className="input" value={confirmAccount} onChange={(e) => setConfirmAccount(e.target.value.replace(/\s/g, ''))} placeholder={t('reEnterAccountNumber')} inputMode="numeric" />
          </div>

          <div>
            <label className="label">{t('ifscCode')}</label>
            <div className="relative">
              <input
                className="input pr-10 uppercase"
                value={ifsc}
                onChange={(e) => handleIfscLookup(e.target.value)}
                placeholder={t('ifscExample')}
                maxLength={11}
              />
              {ifscLoading && <Loader2 className="absolute right-3 top-3 animate-spin text-primary-500" size={18} />}
              {ifscResolved && !ifscLoading && <Check className="absolute right-3 top-3 text-success-500" size={18} />}
            </div>
            {ifscLoading && <p className="mt-1 text-xs text-primary-500">{t('verifyingIfsc')}</p>}
            {ifscError && <p className="mt-1 text-xs text-error-500">{ifscError}</p>}
          </div>

          <div>
            <label className="label">{t('bankName')}</label>
            <input className="input bg-gray-50 dark:bg-gray-800/50" value={bankName} readOnly placeholder={t('autoFilledFromIfsc')} />
          </div>

          <div>
            <label className="label">{t('branchName')}</label>
            <input className="input bg-gray-50 dark:bg-gray-800/50" value={branchName} readOnly placeholder={t('autoFilledFromIfsc')} />
          </div>

          <div>
            <label className="label">{t('accountType')}</label>
            <select className="input" value={accountType} onChange={(e) => setAccountType(e.target.value as 'savings' | 'current')}>
              <option value="savings">{t('savings')}</option>
              <option value="current">{t('current')}</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPreferred} onChange={(e) => setIsPreferred(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            {t('preferred')}
          </label>

          <div className="rounded-lg bg-warning-50 px-3 py-2.5 text-xs text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
            {t('ifscLookupNote')}
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving || !ifscResolved}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
