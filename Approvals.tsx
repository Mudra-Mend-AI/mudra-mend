import { useState, useCallback, useEffect } from 'react';
import { CheckCircle, X, Check, FlaskConical, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, type ProfessionalApplication } from '@/lib/supabase';
import { DEMO_PROFESSIONAL_APPS } from '@/lib/demoData';
import { Card, LoadingState, EmptyState, statusBadge, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

export default function Approvals() {
  const { t, lang } = useI18n();
  const { profile, isDemoMode } = useAuth();
  const [apps, setApps] = useState<ProfessionalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ app: ProfessionalApplication; type: 'approve' | 'reject' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (isDemoMode) {
      setApps(DEMO_PROFESSIONAL_APPS as unknown as ProfessionalApplication[]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('professional_applications').select('*').order('created_at', { ascending: false });
    setApps((data ?? []) as ProfessionalApplication[]);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const doApprove = async (app: ProfessionalApplication, notes: string) => {
    if (!profile) return;
    if (app.user_id === profile.id) {
      setError('You cannot approve your own application. Self-approval is not allowed.');
      return;
    }
    setActionLoading(app.id);
    if (!isDemoMode) {
      const { error: appError } = await supabase.from('professional_applications').update({
        status: 'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString(), review_notes: notes,
      }).eq('id', app.id);
      if (appError) { setActionLoading(null); setError(appError.message); return; }
      const { error: roleError } = await supabase.rpc('admin_update_profile_role', {
        target_user_id: app.user_id, new_role: app.requested_role, new_status: 'active',
      });
      if (roleError) { setActionLoading(null); setError(roleError.message); return; }
      await supabase.from('audit_logs').insert({ actor_id: profile.id, action: 'approve_professional_application', target_type: 'professional_applications', target_id: app.id, metadata: { requested_role: app.requested_role, notes } });
    } else {
      setApps(apps.map((a) => a.id === app.id ? { ...a, status: 'approved', review_notes: notes } : a));
    }
    setActionLoading(null);
    setConfirmAction(null);
    setReviewNotes('');
    load();
  };

  const doReject = async (app: ProfessionalApplication, notes: string) => {
    if (!profile) return;
    setActionLoading(app.id);
    if (!isDemoMode) {
      const { error: appError } = await supabase.from('professional_applications').update({
        status: 'rejected', reviewed_by: profile.id, reviewed_at: new Date().toISOString(), review_notes: notes,
      }).eq('id', app.id);
      if (appError) { setActionLoading(null); setError(appError.message); return; }
      const { error: logError } = await supabase.from('audit_logs').insert({ actor_id: profile.id, action: 'reject_professional_application', target_type: 'professional_applications', target_id: app.id });
      if (logError) console.error('Audit log error:', logError.message);
    } else {
      setApps(apps.map((a) => a.id === app.id ? { ...a, status: 'rejected', review_notes: notes } : a));
    }
    setActionLoading(null);
    setConfirmAction(null);
    setReviewNotes('');
    load();
  };

  const roleLabel = (role: string) => {
    const key = `role${role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as 'roleCustomer' | 'roleAdmin' | 'roleFraudAnalyst' | 'roleBankOfficer' | 'roleInvestigator' | 'roleAuditor' | 'roleCustomerSupport' | 'roleNgoCoordinator' | 'roleGovOfficial';
    return t(key);
  };

  const pending = apps.filter((a) => a.status === 'pending');
  const reviewed = apps.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('demoApplications')}. {t('demoApprovalsNote')}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{t('approvals')}</h1>
        <p className="mt-1 text-sm text-gray-500">{pending.length} pending professional applications</p>
      </div>

      {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}

      <div className="rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-900/20 dark:text-warning-300">
        Professional accounts remain pending until verified by an administrator. Submitted information alone is not proof of employment or authority.
      </div>

      {loading ? <LoadingState /> : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">{t('pendingReview')}</h2>
              {pending.map((app) => (
                <Card key={app.id}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{roleLabel(app.requested_role)}</Badge>
                        {statusBadge(app.status)}
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {(Object.entries(app.submission_data) as [string, unknown][]).map(([k, v]) => (
                          <p key={k}><span className="text-gray-400">{k}:</span> {String(v)}</p>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{formatDateTime(app.created_at, lang)}</p>
                    </div>
                    <div className="flex gap-2">
                      {app.user_id === profile?.id ? (
                        <span className="text-xs text-gray-400">{t('cannotSelfApprove')}</span>
                      ) : (
                        <>
                          <button className="btn-primary" onClick={() => setConfirmAction({ app, type: 'approve' })} disabled={actionLoading === app.id}>
                            {actionLoading === app.id ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> {t('approve')}</>}
                          </button>
                          <button className="btn-danger" onClick={() => setConfirmAction({ app, type: 'reject' })} disabled={actionLoading === app.id}>
                            <X size={16} /> {t('reject')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {reviewed.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">{t('reviewed')}</h2>
              {reviewed.map((app) => (
                <Card key={app.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="info">{roleLabel(app.requested_role)}</Badge>
                      {app.review_notes && <p className="mt-1 text-xs text-gray-500">{t('notes')}: {app.review_notes}</p>}
                      <p className="mt-1 text-xs text-gray-400">{formatDateTime(app.created_at, lang)}</p>
                    </div>
                    {statusBadge(app.status)}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {apps.length === 0 && <Card><EmptyState icon={<CheckCircle size={40} />} title={t('noData')} /></Card>}
        </>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => { setConfirmAction(null); setReviewNotes(''); }}>
          <div className="card w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{confirmAction.type === 'approve' ? t('approveApplication') : t('rejectApplication')}</h2>
              <button onClick={() => { setConfirmAction(null); setReviewNotes(''); }} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {confirmAction.type === 'approve'
                ? `Grant ${roleLabel(confirmAction.app.requested_role)} access to this applicant?`
                : `Reject this ${roleLabel(confirmAction.app.requested_role)} application?`}
            </p>
            <div className="mt-3">
              <label className="label">{t('reviewNotesLabel')} {confirmAction.type === 'reject' && <span className="text-error-500">*</span>}</label>
              <textarea className="input min-h-[80px]" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder={confirmAction.type === 'approve' ? t('optionalApprovalNotes') : t('reasonForRejection')} autoFocus />
            </div>
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => { setConfirmAction(null); setReviewNotes(''); }}>{t('cancel')}</button>
              <button
                className={confirmAction.type === 'approve' ? 'btn-primary flex-1' : 'btn-danger flex-1'}
                onClick={() => confirmAction.type === 'approve' ? doApprove(confirmAction.app, reviewNotes || 'Approved') : doReject(confirmAction.app, reviewNotes || 'Rejected')}
                disabled={confirmAction.type === 'reject' && !reviewNotes.trim()}
              >
                {confirmAction.type === 'approve' ? <><Check size={16} /> {t('confirmApprove')}</> : <><X size={16} /> {t('confirmReject')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
