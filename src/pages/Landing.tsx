import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, ArrowRight, Lock, Users, CheckCircle2, AlertTriangle,
  ChevronDown, Menu, X, Send, QrCode, FileText, Bell, Landmark,
  GraduationCap, HeartHandshake, ShieldCheck, HelpCircle, Search,
  ScrollText, Building2, Moon, Sun, Brain, Lightbulb, MapPin, BarChart3,
  UserCog, Clock, TrendingUp, Sparkles, Globe,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/context/ThemeContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Landing() {
  const { t } = useI18n();
  const { toggleTheme, theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const navLinks = [
    { label: t('features'), href: '#features' },
    { label: t('howItWorks'), href: '#how-it-works' },
    { label: t('financialSafety'), href: '#safety' },
    { label: t('schemes'), href: '#schemes-inclusion' },
    { label: t('aboutImpact'), href: '#roles' },
  ];

  const benefits = [
    { icon: Shield, title: t('fraudPrevention'), desc: t('fraudPreventionDesc'), color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/30' },
    { icon: Lock, title: t('saferPaymentsBenefit'), desc: t('saferPaymentsDesc'), color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-900/30' },
    { icon: Landmark, title: t('schemeAwareness'), desc: t('schemeAwarenessDesc'), color: 'text-accent-600', bg: 'bg-accent-50 dark:bg-accent-900/30' },
    { icon: HeartHandshake, title: t('financialInclusion'), desc: t('financialInclusionDesc'), color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-900/30' },
  ];

  const steps = [
    { icon: UserCog, title: t('step1Title'), desc: t('step1Desc') },
    { icon: ShieldCheck, title: t('step2Title'), desc: t('step2Desc') },
    { icon: CheckCircle2, title: t('step3Title'), desc: t('step3Desc') },
  ];

  const roles = [
    { icon: Users, name: t('roleCustomer'), desc: t('roleCustomerDesc') },
    { icon: Shield, name: t('roleAdmin'), desc: t('roleAdminDesc') },
    { icon: Brain, name: t('roleFraudAnalyst'), desc: t('roleFraudAnalystDesc') },
    { icon: Building2, name: t('roleBankOfficer'), desc: t('roleBankOfficerDesc') },
    { icon: Search, name: t('roleInvestigator'), desc: t('roleInvestigatorDesc') },
    { icon: ScrollText, name: t('roleAuditor'), desc: t('roleAuditorDesc') },
    { icon: HelpCircle, name: t('roleCustomerSupport'), desc: t('roleCustomerSupportDesc') },
    { icon: HeartHandshake, name: t('roleNgoCoordinator'), desc: t('roleNgoCoordinatorDesc') },
    { icon: Landmark, name: t('roleGovOfficial'), desc: t('roleGovOfficialDesc') },
  ];

  const faqs = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
    { q: t('faq5Q'), a: t('faq5A') },
    { q: t('faq6Q'), a: t('faq6A') },
  ];

  const privacyPoints = [t('privacyPoint1'), t('privacyPoint2'), t('privacyPoint3'), t('privacyPoint4')];

  const paymentFeatures = [
    { icon: Send, label: t('payAnyone') },
    { icon: QrCode, label: t('scanQr') },
    { icon: FileText, label: t('digitalReceipts') },
    { icon: Bell, label: t('safetyAlerts') },
  ];

  const schemeFeatures = [
    { icon: Landmark, label: t('schemes') },
    { icon: GraduationCap, label: t('financialLiteracy') },
    { icon: MapPin, label: t('ruralInclusion') },
    { icon: HeartHandshake, label: t('ngoOutreach') },
  ];

  const safetySignals = [
    { icon: Users, label: t('newRecipient') },
    { icon: BarChart3, label: t('unusualAmount') },
    { icon: Clock, label: t('unusualTime') },
  ];

  const stats = [
    { value: '9', label: t('rolePlatformTitle') },
    { value: '3', label: t('language') },
    { value: '6+', label: t('fraudPrevention') },
    { value: '24/7', label: t('safetyAlerts') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/80 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glow">
              <Shield size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight">{t('appName')}</span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={toggleTheme} className="btn-ghost p-2" aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link to="/professional-apply" className="hidden items-center gap-1.5 rounded-lg border border-secondary-300 px-3 py-2 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50 dark:border-secondary-700 dark:text-secondary-300 dark:hover:bg-secondary-900/30 sm:inline-flex">
              <Building2 size={16} /> {t('applyAsProfessional')}
            </Link>
            <Link to="/login" className="btn-secondary hidden text-sm sm:inline-flex">{t('login')}</Link>
            <Link to="/signup" className="btn-primary text-sm">{t('getStarted')}</Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="btn-ghost p-2 lg:hidden" aria-label="Menu">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 dark:border-gray-800 lg:hidden">
            <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  {link.label}
                </a>
              ))}
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                {t('login')}
              </Link>
              <Link to="/professional-apply" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-50 dark:text-secondary-400 dark:hover:bg-secondary-900/20">
                {t('applyAsProfessional')}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* A — Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60 dark:opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/40 via-white to-white dark:from-primary-950/10 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-primary-200/20 blur-3xl dark:bg-primary-800/10" />
        <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-secondary-200/20 blur-3xl dark:bg-secondary-800/10" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-in-up">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200/50 bg-white/60 px-4 py-1.5 text-sm font-medium text-primary-700 shadow-sm backdrop-blur dark:border-primary-800/50 dark:bg-primary-900/20 dark:text-primary-300">
                <Sparkles size={15} /> {t('aiPoweredSafety')}
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-5xl lg:text-6xl">
                {t('yourMoneyYourSafety')}
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                {t('heroDescription')}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="btn-primary text-base">
                  {t('getStarted')} <ArrowRight size={18} />
                </Link>
                <a href="#safety" className="btn-secondary text-base">
                  <ShieldCheck size={18} /> {t('exploreFinancialSafety')}
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-5">
                {[
                  { icon: AlertTriangle, label: t('fraudAwareness') },
                  { icon: Lock, label: t('saferPaymentsBenefit') },
                  { icon: HeartHandshake, label: t('financialInclusion') },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <b.icon size={16} className="text-primary-500" /> {b.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative animate-fade-in-up [animation-delay:200ms]">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary-100/50 to-secondary-100/30 blur-2xl dark:from-primary-900/20 dark:to-secondary-900/10" />
              <div className="space-y-3">
                {/* Safety Check Card */}
                <div className="card p-5 shadow-hero animate-float">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-50 dark:bg-warning-900/30">
                        <ShieldCheck size={18} className="text-warning-600" />
                      </div>
                      <span className="text-sm font-semibold">{t('paymentSafetyCheck')}</span>
                    </div>
                    <span className="badge bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">{t('riskMedium')}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {safetySignals.map((s) => (
                      <div key={s.label} className="flex items-center gap-2 text-sm">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-warning-50 dark:bg-warning-900/20">
                          <s.icon size={14} className="text-warning-500" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
                        <AlertTriangle size={14} className="ml-auto text-warning-500" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Transaction Review Card */}
                <div className="card p-5 [animation-delay:300ms] animate-float">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                      <FileText size={18} className="text-primary-600" />
                    </div>
                    <span className="text-sm font-semibold">{t('transactionReview')}</span>
                  </div>
                  <div className="mt-3 space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">{t('recipientName')}</span><span className="font-medium">Rajesh K.</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{t('amount')}</span><span className="font-bold text-gray-900 dark:text-white">₹ 25,000</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{t('status')}</span><span className="badge bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">{t('pending')}</span></div>
                  </div>
                </div>
                {/* Safety Insights Card */}
                <div className="card p-5 [animation-delay:600ms] animate-float">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-50 dark:bg-success-900/30">
                      <Lightbulb size={18} className="text-success-600" />
                    </div>
                    <span className="text-sm font-semibold">{t('safetyInsights')}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('safetyPreviewAction')}</p>
                </div>
                {/* Demo Label */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{t('demoLabel')}</span>
                  {t('paymentSimulated')}
                </div>
              </div>
            </div>
          </div>
          {/* Stats Bar */}
          <div className="mt-16 grid grid-cols-2 gap-4 rounded-2xl border border-gray-100 bg-white/50 p-6 shadow-card backdrop-blur dark:border-gray-800 dark:bg-gray-900/50 md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-bold text-gradient">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B — Key Benefits */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <span className="section-eyebrow">{t('features')}</span>
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t('keyBenefits')}</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <div key={i} className="card card-hover p-6">
              <div className={`mb-4 inline-flex rounded-xl ${b.bg} p-3.5 ${b.color}`}>
                <b.icon size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* C — How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <span className="section-eyebrow">{t('howItWorks')}</span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t('howItWorks')}</h2>
          </div>
          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent dark:via-primary-800 md:block" />
            {steps.map((s, i) => (
              <div key={i} className="relative text-center">
                <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card dark:bg-gray-800">
                  <s.icon size={28} className="text-primary-600 dark:text-primary-400" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white shadow-sm">{i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* D — Financial Safety Preview */}
      <section id="safety" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="animate-fade-in">
            <span className="section-eyebrow"><ShieldCheck size={14} /> {t('financialSafety')}</span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t('safetyPreviewTitle')}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">{t('safetyPreviewDesc')}</p>
            <div className="mt-6 flex items-center gap-3">
              <TrendingUp size={20} className="text-primary-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('recommendedAction')}</span>
            </div>
          </div>
          <div className="card border-2 border-warning-200 p-6 shadow-hero dark:border-warning-800 animate-fade-in [animation-delay:200ms]">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t('riskLevel')}</span>
              <span className="badge bg-warning-100 px-3 py-1 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">{t('riskMedium')}</span>
            </div>
            <div className="mt-4 space-y-2">
              {safetySignals.map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50 dark:bg-warning-900/20">
                    <s.icon size={16} className="text-warning-500" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{s.label}</span>
                  <AlertTriangle size={14} className="ml-auto text-warning-500" />
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t('assessmentExplanation')}</p>
              <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{t('safetyPreviewExplanation')}</p>
            </div>
            <div className="mt-4 rounded-xl bg-primary-50 px-4 py-3 dark:bg-primary-900/20">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">{t('safetyPreviewAction')}</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{t('demoLabel')}</span>
              {t('paymentSimulated')}
            </div>
          </div>
        </div>
      </section>

      {/* E — Payments & Protection */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="section-eyebrow"><Send size={14} /> {t('payments')}</span>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t('paymentsProtectionTitle')}</h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400">{t('paymentsProtectionDesc')}</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {paymentFeatures.map((f) => (
                  <div key={f.label} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover dark:bg-gray-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                      <f.icon size={20} />
                    </div>
                    <span className="text-sm font-medium">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6 shadow-hero">
              <div className="space-y-3 text-sm">
                {[
                  { label: `${t('reviewPayment')} — ${t('runSafetyCheck')}` },
                  { label: `${t('confirmPayment')} — ${t('paymentSimulated')}` },
                  { label: `${t('recentTransactions')} — ${t('digitalReceipts')}` },
                  { label: `${t('alerts')} — ${t('safetyAlerts')}` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                    <CheckCircle2 size={18} className="flex-shrink-0 text-success-500" />
                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{t('demoLabel')}</span>
                {t('paymentSimulated')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* F — Schemes & Financial Inclusion */}
      <section id="schemes-inclusion" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            {schemeFeatures.map((f) => (
              <div key={f.label} className="card card-hover flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  <f.icon size={24} />
                </div>
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
          <div>
            <span className="section-eyebrow"><Globe size={14} /> {t('financialInclusion')}</span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t('schemesInclusionTitle')}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">{t('schemesInclusionDesc')}</p>
            <Link to="/signup" className="btn-secondary mt-6 text-sm">
              {t('learnMore')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* G — Role-Based Platform */}
      <section id="roles" className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <span className="section-eyebrow"><Users size={14} /> {t('aboutImpact')}</span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t('rolePlatformTitle')}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">{t('rolePlatformDesc')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r, i) => (
              <div key={i} className="card card-hover flex items-start gap-3 p-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 dark:from-primary-900/30 dark:to-primary-800/20 dark:text-primary-400">
                  <r.icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{r.name}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* H — Privacy & Security */}
      <section id="privacy" className="mx-auto max-w-6xl px-4 py-20">
        <div className="card overflow-hidden p-0 shadow-hero">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
              <Lock size={36} className="mb-4" />
              <h2 className="text-2xl font-bold">{t('privacySecurityTitle')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-primary-100">{t('privacySecurityDesc')}</p>
            </div>
            <div className="p-8">
              <ul className="space-y-4">
                {privacyPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success-50 dark:bg-success-900/30">
                      <CheckCircle2 size={16} className="text-success-500" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* I — FAQ */}
      <section id="faq" className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-12 text-center">
            <span className="section-eyebrow"><HelpCircle size={14} /> FAQ</span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t('faqTitle')}</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold">{f.q}</span>
                  <ChevronDown size={18} className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600 dark:border-gray-800 dark:text-gray-400 animate-fade-in">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* J — Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 px-8 py-14 text-center text-white shadow-hero">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/5" />
          <h2 className="relative text-3xl font-bold md:text-4xl">{t('finalCtaTitle')}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-primary-100">{t('finalCtaDesc')}</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="btn bg-white text-primary-700 hover:bg-primary-50 text-base shadow-lg">
              {t('getStarted')} <ArrowRight size={18} />
            </Link>
            <a href="#features" className="btn border border-white/30 text-white hover:bg-white/10 text-base">
              {t('exploreFeatures')}
            </a>
          </div>
        </div>
      </section>

      {/* K — Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white">
                  <Shield size={18} />
                </div>
                <span className="font-bold">{t('appName')}</span>
              </div>
              <p className="mt-3 text-sm text-gray-500">{t('tagline')}</p>
              <p className="mt-2 text-xs text-gray-400">{t('footerDemoDisclosure')}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">{t('features')}</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-primary-600 dark:hover:text-primary-400">{t('fraudPrevention')}</a></li>
                <li><a href="#safety" className="hover:text-primary-600 dark:hover:text-primary-400">{t('financialSafety')}</a></li>
                <li><a href="#schemes-inclusion" className="hover:text-primary-600 dark:hover:text-primary-400">{t('schemes')}</a></li>
                <li><a href="#roles" className="hover:text-primary-600 dark:hover:text-primary-400">{t('rolePlatformTitle')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">{t('support')}</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                <li><Link to="/login" className="hover:text-primary-600 dark:hover:text-primary-400">{t('login')}</Link></li>
                <li><Link to="/signup" className="hover:text-primary-600 dark:hover:text-primary-400">{t('getStarted')}</Link></li>
                <li><Link to="/forgot-password" className="hover:text-primary-600 dark:hover:text-primary-400">{t('forgotPassword')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400 dark:border-gray-800">
            {t('appName')} — {t('tagline')}
          </div>
        </div>
      </footer>
    </div>
  );
}
