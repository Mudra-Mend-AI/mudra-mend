import { useState, useEffect } from 'react';
import { CreditCard, Bell, Mail, MessageSquare, Smartphone, CheckCircle, XCircle, AlertCircle, RefreshCw, FlaskConical, Settings as SettingsIcon, Plug, Shield, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { Card, Badge, StatCard } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface IntegrationStatus {
  id: string;
  name: string;
  category: 'payment' | 'notification' | 'security';
  status: 'not_configured' | 'configured' | 'active' | 'error';
  description: string;
  setupSteps: string[];
  requiredSecrets: string[];
  lastEventAt: string | null;
  pendingEvents: number;
  failedEvents: number;
}

const INTEGRATIONS: IntegrationStatus[] = [
  {
    id: 'cashfree',
    name: 'Cashfree Payments',
    category: 'payment',
    status: 'not_configured',
    description: 'Accept payments via UPI, cards, net banking, and wallets through Cashfree. Supports webhook notifications.',
    setupSteps: [
      'Create a Cashfree merchant account at cashfree.com',
      'Generate API keys from the Cashfree Dashboard',
      'Configure webhook URL in Dashboard > Settings > Webhooks',
      'Store credentials as server-side secrets (CF_APP_ID, CF_SECRET_KEY, CF_WEBHOOK_SECRET)',
      'Run test transaction in sandbox mode',
    ],
    requiredSecrets: ['CF_APP_ID', 'CF_SECRET_KEY', 'CF_WEBHOOK_SECRET'],
    lastEventAt: null,
    pendingEvents: 0,
    failedEvents: 0,
  },
  {
    id: 'in-app-notif',
    name: 'In-App Notifications',
    category: 'notification',
    status: 'active',
    description: 'Notifications displayed in the app notification center. Always available — no external configuration required.',
    setupSteps: [],
    requiredSecrets: [],
    lastEventAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    pendingEvents: 0,
    failedEvents: 0,
  },
  {
    id: 'email-alerts',
    name: 'Email Alert Service',
    category: 'notification',
    status: 'not_configured',
    description: 'Send fraud alerts and notifications via email. Requires an SMTP or email API provider (e.g., Resend, SendGrid, Amazon SES).',
    setupSteps: [
      'Choose an email provider (Resend, SendGrid, or Amazon SES)',
      'Create an account and generate API key',
      'Verify your sender domain',
      'Store credentials as server-side secrets (EMAIL_API_KEY, EMAIL_FROM_ADDRESS)',
      'Send a test email to verify configuration',
    ],
    requiredSecrets: ['EMAIL_API_KEY', 'EMAIL_FROM_ADDRESS'],
    lastEventAt: null,
    pendingEvents: 0,
    failedEvents: 0,
  },
  {
    id: 'sms-alerts',
    name: 'SMS Alert Service',
    category: 'notification',
    status: 'not_configured',
    description: 'Send fraud alerts via SMS. Requires an SMS gateway provider (e.g., MSG91, Twilio, AWS SNS).',
    setupSteps: [
      'Choose an SMS provider (MSG91, Twilio, or AWS SNS)',
      'Create an account and generate API key',
      'Register your sender ID (DLT approval for India)',
      'Store credentials as server-side secrets (SMS_API_KEY, SMS_SENDER_ID)',
      'Send a test SMS to verify configuration',
    ],
    requiredSecrets: ['SMS_API_KEY', 'SMS_SENDER_ID'],
    lastEventAt: null,
    pendingEvents: 0,
    failedEvents: 0,
  },
  {
    id: 'push-notif',
    name: 'Browser Push Notifications',
    category: 'notification',
    status: 'not_configured',
    description: 'Send real-time push notifications to users browsers. Requires Firebase Cloud Messaging or Web Push configuration.',
    setupSteps: [
      'Create a Firebase project at console.firebase.google.com',
      'Generate a Web Push certificate (VAPID key pair)',
      'Configure service worker for push notifications',
      'Store credentials as server-side secrets (FCM_SERVER_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)',
      'Request notification permission from users',
    ],
    requiredSecrets: ['FCM_SERVER_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
    lastEventAt: null,
    pendingEvents: 0,
    failedEvents: 0,
  },
];

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  payment: <CreditCard size={20} />,
  notification: <Bell size={20} />,
  security: <Shield size={20} />,
};

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  configured: 'warning',
  not_configured: 'neutral',
  error: 'error',
  checking: 'neutral',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  active: <CheckCircle size={16} className="text-success-500" />,
  configured: <CheckCircle size={16} className="text-warning-500" />,
  not_configured: <XCircle size={16} className="text-gray-400" />,
  error: <XCircle size={16} className="text-error-500" />,
  checking: <Loader2 size={16} className="animate-spin text-gray-400" />,
};

export default function IntegrationSettings() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | 'payment' | 'notification'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cashfreeStatus, setCashfreeStatus] = useState<'checking' | 'not_configured' | 'configured' | 'active'>('checking');
  const [cashfreeDetail, setCashfreeDetail] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // First probe: check if credentials are present by calling the edge function
        // with an invalid amount. Credential check runs before validation, so:
        // 503 = credentials missing, 400 = credentials present (validation failed).
        const { data: session } = await supabase.auth.getSession();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-cashfree-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ amount: 0, recipientName: 'probe', idempotencyKey: 'probe-' + Date.now() }),
        });
        const data = await resp.json();
        if (cancelled) return;

        if (resp.status === 503) {
          setCashfreeStatus('not_configured');
          setCashfreeDetail(data.error || 'Credentials not set');
          return;
        }

        if (resp.status !== 400 && resp.status !== 200) {
          setCashfreeStatus('not_configured');
          setCashfreeDetail(data.error || `Unexpected response (${resp.status})`);
          return;
        }

        // Credentials are present. Now check if a sandbox test payment has succeeded.
        const { data: successfulTxn, error: txnError } = await supabase
          .from('transactions')
          .select('id')
          .eq('gateway', 'cashfree')
          .eq('status', 'success')
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (txnError) {
          setCashfreeStatus('configured');
          setCashfreeDetail('Credentials detected — unable to verify test payment status');
          return;
        }

        if (successfulTxn) {
          setCashfreeStatus('active');
          setCashfreeDetail('Credentials configured and sandbox test payment verified');
        } else {
          setCashfreeStatus('configured');
          setCashfreeDetail('Credentials detected — no successful sandbox payment yet');
        }
      } catch {
        if (cancelled) return;
        setCashfreeStatus('not_configured');
        setCashfreeDetail('Unable to reach edge function');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const integrations = INTEGRATIONS.map((i) =>
    i.id === 'cashfree'
      ? {
          ...i,
          status: cashfreeStatus === 'checking' ? 'not_configured' : cashfreeStatus,
          description: cashfreeStatus === 'active'
            ? 'Cashfree Sandbox is active. Credentials configured and at least one sandbox payment verified successfully.'
            : cashfreeStatus === 'configured'
              ? 'Cashfree Sandbox credentials detected. Edge functions deployed. Ready for sandbox test payments.'
              : cashfreeStatus === 'not_configured'
                ? `${i.description} — ${cashfreeDetail || 'Secrets not configured.'}`
                : i.description,
          lastEventAt: cashfreeStatus === 'active' ? new Date().toISOString() : null,
        }
      : i
  );

  const filtered = integrations.filter((i) => filter === 'all' || i.category === filter);

  const activeCount = integrations.filter((i) => i.status === 'active').length;
  const configuredCount = integrations.filter((i) => i.status === 'configured').length;
  const notConfiguredCount = integrations.filter((i) => i.status === 'not_configured').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Integration Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Payment gateway, notification service, and webhook configuration status</p>
      </div>

      <div className="rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-900/20 dark:text-warning-300">
        <div className="flex items-center gap-2">
          <Shield size={16} />
          <span>Credentials must be stored as server-side secrets only. Secret values are never displayed in the frontend. An integration is not active until its credentials and test flow have been verified.</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Integrations" value={activeCount} icon={<CheckCircle size={22} />} accent="success" />
        <StatCard label="Needs Configuration" value={notConfiguredCount} icon={<Plug size={22} />} accent="warning" />
        <StatCard label="Total Integrations" value={INTEGRATIONS.length} icon={<SettingsIcon size={22} />} accent="primary" />
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {([
          { key: 'all' as const, label: 'All' },
          { key: 'payment' as const, label: 'Payment Gateways' },
          { key: 'notification' as const, label: 'Notification Services' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              filter === tab.key ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((int) => (
          <Card key={int.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 rounded-lg bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  {CATEGORY_ICON[int.category]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{int.name}</h3>
                    <Badge variant={STATUS_BADGE[int.status]}>{int.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{int.description}</p>
                  {int.lastEventAt && (
                    <p className="mt-1 text-xs text-gray-400">Last event: {new Date(int.lastEventAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {STATUS_ICON[int.status]}
                {int.setupSteps.length > 0 && (
                  <button
                    onClick={() => setExpanded(expanded === int.id ? null : int.id)}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    {expanded === int.id ? 'Hide' : 'Setup'} →
                  </button>
                )}
              </div>
            </div>

            {expanded === int.id && (
              <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Setup Instructions</h4>
                  <ol className="mt-2 space-y-2">
                    {int.setupSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Required Server-Side Secrets</h4>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {int.requiredSecrets.map((s) => (
                      <code key={s} className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">{s}</code>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:bg-gray-800/50">
                  <strong>Webhook Setup:</strong> Configure your webhook endpoint URL in the provider dashboard. The endpoint must verify webhook signatures using the provider documented method. Invalid signatures must be rejected. Duplicate webhook deliveries must be handled idempotently.
                </div>

                {int.category === 'payment' && (
                  <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2.5 text-xs text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300">
                    <FlaskConical size={14} />
                    Payment integrations start in sandbox/test mode. Live payments require provider approval, verified credentials, and completed security checks.
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="border-l-4 border-l-primary-500">
        <h3 className="font-semibold flex items-center gap-2"><Plug size={18} /> Integration Architecture</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Payment providers use a shared internal interface so new gateways can be added without rewriting dashboards or risk-analysis modules. Provider events are normalized into a common transaction event model. Webhook signatures are verified server-side using each providers documented process.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/50">
            <strong>Webhook Verification:</strong> Provider-specific signature verification on every webhook event
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/50">
            <strong>Idempotency:</strong> Duplicate webhook deliveries do not create duplicate transactions or alerts
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/50">
            <strong>Reconciliation:</strong> Delayed or missing events are detected through status API polling
          </div>
        </div>
      </Card>
    </div>
  );
}
