import { useEffect, useState, useCallback } from 'react';
import { Landmark, Search, ExternalLink, AlertTriangle, ShieldCheck, FlaskConical, CheckSquare, Square, ChevronRight, ArrowLeft, Info } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, type GovtScheme } from '@/lib/supabase';
import { DEMO_SCHEMES } from '@/lib/demoData';
import { Card, LoadingState, EmptyState, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import type { TranslationKey } from '@/i18n/translations';

export default function GovtSchemes() {
  const { t, lang } = useI18n();
  const { isDemoMode } = useAuth();
  const [schemes, setSchemes] = useState<GovtScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GovtScheme | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const load = useCallback(async () => {
    if (isDemoMode) {
      setSchemes(DEMO_SCHEMES as unknown as GovtScheme[]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('govt_schemes').select('*').order('name');
    setSchemes((data ?? []) as GovtScheme[]);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const filtered = schemes.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.department.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('schemes')}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('schemes')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('schemesSubtitle')}</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowWizard(true)}>
          <CheckSquare size={16} /> {t('checkEligibility')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input className="input pl-10" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<Landmark size={40} />} title={t('noData')} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-card-hover" onClick={() => setSelected(s)}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"><Landmark size={20} /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.department}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{s.benefits}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="info">{s.category}</Badge>
                    {s.is_demo && <Badge variant="warning">{t('demoData')}</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <SchemeDetail scheme={selected} onClose={() => setSelected(null)} lang={lang} onCheckEligibility={() => { setSelected(null); setShowWizard(true); }} />}
      {showWizard && <EligibilityWizard schemes={schemes} onClose={() => setShowWizard(false)} onSelectScheme={(s) => { setShowWizard(false); setSelected(s); }} />}
    </div>
  );
}

function SchemeDetail({ scheme, onClose, lang, onCheckEligibility }: { scheme: GovtScheme; onClose: () => void; lang: string; onCheckEligibility: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{scheme.name}</h2>
        <p className="text-sm text-gray-500">{scheme.department}</p>
        <div className="mt-2 flex gap-2">
          <Badge variant="info">{scheme.category}</Badge>
          {scheme.is_demo && <Badge variant="warning">{t('demoData')}</Badge>}
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div><p className="font-medium text-gray-700 dark:text-gray-300">{t('eligibility')}</p><p className="text-gray-600 dark:text-gray-400">{scheme.eligibility}</p></div>
          <div><p className="font-medium text-gray-700 dark:text-gray-300">{t('benefits')}</p><p className="text-gray-600 dark:text-gray-400">{scheme.benefits}</p></div>
          <div><p className="font-medium text-gray-700 dark:text-gray-300">{t('applicationProcess')}</p><p className="text-gray-600 dark:text-gray-400">{scheme.application_process}</p></div>
        </div>

        {scheme.scam_warning && (
          <div className="mt-4 rounded-lg bg-error-50 px-4 py-3 dark:bg-error-900/20">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 text-error-600" />
              <div>
                <p className="font-medium text-error-700 dark:text-error-300">{t('scamWarning')}</p>
                <p className="text-sm text-error-600 dark:text-error-400">{scheme.scam_warning}</p>
              </div>
            </div>
          </div>
        )}

        {scheme.official_url && (
          <a href={scheme.official_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
            <ExternalLink size={16} /> {t('officialWebsite')}
          </a>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck size={14} /> {t('lastUpdated')}: {formatDate(scheme.last_updated, lang)}
          </div>
          <button className="btn-secondary text-sm" onClick={onCheckEligibility}>
            <CheckSquare size={14} /> {t('checkEligibility')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EligibilityAnswers {
  age: string;
  income: string;
  location: string;
  category: string;
  occupation: string;
}

const QUESTIONS: { key: keyof EligibilityAnswers; labelKey: TranslationKey; options: { value: string; labelKey: TranslationKey }[] }[] = [
  {
    key: 'age',
    labelKey: 'eligibilityAge',
    options: [
      { value: 'under18', labelKey: 'ageUnder18' },
      { value: '18to60', labelKey: 'age18to60' },
      { value: 'over60', labelKey: 'ageOver60' },
    ],
  },
  {
    key: 'income',
    labelKey: 'eligibilityIncome',
    options: [
      { value: 'below_lakh', labelKey: 'incomeBelowLakh' },
      { value: '1to3', labelKey: 'income1to3Lakh' },
      { value: '3to6', labelKey: 'income3to6Lakh' },
      { value: 'above6', labelKey: 'incomeAbove6Lakh' },
    ],
  },
  {
    key: 'location',
    labelKey: 'eligibilityLocation',
    options: [
      { value: 'rural', labelKey: 'locationRural' },
      { value: 'urban', labelKey: 'locationUrban' },
    ],
  },
  {
    key: 'category',
    labelKey: 'eligibilityCategory',
    options: [
      { value: 'student', labelKey: 'catStudent' },
      { value: 'worker', labelKey: 'catWorker' },
      { value: 'farmer', labelKey: 'catFarmer' },
      { value: 'senior', labelKey: 'catSenior' },
      { value: 'woman', labelKey: 'catWoman' },
      { value: 'general', labelKey: 'catGeneral' },
    ],
  },
  {
    key: 'occupation',
    labelKey: 'eligibilityOccupation',
    options: [
      { value: 'agriculture', labelKey: 'occAgriculture' },
      { value: 'construction', labelKey: 'occConstruction' },
      { value: 'service', labelKey: 'occService' },
      { value: 'business', labelKey: 'occBusiness' },
      { value: 'homemaker', labelKey: 'occHomemaker' },
      { value: 'unemployed', labelKey: 'occUnemployed' },
    ],
  },
];

function EligibilityWizard({ schemes, onClose, onSelectScheme }: { schemes: GovtScheme[]; onClose: () => void; onSelectScheme: (s: GovtScheme) => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<EligibilityAnswers>({ age: '', income: '', location: '', category: '', occupation: '' });
  const [results, setResults] = useState<GovtScheme[] | null>(null);

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setResults(matchSchemes(schemes, answers));
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSelect = (value: string) => {
    const key = QUESTIONS[step].key;
    setAnswers({ ...answers, [key]: value });
  };

  if (results !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
        <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold">{t('matchingSchemes')}</h2>
          <div className="mt-4 rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 flex items-start gap-2">
            <Info size={14} className="mt-0.5 flex-shrink-0" /> {t('eligibilityPreliminary')}
          </div>
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t('noMatchingSchemes')}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {results.map((s) => (
                <div key={s.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800 cursor-pointer hover:border-primary-300" onClick={() => onSelectScheme(s)}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.department}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{s.eligibility}</p>
                  <button className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700">{t('viewSchemeDetails')}</button>
                </div>
              ))}
            </div>
          )}
          <button className="btn-secondary mt-4 w-full" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    );
  }

  const currentQ = QUESTIONS[step];
  const currentValue = answers[currentQ.key];
  const isAnswered = currentValue !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('eligibilityWizard')}</h2>
          <span className="text-xs text-gray-400">{step + 1} / {QUESTIONS.length}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{t('eligibilityWizardDesc')}</p>

        <div className="mt-4 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-primary-600 transition-all duration-300" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium">{t(currentQ.labelKey)}</p>
          <div className="mt-3 space-y-2">
            {currentQ.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  currentValue === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                {currentValue === opt.value ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} className="text-gray-300" />}
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <button className="btn-secondary" onClick={handleBack} disabled={step === 0}>
            <ArrowLeft size={16} /> {t('back')}
          </button>
          <button className="btn-primary" onClick={handleNext} disabled={!isAnswered}>
            {step < QUESTIONS.length - 1 ? t('next') : t('checkEligibility')}
          </button>
        </div>
      </div>
    </div>
  );
}

function matchSchemes(schemes: GovtScheme[], answers: EligibilityAnswers): GovtScheme[] {
  const matches: { scheme: GovtScheme; score: number }[] = [];
  for (const s of schemes) {
    const text = `${s.name} ${s.eligibility} ${s.benefits} ${s.category}`.toLowerCase();
    let score = 0;
    if (answers.category === 'farmer' && (text.includes('farmer') || text.includes('kisan') || text.includes('agricultur'))) score += 2;
    if (answers.category === 'woman' && (text.includes('woman') || text.includes('women') || text.includes('mahila'))) score += 2;
    if (answers.category === 'senior' && (text.includes('senior') || text.includes('old age') || text.includes('pension') || text.includes('elderly'))) score += 2;
    if (answers.category === 'student' && (text.includes('student') || text.includes('education') || text.includes('scholarship'))) score += 2;
    if (answers.category === 'worker' && (text.includes('worker') || text.includes('labour') || text.includes('shram'))) score += 2;
    if (answers.age === 'over60' && (text.includes('senior') || text.includes('old age') || text.includes('pension'))) score += 1;
    if (answers.age === 'under18' && (text.includes('student') || text.includes('child') || text.includes('education'))) score += 1;
    if (answers.income === 'below_lakh' && (text.includes('below poverty') || text.includes('bpl') || text.includes('low income') || text.includes('poor'))) score += 1;
    if (answers.location === 'rural' && (text.includes('rural') || text.includes('village') || text.includes('gram'))) score += 1;
    if (answers.occupation === 'agriculture' && (text.includes('farmer') || text.includes('agricultur') || text.includes('kisan'))) score += 1;
    if (score > 0) matches.push({ scheme: s, score });
  }
  return matches.sort((a, b) => b.score - a.score).map((m) => m.scheme);
}
