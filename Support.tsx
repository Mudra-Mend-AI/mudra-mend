import { useState, useCallback, useEffect } from 'react';
import { MessageSquare, Plus, X, Send, Brain, Search, Filter, FlaskConical, HelpCircle, ChevronDown, ChevronUp, LifeBuoy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type SupportTicket } from '@/lib/supabase';
import { DEMO_TICKETS } from '@/lib/demoData';
import { Card, LoadingState, EmptyState, statusBadge, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

const CATEGORIES = ['payment_issue', 'account_issue', 'scam_help', 'general', 'technical'];
const STATUSES = ['open', 'in_progress', 'resolved', 'escalated', 'closed'];

import type { TranslationKey } from '@/i18n/translations';

interface FAQItem { qKey: TranslationKey; aKey: TranslationKey; category: string; }
const FAQ_ITEMS: FAQItem[] = [
  { category: 'payments', qKey: 'faqQ1', aKey: 'faqA1' },
  { category: 'payments', qKey: 'faqQ2', aKey: 'faqA2' },
  { category: 'payments', qKey: 'faqQ3', aKey: 'faqA3' },
  { category: 'payments', qKey: 'faqQ4', aKey: 'faqA4' },
  { category: 'security', qKey: 'faqQ5', aKey: 'faqA5' },
  { category: 'security', qKey: 'faqQ6', aKey: 'faqA6' },
  { category: 'security', qKey: 'faqQ7', aKey: 'faqA7' },
  { category: 'account', qKey: 'faqQ8', aKey: 'faqA8' },
  { category: 'account', qKey: 'faqQ9', aKey: 'faqA9' },
  { category: 'account', qKey: 'faqQ10', aKey: 'faqA10' },
  { category: 'general', qKey: 'faqQ11', aKey: 'faqA11' },
  { category: 'general', qKey: 'faqQ12', aKey: 'faqA12' },
];

export default function Support() {
  const { profile, isDemoMode } = useAuth();
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'tickets' | 'faq'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [faqFilter, setFaqFilter] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const canManage = profile?.role === 'admin' || profile?.role === 'customer_support';

  const load = useCallback(async () => {
    if (isDemoMode) {
      setTickets(DEMO_TICKETS as unknown as SupportTicket[]);
      setLoading(false);
      return;
    }
    if (!profile) return;
    let q = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    const isManager = profile.role === 'admin' || profile.role === 'customer_support';
    if (!isManager) q = q.eq('user_id', profile.id);
    const { data } = await q;
    setTickets((data ?? []) as SupportTicket[]);
    setLoading(false);
  }, [profile, isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      payment_issue: t('catPaymentIssue'),
      account_issue: t('catAccountIssue'),
      scam_help: t('catScamReportHelp'),
      general: t('catGeneralQuestion'),
      technical: t('catTechnicalProblem'),
      'Payment Issue': t('catPaymentIssue'),
      'Account Issue': t('catAccountIssue'),
      'Scam Report Help': t('catScamReportHelp'),
      'General Question': t('catGeneralQuestion'),
      'Technical Problem': t('catTechnicalProblem'),
    };
    return map[cat] ?? cat;
  };

  const filtered = tickets.filter((tkt) => {
    const matchesSearch = !search || tkt.subject.toLowerCase().includes(search.toLowerCase()) || tkt.category.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tkt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredFaqs = FAQ_ITEMS.filter((f) => {
    const matchesCategory = faqFilter === 'all' || f.category === faqFilter;
    const matchesSearch = !search || t(f.qKey).toLowerCase().includes(search.toLowerCase()) || t(f.aKey).toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const faqCategoryLabel = (cat: string) => {
    const map: Record<string, string> = { general: t('faqGeneral'), payments: t('faqPayments'), security: t('faqSecurity'), account: t('faqAccount') };
    return map[cat] ?? cat;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('tickets')}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('support')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('supportSubtitle')}</p>
        </div>
        {tab === 'tickets' && !isDemoMode && <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> {t('add')}</button>}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => setTab('tickets')} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === 'tickets' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          <MessageSquare size={16} /> {t('tickets')}
        </button>
        <button onClick={() => setTab('faq')} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === 'faq' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          <HelpCircle size={16} /> {t('helpArticles')}
        </button>
      </div>

      {tab === 'faq' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input className="input pl-10" placeholder={t('searchArticles')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select className="input w-auto" value={faqFilter} onChange={(e) => setFaqFilter(e.target.value)}>
                <option value="all">{t('all')}</option>
                <option value="general">{t('faqGeneral')}</option>
                <option value="payments">{t('faqPayments')}</option>
                <option value="security">{t('faqSecurity')}</option>
                <option value="account">{t('faqAccount')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredFaqs.map((f, i) => (
              <Card key={i} className="cursor-pointer" >
                <div className="flex items-center justify-between" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                  <div className="flex items-center gap-3">
                    <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{faqCategoryLabel(f.category)}</span>
                    <p className="text-sm font-medium">{t(f.qKey)}</p>
                  </div>
                  {expandedFaq === i ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
                {expandedFaq === i && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{t(f.aKey)}</p>
                )}
              </Card>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <Card><EmptyState icon={<HelpCircle size={40} />} title={t('noData')} subtitle={t('noArticlesMatch')} /></Card>
          )}

          <Card className="bg-primary-50 dark:bg-primary-900/20">
            <div className="flex items-start gap-3">
              <LifeBuoy size={24} className="mt-0.5 flex-shrink-0 text-primary-600" />
              <div>
                <p className="font-medium text-primary-700 dark:text-primary-300">{t('contactSupport')}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('contactSupportDesc')}</p>
                <button className="btn-primary mt-3" onClick={() => setTab('tickets')}>{t('tickets')}</button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input className="input pl-10" placeholder={t('searchTickets')} value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <Card><EmptyState icon={<MessageSquare size={40} />} title={t('noData')} subtitle={t('noTicketsMatch')} /></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((tkt) => (
                <Card key={tkt.id} className="cursor-pointer hover:shadow-card-hover" onClick={() => setSelected(tkt)}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tkt.subject}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(tkt.created_at, lang)} · {categoryLabel(tkt.category)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{tkt.priority}</Badge>
                      {statusBadge(tkt.status)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && profile && <TicketForm userId={profile.id} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} onChanged={load} canManage={canManage} isDemoMode={isDemoMode} lang={lang} currentUserId={profile?.id ?? ''} />}
    </div>
  );
}

function TicketForm({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState('medium');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categoryLabelForForm = (cat: string) => {
    const map: Record<string, string> = {
      payment_issue: t('catPaymentIssue'),
      account_issue: t('catAccountIssue'),
      scam_help: t('catScamReportHelp'),
      general: t('catGeneralQuestion'),
      technical: t('catTechnicalProblem'),
    };
    return map[cat] ?? cat;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { setError(t('subjectRequired')); return; }
    setSubmitting(true);
    setError('');
    const { data, error: insertError } = await supabase.from('support_tickets').insert({ user_id: userId, subject: subject.trim(), category, status: 'open', priority }).select('id').maybeSingle();
    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }
    if (data?.id) {
      const { error: respError } = await supabase.from('ticket_responses').insert({ ticket_id: data.id, author_id: userId, body: body || '(no details)' });
      if (respError) {
        setError(respError.message);
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('newSupportTicket')}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
          <div><label className="label">{t('subject')}</label><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus /></div>
          <div><label className="label">{t('category')}</label><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabelForForm(c)}</option>)}</select></div>
          <div><label className="label">{t('priority')}</label><select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="low">{t('priorityLow')}</option><option value="medium">{t('priorityMedium')}</option><option value="high">{t('priorityHigh')}</option><option value="critical">{t('priorityCritical')}</option></select></div>
          <div><label className="label">{t('details')}</label><textarea className="input min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? t('submitting') : t('submit')}</button>
        </form>
      </div>
    </div>
  );
}

function TicketDetail({ ticket, onClose, onChanged, canManage, isDemoMode, lang, currentUserId }: { ticket: SupportTicket; onClose: () => void; onChanged: () => void; canManage: boolean; isDemoMode: boolean; lang: 'en' | 'hi' | 'mr'; currentUserId: string }) {
  const { t } = useI18n();
  const [responses, setResponses] = useState<{ id: string; author_id: string; body: string; is_ai_draft: boolean; created_at: string }[]>([]);
  const [newReply, setNewReply] = useState('');
  const [status, setStatus] = useState(ticket.status);
  const [updating, setUpdating] = useState(false);

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      payment_issue: t('catPaymentIssue'),
      account_issue: t('catAccountIssue'),
      scam_help: t('catScamReportHelp'),
      general: t('catGeneralQuestion'),
      technical: t('catTechnicalProblem'),
      'Payment Issue': t('catPaymentIssue'),
      'Account Issue': t('catAccountIssue'),
      'Scam Report Help': t('catScamReportHelp'),
      'General Question': t('catGeneralQuestion'),
      'Technical Problem': t('catTechnicalProblem'),
    };
    return map[cat] ?? cat;
  };

  useEffect(() => {
    if (isDemoMode) {
      setResponses([
        { id: 'r1', author_id: ticket.user_id, body: 'My issue is about: ' + ticket.subject, is_ai_draft: false, created_at: ticket.created_at },
        { id: 'r2', author_id: 'ai-assistant', body: ticket.ai_summary ?? 'AI analysis pending for this ticket.', is_ai_draft: true, created_at: ticket.updated_at },
      ]);
      return;
    }
    supabase.from('ticket_responses').select('id,author_id,body,is_ai_draft,created_at').eq('ticket_id', ticket.id).order('created_at', { ascending: true }).then(({ data }) => {
      setResponses((data ?? []) as { id: string; author_id: string; body: string; is_ai_draft: boolean; created_at: string }[]);
    });
  }, [ticket.id, isDemoMode, ticket.user_id, ticket.subject, ticket.ai_summary, ticket.created_at, ticket.updated_at]);

  const sendReply = async () => {
    if (!newReply.trim()) return;
    setUpdating(true);
    if (!isDemoMode) {
      const authorId = currentUserId || ticket.user_id;
      const { data, error } = await supabase.from('ticket_responses').insert({ ticket_id: ticket.id, author_id: authorId, body: newReply.trim() }).select('id,author_id,body,is_ai_draft,created_at').maybeSingle();
      if (error) {
        console.error('Reply error:', error.message);
        setUpdating(false);
        return;
      }
      if (data) setResponses([...responses, data as { id: string; author_id: string; body: string; is_ai_draft: boolean; created_at: string }]);
    } else {
      setResponses([...responses, { id: `r-${Date.now()}`, author_id: 'demo-user', body: newReply.trim(), is_ai_draft: false, created_at: new Date().toISOString() }]);
    }
    setNewReply('');
    setUpdating(false);
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    if (!isDemoMode) {
      const { error } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', ticket.id);
      if (error) {
        console.error('Status update error:', error.message);
        setUpdating(false);
        return;
      }
    }
    setStatus(newStatus as SupportTicket['status']);
    setUpdating(false);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{ticket.subject}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="info">{categoryLabel(ticket.category)}</Badge>
          {statusBadge(status)}
          <Badge variant="neutral">{ticket.priority}</Badge>
        </div>

        {ticket.ai_summary && (
          <div className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-sm dark:bg-primary-900/20">
            <div className="flex items-center gap-1.5 text-primary-700 dark:text-primary-300"><Brain size={14} /> {t('aiSummary')}</div>
            <p className="mt-1 text-gray-600 dark:text-gray-400">{ticket.ai_summary}</p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {responses.map((r) => (
            <div key={r.id} className={`rounded-lg px-3 py-2 ${r.is_ai_draft ? 'bg-secondary-50 dark:bg-secondary-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
              {r.is_ai_draft && <div className="flex items-center gap-1 text-xs text-secondary-600"><Brain size={12} /> {t('aiDraftLabel')}</div>}
              <p className="text-sm">{r.body}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDateTime(r.created_at, lang)}</p>
            </div>
          ))}
        </div>

        {canManage && (
          <div className="mt-4">
            <label className="label">{t('updateStatus')}</label>
            <select className="input" value={status} onChange={(e) => updateStatus(e.target.value)} disabled={updating}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <input className="input" value={newReply} onChange={(e) => setNewReply(e.target.value)} placeholder={t('replyPlaceholder')} onKeyDown={(e) => e.key === 'Enter' && sendReply()} disabled={updating} />
          <button className="btn-primary" onClick={sendReply} disabled={updating || !newReply.trim()}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
