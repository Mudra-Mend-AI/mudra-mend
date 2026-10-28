import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeftRight, QrCode, HandCoins, Send, ShieldCheck, AlertTriangle, Loader2, X, Check, UserPlus, Ban, Smartphone, Zap, BookOpen, Download, RefreshCw, Info, FlaskConical, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, type BankAccount, type Recipient, type Transaction } from '@/lib/supabase';
import { runFraudAssessment, saveAssessment, getAiRecommendedAction, type AssessmentResult } from '@/lib/fraudEngine';
import { formatCurrency, validateIfsc, validateMobile, downloadCsv } from '@/lib/utils';
import { Card, LoadingState, EmptyState, Badge, statusBadge, ConfirmDialog } from '@/components/ui';

type Step = 'details' | 'checking' | 'assessment' | 'review' | 'result' | 'gateway_checkout';
type PayMode = 'quick' | 'guided';

const ASSESSMENT_TIMEOUT_MS = 12000;

const CASHFREE_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
let cashfreeInstance: ReturnType<NonNullable<Window['Cashfree']>> | null = null;
let sdkLoadPromise: Promise<ReturnType<NonNullable<Window['Cashfree']>> | null> | null = null;

function loadCashfreeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CASHFREE_SDK_URL}"]`);
    if (existing) {
      if (window.Cashfree) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Cashfree SDK script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = CASHFREE_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Cashfree SDK script failed to load'));
    document.head.appendChild(script);
  });
}

async function ensureCashfreeSDK(): Promise<ReturnType<NonNullable<Window['Cashfree']>> | null> {
  if (cashfreeInstance) return cashfreeInstance;
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = (async () => {
    try {
      await loadCashfreeScript();
      if (!window.Cashfree) {
        console.error('Cashfree SDK loaded but window.Cashfree is not defined');
        return null;
      }
      cashfreeInstance = window.Cashfree({ mode: 'sandbox' });
      return cashfreeInstance;
    } catch (err) {
      console.error('Cashfree SDK load error:', err);
      sdkLoadPromise = null;
      return null;
    }
  })();

  return sdkLoadPromise;
}

export default function Payments() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'pay' | 'request' | 'recipients' | 'history'>('pay');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const [{ data: a, error: aErr }, { data: r, error: rErr }, { data: tx, error: txErr }] = await Promise.all([
      supabase.from('bank_accounts').select('*').eq('user_id', profile.id).order('is_preferred', { ascending: false }),
      supabase.from('recipients').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('sender_id', profile.id).order('created_at', { ascending: false }).limit(5),
    ]);
    if (aErr) console.error('Failed to load bank accounts:', aErr.message);
    if (rErr) console.error('Failed to load recipients:', rErr.message);
    if (txErr) console.error('Failed to load transactions:', txErr.message);
    setAccounts((a ?? []) as BankAccount[]);
    setRecipients((r ?? []) as Recipient[]);
    setRecentTxns((tx ?? []) as Transaction[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState />;
  if (!profile) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t('payments')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('paymentsSubtitle')}</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <TabButton active={tab === 'pay'} onClick={() => setTab('pay')} icon={<Send size={16} />} label={t('payAnyone')} />
        <TabButton active={tab === 'request'} onClick={() => setTab('request')} icon={<HandCoins size={16} />} label={t('requestMoney')} />
        <TabButton active={tab === 'recipients'} onClick={() => setTab('recipients')} icon={<UserPlus size={16} />} label={t('savedRecipients')} />
        <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={<ArrowLeftRight size={16} />} label={t('recentActivity')} />
      </div>

      {tab === 'pay' && <PayForm accounts={accounts} recipients={recipients} userId={profile.id} lang={lang} onDone={loadData} />}
      {tab === 'request' && <RequestForm />}
      {tab === 'recipients' && <RecipientsManager recipients={recipients} userId={profile.id} onChanged={loadData} />}
      {tab === 'history' && <RecentHistory txns={recentTxns} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function PayForm({ accounts, recipients, userId, lang, onDone }: { accounts: BankAccount[]; recipients: Recipient[]; userId: string; lang: string; onDone: () => void }) {
  const { t } = useI18n();
  const [payMode, setPayMode] = useState<PayMode>('quick');
  const [step, setStep] = useState<Step>('details');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [recipientIfsc, setRecipientIfsc] = useState('');
  const [recipientUpi, setRecipientUpi] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'qr' | 'bank_transfer' | 'mobile'>('upi');
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: Transaction['status']; reference: string; amount: number; recipientName: string } | null>(null);
  const [error, setError] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [useRealGateway, setUseRealGateway] = useState(false);
  const [gatewayOrder, setGatewayOrder] = useState<{ orderId: string; paymentSessionId: string; transactionId: string; referenceId: string } | null>(null);
  const [gatewayError, setGatewayError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetForm = () => {
    setStep('details');
    setRecipientName(''); setRecipientAccount(''); setRecipientIfsc(''); setRecipientUpi(''); setRecipientMobile('');
    setAmount(''); setNote(''); setAssessment(null); setResult(null); setError(''); setAssessmentError('');
    setGatewayOrder(null); setGatewayError('');
  };

  const validateDetails = (): boolean => {
    setError('');
    const amt = parseFloat(amount);
    if (!recipientName.trim()) { setError(t('recipientNameRequired')); return false; }
    if (!amt || amt <= 0) { setError(t('amountRequired')); return false; }
    if (paymentMode === 'bank_transfer' && !validateIfsc(recipientIfsc)) { setError(t('ifscRequired')); return false; }
    if (paymentMode === 'mobile' && !validateMobile(recipientMobile)) { setError(t('mobileRequired')); return false; }
    if (paymentMode !== 'qr' && paymentMode !== 'mobile') {
      if (!recipientAccount && !recipientUpi) { setError(t('accountOrUpiRequired')); return false; }
    }
    return true;
  };

  const handleRunAssessment = async (isRetry = false) => {
    if (!validateDetails()) return;
    setStep('checking');
    setAssessing(true);
    setAssessmentError('');
    if (isRetry) setAssessment(null);

    const amt = parseFloat(amount);

    // Set timeout for assessment
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef.current = setTimeout(() => reject(new Error('timeout')), ASSESSMENT_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([
        runFraudAssessment({
          recipientName: recipientName.trim(),
          recipientAccount: recipientAccount || undefined,
          recipientIfsc: recipientIfsc || undefined,
          recipientUpi: recipientUpi || undefined,
          recipientMobile: recipientMobile || undefined,
          amount: amt,
          purpose: note || undefined,
          userId,
          isSimulated: true,
        }),
        timeoutPromise,
      ]);

      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setAssessment(result);
      setAssessing(false);
      setStep('assessment');
    } catch (err) {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setAssessing(false);
      const msg = err instanceof Error && err.message === 'timeout' ? t('assessmentTimeout') : t('assessmentError');
      setAssessmentError(msg);
      setStep('checking');
    }
  };

  const handleConfirmPayment = async () => {
    if (!assessment) return;
    setSubmitting(true);
    const amt = parseFloat(amount);

    if (assessment.riskLevel === 'blocked') {
      setResult({ status: 'cancelled', reference: 'BLOCKED-' + Date.now().toString(36).toUpperCase(), amount: amt, recipientName: recipientName.trim() });
      setStep('result');
      setSubmitting(false);
      return;
    }

    // Save assessment first so we can pass its ID to the server-side function
    const assessmentId = await saveAssessment(assessment, null, userId);

    const recipientRef = { name: recipientName, account: recipientAccount || null, ifsc: recipientIfsc || null, upi: recipientUpi || null, mobile: recipientMobile || null };
    const idempotencyKey = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const aiAction = getAiRecommendedAction(assessment.riskLevel, assessment.riskScore);

    if (useRealGateway) {
      // Real Cashfree Sandbox path: create order via edge function
      try {
        const orderResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-cashfree-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            amount: amt,
            recipientName: recipientName.trim(),
            recipientAccount: recipientAccount || null,
            recipientIfsc: recipientIfsc || null,
            recipientUpi: recipientUpi || null,
            recipientMobile: recipientMobile || null,
            purpose: note || null,
            paymentMode,
            assessmentId,
            idempotencyKey,
            riskScore: assessment.riskScore,
            aiRecommendedAction: aiAction,
            returnUrl: window.location.origin + window.location.pathname,
          }),
        });

        const orderData = await orderResp.json();

        if (!orderResp.ok || (!orderData.paymentSessionId && !orderData.alreadyExists)) {
          setSubmitting(false);
          setGatewayError(orderData.error || orderData.details || 'Failed to create Cashfree order');
          return;
        }

        if (orderData.paymentSessionId && typeof orderData.paymentSessionId !== 'string') {
          setSubmitting(false);
          setGatewayError('Invalid payment session received from server');
          return;
        }

        if (orderData.alreadyExists && orderData.status !== 'pending') {
          setResult({ status: orderData.status as Transaction['status'], reference: orderData.referenceId, amount: amt, recipientName: recipientName.trim() });
          setStep('result');
          setSubmitting(false);
          onDone();
          return;
        }

        // Link assessment to the transaction
        if (assessmentId) {
          await supabase.from('fraud_assessments').update({ transaction_id: orderData.transactionId }).eq('id', assessmentId);
        }

        setGatewayOrder({
          orderId: orderData.orderId,
          paymentSessionId: orderData.paymentSessionId,
          transactionId: orderData.transactionId,
          referenceId: orderData.referenceId,
        });
        setStep('gateway_checkout');
        setSubmitting(false);
      } catch (err) {
        setSubmitting(false);
        setGatewayError(err instanceof Error ? err.message : 'Network error creating order');
      }
      return;
    }

    // Simulated path (existing behavior)
    const { data: txn, error: fnError } = await supabase.rpc('create_simulated_transaction', {
      p_sender_id: userId,
      p_recipient_ref: recipientRef,
      p_amount: amt,
      p_payment_mode: paymentMode,
      p_purpose: note || null,
      p_idempotency_key: idempotencyKey,
      p_assessment_risk_level: assessment.riskLevel,
      p_assessment_id: assessmentId,
      p_risk_score: assessment.riskScore,
      p_ai_recommended_action: aiAction,
    });

    if (fnError || !txn) {
      setError(fnError?.message ?? t('assessmentError'));
      setStep('details');
      setSubmitting(false);
      return;
    }

    const createdTxn = txn as Transaction;

    // Link assessment to the transaction
    if (assessmentId) {
      const { error: linkError } = await supabase.from('fraud_assessments').update({ transaction_id: createdTxn.id }).eq('id', assessmentId);
      if (linkError) console.error('Failed to link assessment:', linkError.message);
    }

    const alertPriority = assessment.riskLevel === 'high' ? 'high' : assessment.riskLevel === 'medium' ? 'medium' : null;
    if (alertPriority) {
      const { error: alertError } = await supabase.from('alerts').insert({
        user_id: userId,
        category: 'payment_safety',
        priority: alertPriority,
        title: `${t('safetyAlert')}: ${assessment.riskLevel} ${t('riskLevel')}`,
        body: `${formatCurrency(amt)} → ${recipientName}. ${assessment.riskCategory} (${assessment.riskScore}/100). ${aiAction}`,
        related_transaction_id: createdTxn.id,
      });
      if (alertError) console.error('Failed to create alert:', alertError.message);
    }

    setResult({ status: createdTxn.status, reference: createdTxn.reference_id, amount: amt, recipientName: recipientName.trim() });
    setStep('result');
    setSubmitting(false);
    onDone();
  };

  const handleDownloadReceipt = () => {
    if (!result) return;
    downloadCsv(`receipt-${result.reference}.csv`, [{
      reference: result.reference,
      recipient: result.recipientName,
      amount: result.amount,
      status: result.status,
      mode: paymentMode,
      date: new Date().toISOString(),
      simulated: useRealGateway ? 'NO — Cashfree Sandbox' : 'YES — Demo Mode',
    }]);
  };

  const handleVerifyPayment = async (): Promise<void> => {
    if (!gatewayOrder) return;
    setVerifying(true);
    setGatewayError('');
    try {
      const session = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-cashfree-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({ orderId: gatewayOrder.orderId, transactionId: gatewayOrder.transactionId }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setVerifying(false);
        setGatewayError(data.error || data.details || 'Payment verification failed. Click "Verify payment status" to retry.');
        return;
      }
      const finalStatus = data.status as Transaction['status'];
      if (finalStatus === 'failed' || finalStatus === 'cancelled') {
        await supabase.from('alerts').insert({
          user_id: userId,
          category: 'payment_safety',
          priority: 'high',
          title: `Payment ${finalStatus}: ${gatewayOrder.referenceId}`,
          body: `Payment of ${formatCurrency(parseFloat(amount))} to ${recipientName.trim()} was ${finalStatus}. Reference: ${gatewayOrder.referenceId}`,
          related_transaction_id: gatewayOrder.transactionId,
        });
      }
      setResult({ status: finalStatus, reference: gatewayOrder.referenceId, amount: parseFloat(amount), recipientName: recipientName.trim() });
      setStep('result');
      setVerifying(false);
      onDone();
    } catch (err) {
      setVerifying(false);
      setGatewayError(err instanceof Error ? err.message : 'Network error during verification. Click "Verify payment status" to retry.');
    }
  };

  const handleOpenCheckout = async () => {
    if (!gatewayOrder) return;
    setGatewayError('');
    setVerifying(true);
    try {
      const cf = await ensureCashfreeSDK();
      if (!cf) {
        setVerifying(false);
        setGatewayError('Cashfree SDK could not be loaded. Check your network connection and try again.');
        return;
      }

      if (!gatewayOrder.paymentSessionId || !gatewayOrder.paymentSessionId.trim()) {
        setVerifying(false);
        setGatewayError('No valid payment session available. Please go back and retry the payment.');
        return;
      }

      // Persist order info so we can verify after redirect
      sessionStorage.setItem('cashfree_pending_order', JSON.stringify(gatewayOrder));

      const result = await cf.checkout({
        paymentSessionId: gatewayOrder.paymentSessionId,
        redirectTarget: '_self',
      });

      // With _self, if the SDK resolves without redirecting, handle it
      if (result?.error) {
        setVerifying(false);
        setGatewayError('Checkout could not be opened. Click "Verify payment status" to check the result, or try again.');
      }
    } catch (err) {
      setVerifying(false);
      setGatewayError(err instanceof Error ? err.message : 'Failed to open Cashfree checkout. Please try again.');
    }
  };

  // Auto-verify payment when returning from Cashfree redirect
  const restorePendingOrder = useCallback(() => {
    const saved = sessionStorage.getItem('cashfree_pending_order');
    if (!saved) return;
    try {
      const order = JSON.parse(saved) as { orderId: string; paymentSessionId: string; transactionId: string; referenceId: string };
      sessionStorage.removeItem('cashfree_pending_order');
      // Clean up any order_id query param from the redirect URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('order_id')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      setGatewayOrder(order);
      setStep('gateway_checkout');
      // Auto-verify after a short delay to let the UI settle
      setTimeout(() => {
        // Call verify directly since handleVerifyPayment depends on gatewayOrder state
        (async () => {
          setVerifying(true);
          setGatewayError('');
          try {
            const session = await supabase.auth.getSession();
            const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-cashfree-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.data.session?.access_token}`,
              },
              body: JSON.stringify({ orderId: order.orderId, transactionId: order.transactionId }),
            });
            const data = await resp.json();
            if (!resp.ok) {
              setVerifying(false);
              setGatewayError(data.error || data.details || 'Payment verification failed. Click "Verify payment status" to retry.');
              return;
            }
            const finalStatus = data.status as Transaction['status'];
            if (finalStatus === 'failed' || finalStatus === 'cancelled') {
              await supabase.from('alerts').insert({
                user_id: userId,
                category: 'payment_safety',
                priority: 'high',
                title: `Payment ${finalStatus}: ${order.referenceId}`,
                body: `Payment was ${finalStatus}. Reference: ${order.referenceId}`,
                related_transaction_id: order.transactionId,
              });
            }
            setResult({ status: finalStatus, reference: order.referenceId, amount: parseFloat(amount), recipientName: recipientName.trim() });
            setStep('result');
            setVerifying(false);
            onDone();
          } catch {
            setVerifying(false);
            setGatewayError('Network error during verification. Click "Verify payment status" to retry.');
          }
        })();
      }, 500);
    } catch {
      sessionStorage.removeItem('cashfree_pending_order');
    }
  }, [userId, amount, recipientName, onDone]);

  useEffect(() => {
    restorePendingOrder();
  }, [restorePendingOrder]);

  // --- Step: Checking (safety popup) ---
  if (step === 'checking') {
    return (
      <Card className="py-10 text-center">
        {assessmentError ? (
          <div className="space-y-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-lg font-bold">{t('assessmentErrorTitle')}</h2>
            <p className="text-sm text-gray-500">{assessmentError}</p>
            <div className="flex justify-center gap-3">
              <button className="btn-secondary" onClick={() => { setStep('details'); setAssessmentError(''); }}>
                <X size={16} /> {t('back')}
              </button>
              <button className="btn-primary" onClick={() => handleRunAssessment(true)}>
                <RefreshCw size={16} /> {t('retry')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <Loader2 size={28} className="animate-spin" />
            </div>
            <h2 className="text-lg font-bold">{t('checkingSafety')}</h2>
            <p className="text-sm text-gray-500">{t('checkingSafetyDesc')}</p>
            <div className="mx-auto max-w-xs space-y-2 text-left text-xs text-gray-400">
              <div className="flex items-center gap-2"><Check size={12} className="text-success-500" /> {t('checkingRecipient')}</div>
              <div className="flex items-center gap-2"><Check size={12} className="text-success-500" /> {t('checkingAmount')}</div>
              <div className="flex items-center gap-2"><Check size={12} className="text-success-500" /> {t('checkingHistory')}</div>
              <div className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-primary-500" /> {t('checkingScamDatabase')}</div>
            </div>
            <p className="text-xs text-gray-400">{t('assessmentDisclaimer')}</p>
          </div>
        )}
      </Card>
    );
  }

  // --- Step: Assessment results ---
  if (step === 'assessment' && assessment) {
    const riskColors = {
      low: { bg: 'bg-success-50 dark:bg-success-900/20', text: 'text-success-700 dark:text-success-300', label: t('riskLow'), bar: 'bg-success-500' },
      medium: { bg: 'bg-warning-50 dark:bg-warning-900/20', text: 'text-warning-700 dark:text-warning-300', label: t('riskMedium'), bar: 'bg-warning-500' },
      high: { bg: 'bg-error-50 dark:bg-error-900/20', text: 'text-error-700 dark:text-error-300', label: t('riskHigh'), bar: 'bg-error-500' },
      blocked: { bg: 'bg-error-100 dark:bg-error-900/40', text: 'text-error-800 dark:text-error-200', label: t('riskBlocked'), bar: 'bg-error-700' },
    };
    const rc = riskColors[assessment.riskLevel];
    const explanation = lang === 'hi' ? assessment.explanationHi : lang === 'mr' ? assessment.explanationMr : assessment.explanation;

    return (
      <div className="space-y-4">
        <Card className={rc.bg}>
          <div className="flex items-center gap-3">
            {assessment.riskLevel === 'blocked' ? <Ban size={28} className={rc.text} /> : <ShieldCheck size={28} className={rc.text} />}
            <div className="flex-1">
              <p className={`text-lg font-bold ${rc.text}`}>{t('safetyAssessmentComplete')} — {rc.label}</p>
              <p className="text-xs text-gray-500">{t('paymentSimulated')} · {assessment.modelVersion}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{t('riskScore')}</span>
              <span className={`font-bold ${rc.text}`}>{assessment.riskScore}/100</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className={`h-full rounded-full transition-all ${rc.bar}`} style={{ width: `${assessment.riskScore}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{assessment.riskCategory}</p>
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 font-semibold">{t('assessmentExplanation')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{explanation}</p>
          {assessment.missingInfo && (
            <p className="mt-2 text-xs text-warning-600 dark:text-warning-400">{t('missingInfo')}: {assessment.missingInfo}</p>
          )}
        </Card>

        <Card>
          <h3 className="mb-2 font-semibold">{t('rulesEvaluated')}</h3>
          <div className="space-y-1.5">
            {assessment.rulesEvaluated.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {r.triggered ? <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-warning-500" /> : <Check size={16} className="mt-0.5 flex-shrink-0 text-success-500" />}
                <span className={r.triggered ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>{r.detail}</span>
              </div>
            ))}
          </div>
        </Card>

        {assessment.recommendations.length > 0 && (
          <Card>
            <h3 className="mb-2 font-semibold">{t('safetyRecommendations')}</h3>
            <ul className="space-y-1.5">
              {assessment.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" /> {r}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {assessment.restrictions.length > 0 && (
          <Card className="border-error-200 dark:border-error-800">
            <h3 className="mb-2 font-semibold text-error-700 dark:text-error-300">{t('mandatoryRestrictions')}</h3>
            <ul className="space-y-1.5">
              {assessment.restrictions.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-error-700 dark:text-error-300">
                  <Ban size={16} className="mt-0.5 flex-shrink-0" /> {r}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h3 className="mb-3 font-semibold">{t('reviewPayment')}</h3>
          <div className="space-y-2 text-sm">
            <ReviewRow label={t('recipientName')} value={recipientName} />
            <ReviewRow label={t('amount')} value={formatCurrency(parseFloat(amount))} />
            {recipientAccount && <ReviewRow label={t('recipientAccount')} value={`••••${recipientAccount.slice(-4)}`} />}
            {recipientUpi && <ReviewRow label={t('recipientUpi')} value={recipientUpi} />}
            {recipientMobile && <ReviewRow label={t('mobile')} value={recipientMobile} />}
            <ReviewRow label={t('mode')} value={paymentMode.toUpperCase()} />
            {note && <ReviewRow label={t('note')} value={note} />}
          </div>
        </Card>

        {assessment.riskLevel !== 'blocked' && (
          <div className="rounded-lg bg-warning-50 px-3 py-2.5 text-xs text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
            {useRealGateway ? 'Sandbox payment via Cashfree — no real money will be charged.' : t('simulatedPaymentWarning')}
          </div>
        )}

        {gatewayError && (
          <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">
            {gatewayError}
            <button className="ml-2 text-xs underline" onClick={() => setGatewayError('')}>Dismiss</button>
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => { setShowCancel(true); }}>
            <X size={18} /> {t('cancelPayment')}
          </button>
          {assessment.riskLevel === 'blocked' ? (
            <button className="btn-danger flex-1" disabled>
              <Ban size={18} /> {t('riskBlocked')}
            </button>
          ) : (
            <button className="btn-primary flex-1" onClick={handleConfirmPayment} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} {t('confirmPayment')}
            </button>
          )}
        </div>

        <ConfirmDialog
          open={showCancel}
          title={t('cancelPayment')}
          message={t('cancelPaymentConfirm')}
          confirmLabel={t('cancel')}
          onConfirm={() => { resetForm(); setShowCancel(false); }}
          onCancel={() => setShowCancel(false)}
        />
      </div>
    );
  }

  // --- Step: Gateway Checkout (Cashfree Sandbox) ---
  if (step === 'gateway_checkout' && gatewayOrder) {
    const amt = parseFloat(amount);
    return (
      <div className="space-y-4">
        <Card className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <CreditCard size={32} />
          </div>
          <h2 className="text-xl font-bold">Cashfree Sandbox Checkout</h2>
          <p className="mt-2 text-sm text-gray-500">{formatCurrency(amt)} → {recipientName}</p>
          <p className="mt-1 text-xs text-gray-400">{t('reference')}: {gatewayOrder.referenceId}</p>
          <p className="mt-3 text-xs text-warning-600 dark:text-warning-400">Sandbox mode — no real money will be charged</p>

          {gatewayError && (
            <div className="mt-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">
              {gatewayError}
              <button className="ml-2 text-xs underline" onClick={() => { setGatewayError(''); }}>Dismiss</button>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-3">
            <button className="btn-secondary" onClick={() => { setStep('assessment'); setGatewayError(''); }} disabled={verifying}>
              <X size={16} /> {t('back')}
            </button>
            <button className="btn-primary" onClick={handleOpenCheckout} disabled={verifying}>
              {verifying ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />} Open Checkout
            </button>
          </div>

          <button className="mt-4 text-xs text-gray-400 hover:text-gray-600" onClick={handleVerifyPayment} disabled={verifying}>
            {verifying ? <Loader2 size={12} className="inline animate-spin" /> : null} Already paid? Verify payment status →
          </button>
        </Card>
      </div>
    );
  }

  // --- Step: Result ---
  if (step === 'result' && result) {
    const isSuccess = result.status === 'success';
    const isBlocked = result.status === 'cancelled';
    return (
      <Card className="text-center py-8">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isSuccess ? 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400' : 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400'}`}>
          {isSuccess ? <Check size={32} /> : <X size={32} />}
        </div>
        <h2 className="text-xl font-bold">{isSuccess ? t('paymentSuccess') : isBlocked ? t('riskBlocked') : t('paymentFailed')}</h2>
        <p className="mt-2 text-sm text-gray-500">{t('reference')}: {result.reference}</p>
        <p className="mt-1 text-lg font-bold">{formatCurrency(result.amount)}</p>
        <p className="text-sm text-gray-500">→ {result.recipientName}</p>
        <div className="mt-2">{statusBadge(result.status)}</div>
        <p className="mt-3 text-xs text-accent-600">{useRealGateway ? 'Cashfree Sandbox Payment' : t('paymentSimulated')}</p>
        <div className="mt-6 flex justify-center gap-3">
          {isSuccess && (
            <button className="btn-secondary" onClick={handleDownloadReceipt}>
              <Download size={16} /> {t('downloadReceipt')}
            </button>
          )}
          <button className="btn-primary" onClick={resetForm}>{t('newPayment')}</button>
        </div>
      </Card>
    );
  }

  // --- Step: Details form ---
  return (
    <div className="space-y-4">
      {/* Quick Pay / Guided Pay toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setPayMode('quick')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${payMode === 'quick' ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400'}`}
        >
          <Zap size={18} /> {t('quickPay')}
        </button>
        <button
          onClick={() => setPayMode('guided')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${payMode === 'guided' ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400'}`}
        >
          <BookOpen size={18} /> {t('guidedPay')}
        </button>
      </div>

      {payMode === 'guided' && (
        <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
          <div className="flex items-start gap-2">
            <Info size={16} className="mt-0.5 flex-shrink-0" />
            <p>{t('guidedPayDesc')}</p>
          </div>
        </div>
      )}

      <Card>
        {accounts.length === 0 ? (
          <EmptyState icon={<ArrowLeftRight size={40} />} title={t('noBankAccounts')} subtitle={t('linkBankAccountFirst')} />
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleRunAssessment(); }} className="space-y-4">
            {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}

            <div>
              <label className="label">{t('fromAccount')}</label>
              <select className="input" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} required>
                <option value="">{t('selectAccount')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.bank_name} ••••{a.account_number_last4}</option>
                ))}
              </select>
            </div>

            {/* Payment method selector */}
            <div className="flex flex-wrap gap-2">
              <PaymentModeBtn active={paymentMode === 'upi'} onClick={() => setPaymentMode('upi')} label="UPI" />
              <PaymentModeBtn active={paymentMode === 'mobile'} onClick={() => setPaymentMode('mobile')} icon={<Smartphone size={16} />} label={t('mobileNumber')} />
              <PaymentModeBtn active={paymentMode === 'qr'} onClick={() => setPaymentMode('qr')} icon={<QrCode size={16} />} label={t('scanQr')} />
              <PaymentModeBtn active={paymentMode === 'bank_transfer'} onClick={() => setPaymentMode('bank_transfer')} label={t('bankTransfer')} />
            </div>

            {paymentMode === 'qr' && (
              <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                <div className="flex items-center gap-2"><QrCode size={18} /> {t('qrPermissionNote')}</div>
                <p className="mt-1 text-xs">{t('qrScamWarning')}</p>
              </div>
            )}

            {paymentMode === 'mobile' && (
              <div>
                <label className="label">{t('recipientMobile')}</label>
                <input className="input" value={recipientMobile} onChange={(e) => setRecipientMobile(e.target.value)} placeholder="9876543210" maxLength={10} inputMode="numeric" />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t('recipientName')}</label>
                <input className="input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} list="recipient-list" placeholder={t('recipientName')} />
                <datalist id="recipient-list">
                  {recipients.map((r) => <option key={r.id} value={r.name} />)}
                </datalist>
              </div>
              <div>
                <label className="label">{t('amount')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">₹</span>
                  <input className="input pl-8" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" type="number" step="0.01" inputMode="decimal" />
                </div>
              </div>
            </div>

            {paymentMode === 'bank_transfer' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">{t('recipientAccount')}</label>
                  <input className="input" value={recipientAccount} onChange={(e) => setRecipientAccount(e.target.value)} placeholder={t('accountNumber')} />
                </div>
                <div>
                  <label className="label">{t('recipientIfsc')}</label>
                  <input className="input uppercase" value={recipientIfsc} onChange={(e) => setRecipientIfsc(e.target.value.toUpperCase())} placeholder={t('ifscCode')} maxLength={11} />
                </div>
              </div>
            )}

            {paymentMode === 'upi' && (
              <div>
                <label className="label">{t('recipientUpi')}</label>
                <input className="input" value={recipientUpi} onChange={(e) => setRecipientUpi(e.target.value)} placeholder="name@upi" />
              </div>
            )}

            <div>
              <label className="label">{t('note')} <span className="text-gray-400 text-xs">({t('optional')})</span></label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notePlaceholder')} />
            </div>

            {/* Quick pay shortcuts */}
            {payMode === 'quick' && recipients.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">{t('quickSend')}</p>
                <div className="flex flex-wrap gap-2">
                  {recipients.slice(0, 4).map((r) => (
                    <button key={r.id} type="button" onClick={() => { setRecipientName(r.name); setRecipientUpi(r.upi_id ?? ''); setRecipientAccount(r.account_number ?? ''); setRecipientIfsc(r.ifsc ?? ''); }}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:text-gray-400">
                      <Smartphone size={12} /> {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment mode toggle: Simulated vs Real Cashfree Sandbox */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium">{useRealGateway ? 'Real Payment (Sandbox)' : t('demoPaymentLabel')}</p>
                <p className="text-xs text-gray-500">{useRealGateway ? 'Uses Cashfree Sandbox — no real money charged' : t('simulatedPaymentWarning')}</p>
              </div>
              <button
                type="button"
                onClick={() => setUseRealGateway(!useRealGateway)}
                className={`relative h-6 w-11 rounded-full transition-colors ${useRealGateway ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                aria-label="Toggle real sandbox payment"
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${useRealGateway ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={assessing}>
              {assessing ? <><Loader2 className="animate-spin" size={18} /> {t('runSafetyCheck')}…</> : <><ShieldCheck size={18} /> {t('runSafetyCheck')}</>}
            </button>
          </form>
        )}
      </Card>

      <div className="rounded-lg bg-secondary-50 px-3 py-2.5 text-xs text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
        <FlaskConical size={12} className="mr-1 inline" /> {t('demoPaymentLabel')}
      </div>
    </div>
  );
}

function PaymentModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-1.5 dark:border-gray-800">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function RecentHistory({ txns }: { txns: Transaction[] }) {
  const { t } = useI18n();
  if (txns.length === 0) {
    return <Card><EmptyState icon={<ArrowLeftRight size={40} />} title={t('noData')} subtitle={t('noRecentTxns')} /></Card>;
  }
  return (
    <div className="space-y-2">
      {txns.map((tx) => (
        <Card key={tx.id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{(tx.recipient_ref as { name?: string }).name ?? 'Unknown'}</p>
              <p className="text-xs text-gray-500">{formatCurrency(tx.amount)} · {tx.payment_mode.toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-2">
              {tx.is_simulated && <Badge variant="warning">{t('simulated')}</Badge>}
              {statusBadge(tx.status)}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RequestForm() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError(t('amountRequired')); return; }
    if (!profile) return;
    setSubmitting(true);
    const idempotencyKey = `${profile.id}-req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: txn, error: fnError } = await supabase.rpc('create_simulated_transaction', {
      p_sender_id: profile.id,
      p_recipient_ref: { name: profile.full_name, account: null, ifsc: null, upi: null, mobile: null },
      p_amount: amt,
      p_payment_mode: 'request',
      p_purpose: note || null,
      p_idempotency_key: idempotencyKey,
      p_assessment_risk_level: 'low',
      p_assessment_id: null,
    });
    if (fnError || !txn) {
      setError(fnError?.message ?? t('error'));
      setSubmitting(false);
      return;
    }
    const created = txn as Transaction;
    setReference(created.reference_id);
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <Card>
      {submitted ? (
        <div className="py-8 text-center">
          <Check className="mx-auto mb-3 text-success-500" size={40} />
          <p className="font-semibold">{t('requestCreated')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('reference')}: {reference}</p>
          <p className="mt-1 text-xs text-accent-600">{t('paymentSimulated')}</p>
          <button className="btn-secondary mt-4" onClick={() => { setSubmitted(false); setAmount(''); setNote(''); setReference(''); }}>{t('back')}</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
          <div>
            <label className="label">{t('amount')}</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">₹</span>
              <input className="input pl-8" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" type="number" step="0.01" required />
            </div>
          </div>
          <div>
            <label className="label">{t('note')} <span className="text-gray-400 text-xs">({t('optional')})</span></label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notePlaceholder')} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <><HandCoins size={18} /> {t('requestMoney')}</>}
          </button>
        </form>
      )}
    </Card>
  );
}

function RecipientsManager({ recipients, userId, onChanged }: { recipients: Recipient[]; userId: string; onChanged: () => void }) {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upi, setUpi] = useState('');
  const [mobile, setMobile] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError(t('recipientNameRequired')); return; }
    if (!account && !upi && !mobile) { setError(t('accountOrUpiOrMobileRequired')); return; }
    const { error: insertError } = await supabase.from('recipients').insert({
      user_id: userId, name: name.trim(), account_number: account || null, ifsc: ifsc || null, upi_id: upi || null, note: note || null, verified: false,
    });
    if (insertError) { setError(insertError.message); return; }
    setName(''); setAccount(''); setIfsc(''); setUpi(''); setMobile(''); setNote(''); setShowForm(false);
    onChanged();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('recipients').delete().eq('id', id).eq('user_id', userId);
    if (error) { console.error('Delete recipient error:', error.message); return; }
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}><UserPlus size={18} /> {t('add')}</button>
      </div>
      {recipients.length === 0 ? (
        <Card><EmptyState icon={<UserPlus size={40} />} title={t('noData')} subtitle={t('addRecipientsHint')} /></Card>
      ) : (
        <div className="space-y-2">
          {recipients.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-gray-500">{r.upi_id ?? (r.account_number ? `••••${r.account_number.slice(-4)}` : '')} {r.ifsc ? `· ${r.ifsc}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.verified ? <Badge variant="success">{t('verified')}</Badge> : <Badge variant="neutral">{t('unverified')}</Badge>}
                  <button onClick={() => handleDelete(r.id)} className="btn-ghost p-2 text-error-500"><X size={16} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{t('addRecipient')}</h2>
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              {error && <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">{error}</div>}
              <div><label className="label">{t('recipientName')}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><label className="label">{t('recipientUpi')}</label><input className="input" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" /></div>
              <div><label className="label">{t('mobile')}</label><input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" maxLength={10} /></div>
              <div><label className="label">{t('recipientAccount')}</label><input className="input" value={account} onChange={(e) => setAccount(e.target.value)} /></div>
              <div><label className="label">{t('recipientIfsc')}</label><input className="input uppercase" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} maxLength={11} /></div>
              <div><label className="label">{t('note')} <span className="text-gray-400 text-xs">({t('optional')})</span></label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                <button type="submit" className="btn-primary flex-1">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
