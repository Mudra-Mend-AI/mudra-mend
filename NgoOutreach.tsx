import { useEffect, useState, useCallback } from 'react';
import { HeartHandshake, Plus, X, Users, MapPin, Search, Filter, FlaskConical, UserPlus, Phone, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { TranslationKey } from '@/i18n/translations';
import { useAuth } from '@/context/AuthContext';
import { supabase, type NgoProgram, type BeneficiaryReferral } from '@/lib/supabase';
import { DEMO_PROGRAMS } from '@/lib/demoData';
import { Card, StatCard, LoadingState, EmptyState, statusBadge, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type Tab = 'programs' | 'referrals';

export default function NgoOutreach() {
  const { t, lang } = useI18n();
  const { profile, isDemoMode } = useAuth();
  const [tab, setTab] = useState<Tab>('programs');
  const [programs, setPrograms] = useState<NgoProgram[]>([]);
  const [referrals, setReferrals] = useState<BeneficiaryReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const canEdit = (profile?.role === 'admin' || profile?.role === 'ngo_coordinator') && !isDemoMode;
  const [editingProgram, setEditingProgram] = useState<NgoProgram | null>(null);

  const handleReferralStatusUpdate = async (id: string, newStatus: string) => {
    if (isDemoMode) {
      setReferrals(referrals.map((r) => r.id === id ? { ...r, status: newStatus as BeneficiaryReferral['status'] } : r));
      return;
    }
    const { error } = await supabase.from('beneficiary_referrals').update({ status: newStatus }).eq('id', id);
    if (error) { console.error('Referral status update error:', error.message); return; }
    setReferrals(referrals.map((r) => r.id === id ? { ...r, status: newStatus as BeneficiaryReferral['status'] } : r));
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm(t('confirmDeleteProgram'))) return;
    if (isDemoMode) {
      setPrograms(programs.filter((p) => p.id !== id));
      return;
    }
    const { error } = await supabase.from('ngo_programs').delete().eq('id', id);
    if (error) { console.error('Delete program error:', error.message); return; }
    setPrograms(programs.filter((p) => p.id !== id));
  };

  const load = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) {
      setPrograms(DEMO_PROGRAMS as unknown as NgoProgram[]);
      setReferrals([]);
      setLoading(false);
      return;
    }
    const [progRes, refRes] = await Promise.all([
      supabase.from('ngo_programs').select('*').order('created_at', { ascending: false }),
      profile ? supabase.from('beneficiary_referrals').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: null }),
    ]);
    setPrograms((progRes.data ?? []) as NgoProgram[]);
    setReferrals((refRes.data ?? []) as BeneficiaryReferral[]);
    setLoading(false);
  }, [isDemoMode, profile]);

  useEffect(() => { load(); }, [load]);

  const totalBeneficiaries = programs.reduce((s, p) => s + p.beneficiaries_reached, 0);
  const totalEvents = programs.reduce((s, p) => s + p.outreach_events_count, 0);

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.region ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch = !search || r.beneficiary_name.toLowerCase().includes(search.toLowerCase()) || (r.region ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const referralStatusBadge = (status: string) => {
    const map: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'error'> = {
      pending: 'warning',
      contacted: 'info',
      enrolled: 'success',
      completed: 'success',
      closed: 'neutral',
    };
    return <Badge variant={map[status] ?? 'neutral'}>{t(`referral${status.charAt(0).toUpperCase() + status.slice(1)}` as Parameters<typeof t>[0])}</Badge>;
  };

  const assistanceTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      financial_aid: t('assistanceFinancialAid'),
      literacy: t('assistanceLiteracy'),
      scheme_enrollment: t('assistanceSchemeEnrollment'),
      other: t('assistanceOther'),
    };
    return map[type] ?? type;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('ngoOutreach')}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('ngoOutreach')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('ngoOutreachSubtitle')}</p>
        </div>
        {canEdit && tab === 'programs' && <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> {t('add')}</button>}
        {canEdit && tab === 'referrals' && <button className="btn-primary" onClick={() => setShowReferralForm(true)}><UserPlus size={18} /> {t('newReferral')}</button>}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => { setTab('programs'); setSearch(''); setStatusFilter('all'); }} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === 'programs' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          <HeartHandshake size={16} /> {t('programs')}
        </button>
        <button onClick={() => { setTab('referrals'); setSearch(''); setStatusFilter('all'); }} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === 'referrals' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          <UserPlus size={16} /> {t('beneficiaryReferrals')}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input pl-10" placeholder={tab === 'programs' ? t('searchPrograms') : t('beneficiaryName')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t('statusAll')}</option>
            {tab === 'programs' ? (
              <>
                <option value="planned">{t('statusPlanned')}</option>
                <option value="active">{t('statusActive')}</option>
                <option value="completed">{t('statusCompleted')}</option>
                <option value="paused">{t('statusPaused')}</option>
              </>
            ) : (
              <>
                <option value="pending">{t('referralPending')}</option>
                <option value="contacted">{t('referralContacted')}</option>
                <option value="enrolled">{t('referralEnrolled')}</option>
                <option value="completed">{t('referralCompleted')}</option>
                <option value="closed">{t('referralClosed')}</option>
              </>
            )}
          </select>
        </div>
      </div>

      {tab === 'programs' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('programs')} value={programs.length} icon={<HeartHandshake size={22} />} accent="secondary" />
          <StatCard label={t('beneficiaries')} value={totalBeneficiaries} icon={<Users size={22} />} accent="primary" />
          <StatCard label={t('events')} value={totalEvents} icon={<MapPin size={22} />} accent="success" />
        </div>
      )}

      {tab === 'programs' && (
        <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-900/20 dark:text-success-300">
          {t('beneficiaryPrivacyNote')}
        </div>
      )}

      {loading ? <LoadingState /> : tab === 'programs' ? (
        filteredPrograms.length === 0 ? (
          <Card><EmptyState icon={<HeartHandshake size={40} />} title={t('noData')} /></Card>
        ) : (
          <div className="space-y-3">
            {filteredPrograms.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                    <p className="mt-1 text-xs text-gray-400">{p.region ?? '—'} · {formatDate(p.created_at, lang)}</p>
                    <p className="text-xs text-gray-400">{p.beneficiaries_reached} {t('beneficiaries').toLowerCase()} · {p.outreach_events_count} {t('events').toLowerCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(p.status)}
                    {canEdit && (
                      <>
                        <button className="btn-ghost p-1.5" onClick={(e) => { e.stopPropagation(); setEditingProgram(p); }} title={t('editProgram')}><Pencil size={14} /></button>
                        <button className="btn-ghost p-1.5 text-error-600" onClick={(e) => { e.stopPropagation(); handleDeleteProgram(p.id); }} title={t('deleteProgram')}><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          <p className="mb-4 text-sm text-gray-500">{t('referralSubtitle')}</p>
          {filteredReferrals.length === 0 ? (
            <EmptyState icon={<UserPlus size={40} />} title={t('noData')} subtitle={canEdit ? t('newReferral') : undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-gray-800">
                    <th className="py-2 pr-4 font-medium">{t('beneficiaryName')}</th>
                    <th className="py-2 pr-4 font-medium">{t('assistanceType')}</th>
                    <th className="py-2 pr-4 font-medium">{t('region')}</th>
                    <th className="py-2 pr-4 font-medium">{t('referralStatus')}</th>
                    <th className="py-2 pr-4 font-medium">{t('lastUpdated')}</th>
                    {canEdit && <th className="py-2 pr-4 font-medium">{t('actions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.beneficiary_name}</p>
                        {r.contact && <p className="flex items-center gap-1 text-xs text-gray-400"><Phone size={10} /> {r.contact}</p>}
                      </td>
                      <td className="py-3 pr-4">{assistanceTypeLabel(r.assistance_type)}</td>
                      <td className="py-3 pr-4 text-gray-500">{r.region ?? '—'}</td>
                      <td className="py-3 pr-4">{referralStatusBadge(r.status)}</td>
                      <td className="py-3 pr-4 text-xs text-gray-400">{formatDate(r.created_at, lang)}</td>
                      <td className="py-3 pr-4">
                        {canEdit && (
                          <ReferralStatusUpdate referral={r} onUpdate={(newStatus) => handleReferralStatusUpdate(r.id, newStatus)} t={t} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {showForm && canEdit && <ProgramForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {showReferralForm && canEdit && profile && <ReferralForm userId={profile.id} programs={programs} onClose={() => setShowReferralForm(false)} onSaved={() => { setShowReferralForm(false); load(); }} />}
      {editingProgram && canEdit && <ProgramForm program={editingProgram} onClose={() => setEditingProgram(null)} onSaved={() => { setEditingProgram(null); load(); }} />}
    </div>
  );
}

function ProgramForm({ program, onClose, onSaved }: { program?: NgoProgram | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(program?.name ?? '');
  const [description, setDescription] = useState(program?.description ?? '');
  const [region, setRegion] = useState(program?.region ?? '');
  const [status, setStatus] = useState<string>(program?.status ?? 'planned');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t('programNameRequired')); return; }
    if (program) {
      const { error: updateError } = await supabase.from('ngo_programs').update({ name: name.trim(), description: description || null, region: region || null, status }).eq('id', program.id);
      if (updateError) { setError(updateError.message); return; }
    } else {
      const { data: org } = await supabase.from('organizations').select('id').eq('type', 'ngo').limit(1).maybeSingle();
      const orgId = (org as { id: string } | null)?.id;
      if (!orgId) {
        const { data: newOrg, error: orgError } = await supabase.from('organizations').insert({ type: 'ngo', name: 'Default NGO', verification_status: 'pending' }).select('id').maybeSingle();
        if (orgError || !newOrg) { setError(orgError?.message ?? 'Failed to create organization'); return; }
        const { error: progError } = await supabase.from('ngo_programs').insert({ organization_id: (newOrg as { id: string }).id, name: name.trim(), description: description || null, region: region || null, status });
        if (progError) { setError(progError.message); return; }
      } else {
        const { error: progError } = await supabase.from('ngo_programs').insert({ organization_id: orgId, name: name.trim(), description: description || null, region: region || null, status });
        if (progError) { setError(progError.message); return; }
      }
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{program ? t('editProgram') : t('newProgram')}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
          <div><label className="label">{t('programName')}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label">{t('description')}</label><textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><label className="label">{t('region')}</label><input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t('regionPlaceholder')} /></div>
          {program && (
            <div><label className="label">{t('programStatus')}</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="planned">{t('statusPlanned')}</option>
                <option value="active">{t('statusActive')}</option>
                <option value="completed">{t('statusCompleted')}</option>
                <option value="paused">{t('statusPaused')}</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary w-full">{t('submit')}</button>
        </form>
      </div>
    </div>
  );
}

function ReferralForm({ userId, programs, onClose, onSaved }: { userId: string; programs: NgoProgram[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [contact, setContact] = useState('');
  const [region, setRegion] = useState('');
  const [assistanceType, setAssistanceType] = useState<BeneficiaryReferral['assistance_type']>('financial_aid');
  const [programId, setProgramId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryName.trim()) { setError(t('beneficiaryNameRequired')); return; }
    setSubmitting(true);
    const { error: refError } = await supabase.from('beneficiary_referrals').insert({
      referrer_id: userId,
      beneficiary_name: beneficiaryName.trim(),
      contact: contact || null,
      region: region || null,
      assistance_type: assistanceType,
      program_id: programId || null,
      notes: notes || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (refError) { setError(refError.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('newReferral')}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
          <div><label className="label">{t('beneficiaryName')}</label><input className="input" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} autoFocus /></div>
          <div><label className="label">{t('contactInfo')}</label><input className="input" value={contact} onChange={(e) => setContact(e.target.value)} /></div>
          <div><label className="label">{t('region')}</label><input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t('regionPlaceholder')} /></div>
          <div>
            <label className="label">{t('assistanceType')}</label>
            <select className="input" value={assistanceType} onChange={(e) => setAssistanceType(e.target.value as BeneficiaryReferral['assistance_type'])}>
              <option value="financial_aid">{t('assistanceFinancialAid')}</option>
              <option value="literacy">{t('assistanceLiteracy')}</option>
              <option value="scheme_enrollment">{t('assistanceSchemeEnrollment')}</option>
              <option value="other">{t('assistanceOther')}</option>
            </select>
          </div>
          {programs.length > 0 && (
            <div>
              <label className="label">{t('programs')}</label>
              <select className="input" value={programId} onChange={(e) => setProgramId(e.target.value)}>
                <option value="">—</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div><label className="label">{t('referralNotes')}</label><textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? t('submitting') : t('submit')}</button>
        </form>
      </div>
    </div>
  );
}

function ReferralStatusUpdate({ referral, onUpdate, t }: { referral: BeneficiaryReferral; onUpdate: (status: string) => void; t: (key: TranslationKey) => string }) {
  const [open, setOpen] = useState(false);
  const statusKeys: { value: string; key: TranslationKey }[] = [
    { value: 'pending', key: 'referralPending' },
    { value: 'contacted', key: 'referralContacted' },
    { value: 'enrolled', key: 'referralEnrolled' },
    { value: 'completed', key: 'referralCompleted' },
    { value: 'closed', key: 'referralClosed' },
  ];

  return (
    <div className="relative">
      <button className="btn-ghost p-1.5 text-xs" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {statusKeys.map((s) => (
              <button
                key={s.value}
                className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${referral.status === s.value ? 'font-bold text-primary-600' : 'text-gray-600 dark:text-gray-400'}`}
                onClick={(e) => { e.stopPropagation(); onUpdate(s.value); setOpen(false); }}
              >
                {t(s.key)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
