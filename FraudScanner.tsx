import { useState } from 'react';
import { Scan, MessageSquare, ArrowLeftRight, FileWarning, ShieldCheck, AlertTriangle, Info, Loader2, Brain, Lightbulb } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Card, Badge, EmptyState } from '@/components/ui';
import { runFraudAssessment } from '@/lib/fraudEngine';

type ScannerMode = 'message' | 'transaction' | 'report';

interface MessageFinding {
  type: 'suspicious_keyword' | 'urgency' | 'impersonation' | 'url' | 'payment_request' | 'info';
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

interface ScanResult {
  id: string;
  timestamp: string;
  mode: string;
  riskScore: number;
  findings: MessageFinding[];
  explanation: string;
  recommendations: string[];
  limitations: string;
}

const SUSPICIOUS_KEYWORDS = [
  { word: 'urgent', reason: 'Creates urgency to prevent careful thinking', severity: 'high' as const },
  { word: 'immediately', reason: 'Pressures immediate action', severity: 'medium' as const },
  { word: 'otp', reason: 'Requests OTP — banks never ask for OTP', severity: 'high' as const },
  { word: 'kyc', reason: 'KYC verification via SMS/email is suspicious', severity: 'high' as const },
  { word: 'verify', reason: 'Asks you to "verify" — likely credential phishing', severity: 'medium' as const },
  { word: 'blocked', reason: 'Threatens account block to create panic', severity: 'medium' as const },
  { word: 'suspended', reason: 'Threatens account suspension', severity: 'medium' as const },
  { word: 'winner', reason: 'Lottery or prize scam language', severity: 'high' as const },
  { word: 'prize', reason: 'Prize or lottery scam language', severity: 'high' as const },
  { word: 'lottery', reason: 'Lottery scam', severity: 'high' as const },
  { word: 'refund', reason: 'Refund offer may be a scam', severity: 'medium' as const },
  { word: 'click', reason: 'Asks to click a link — may be phishing', severity: 'medium' as const },
  { word: 'link', reason: 'Contains a link — verify before clicking', severity: 'low' as const },
  { word: 'pm-kisan', reason: 'Government scheme impersonation', severity: 'high' as const },
  { word: 'pmay', reason: 'Government scheme impersonation', severity: 'high' as const },
  { word: 'subsidy', reason: 'Subsidy offer may be fake', severity: 'medium' as const },
  { word: 'loan', reason: 'Loan offer may be fake', severity: 'medium' as const },
  { word: 'processing fee', reason: 'Upfront fee for loan/refund is a scam', severity: 'high' as const },
  { word: 'customer care', reason: 'Fake customer care — verify on official website', severity: 'high' as const },
  { word: 'anydesk', reason: 'Remote access app request — highly dangerous', severity: 'high' as const },
  { word: 'teamviewer', reason: 'Remote access app request — highly dangerous', severity: 'high' as const },
  { word: 'screen share', reason: 'Screen sharing request — dangerous', severity: 'high' as const },
  { word: 'gift', reason: 'Gift offer may be scam bait', severity: 'medium' as const },
  { word: 'free', reason: '"Free" offers are common scam bait', severity: 'low' as const },
  { word: 'invest', reason: 'Investment solicitation — verify SEBI registration', severity: 'medium' as const },
  { word: 'bitcoin', reason: 'Cryptocurrency investment may be unregulated', severity: 'medium' as const },
  { word: 'double', reason: '"Double your money" is a Ponzi scheme pattern', severity: 'high' as const },
];

function analyzeMessage(text: string): MessageFinding[] {
  const findings: MessageFinding[] = [];
  const lower = text.toLowerCase();

  for (const kw of SUSPICIOUS_KEYWORDS) {
    if (lower.includes(kw.word)) {
      findings.push({
        type: 'suspicious_keyword',
        detail: `"${kw.word}" detected: ${kw.reason}`,
        severity: kw.severity,
      });
    }
  }

  if (/urgent|immediately|within \d+ (hour|minute|day)|act now|don't delay|last chance/i.test(text)) {
    findings.push({ type: 'urgency', detail: 'Urgency language detected — scammers use time pressure to prevent careful thinking', severity: 'high' });
  }

  if (/bank|rbi|sbi|hdfc|icici|axis|government|official|admin|manager|officer|representative/i.test(text)) {
    findings.push({ type: 'impersonation', detail: 'Impersonation indicator — message claims to be from a bank, government, or official entity. Verify through official channels only.', severity: 'medium' });
  }

  const urlMatches = text.match(/https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+/gi);
  if (urlMatches) {
    findings.push({ type: 'url', detail: `URL detected: ${urlMatches[0]}. Do not click links in unsolicited messages. If needed, visit the official website directly.`, severity: 'medium' });
  }

  if (/pay|send money|transfer|upi|scan|qr|payment|rs\.?|₹/i.test(text)) {
    findings.push({ type: 'payment_request', detail: 'Payment-related content detected. Verify the recipient through a trusted channel before any payment.', severity: 'medium' });
  }

  if (findings.length === 0) {
    findings.push({ type: 'info', detail: 'No suspicious indicators detected in the message text. This does not guarantee the message is safe.', severity: 'low' });
  }

  return findings;
}

function calculateRiskScore(findings: MessageFinding[]): number {
  let score = 0;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const medCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;
  score += highCount * 20;
  score += medCount * 10;
  score += lowCount * 3;
  return Math.min(100, score);
}

export default function FraudScanner() {
  const { t } = useI18n();
  const { profile, isDemoMode } = useAuth();
  const [mode, setMode] = useState<ScannerMode>('message');
  const [messageText, setMessageText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  // Transaction analysis fields
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientUpi, setRecipientUpi] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');

  const handleScanMessage = async () => {
    if (!messageText.trim()) return;
    setScanning(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 600));
    const findings = analyzeMessage(messageText);
    const score = calculateRiskScore(findings);
    const recommendations: string[] = [];
    if (findings.some((f) => f.severity === 'high')) recommendations.push('Do not share any OTP, PIN, or personal information.');
    if (findings.some((f) => f.type === 'url')) recommendations.push('Do not click any links in the message. Visit official websites directly.');
    if (findings.some((f) => f.type === 'payment_request')) recommendations.push('Verify the recipient through a trusted channel before making any payment.');
    if (findings.some((f) => f.type === 'impersonation')) recommendations.push('Contact the organisation directly using their official helpline — do not use numbers from the message.');
    if (findings.some((f) => f.type === 'urgency')) recommendations.push('Scammers use urgency to prevent careful thinking. Take time to verify.');
    if (recommendations.length === 0) recommendations.push('No suspicious indicators detected. Continue to be cautious and verify unexpected requests.');

    setResult({
      id: 'SCAN-' + Date.now().toString(36).toUpperCase(),
      timestamp: new Date().toISOString(),
      mode: 'message',
      riskScore: score,
      findings,
      explanation: `Analysis found ${findings.length} indicator(s). Risk score: ${score}/100. This is a rule-based analysis — it does not verify sender identity or URLs. A clean scan does not guarantee safety.`,
      recommendations,
      limitations: 'This scanner analyses message text only. It does not verify sender identity, URL safety, or whether the sender is legitimate. Use it as a first check, not a definitive assessment.',
    });
    setScanning(false);
  };

  const handleScanTransaction = async () => {
    const amt = parseFloat(amount);
    if (!recipientName.trim() || !amt || amt <= 0) return;
    setScanning(true);
    setResult(null);

    try {
      const assessment = await runFraudAssessment({
        recipientName: recipientName.trim(),
        recipientAccount: recipientAccount || undefined,
        recipientUpi: recipientUpi || undefined,
        amount: amt,
        userId: profile?.id ?? 'demo-user',
        isSimulated: true,
      });

      const findings: MessageFinding[] = assessment.rulesEvaluated
        .filter((r) => r.triggered)
        .map((r) => ({
          type: 'suspicious_keyword',
          detail: r.detail,
          severity: r.weight >= 18 ? 'high' : r.weight >= 10 ? 'medium' : 'low',
        }));

      if (findings.length === 0) {
        findings.push({ type: 'info', detail: 'No risk indicators detected from available transaction signals.', severity: 'low' });
      }

      setResult({
        id: 'TXN-SCAN-' + Date.now().toString(36).toUpperCase(),
        timestamp: new Date().toISOString(),
        mode: 'transaction',
        riskScore: assessment.riskScore,
        findings,
        explanation: assessment.explanation,
        recommendations: assessment.recommendations,
        limitations: 'Risk assessment uses deterministic rules and available transaction history. It does not verify the recipient identity externally or use a trained ML model. A low risk score does not guarantee the payment is safe.',
      });
    } catch {
      setResult({
        id: 'TXN-SCAN-ERR',
        timestamp: new Date().toISOString(),
        mode: 'transaction',
        riskScore: 0,
        findings: [{ type: 'info', detail: 'Assessment could not be completed due to an error.', severity: 'low' }],
        explanation: 'Transaction risk assessment failed. Please try again.',
        recommendations: ['Verify the recipient through a trusted channel before proceeding.'],
        limitations: 'Assessment could not be completed.',
      });
    }
    setScanning(false);
  };

  const riskColor = result
    ? result.riskScore >= 70 ? 'error' : result.riskScore >= 30 ? 'warning' : 'success'
    : 'neutral';

  const riskLabel = result
    ? result.riskScore >= 70 ? 'High Risk' : result.riskScore >= 30 ? 'Medium Risk' : 'Low Risk'
    : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">AI Fraud Scanner</h1>
        <p className="mt-1 text-sm text-gray-500">Analyze suspicious messages or transactions for fraud indicators</p>
      </div>

      <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
        <div className="flex items-center gap-2">
          <Brain size={16} />
          <span>Rule-based analysis with transparent explanations. No external AI API is configured — all analysis uses deterministic rules. Results are advisory, not definitive.</span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {([
          { key: 'message' as const, icon: <MessageSquare size={16} />, label: 'Message Analysis' },
          { key: 'transaction' as const, icon: <ArrowLeftRight size={16} />, label: 'Transaction Risk' },
          { key: 'report' as const, icon: <FileWarning size={16} />, label: 'Report Fraud' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setMode(tab.key); setResult(null); }}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === tab.key ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Message Analysis */}
      {mode === 'message' && (
        <Card>
          <h3 className="font-semibold">Paste a suspicious SMS, email, or message</h3>
          <p className="mt-1 text-xs text-gray-500">The scanner checks for phishing keywords, urgency language, impersonation, URLs, and payment requests.</p>
          <textarea
            className="input mt-3 min-h-[120px] font-mono text-sm"
            placeholder="Paste the suspicious message here…"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <button className="btn-primary mt-3" onClick={handleScanMessage} disabled={scanning || !messageText.trim()}>
            {scanning ? <><Loader2 size={16} className="animate-spin" /> Scanning…</> : <><Scan size={16} /> Scan Message</>}
          </button>
        </Card>
      )}

      {/* Transaction Risk Analysis */}
      {mode === 'transaction' && (
        <Card>
          <h3 className="font-semibold">Enter transaction details for risk analysis</h3>
          <p className="mt-1 text-xs text-gray-500">Analyzes recipient, amount, and transaction patterns using the fraud rules engine.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Recipient Name</label>
              <input className="input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g., Rajesh Kumar" />
            </div>
            <div>
              <label className="label">Amount (Rs)</label>
              <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 5000" />
            </div>
            <div>
              <label className="label">UPI ID (optional)</label>
              <input className="input" value={recipientUpi} onChange={(e) => setRecipientUpi(e.target.value)} placeholder="e.g., rajesh@upi" />
            </div>
            <div>
              <label className="label">Account Number (optional)</label>
              <input className="input" value={recipientAccount} onChange={(e) => setRecipientAccount(e.target.value)} placeholder="e.g., 1234567890" />
            </div>
          </div>
          <button className="btn-primary mt-3" onClick={handleScanTransaction} disabled={scanning || !recipientName.trim() || !amount}>
            {scanning ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</> : <><Scan size={16} /> Analyze Transaction</>}
          </button>
          {isDemoMode && <p className="mt-2 text-xs text-secondary-600">Demo mode: Transaction history queries will use mock data.</p>}
        </Card>
      )}

      {/* Report Fraud */}
      {mode === 'report' && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <FileWarning size={20} className="text-error-500" />
            <h3 className="font-semibold">Report a Fraud Incident</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            To report suspected fraud, use the Scam Reports page to file a detailed report with category, description, and evidence. This creates a case for review by fraud analysts.
          </p>
          <a href="/app/scam-reports" className="btn-primary mt-3 inline-flex">Go to Scam Reports</a>
        </Card>
      )}

      {/* Results */}
      {scanning && (
        <Card className="text-center py-10">
          <Loader2 size={32} className="mx-auto animate-spin text-primary-500" />
          <p className="mt-3 text-sm text-gray-500">Analyzing…</p>
        </Card>
      )}

      {result && !scanning && (
        <div className="space-y-4">
          <Card className={riskColor === 'error' ? 'border-error-300 dark:border-error-700' : riskColor === 'warning' ? 'border-warning-300 dark:border-warning-700' : 'border-success-300 dark:border-success-700'}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {riskColor === 'error' ? <AlertTriangle size={28} className="text-error-500" /> : riskColor === 'warning' ? <ShieldCheck size={28} className="text-warning-500" /> : <ShieldCheck size={28} className="text-success-500" />}
                <div>
                  <p className="text-lg font-bold">{riskLabel}</p>
                  <p className="text-xs text-gray-500">Scan ID: {result.id} · {new Date(result.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{result.riskScore}<span className="text-lg text-gray-400">/100</span></p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Explanation</h4>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{result.explanation}</p>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Findings ({result.findings.length})</h4>
              <div className="mt-1 space-y-2">
                {result.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                    {f.severity === 'high' ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-error-500" /> : f.severity === 'medium' ? <Info size={14} className="mt-0.5 flex-shrink-0 text-warning-500" /> : <Info size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />}
                    <div>
                      <Badge variant={f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'neutral'}>{f.severity}</Badge>
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{f.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><Lightbulb size={12} /> Recommendations</h4>
              <ul className="mt-1 space-y-1">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-primary-500">→</span> {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-lg bg-warning-50 px-3 py-2.5 text-xs text-warning-700 dark:bg-warning-900/20 dark:text-warning-300">
              <strong>Limitations:</strong> {result.limitations}
            </div>
          </Card>
        </div>
      )}

      {!result && !scanning && (
        <Card>
          <EmptyState
            icon={<Scan size={40} />}
            title="No scan results yet"
            subtitle={mode === 'message' ? 'Paste a message and click Scan to begin' : mode === 'transaction' ? 'Enter transaction details and click Analyze to begin' : 'Use Scam Reports to file a fraud report'}
          />
        </Card>
      )}
    </div>
  );
}
