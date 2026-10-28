import { useState, useCallback, useEffect } from 'react';
import { FolderKanban, Plus, X, FileText, Clock, Search, Filter, FlaskConical } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Case } from '@/lib/supabase';
import { DEMO_CASES } from '@/lib/demoData';
import { Card, LoadingState, EmptyState, statusBadge, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

const STATUSES = ['open', 'under_investigation', 'pending_review', 'closed', 'escalated'];

export default function Cases() {
  const { t, lang } = useI18n();
  const { profile, isDemoMode } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    if (isDemoMode) {
      setCases(DEMO_CASES as unknown as Case[]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
    setCases((data ?? []) as Case[]);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const canCreate = profile?.role === 'admin' || profile?.role === 'fraud_analyst' || profile?.role === 'investigator';

  const filtered = cases.filter((c) => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.notes ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('cases')}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('cases')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('investigatorDashboardSubtitle2')}</p>
        </div>
        {canCreate && !isDemoMode && <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> {t('add')}</button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input pl-10" placeholder={t('searchCases')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t('all')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<FolderKanban size={40} />} title={t('noData')} subtitle={t('noCasesMatchFilters')} /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-card-hover" onClick={() => setSelectedCase(c)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(c.created_at, lang)} · Assigned: {c.assigned_to ?? 'Unassigned'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{c.priority}</Badge>
                  {statusBadge(c.status)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && <CaseForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} creatorId={profile?.id ?? ''} />}
      {selectedCase && <CaseDetail caseData={selectedCase} onClose={() => setSelectedCase(null)} onChanged={load} canEdit={canCreate} isDemoMode={isDemoMode} lang={lang} />}
    </div>
  );
}

function CaseForm({ onClose, onSaved, creatorId }: { onClose: () => void; onSaved: () => void; creatorId: string }) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError(t('titleRequired')); return; }
    setSubmitting(true);
    setError('');
    const { error: insertError } = await supabase.from('cases').insert({ title: title.trim(), priority, notes: notes || null, status: 'open', assigned_to: creatorId });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('newCase')}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
          <div><label className="label">{t('title')}</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div><label className="label">{t('priority')}</label><select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="low">{t('lowLabel')}</option><option value="medium">{t('mediumLabel')}</option><option value="high">{t('highLabel')}</option><option value="critical">{t('criticalLabel')}</option></select></div>
          <div><label className="label">{t('notes')}</label><textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? t('creatingEllipsis') : t('submit')}</button>
        </form>
      </div>
    </div>
  );
}

function CaseDetail({ caseData, onClose, onChanged, canEdit, isDemoMode, lang }: { caseData: Case; onClose: () => void; onChanged: () => void; canEdit: boolean; isDemoMode: boolean; lang: 'en' | 'hi' | 'mr' }) {
  const { t } = useI18n();
  const [status, setStatus] = useState(caseData.status);
  const [timeline, setTimeline] = useState<{ id: string; action: string; note: string | null; created_at: string }[]>([]);
  const [newNote, setNewNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setTimeline([
        { id: 'tl1', action: 'Case created', note: caseData.notes, created_at: caseData.created_at },
        { id: 'tl2', action: `Status: ${caseData.status}`, note: null, created_at: caseData.updated_at },
      ]);
      return;
    }
    supabase.from('case_timeline').select('id,action,note,created_at').eq('case_id', caseData.id).order('created_at', { ascending: false }).then(({ data }) => {
      setTimeline((data ?? []) as { id: string; action: string; note: string | null; created_at: string }[]);
    });
  }, [caseData.id, isDemoMode, caseData.notes, caseData.status, caseData.created_at, caseData.updated_at]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    if (!isDemoMode) {
      const { error: updateError } = await supabase.from('cases').update({ status: newStatus }).eq('id', caseData.id);
      if (updateError) {
        console.error('Case status update error:', updateError.message);
        setUpdating(false);
        return;
      }
      const { error: tlError } = await supabase.from('case_timeline').insert({ case_id: caseData.id, action: `Status changed to ${newStatus}` });
      if (tlError) console.error('Timeline insert error:', tlError.message);
    }
    setStatus(newStatus as Case['status']);
    setTimeline([{ id: `tl-${Date.now()}`, action: `Status changed to ${newStatus}`, note: null, created_at: new Date().toISOString() }, ...timeline]);
    setUpdating(false);
    onChanged();
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setUpdating(true);
    if (!isDemoMode) {
      const { error: noteError } = await supabase.from('case_timeline').insert({ case_id: caseData.id, action: 'Note added', note: newNote.trim() });
      if (noteError) {
        console.error('Note insert error:', noteError.message);
        setUpdating(false);
        return;
      }
    }
    setTimeline([{ id: `tl-${Date.now()}`, action: 'Note added', note: newNote.trim(), created_at: new Date().toISOString() }, ...timeline]);
    setNewNote('');
    setUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{caseData.title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="neutral">{caseData.priority}</Badge>
          {statusBadge(caseData.status)}
          <span className="text-xs text-gray-400">{t('assigned')}: {caseData.assigned_to ?? t('unassigned')}</span>
        </div>
        {caseData.notes && <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{caseData.notes}</p>}

        {canEdit && (
          <div className="mt-4">
            <label className="label">{t('updateStatus')}</label>
            <select className="input" value={status} onChange={(e) => updateStatus(e.target.value)} disabled={updating}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        )}

        {canEdit && (
          <div className="mt-4">
            <label className="label">{t('addNote')}</label>
            <div className="flex gap-2">
              <input className="input" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t('addInvestigationNote')} onKeyDown={(e) => e.key === 'Enter' && addNote()} />
              <button className="btn-secondary" onClick={addNote} disabled={updating || !newNote.trim()}><Plus size={16} /></button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Clock size={18} /> {t('timeline')}</h3>
          {timeline.length === 0 ? <p className="text-sm text-gray-400">{t('noTimelineEntries')}</p> : (
            <div className="space-y-2">
              {timeline.map((tl) => (
                <div key={tl.id} className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                  <FileText size={16} className="mt-0.5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium">{tl.action}</p>
                    {tl.note && <p className="text-xs text-gray-500">{tl.note}</p>}
                    <p className="text-xs text-gray-400">{formatDateTime(tl.created_at, lang)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
