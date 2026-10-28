import { useState, useMemo } from 'react';
import { Search, Filter, Shield, AlertTriangle, AlertCircle, Info, CheckCircle, Eye, ArrowRight, BookOpen } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { Card, Badge, EmptyState } from '@/components/ui';

interface FraudCategory {
  id: string;
  category: string;
  subcategory: string;
  explanation: string;
  warningSigns: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  preventiveActions: string[];
  responseActions: string[];
  relevantRole: string;
  detectionMethod: string;
  detectionRequirements: string;
  isEducational: boolean;
}

const FRAUD_CATEGORIES: FraudCategory[] = [
  {
    id: 'upi-qr',
    category: 'UPI & QR Code Fraud',
    subcategory: 'Payment Fraud',
    explanation: 'Fraudsters send malicious QR codes or UPI collect requests that trick victims into authorising payments to the attacker account. Victims may scan a QR code expecting to receive money but instead authorise a debit.',
    warningSigns: ['Unexpected QR code from unknown sender', 'Pressure to scan quickly', 'QR code received via WhatsApp/SMS', 'Request to enter UPI PIN to "receive" money'],
    severity: 'high',
    impact: 'Direct financial loss — victim authorises a debit believing they will receive money.',
    preventiveActions: ['Never scan QR codes from unknown sources', 'Remember: scanning a QR code and entering PIN always sends money, never receives', 'Verify the merchant before paying via QR'],
    responseActions: ['Do not enter your UPI PIN', 'Block the sender', 'Report to your bank and cybercrime.gov.in', 'File a scam report in Mudra-Mend'],
    relevantRole: 'Customer / Bank Officer',
    detectionMethod: 'Recipient verification, scam report matching, unusual recipient patterns',
    detectionRequirements: 'Transaction metadata, recipient identity, scam report database',
    isEducational: true,
  },
  {
    id: 'fake-confirmation',
    category: 'Fake Payment Confirmation',
    subcategory: 'Payment Fraud',
    explanation: 'Scammers send fake SMS or screenshots showing a successful payment that was never actually made, tricking sellers into delivering goods or services without receiving money.',
    warningSigns: ['Payment screenshot received but no credit in your bank account', 'Urgent requests to deliver immediately', "Sender's name in SMS doesn't match UPI ID", 'SMS from non-official numbers'],
    severity: 'high',
    impact: 'Loss of goods or services without receiving payment.',
    preventiveActions: ['Always verify payment credit in your bank account or UPI app', 'Do not rely on SMS screenshots as proof of payment', 'Wait for confirmed credit before delivering'],
    responseActions: ['Check your bank account for actual credit', 'Do not deliver goods until payment is confirmed', 'Report the fake confirmation to your bank'],
    relevantRole: 'Customer / Bank Officer',
    detectionMethod: 'Payment status verification, provider confirmation, mismatched references',
    detectionRequirements: 'Bank account confirmation, provider transaction status',
    isEducational: true,
  },
  {
    id: 'phishing',
    category: 'Phishing, Smishing & Vishing',
    subcategory: 'Social Engineering',
    explanation: 'Fraudsters send deceptive emails (phishing), SMS messages (smishing), or make phone calls (vishing) pretending to be from banks, government, or trusted organisations to steal credentials, OTPs, or money.',
    warningSigns: ['Links asking you to "verify" or "update" account details', 'SMS/emails with urgency: "account will be blocked"', 'Calls asking for OTP, PIN, or card details', 'Sender address or number doesn\'t match official channels'],
    severity: 'high',
    impact: 'Credential theft, unauthorised account access, financial loss.',
    preventiveActions: ['Never click links in unsolicited messages', 'Banks never ask for OTP or PIN', 'Verify by calling the official helpline directly', 'Check sender address carefully'],
    responseActions: ['Do not click links or share OTP', 'Delete the message', 'Report to your bank and cybercrime.gov.in', 'Change passwords if credentials were shared'],
    relevantRole: 'Customer / Fraud Analyst',
    detectionMethod: 'Message content analysis, suspicious keyword detection, URL pattern matching',
    detectionRequirements: 'Message text input from user',
    isEducational: true,
  },
  {
    id: 'fake-customer-care',
    category: 'Fake Customer Care & Tech Support',
    subcategory: 'Social Engineering',
    explanation: 'Fraudsters post fake customer care numbers on search engines or social media. When victims call, they are persuaded to install screen-sharing apps or share OTPs, giving attackers access to bank accounts.',
    warningSigns: ['Customer care number found via search may be fake', 'Asked to install AnyDesk, TeamViewer, or similar', 'Asked to share OTP or approve UPI request', "Number not on bank's official website"],
    severity: 'critical',
    impact: 'Full account takeover, significant financial loss.',
    preventiveActions: ['Only use customer care numbers from official bank websites', 'Never install remote access apps at someone\'s request', 'Never share OTP or approve incoming UPI requests'],
    responseActions: ['Uninstall any remote access app immediately', 'Block your bank account', 'Report to cybercrime.gov.in', 'Change all banking passwords'],
    relevantRole: 'Customer / Fraud Analyst',
    detectionMethod: 'Scam report matching, remote access app indicators, screen-sharing detection',
    detectionRequirements: 'Scam report database, device signals (when available)',
    isEducational: true,
  },
  {
    id: 'identity-theft',
    category: 'Identity Theft & Account Takeover',
    subcategory: 'Identity Fraud',
    explanation: 'Attackers steal personal information (Aadhaar, PAN, mobile number) to impersonate victims, open accounts, or take over existing bank accounts through SIM swaps or credential reuse.',
    warningSigns: ['Unexpected SIM deactivation', 'Transactions you did not initiate', 'New accounts opened in your name', "Login alerts from unknown devices"],
    severity: 'critical',
    impact: 'Account takeover, unauthorised transactions, credit damage.',
    preventiveActions: ['Lock Aadhaar/PAN biometric when not in use', 'Use strong unique passwords', 'Enable two-factor authentication', 'Monitor bank statements regularly'],
    responseActions: ['Contact your bank immediately to freeze accounts', 'Report to police and cybercrime.gov.in', 'Check credit report for unauthorised accounts', 'Change all passwords'],
    relevantRole: 'Fraud Analyst / Investigator',
    detectionMethod: 'First transaction to unknown recipient, unusual device/location, rapid credential changes',
    detectionRequirements: 'Transaction history, device fingerprints, login logs',
    isEducational: true,
  },
  {
    id: 'otp-compromise',
    category: 'OTP & Credential Compromise',
    subcategory: 'Credential Fraud',
    explanation: 'Fraudsters trick victims into sharing OTPs received for transaction authentication. Once the OTP is shared, the attacker can authorise transactions from the victim account.',
    warningSigns: ['Someone asks you to read out an SMS code', 'OTP received for a transaction you did not initiate', 'Calls claiming OTP is needed for "verification"'],
    severity: 'critical',
    impact: 'Immediate unauthorised transaction — once OTP is shared, the fraudster can complete the payment.',
    preventiveActions: ['Never share OTP with anyone, including bank staff', 'Banks never ask for OTP', 'Be suspicious of anyone asking you to read an SMS', 'Do not approve incoming UPI collect requests'],
    responseActions: ['If OTP was shared, call your bank immediately to block the transaction', 'File a complaint at cybercrime.gov.in', 'Change your UPI PIN and banking passwords'],
    relevantRole: 'Customer / Bank Officer',
    detectionMethod: 'Rapid transaction after OTP request, unusual transaction patterns',
    detectionRequirements: 'Transaction timing data, OTP delivery logs (when available)',
    isEducational: true,
  },
  {
    id: 'sim-swap',
    category: 'SIM Swap & Device Compromise',
    subcategory: 'Identity Fraud',
    explanation: 'Attackers convince mobile operators to issue a duplicate SIM card for the victim number, allowing them to receive OTPs and reset banking credentials. This is a sophisticated attack that may not be detectable from transaction data alone.',
    warningSigns: ['Sudden loss of mobile network signal', 'Unable to make/receive calls', 'OTP messages stop arriving', 'Banking transactions you did not authorise'],
    severity: 'critical',
    impact: 'Complete account takeover via OTP interception.',
    preventiveActions: ['Contact your mobile operator if SIM suddenly stops working', 'Use app-based 2FA instead of SMS where available', 'Set a SIM swap alert with your operator'],
    responseActions: ['Contact mobile operator immediately', 'Freeze bank accounts', 'Report to police and cybercrime.gov.in'],
    relevantRole: 'Fraud Analyst / Investigator',
    detectionMethod: 'SIM swap indicators require telecom provider data — not detectable from app data alone',
    detectionRequirements: 'Telecom provider integration (not available in this platform)',
    isEducational: true,
  },
  {
    id: 'loan-fraud',
    category: 'Fake Loan & Lending Fraud',
    subcategory: 'Financial Fraud',
    explanation: 'Scammers offer fake loans with attractive terms, then demand upfront "processing fees" or "insurance" payments before disbursal. No loan is ever disbursed.',
    warningSigns: ['Loan approved without documentation', 'Upfront fee demanded before disbursal', 'No physical office or RBI registration', 'Unsolicited loan offers via SMS/WhatsApp'],
    severity: 'high',
    impact: 'Loss of processing fee, potential identity theft from submitted documents.',
    preventiveActions: ['Legitimate lenders never charge upfront fees', 'Verify lender is RBI-registered', 'Check the lender on RBI website', 'Never pay to get a loan'],
    responseActions: ['Do not pay any upfront fee', 'Report to cybercrime.gov.in', 'Do not share Aadhaar/PAN with unknown lenders'],
    relevantRole: 'Customer / Fraud Analyst',
    detectionMethod: 'Suspicious recipient patterns, keywords in recipient name, scam report matching',
    detectionRequirements: 'Transaction metadata, scam report database',
    isEducational: true,
  },
  {
    id: 'investment-ponzi',
    category: 'Investment, Ponzi & Fake Returns',
    subcategory: 'Financial Fraud',
    explanation: 'Schemes promising high guaranteed returns through crypto, stock tips, or Ponzi structures. Early investors are paid with new investors money until the scheme collapses.',
    warningSigns: ['Guaranteed high returns with no risk', 'Pressure to invest quickly', "Returns paid in initial weeks to build trust", 'Unregulated investment platform'],
    severity: 'high',
    impact: 'Total loss of invested capital, especially for late entrants.',
    preventiveActions: ['Verify investment platform is SEBI-registered', 'No investment offers guaranteed returns', 'Be suspicious of WhatsApp/Telegram investment groups'],
    responseActions: ['Stop investing immediately', 'Report to SEBI SCORES and cybercrime.gov.in', 'Document all communications as evidence'],
    relevantRole: 'Customer / Fraud Analyst',
    detectionMethod: 'Repeated payments to unknown investment platforms, keyword detection',
    detectionRequirements: 'Transaction metadata, user-reported suspicious contacts',
    isEducational: true,
  },
  {
    id: 'ecommerce-refund',
    category: 'E-commerce, Refund & Marketplace Scams',
    subcategory: 'Consumer Fraud',
    explanation: 'Scammers pose as sellers on marketplaces, or as customer care offering refunds. They send malicious links or QR codes, or request screen sharing to "process" the refund.',
    warningSigns: ['Refund offered without a return request', 'Asked to scan QR for refund', 'Screen sharing requested for refund processing', 'Link sent via SMS for "refund portal"'],
    severity: 'high',
    impact: 'Financial loss through unauthorised transactions during fake refund process.',
    preventiveActions: ['Refunds go back to original payment method automatically', 'Never scan QR codes or share OTP for refunds', 'Only use the official marketplace platform for returns'],
    responseActions: ['Do not scan QR or share OTP', 'Report to the marketplace platform', 'File complaint at cybercrime.gov.in'],
    relevantRole: 'Customer / Fraud Analyst',
    detectionMethod: 'Scam report matching, QR pattern detection, unusual recipient analysis',
    detectionRequirements: 'Transaction metadata, scam report database',
    isEducational: true,
  },
  {
    id: 'business-email',
    category: 'Business Email Compromise & Invoice Fraud',
    subcategory: 'Corporate Fraud',
    explanation: 'Attackers compromise or spoof business email accounts to redirect invoice payments to attacker-controlled bank accounts by changing beneficiary details.',
    warningSigns: ['Sudden change in vendor bank details', 'Urgent payment request via email', 'Email domain slightly different from real', 'Pressure to bypass verification procedures'],
    severity: 'critical',
    impact: 'Large corporate payments diverted to fraudster accounts.',
    preventiveActions: ['Verify bank detail changes via phone using known contact', 'Use dual authorisation for large transfers', 'Check email domain carefully'],
    responseActions: ['Do not process the payment', 'Contact the vendor directly on known number', 'Report to IT security and bank'],
    relevantRole: 'Bank Officer / Fraud Analyst',
    detectionMethod: 'Beneficiary detail changes, unusual payment patterns, new recipient with high amount',
    detectionRequirements: 'Transaction metadata, beneficiary history, corporate email logs (not available)',
    isEducational: true,
  },
  {
    id: 'money-mule',
    category: 'Money Mule & Suspicious Transfers',
    subcategory: 'Money Laundering',
    explanation: 'Individuals are recruited (knowingly or unknowingly) to receive money from fraud victims and transfer it onward, making them money mules. This launders stolen funds and makes recovery difficult.',
    warningSigns: ['Asked to receive money and forward it for a commission', 'Multiple rapid incoming and outgoing transactions', 'Transactions from/to unknown parties', 'Account used as intermediary without clear purpose'],
    severity: 'high',
    impact: 'Legal liability for money laundering, account closure, criminal charges.',
    preventiveActions: ['Never let others use your bank account', 'Never accept money to forward it', 'Be suspicious of work-from-home offers involving banking'],
    responseActions: ['Stop all forwarding activity', 'Report to your bank and police', 'Do not withdraw or transfer suspicious funds'],
    relevantRole: 'Fraud Analyst / Investigator / Bank Officer',
    detectionMethod: 'Rapid in-out transaction patterns, multiple senders to single receiver, velocity analysis',
    detectionRequirements: 'Transaction history across accounts (requires bank-level access)',
    isEducational: true,
  },
  {
    id: 'scheme-fraud',
    category: 'Beneficiary & Government Scheme Fraud',
    subcategory: 'Scheme Fraud',
    explanation: 'Fraudsters impersonate government officials offering fake scheme benefits, demanding processing fees, or collecting documents to claim benefits in the victim name.',
    warningSigns: ['Asked to pay for "free" government scheme benefits', "Officials asking for money — real schemes don't require fees to individuals", 'Aadhaar or bank details requested by unknown callers', 'Promises of PM-Kisan, PMAY, or other benefits via phone'],
    severity: 'high',
    impact: 'Loss of processing fee, potential identity theft, denial of legitimate benefits.',
    preventiveActions: ['Government schemes never require payments to individuals', 'Apply through official portals only', 'Verify scheme details on government websites'],
    responseActions: ['Do not pay any fee', 'Report to cybercrime.gov.in', 'Check official scheme portals for legitimate benefits'],
    relevantRole: 'Customer / Gov Official / Fraud Analyst',
    detectionMethod: 'Scheme keyword detection in recipient name, scam report matching, beneficiary anomaly detection',
    detectionRequirements: 'Transaction metadata, beneficiary records (for anomaly detection)',
    isEducational: true,
  },
  {
    id: 'forged-documents',
    category: 'Forged Documents & Identity Inconsistencies',
    subcategory: 'Document Fraud',
    explanation: 'Forged identity documents, income proofs, or property papers used to obtain loans, open accounts, or claim benefits fraudulently.',
    warningSigns: ['Documents with inconsistent fonts or formatting', 'Aadhaar/PAN details not matching across documents', 'Photograph substitution', 'Address proofs with same address for multiple applicants'],
    severity: 'medium',
    impact: 'Fraudulent account opening, loan defaults, benefit diversion.',
    preventiveActions: ['Verify documents through official portals (Aadhaar, PAN verification)', 'Cross-check identity across multiple documents', 'Use digital verification tools'],
    responseActions: ['Report to the institution that accepted the document', 'File a police complaint', 'Flag the identity in fraud databases'],
    relevantRole: 'Bank Officer / Investigator / Gov Official',
    detectionMethod: 'Document verification requires specialised tools — not available in this platform',
    detectionRequirements: 'Document verification APIs, identity cross-checking systems',
    isEducational: true,
  },
  {
    id: 'synthetic-identity',
    category: 'Synthetic & Duplicate Identity',
    subcategory: 'Identity Fraud',
    explanation: 'Synthetic identities created by combining real and fake information to open accounts or claim benefits. Duplicate records may indicate fraud but are not proof of fraud.',
    warningSigns: ['Multiple accounts with same mobile/Aadhaar but different names', 'Address used by many unrelated accounts', 'Rapid sequential account openings'],
    severity: 'medium',
    impact: 'Fraudulent accounts, benefit diversion, credit default.',
    preventiveActions: ['Verify identity through official portals', 'Cross-check Aadhaar/PAN/mobile uniqueness', 'Flag duplicate records for review'],
    responseActions: ['Flag duplicate records for investigation', 'Do not automatically treat duplicates as fraud', 'Verify with the individual before action'],
    relevantRole: 'Gov Official / Fraud Analyst / Bank Officer',
    detectionMethod: 'Beneficiary record deduplication, identity field cross-matching',
    detectionRequirements: 'Beneficiary database with identity fields (scheme data)',
    isEducational: true,
  },
  {
    id: 'insider-risk',
    category: 'Insider Risk & Unauthorized Access',
    subcategory: 'Internal Fraud',
    explanation: 'Employees or authorised users accessing systems beyond their scope, modifying records, or leaking sensitive data. This requires audit logging and access control monitoring.',
    warningSigns: ['Access to records outside working hours', 'Bulk record access without business need', 'Failed access attempts to restricted data', 'Config changes without authorisation'],
    severity: 'high',
    impact: 'Data breaches, internal fraud, regulatory violations.',
    preventiveActions: ['Enforce least-privilege access', 'Regular access reviews', 'Audit all sensitive actions', 'Monitor for unusual access patterns'],
    responseActions: ['Suspend access pending review', 'Investigate via audit logs', 'Report to compliance and security team'],
    relevantRole: 'Admin / Auditor',
    detectionMethod: 'Audit log analysis, access pattern monitoring, role-based access review',
    detectionRequirements: 'Audit log database, role-based access control system',
    isEducational: true,
  },
  {
    id: 'velocity-anomaly',
    category: 'Repeated Failures & Payment Velocity',
    subcategory: 'Transaction Anomaly',
    explanation: 'Multiple rapid payment attempts, repeated failures, or unusual transaction velocity may indicate fraud attempts, card testing, or account takeover.',
    warningSigns: ['Multiple failed payment attempts in short window', 'Rapid succession of transactions', 'Same amount to same recipient repeatedly', 'Unusual burst of activity'],
    severity: 'medium',
    impact: 'May indicate fraud attempt, card testing, or account compromise.',
    preventiveActions: ['Monitor transaction velocity', 'Set velocity limits', 'Require additional verification for rapid transactions'],
    responseActions: ['Review the transaction pattern', 'Contact the account holder to verify', 'Temporarily restrict if pattern is suspicious'],
    relevantRole: 'Bank Officer / Fraud Analyst',
    detectionMethod: 'Velocity analysis, duplicate payment detection, rapid succession rules',
    detectionRequirements: 'Transaction history with timestamps',
    isEducational: true,
  },
  {
    id: 'deepfake-ai',
    category: 'AI-Generated Impersonation & Deepfakes',
    subcategory: 'Emerging Threat',
    explanation: 'AI-generated voice clones (vishing) or video deepfakes used to impersonate family members, officials, or executives to request urgent money transfers. This is an emerging threat that is difficult to detect from transaction data alone.',
    warningSigns: ['Voice/video call from "family" requesting urgent money transfer', 'Caller sounds slightly different', 'Request to keep the transfer secret', "Pressure and emotional manipulation"],
    severity: 'critical',
    impact: 'Large transfers to fraudster accounts based on false identity.',
    preventiveActions: ['Verify money requests through a second channel', 'Call the person back on their known number', 'Be suspicious of urgent, secret money requests', 'Establish a family code word for emergencies'],
    responseActions: ['Do not transfer money based on voice/video alone', 'Verify through a known contact number', 'Report to police and cybercrime.gov.in'],
    relevantRole: 'Customer / Fraud Analyst',
    detectionMethod: 'Deepfake detection requires specialised AI tools — not available in this platform',
    detectionRequirements: 'Voice/video analysis tools (external integration required)',
    isEducational: true,
  },
  {
    id: 'insurance-fraud',
    category: 'Suspicious Insurance & Claims',
    subcategory: 'Claims Fraud',
    explanation: 'Fraudulent insurance claims with forged documents, staged incidents, or inflated claims. Detection requires claims data analysis.',
    warningSigns: ['Claim filed shortly after policy purchase', 'Inconsistent incident reports', 'Claims from blacklisted providers', 'Multiple claims for same incident'],
    severity: 'medium',
    impact: 'Insurance payout fraud, increased premiums for honest customers.',
    preventiveActions: ['Verify claim documentation thoroughly', 'Cross-check with incident reports', 'Flag claims for review'],
    responseActions: ['Investigate flagged claims', 'Request additional documentation', 'Report to insurance regulator if confirmed'],
    relevantRole: 'Fraud Analyst / Investigator',
    detectionMethod: 'Claims pattern analysis requires claims database — not available in this platform',
    detectionRequirements: 'Insurance claims database (external system)',
    isEducational: true,
  },
];

const SEVERITY_BADGE: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  low: 'info', medium: 'warning', high: 'error', critical: 'error',
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  low: <Info size={18} />,
  medium: <AlertCircle size={18} />,
  high: <AlertTriangle size={18} />,
  critical: <Shield size={18} />,
};

export default function FraudIntelligence() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');
  const [selected, setSelected] = useState<FraudCategory | null>(null);

  const subcategories = useMemo(() => {
    const subs = new Set(FRAUD_CATEGORIES.map((c) => c.subcategory));
    return ['all', ...Array.from(subs).sort()];
  }, []);

  const filtered = useMemo(() => {
    return FRAUD_CATEGORIES.filter((c) => {
      const matchesSearch = !search ||
        c.category.toLowerCase().includes(search.toLowerCase()) ||
        c.explanation.toLowerCase().includes(search.toLowerCase()) ||
        c.warningSigns.some((w) => w.toLowerCase().includes(search.toLowerCase()));
      const matchesSeverity = severityFilter === 'all' || c.severity === severityFilter;
      const matchesSub = subFilter === 'all' || c.subcategory === subFilter;
      return matchesSearch && matchesSeverity && matchesSub;
    });
  }, [search, severityFilter, subFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Fraud Intelligence Center</h1>
        <p className="mt-1 text-sm text-gray-500">Comprehensive catalog of fraud types — understanding, warning signs, prevention, and response</p>
      </div>

      <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
        This catalog is educational. Suspicious indicators are not proof of fraud. Confirmed fraud requires investigation. Detection capability depends on available data — some categories cannot be automatically detected by this platform.
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input pl-10" placeholder="Search fraud types, warning signs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">All Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select className="input w-auto" value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
          {subcategories.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Types' : s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={<Filter size={40} />} title="No matching fraud categories" subtitle="Try different search terms or filters" /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setSelected(c)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={SEVERITY_BADGE[c.severity]}>{c.severity}</Badge>
                    <Badge variant="neutral">{c.subcategory}</Badge>
                    {c.isEducational && <Badge variant="info"><BookOpen size={10} className="inline mr-0.5" />Educational</Badge>}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{c.category}</h3>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{c.explanation}</p>
                </div>
                <div className={`flex-shrink-0 rounded-lg p-2 ${c.severity === 'critical' ? 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400' : c.severity === 'high' ? 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {SEVERITY_ICON[c.severity]}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-primary-600">
                <Eye size={12} /> View details <ArrowRight size={12} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <FraudDetailModal category={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FraudDetailModal({ category, onClose }: { category: FraudCategory; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={SEVERITY_BADGE[category.severity]}>{category.severity} severity</Badge>
              <Badge variant="neutral">{category.subcategory}</Badge>
              {category.isEducational && <Badge variant="info">Educational</Badge>}
            </div>
            <h2 className="mt-2 text-lg font-bold">{category.category}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-gray-400">✕</button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Explanation</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{category.explanation}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Warning Signs</h3>
            <ul className="mt-1 space-y-1">
              {category.warningSigns.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-warning-500" /> {w}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Potential Impact</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{category.impact}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preventive Actions</h3>
              <ul className="mt-1 space-y-1">
                {category.preventiveActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle size={14} className="mt-0.5 flex-shrink-0 text-success-500" /> {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Response Actions</h3>
              <ul className="mt-1 space-y-1">
                {category.responseActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <ArrowRight size={14} className="mt-0.5 flex-shrink-0 text-primary-500" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Relevant Role</h3>
              <p className="mt-1 text-gray-700 dark:text-gray-300">{category.relevantRole}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detection Method</h3>
              <p className="mt-1 text-gray-700 dark:text-gray-300">{category.detectionMethod}</p>
            </div>
          </div>

          <div className="rounded-lg bg-warning-50 px-3 py-2.5 text-xs text-warning-700 dark:bg-warning-900/20 dark:text-warning-300">
            <strong>Detection Requirements:</strong> {category.detectionRequirements}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
            <Info size={12} /> This is educational information. Suspicious indicators are not proof of fraud. Confirmed fraud requires investigation and verified evidence.
          </div>
        </div>
      </div>
    </div>
  );
}
