import { supabase } from './supabase';
import type { Lang } from '@/i18n/translations';

export interface AssessmentInput {
  recipientName: string;
  recipientAccount?: string;
  recipientIfsc?: string;
  recipientUpi?: string;
  recipientMobile?: string;
  amount: number;
  purpose?: string;
  userId: string;
  isSimulated: boolean;
}

export interface AssessmentResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  riskCategory: string;
  rulesEvaluated: { rule: string; triggered: boolean; detail: string; weight: number }[];
  evidence: Record<string, unknown>;
  explanation: string;
  explanationHi: string;
  explanationMr: string;
  missingInfo: string | null;
  recommendations: string[];
  restrictions: string[];
  modelVersion: string;
  isSimulated: boolean;
}

interface RuleConfig {
  maxRepeatedAttempts: number;
  velocityWindowMinutes: number;
  maxTxnPerWindow: number;
  newRecipientRisk: string;
  unverifiedRecipientRisk: string;
  amountThresholdHigh: number;
  amountThresholdVeryHigh: number;
}

const DEFAULT_CONFIG: RuleConfig = {
  maxRepeatedAttempts: 3,
  velocityWindowMinutes: 10,
  maxTxnPerWindow: 5,
  newRecipientRisk: 'medium',
  unverifiedRecipientRisk: 'medium',
  amountThresholdHigh: 50000,
  amountThresholdVeryHigh: 200000,
};

async function loadRuleConfig(): Promise<RuleConfig> {
  const { data } = await supabase
    .from('ai_rule_versions')
    .select('config')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.config) return { ...DEFAULT_CONFIG, ...(data.config as Partial<RuleConfig>) };
  return DEFAULT_CONFIG;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function levelFromScore(score: number, blocked: boolean): AssessmentResult['riskLevel'] {
  if (blocked || score >= 80) return 'blocked';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export async function runFraudAssessment(input: AssessmentInput): Promise<AssessmentResult> {
  const config = await loadRuleConfig();
  const rules: AssessmentResult['rulesEvaluated'] = [];
  const restrictions: string[] = [];
  const recommendations: string[] = [];
  const evidence: Record<string, unknown> = {};
  let rawScore = 0;
  let blocked = false;

  // Rule 1: High amount threshold
  const isHighAmount = input.amount >= config.amountThresholdHigh;
  const isVeryHighAmount = input.amount >= config.amountThresholdVeryHigh;
  rules.push({
    rule: 'high_amount_threshold',
    triggered: isHighAmount,
    detail: isVeryHighAmount
      ? `Amount ${input.amount} far exceeds threshold ${config.amountThresholdVeryHigh}`
      : isHighAmount
        ? `Amount ${input.amount} exceeds threshold ${config.amountThresholdHigh}`
        : 'Amount within normal range',
    weight: isVeryHighAmount ? 18 : isHighAmount ? 12 : 0,
  });
  if (isVeryHighAmount) rawScore += 18;
  else if (isHighAmount) rawScore += 12;
  evidence.amount = input.amount;
  evidence.highAmountThreshold = config.amountThresholdHigh;
  evidence.veryHighAmountThreshold = config.amountThresholdVeryHigh;

  // Rule 2: Recipient verification status
  const { data: savedRecipient } = await supabase
    .from('recipients')
    .select('*')
    .eq('user_id', input.userId)
    .ilike('name', input.recipientName)
    .limit(1)
    .maybeSingle();
  const isKnownRecipient = !!savedRecipient;
  const isVerifiedRecipient = savedRecipient?.verified ?? false;

  rules.push({
    rule: 'recipient_verification',
    triggered: !isVerifiedRecipient,
    detail: isVerifiedRecipient ? 'Recipient is verified' : isKnownRecipient ? 'Recipient saved but not verified' : 'New or unknown recipient',
    weight: isKnownRecipient ? 8 : 15,
  });
  if (!isVerifiedRecipient) rawScore += isKnownRecipient ? 8 : 15;
  evidence.recipientKnown = isKnownRecipient;
  evidence.recipientVerified = isVerifiedRecipient;

  // Rule 3: Velocity check
  const windowStart = new Date(Date.now() - config.velocityWindowMinutes * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', input.userId)
    .gte('created_at', windowStart);
  const isHighVelocity = (recentCount ?? 0) >= config.maxTxnPerWindow;
  rules.push({
    rule: 'velocity_check',
    triggered: isHighVelocity,
    detail: isHighVelocity ? `${recentCount} transactions in last ${config.velocityWindowMinutes} min` : `${recentCount ?? 0} transactions in window`,
    weight: isHighVelocity ? 12 : 0,
  });
  if (isHighVelocity) rawScore += 12;
  evidence.recentTxnCount = recentCount;

  // Rule 4: Scam report matching
  const safeName = input.recipientName.replace(/[%_]/g, (m) => '\\' + m);
  const { data: scamMatches } = await supabase
    .from('scam_reports')
    .select('id,category,description,status')
    .or(`suspect_contact.ilike.%${safeName}%,description.ilike.%${safeName}%`)
    .limit(5);
  const hasScamMatch = (scamMatches ?? []).length > 0;
  rules.push({
    rule: 'scam_report_match',
    triggered: hasScamMatch,
    detail: hasScamMatch ? `${scamMatches!.length} matching scam reports found` : 'No matching scam reports',
    weight: hasScamMatch ? 25 : 0,
  });
  if (hasScamMatch) rawScore += 25;
  evidence.scamReportMatches = scamMatches ?? [];

  // Rule 5: Missing recipient information
  const hasMissingInfo = !input.recipientAccount && !input.recipientUpi && !input.recipientMobile;
  rules.push({
    rule: 'missing_recipient_info',
    triggered: hasMissingInfo,
    detail: hasMissingInfo ? 'No account number, UPI ID, or mobile provided' : 'Recipient details provided',
    weight: hasMissingInfo ? 8 : 0,
  });
  if (hasMissingInfo) rawScore += 8;

  // Rule 6: Unusual time (11 PM – 5 AM IST) — uses Asia/Kolkata timezone for accurate calculation
  const istParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const istHour = parseInt(istParts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const isUnusualTime = istHour >= 23 || istHour < 5;
  rules.push({
    rule: 'unusual_time',
    triggered: isUnusualTime,
    detail: isUnusualTime ? `Transaction at unusual hour (${istHour}:00 IST)` : 'Transaction within normal hours',
    weight: isUnusualTime ? 8 : 0,
  });
  if (isUnusualTime) rawScore += 8;
  evidence.transactionHour = istHour;

  // Rule 7: Duplicate payment detection
  const dupWindowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentTxns } = await supabase
    .from('transactions')
    .select('id,amount,recipient_ref,created_at')
    .eq('sender_id', input.userId)
    .gte('created_at', dupWindowStart)
    .order('created_at', { ascending: false })
    .limit(10);
  const isDuplicate = (recentTxns ?? []).some((tx) => {
    const ref = tx.recipient_ref as { name?: string } | null;
    return tx.amount === input.amount && ref?.name?.toLowerCase() === input.recipientName.toLowerCase();
  });
  rules.push({
    rule: 'duplicate_payment',
    triggered: isDuplicate,
    detail: isDuplicate ? 'Duplicate payment — same amount and recipient within 5 minutes' : 'No duplicate payment detected',
    weight: isDuplicate ? 15 : 0,
  });
  if (isDuplicate) rawScore += 15;
  evidence.isDuplicatePayment = isDuplicate;

  // Rule 8: Rapid succession
  const rapidWindowStart = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { count: rapidCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', input.userId)
    .gte('created_at', rapidWindowStart);
  const isRapidSuccession = (rapidCount ?? 0) >= 3;
  rules.push({
    rule: 'rapid_succession',
    triggered: isRapidSuccession,
    detail: isRapidSuccession ? `${rapidCount} payments in last 2 minutes — burst pattern` : 'No rapid succession detected',
    weight: isRapidSuccession ? 12 : 0,
  });
  if (isRapidSuccession) rawScore += 12;
  evidence.rapidSuccessionCount = rapidCount;

  // Rule 9: Large amount to new recipient (compound)
  const isLargeNewRecipient = isHighAmount && !isKnownRecipient;
  rules.push({
    rule: 'large_amount_new_recipient',
    triggered: isLargeNewRecipient,
    detail: isLargeNewRecipient ? 'Large amount to a new recipient — compound risk' : 'No compound risk pattern',
    weight: isLargeNewRecipient ? 15 : 0,
  });
  if (isLargeNewRecipient) rawScore += 15;

  // Rule 10: QR scam signal — payment mode QR with new recipient and high amount
  const isQrPattern = !input.recipientAccount && !input.recipientUpi && input.recipientMobile === undefined && !isKnownRecipient && input.amount > 1000;
  rules.push({
    rule: 'qr_scan_pattern',
    triggered: isQrPattern,
    detail: isQrPattern ? 'QR-initiated payment to unknown recipient — verify before confirming' : 'No QR scam pattern detected',
    weight: isQrPattern ? 10 : 0,
  });
  if (isQrPattern) rawScore += 10;
  evidence.qrScanPattern = isQrPattern;

  // Rule 11: Phishing/social engineering indicators — keywords in recipient name
  const suspiciousKeywords = ['urgent', 'lottery', 'prize', 'winner', 'tax', 'refund', 'kyc', 'verify', 'otp', 'gift', 'free'];
  const recipientLower = input.recipientName.toLowerCase();
  const matchedKeywords = suspiciousKeywords.filter((k) => recipientLower.includes(k));
  const hasPhishingSignal = matchedKeywords.length > 0;
  rules.push({
    rule: 'phishing_social_engineering',
    triggered: hasPhishingSignal,
    detail: hasPhishingSignal ? `Suspicious keywords detected in recipient name: ${matchedKeywords.join(', ')}` : 'No phishing indicators in recipient name',
    weight: hasPhishingSignal ? 20 : 0,
  });
  if (hasPhishingSignal) rawScore += 20;
  evidence.suspiciousKeywords = matchedKeywords;

  // Rule 12: Account takeover signal — first transaction ever for this user
  const { count: totalTxnCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', input.userId);
  const isFirstTransaction = (totalTxnCount ?? 0) === 0;
  const isTakeoverPattern = isFirstTransaction && isHighAmount && !isKnownRecipient;
  rules.push({
    rule: 'account_takeover',
    triggered: isTakeoverPattern,
    detail: isTakeoverPattern ? 'First-ever transaction is high-value to unknown recipient — possible account takeover' : 'No account takeover pattern detected',
    weight: isTakeoverPattern ? 18 : 0,
  });
  if (isTakeoverPattern) rawScore += 18;
  evidence.isFirstTransaction = isFirstTransaction;
  evidence.totalTransactionCount = totalTxnCount;

  // Rule 13: Government scheme scam signal — keywords suggesting scheme fraud
  const schemeKeywords = ['scheme', 'subsidy', 'benefit', 'ration', 'pmay', 'pm-kisan', 'aadhaar', 'bpl'];
  const schemeMatch = schemeKeywords.some((k) => recipientLower.includes(k));
  const isSchemeScam = schemeMatch && !isKnownRecipient;
  rules.push({
    rule: 'scheme_scam',
    triggered: isSchemeScam,
    detail: isSchemeScam ? 'Recipient name references government scheme — legitimate scheme payments do not require transfers to individuals' : 'No scheme scam pattern detected',
    weight: isSchemeScam ? 15 : 0,
  });
  if (isSchemeScam) rawScore += 15;
  evidence.schemeScamSignal = isSchemeScam;

  // Rule 14: Mandatory restriction — blocked if scam report is verified
  const verifiedScamMatch = (scamMatches ?? []).some((s) => s.status === 'verified');
  if (verifiedScamMatch) {
    restrictions.push('Payment blocked: recipient matches a verified scam report');
    blocked = true;
    rawScore = 100;
  }

  const riskScore = clampScore(rawScore);
  const riskLevel = levelFromScore(riskScore, blocked);

  const riskCategory = riskLevel === 'blocked'
    ? 'Payment Blocked'
    : riskLevel === 'high'
      ? 'High Fraud Risk'
      : riskLevel === 'medium'
        ? 'Elevated Risk'
        : 'Low Risk';

  // Build recommendations
  if (!isVerifiedRecipient) {
    recommendations.push('Verify the recipient through a trusted channel before proceeding.');
  }
  if (isHighAmount) {
    recommendations.push('Double-check the amount and recipient details for this high-value transfer.');
  }
  if (isHighVelocity) {
    recommendations.push('Multiple recent transactions detected. Review your transaction history.');
  }
  if (hasScamMatch && !verifiedScamMatch) {
    recommendations.push('This recipient appears in submitted scam reports. Exercise extreme caution.');
  }
  if (hasMissingInfo) {
    recommendations.push('Provide complete recipient details for a more thorough assessment.');
  }
  if (isUnusualTime) {
    recommendations.push('This transaction is being made late at night. Verify the recipient and amount carefully.');
  }
  if (isDuplicate) {
    recommendations.push('A similar payment was made recently. Confirm this is not an accidental duplicate.');
  }
  if (isRapidSuccession) {
    recommendations.push('Multiple rapid payments detected. Review your recent transaction history.');
  }
  if (isLargeNewRecipient) {
    recommendations.push('This is a large payment to a new recipient. Consider verifying through a trusted channel first.');
  }
  if (isQrPattern) {
    recommendations.push('QR payments to unknown recipients carry risk. Verify the merchant or individual before paying.');
  }
  if (hasPhishingSignal) {
    recommendations.push('The recipient name contains keywords commonly used in phishing scams. Do not proceed if you were pressured to pay.');
  }
  if (isTakeoverPattern) {
    recommendations.push('This is your first transaction and it is high-value to an unknown recipient. If you did not initiate this, contact support immediately.');
  }
  if (isSchemeScam) {
    recommendations.push('Government schemes do not require payments to individuals. Verify through official channels before transferring money.');
  }
  if (riskLevel === 'low' && recommendations.length === 0) {
    recommendations.push('No warnings generated. Always verify recipient details before confirming.');
  }

  const triggeredRules = rules.filter((r) => r.triggered);
  const explanation = buildExplanation(triggeredRules, riskLevel, riskScore, riskCategory, input, 'en');
  const explanationHi = buildExplanation(triggeredRules, riskLevel, riskScore, riskCategory, input, 'hi');
  const explanationMr = buildExplanation(triggeredRules, riskLevel, riskScore, riskCategory, input, 'mr');

  return {
    riskScore,
    riskLevel,
    riskCategory,
    rulesEvaluated: rules,
    evidence,
    explanation,
    explanationHi,
    explanationMr,
    missingInfo: hasMissingInfo ? 'Missing recipient account number, UPI ID, or mobile number' : null,
    recommendations,
    restrictions,
    modelVersion: 'rules-v2',
    isSimulated: input.isSimulated,
  };
}

function buildExplanation(
  triggered: { rule: string; detail: string }[],
  riskLevel: string,
  riskScore: number,
  riskCategory: string,
  input: AssessmentInput,
  lang: Lang,
): string {
  const prefix = lang === 'hi'
    ? `जोखिम स्कोर: ${riskScore}/100 · श्रेणी: ${riskCategory} · स्तर: ${riskLevel.toUpperCase()}`
    : lang === 'mr'
      ? `जोखीम स्कोअर: ${riskScore}/100 · श्रेणी: ${riskCategory} · पातळी: ${riskLevel.toUpperCase()}`
      : `Risk Score: ${riskScore}/100 · Category: ${riskCategory} · Level: ${riskLevel.toUpperCase()}`;

  if (triggered.length === 0) {
    const safe = lang === 'hi'
      ? `${input.amount} का ${input.recipientName} को भुगतान के लिए कोई जोखिम संकेत नहीं मिला। यह मूल्यांकन नियत्रात्मक नियमों और उपलब्ध साक्ष्य पर आधारित है। कोई चेतावनी नहीं होने का अर्थ भुगतान सुरक्षित है यह गारंटी नहीं है।`
      : lang === 'mr'
        ? `${input.amount} चे ${input.recipientName} ला पेमेंटसाठी कोणताही जोखीम संकेत आढळला नाही. हे मूल्यमापन नियमाधारित नियम आणि उपलब्ध पुराव्यावर आधारित आहे. चेतावणी नसणे हे पेमेंट सुरक्षित आहे अशी हमी नाही.`
        : `No risk indicators detected for payment of ${input.amount} to ${input.recipientName}. This assessment is based on deterministic rules and available evidence. No warning does not guarantee the payment is safe — always verify recipient details.`;
    return `${prefix}. ${safe}`;
  }

  const parts: string[] = [prefix + '.'];
  for (const r of triggered) {
    parts.push(`• ${r.detail}.`);
  }
  const disclaimer = lang === 'hi'
    ? 'यह मूल्यांकन केवल विश्वसनीय एप्लिकेशन सेवाओं के साक्ष्य का उपयोग करता है। यह सुरक्षा या धोखाधड़ी की गारंटी नहीं है।'
    : lang === 'mr'
      ? 'हे मूल्यमापन फक्त विश्वसनीय ॲप्लिकेशन सेवांच्या पुराव्याचा वापर करते. ही सुरक्षा किंवा फसवणूकीची हमी नाही.'
      : 'This assessment uses only evidence from trusted application services. It does not constitute a guarantee of safety or fraud.';
  parts.push(disclaimer);
  return parts.join(' ');
}

export async function saveAssessment(result: AssessmentResult, transactionId: string | null, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('fraud_assessments').insert({
    transaction_id: transactionId,
    user_id: userId,
    risk_level: result.riskLevel,
    rules_evaluated: result.rulesEvaluated,
    evidence: { ...result.evidence, riskScore: result.riskScore, riskCategory: result.riskCategory },
    explanation: result.explanation,
    explanation_hi: result.explanationHi,
    explanation_mr: result.explanationMr,
    missing_info: result.missingInfo,
    recommendations: result.recommendations,
    restrictions: result.restrictions,
    model_version: result.modelVersion,
    is_simulated: result.isSimulated,
  }).select('id').maybeSingle();

  if (error) {
    console.error('Assessment save error:', error.message);
    return null;
  }
  return data?.id ?? null;
}
