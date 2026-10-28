import { useEffect, useState, useCallback } from 'react';
import { BarChart3, Download, TrendingUp, AlertTriangle, FolderKanban, Users, Search, Filter, FlaskConical, Landmark, Activity, Globe } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DEMO_TRANSACTIONS, DEMO_SCAM_REPORTS, DEMO_CASES, DEMO_USERS } from '@/lib/demoData';
import { fetchGovtStatistics, type GovtStatistic } from '@/lib/analytics';
import { Card, StatCard, LoadingState, Badge } from '@/components/ui';
import { downloadCsv, formatCurrency } from '@/lib/utils';

interface RiskData { low: number; medium: number; high: number; blocked: number; }
interface StatusData { success: number; failed: number; cancelled: number; pending: number; }

export default function Reports() {
  const { t } = useI18n();
  const { isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [txnStats, setTxnStats] = useState({ total: 0, success: 0, failed: 0, volume: 0 });
  const [scamCount, setScamCount] = useState(0);
  const [caseCount, setCaseCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [riskData, setRiskData] = useState<RiskData>({ low: 0, medium: 0, high: 0, blocked: 0 });
  const [statusData, setStatusData] = useState<StatusData>({ success: 0, failed: 0, cancelled: 0, pending: 0 });
  const [search, setSearch] = useState('');
  const [govtStats, setGovtStats] = useState<GovtStatistic[]>([]);
  const [govtCategoryFilter, setGovtCategoryFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const stats = await fetchGovtStatistics(isDemoMode);
    setGovtStats(stats);

    if (isDemoMode) {
      const tData = DEMO_TRANSACTIONS as { amount: number; status: string }[];
      const aData = DEMO_TRANSACTIONS.map(() => ({ risk_level: tData.length > 3 ? ['low','medium','high','blocked'][Math.floor(Math.random()*4)] : 'low' }));
      setTxnStats({
        total: tData.length,
        success: tData.filter((x) => x.status === 'success').length,
        failed: tData.filter((x) => x.status === 'failed').length,
        volume: tData.reduce((s, x) => s + Number(x.amount), 0),
      });
      setScamCount(DEMO_SCAM_REPORTS.length);
      setCaseCount(DEMO_CASES.length);
      setUserCount(DEMO_USERS.length);
      setReferralCount(0);
      setProgramCount(0);
      setRiskData({
        low: aData.filter((a) => a.risk_level === 'low').length,
        medium: aData.filter((a) => a.risk_level === 'medium').length,
        high: aData.filter((a) => a.risk_level === 'high').length,
        blocked: aData.filter((a) => a.risk_level === 'blocked').length,
      });
      setStatusData({
        success: tData.filter((x) => x.status === 'success').length,
        failed: tData.filter((x) => x.status === 'failed').length,
        cancelled: tData.filter((x) => x.status === 'cancelled').length,
        pending: tData.filter((x) => x.status === 'pending' || x.status === 'processing').length,
      });
      setLoading(false);
      return;
    }
    let txnQuery = supabase.from('transactions').select('amount,status');
    let assessQuery = supabase.from('fraud_assessments').select('risk_level');
    if (dateFrom) {
      txnQuery = txnQuery.gte('created_at', dateFrom);
      assessQuery = assessQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      txnQuery = txnQuery.lte('created_at', dateTo + 'T23:59:59');
      assessQuery = assessQuery.lte('created_at', dateTo + 'T23:59:59');
    }
    const [txnsRes, scamsRes, casesRes, usersRes, assessRes, referralsRes, programsRes] = await Promise.all([
      txnQuery,
      supabase.from('scam_reports').select('*', { count: 'exact', head: true }),
      supabase.from('cases').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      assessQuery,
      supabase.from('beneficiary_referrals').select('*', { count: 'exact', head: true }),
      supabase.from('ngo_programs').select('*', { count: 'exact', head: true }),
    ]);
    const tData = (txnsRes.data ?? []) as { amount: number; status: string }[];
    const aData = (assessRes.data ?? []) as { risk_level: string }[];

    setTxnStats({
      total: tData.length,
      success: tData.filter((x) => x.status === 'success').length,
      failed: tData.filter((x) => x.status === 'failed').length,
      volume: tData.reduce((s, x) => s + Number(x.amount), 0),
    });
    setScamCount(scamsRes.count ?? 0);
    setCaseCount(casesRes.count ?? 0);
    setUserCount(usersRes.count ?? 0);
    setReferralCount(referralsRes.count ?? 0);
    setProgramCount(programsRes.count ?? 0);
    setRiskData({
      low: aData.filter((a) => a.risk_level === 'low').length,
      medium: aData.filter((a) => a.risk_level === 'medium').length,
      high: aData.filter((a) => a.risk_level === 'high').length,
      blocked: aData.filter((a) => a.risk_level === 'blocked').length,
    });
    setStatusData({
      success: tData.filter((x) => x.status === 'success').length,
      failed: tData.filter((x) => x.status === 'failed').length,
      cancelled: tData.filter((x) => x.status === 'cancelled').length,
      pending: tData.filter((x) => x.status === 'pending' || x.status === 'processing').length,
    });
    setLoading(false);
  }, [dateFrom, dateTo, isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    const rows: Record<string, unknown>[] = [
      { metric: t('transactionVolume'), value: txnStats.volume, category: 'Application Records' },
      { metric: t('totalTransactions'), value: txnStats.total, category: 'Application Records' },
      { metric: t('scamReports'), value: scamCount, category: 'Application Records' },
      { metric: t('cases'), value: caseCount, category: 'Application Records' },
      { metric: t('usersLabel'), value: userCount, category: 'Application Records' },
      { metric: t('beneficiaryReferrals'), value: referralCount, category: 'Application Records' },
      { metric: t('programs'), value: programCount, category: 'Application Records' },
    ];
    for (const s of filteredGovtStats) {
      rows.push({
        metric: s.indicator_name,
        value: s.indicator_value ?? s.indicator_value_text ?? '—',
        category: 'Official Government Data',
        geography: s.geography_name,
        period: s.reporting_period,
        unit: s.indicator_unit ?? '',
      });
    }
    downloadCsv('report-summary.csv', rows);
  };

  const totalAssessments = riskData.low + riskData.medium + riskData.high + riskData.blocked;
  const totalTxns = statusData.success + statusData.failed + statusData.cancelled + statusData.pending;

  const riskBars = [
    { label: t('riskLow'), count: riskData.low, color: 'bg-success-500' },
    { label: t('riskMedium'), count: riskData.medium, color: 'bg-warning-500' },
    { label: t('riskHigh'), count: riskData.high, color: 'bg-error-500' },
    { label: t('riskBlocked'), count: riskData.blocked, color: 'bg-error-700' },
  ];

  const statusBars = [
    { label: t('paymentSuccess'), count: statusData.success, color: 'bg-success-500' },
    { label: t('paymentFailed'), count: statusData.failed, color: 'bg-error-500' },
    { label: t('riskBlocked'), count: statusData.cancelled, color: 'bg-warning-500' },
    { label: t('pending'), count: statusData.pending, color: 'bg-secondary-500' },
  ];

  // Build SDG indicators from real govt_statistics data
  const povertyStats = govtStats.filter((s) => s.indicator_category === 'poverty');
  const sdgStats = govtStats.filter((s) => s.indicator_category === 'sdg');
  const upiStats = govtStats.filter((s) => s.indicator_category === 'digital_payments');
  const fiStats = govtStats.filter((s) => s.indicator_category === 'financial_inclusion');

  const mpiIndiaNFHS5 = povertyStats.find((s) => s.indicator_name === 'MPI Headcount Ratio (H)' && s.geography_name === 'India' && s.reporting_period.includes('NFHS-5'));
  const mpiIndiaNFHS4 = povertyStats.find((s) => s.indicator_name === 'MPI Headcount Ratio (H)' && s.geography_name === 'India' && s.reporting_period.includes('NFHS-4'));
  const peopleEscaped = povertyStats.find((s) => s.indicator_name === 'People Escaped Poverty (9 years)' && s.geography_name === 'India');
  const sdgComposite = sdgStats.find((s) => s.indicator_name === 'SDG Composite Score' && !s.indicator_name.includes('2020'));
  const sdg1Score = sdgStats.find((s) => s.indicator_name === 'SDG 1 (No Poverty) Score');
  const sdgPrevScore = sdgStats.find((s) => s.indicator_name.includes('2020-21'));
  const fiIndex = fiStats.find((s) => s.indicator_name === 'Financial Inclusion Index' && !s.indicator_name.includes('baseline'));
  const fiBaseline = fiStats.find((s) => s.indicator_name.includes('baseline'));
  const pmjdyBeneficiaries = fiStats.find((s) => s.indicator_name === 'PMJDY Total Beneficiaries');

  // State-wise poverty data for chart
  const statePovertyNFHS5 = povertyStats
    .filter((s) => s.indicator_name === 'MPI Headcount Ratio (H)' && s.geography_level === 'state' && s.reporting_period.includes('NFHS-5'))
    .sort((a, b) => (b.indicator_value ?? 0) - (a.indicator_value ?? 0));

  const sdgIndicators: { label: string; value: string; source: string; dataCategory: string; unit?: string }[] = [];

  if (mpiIndiaNFHS5) {
    sdgIndicators.push({
      label: 'MPI Headcount Ratio (NFHS-5, 2019-21)',
      value: String(mpiIndiaNFHS5.indicator_value),
      source: 'NITI Aayog MPI 2023',
      dataCategory: 'official',
      unit: mpiIndiaNFHS5.indicator_unit ?? '%',
    });
  }
  if (mpiIndiaNFHS4) {
    sdgIndicators.push({
      label: 'MPI Headcount Ratio (NFHS-4, 2015-16)',
      value: String(mpiIndiaNFHS4.indicator_value),
      source: 'NITI Aayog MPI 2023',
      dataCategory: 'official',
      unit: mpiIndiaNFHS4.indicator_unit ?? '%',
    });
  }
  if (peopleEscaped) {
    sdgIndicators.push({
      label: 'People Escaped Poverty (9 years)',
      value: String(peopleEscaped.indicator_value),
      source: 'NITI Aayog MPI 2023',
      dataCategory: 'official',
      unit: peopleEscaped.indicator_unit ?? 'lakhs',
    });
  }
  if (sdgComposite) {
    sdgIndicators.push({
      label: 'SDG Composite Score (2023-24)',
      value: String(sdgComposite.indicator_value),
      source: 'NITI Aayog SDG India Index 2023-24',
      dataCategory: 'official',
      unit: sdgComposite.indicator_unit ?? 'score',
    });
  }
  if (sdg1Score) {
    sdgIndicators.push({
      label: 'SDG 1 (No Poverty) Score',
      value: String(sdg1Score.indicator_value),
      source: 'NITI Aayog SDG India Index 2023-24',
      dataCategory: 'official',
      unit: sdg1Score.indicator_unit ?? 'score',
    });
  }
  if (fiIndex) {
    sdgIndicators.push({
      label: 'Financial Inclusion Index (2025)',
      value: String(fiIndex.indicator_value),
      source: 'Ministry of Finance / PIB',
      dataCategory: 'official',
      unit: fiIndex.indicator_unit ?? 'index',
    });
  }
  if (pmjdyBeneficiaries) {
    sdgIndicators.push({
      label: 'PMJDY Total Beneficiaries',
      value: String(pmjdyBeneficiaries.indicator_value),
      source: 'Ministry of Finance / PIB',
      dataCategory: 'official',
      unit: pmjdyBeneficiaries.indicator_unit ?? 'crore',
    });
  }

  // Application data indicators (kept separate from official)
  sdgIndicators.push({
    label: t('sdgVerifiedReferrals'),
    value: String(referralCount),
    source: t('sdgSourceAssistance'),
    dataCategory: 'application',
  });
  sdgIndicators.push({
    label: t('sdgSafetyEngagement'),
    value: String(totalAssessments),
    source: t('sdgSourceRecommendations'),
    dataCategory: 'application',
  });
  sdgIndicators.push({
    label: t('sdgOutreachCoverage'),
    value: String(programCount),
    source: t('sdgSourceNgo'),
    dataCategory: 'application',
  });

  const filteredSdgIndicators = sdgIndicators.filter((ind) =>
    !search || ind.label.toLowerCase().includes(search.toLowerCase()) || ind.source.toLowerCase().includes(search.toLowerCase())
  );

  // UPI monthly trend data
  const upiVolumeStats = upiStats.filter((s) => s.indicator_name === 'UPI Transaction Volume').sort((a, b) => (a.period_start ?? '').localeCompare(b.period_start ?? ''));
  const upiValueStats = upiStats.filter((s) => s.indicator_name === 'UPI Transaction Value').sort((a, b) => (a.period_start ?? '').localeCompare(b.period_start ?? ''));
  const maxUpiVolume = Math.max(...upiVolumeStats.map((s) => s.indicator_value ?? 0), 1);

  // Filtered govt stats for table
  const filteredGovtStats = govtStats.filter((s) => govtCategoryFilter === 'all' || s.indicator_category === govtCategoryFilter);

  const povertyDecline = mpiIndiaNFHS4 && mpiIndiaNFHS5 ? (mpiIndiaNFHS4.indicator_value ?? 0) - (mpiIndiaNFHS5.indicator_value ?? 0) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
          <FlaskConical size={14} /> {t('demoData')} — {t('reports')}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('reports')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('reportsSubtitle')}</p>
        </div>
        <button className="btn-secondary" onClick={handleExport}><Download size={16} /> CSV</button>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">{t('dateRangeFilter')}</h3>
        <div className="flex flex-wrap gap-3">
          <div><label className="label">{t('from')}</label><input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div><label className="label">{t('to')}</label><input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          <div className="flex items-end"><button className="btn-primary" onClick={load}>{t('filter')}</button></div>
        </div>
        <p className="mt-2 text-xs text-gray-400">Date range applies to application data (transactions, fraud assessments). Official government statistics have their own reporting periods shown below.</p>
      </Card>

      {loading ? <LoadingState /> : (
        <>
          {/* Application Data KPIs */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="info">Application Records</Badge>
              <span className="text-xs text-gray-400">Mudra-Mend platform data — transactions, reports, cases</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t('transactionVolume')} value={formatCurrency(txnStats.volume)} icon={<TrendingUp size={22} />} accent="primary" />
              <StatCard label={t('totalTransactions')} value={txnStats.total} icon={<BarChart3 size={22} />} accent="secondary" trend={`${txnStats.success} ${t('success').toLowerCase()}, ${txnStats.failed} ${t('failed').toLowerCase()}`} />
              <StatCard label={t('scamReports')} value={scamCount} icon={<AlertTriangle size={22} />} accent="error" />
              <StatCard label={t('cases')} value={caseCount} icon={<FolderKanban size={22} />} accent="warning" />
            </div>
          </div>

          {/* Official Government Statistics KPIs */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="success">Official Government Data</Badge>
              <span className="text-xs text-gray-400">From NITI Aayog, NPCI, Ministry of Finance — not application records</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="MPI Headcount (NFHS-5)"
                value={mpiIndiaNFHS5 ? `${mpiIndiaNFHS5.indicator_value}%` : '—'}
                icon={<Users size={22} />}
                accent="primary"
                trend={povertyDecline > 0 ? `↓ ${povertyDecline.toFixed(1)}pp from NFHS-4` : undefined}
              />
              <StatCard
                label="SDG Composite Score"
                value={sdgComposite ? String(sdgComposite.indicator_value) : '—'}
                icon={<Activity size={22} />}
                accent="success"
                trend={sdgPrevScore ? `↑ from ${sdgPrevScore.indicator_value} in 2020-21` : undefined}
              />
              <StatCard
                label="Financial Inclusion Index"
                value={fiIndex ? String(fiIndex.indicator_value) : '—'}
                icon={<TrendingUp size={22} />}
                accent="secondary"
                trend={fiBaseline ? `↑ from ${fiBaseline.indicator_value} in 2021` : undefined}
              />
              <StatCard
                label="PMJDY Beneficiaries"
                value={pmjdyBeneficiaries ? `${pmjdyBeneficiaries.indicator_value} cr` : '—'}
                icon={<Landmark size={22} />}
                accent="warning"
              />
            </div>
          </div>

          {/* Application data charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="font-semibold">{t('fraudTrends')}</h2>
                <Badge variant="info">Application</Badge>
              </div>
              <p className="mb-4 text-xs text-gray-500">{t('fraudTrendsDesc')}</p>
              {totalAssessments === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">{t('noData')}</div>
              ) : (
                <div className="space-y-3">
                  {riskBars.map((bar) => {
                    const pct = totalAssessments > 0 ? (bar.count / totalAssessments) * 100 : 0;
                    return (
                      <div key={bar.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400">{bar.label}</span>
                          <span className="font-medium">{bar.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-6 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                          <div className={`h-full rounded-md transition-all duration-500 ${bar.color}`} style={{ width: `${Math.max(pct, bar.count > 0 ? 4 : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="font-semibold">{t('paymentStatusBreakdown')}</h2>
                <Badge variant="info">Application</Badge>
              </div>
              <p className="mb-4 text-xs text-gray-500">{t('totalTransactions')}: {totalTxns}</p>
              {totalTxns === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">{t('noData')}</div>
              ) : (
                <div className="space-y-3">
                  {statusBars.map((bar) => {
                    const pct = totalTxns > 0 ? (bar.count / totalTxns) * 100 : 0;
                    return (
                      <div key={bar.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400">{bar.label}</span>
                          <span className="font-medium">{bar.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-6 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                          <div className={`h-full rounded-md transition-all duration-500 ${bar.color}`} style={{ width: `${Math.max(pct, bar.count > 0 ? 4 : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* State-wise Poverty Chart (Official Data) */}
          {statePovertyNFHS5.length > 0 && (
            <Card>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="font-semibold">State-wise MPI Headcount Ratio (NFHS-5, 2019-21)</h2>
                <Badge variant="success">Official — NITI Aayog</Badge>
              </div>
              <p className="mb-4 text-xs text-gray-500">Source: NITI Aayog National MPI 2023 · Reporting period: NFHS-5 (2019-21) · Unit: % of population multidimensionally poor</p>
              <div className="space-y-2">
                {statePovertyNFHS5.slice(0, 15).map((s) => {
                  const pct = s.indicator_value ?? 0;
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{s.geography_name}</span>
                        <span className="font-medium">{pct.toFixed(2)}%</span>
                      </div>
                      <div className="h-5 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded-md transition-all duration-500 bg-primary-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* UPI Monthly Trend (Official NPCI Data — NOT Mudra-Mend) */}
          {upiVolumeStats.length > 0 && (
            <Card>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="font-semibold">National UPI Transaction Trend (Monthly)</h2>
                <Badge variant="success">Official — NPCI</Badge>
              </div>
              <p className="mb-4 text-xs text-gray-500">
                Source: NPCI Monthly Product Statistics · National UPI aggregates — these are NOT Mudra-Mend application transactions.
                Reporting period: Monthly · Unit: Volume in millions, Value in Rs crore
              </p>
              <div className="space-y-3">
                {upiVolumeStats.map((s, i) => {
                  const valStat = upiValueStats[i];
                  const pct = ((s.indicator_value ?? 0) / maxUpiVolume) * 100;
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{s.reporting_period}</span>
                        <span className="font-medium">
                          {(s.indicator_value ?? 0).toLocaleString('en-IN')} M
                          {valStat && <span className="text-gray-400"> · Rs {(valStat.indicator_value ?? 0).toLocaleString('en-IN')} cr</span>}
                        </span>
                      </div>
                      <div className="h-5 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded-md transition-all duration-500 bg-secondary-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* SDG 1 Tracker — now dynamic from real data */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 font-semibold"><Users size={20} className="text-primary-500" /> {t('sdg1Tracker')}</h2>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input className="input pl-9 w-auto text-sm" placeholder={t('searchReports')} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-500">{t('sdg1Desc')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-gray-800">
                    <th className="py-2 pr-4 font-medium">{t('indicator')}</th>
                    <th className="py-2 pr-4 font-medium">{t('value')}</th>
                    <th className="py-2 pr-4 font-medium">Data Category</th>
                    <th className="py-2 pr-4 font-medium">{t('source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSdgIndicators.map((ind, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="py-3 pr-4 font-medium">{ind.label}</td>
                      <td className="py-3 pr-4">{ind.value}{ind.unit ? ` ${ind.unit}` : ''}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={ind.dataCategory === 'official' ? 'success' : 'info'}>
                          {ind.dataCategory === 'official' ? 'Official' : 'Application'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{ind.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-400">{t('sdgDisclaimer')}</p>
            <p className="mt-1 text-xs text-gray-400">
              Official government statistics are kept separate from Mudra-Mend application records. National UPI statistics are not treated as Mudra-Mend transactions. Application registrations are not claimed as proof of poverty reduction.
            </p>
          </Card>

          {/* Full Government Statistics Table */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-primary-500" />
                <h2 className="font-semibold">All Official Government Statistics</h2>
                <Badge variant="success">Official</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select className="input w-auto text-sm" value={govtCategoryFilter} onChange={(e) => setGovtCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="poverty">Poverty</option>
                  <option value="sdg">SDG</option>
                  <option value="digital_payments">Digital Payments</option>
                  <option value="financial_inclusion">Financial Inclusion</option>
                </select>
              </div>
            </div>
            {filteredGovtStats.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">{t('noData')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-gray-800">
                      <th className="py-2 pr-4 font-medium">Indicator</th>
                      <th className="py-2 pr-4 font-medium">Category</th>
                      <th className="py-2 pr-4 font-medium">Geography</th>
                      <th className="py-2 pr-4 font-medium">Period</th>
                      <th className="py-2 pr-4 font-medium text-right">Value</th>
                      <th className="py-2 pr-4 font-medium">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGovtStats.map((s) => (
                      <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="py-3 pr-4 font-medium">{s.indicator_name}</td>
                        <td className="py-3 pr-4"><Badge variant="info">{s.indicator_category.replace(/_/g, ' ')}</Badge></td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{s.geography_name}</td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{s.reporting_period}</td>
                        <td className="py-3 pr-4 text-right font-semibold">
                          {s.indicator_value != null ? s.indicator_value.toLocaleString('en-IN') : s.indicator_value_text ?? '—'}
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{s.indicator_unit ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
