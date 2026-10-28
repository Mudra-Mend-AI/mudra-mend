import { useState } from 'react';
import { BookOpen, Shield, AlertTriangle, CheckCircle, Lightbulb, Award, ChevronRight, X, GraduationCap, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Card, Badge, StatCard } from '@/components/ui';

interface Lesson {
  id: string;
  title: string;
  titleHi: string;
  titleMr: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  contentHi: string;
  contentMr: string;
  warningSigns: string[];
  safePractices: string[];
  checklist: string[];
  quiz: { question: string; options: string[]; answer: number; explanation: string }[];
}

const LESSONS: Lesson[] = [
  {
    id: 'upi-safety',
    title: 'UPI Payment Safety',
    titleHi: 'UPI भुगतान सुरक्षा',
    titleMr: 'UPI पेमेंट सुरक्षा',
    category: 'Payment Safety',
    difficulty: 'beginner',
    content: 'UPI (Unified Payments Interface) lets you send and receive money instantly using just a mobile number or UPI ID. While convenient, it is also a target for fraud. The most important rule: scanning a QR code and entering your PIN always SENDS money — it never receives money. If someone asks you to scan a QR code to receive payment, it is a scam.',
    contentHi: 'UPI (यूनिफाइड पेमेंट्स इंटरफेस) आपको केवल मोबाइल नंबर या UPI ID का उपयोग करके तुरंत पैसे भेजने और प्राप्त करने की सुविधा देता है। सबसे महत्वपूर्ण नियम: QR कोड स्कैन करना और PIN दर्ज करना हमेशा पैसे भेजता है — यह कभी पैसे प्राप्त नहीं करता।',
    contentMr: 'UPI (युनिफाइड पेमेंट्स इंटरफेस) तुम्हाला फक्त मोबाइल नंबर किंवा UPI ID वापरून लगेच पैसे पाठवण्याची आणि प्राप्त करण्याची सुविधा देते. सर्वात महत्त्वाचा नियम: QR कोड स्कॅन करणे आणि PIN टाकणे नेहमी पैसे पाठवते — ते कधीच पैसे मिळवत नाही.',
    warningSigns: ['Someone asks you to scan a QR code to "receive" money', 'Pressure to enter UPI PIN quickly', 'Unknown UPI collect request received', 'Unexpected payment request from a stranger'],
    safePractices: ['Always verify recipient name before confirming', 'Never share your UPI PIN with anyone', 'Check the amount carefully before entering PIN', 'Only scan QR codes from trusted merchants'],
    checklist: ['I verify the recipient name before every payment', 'I never share my UPI PIN', 'I know scanning QR + entering PIN = sending money', 'I check the amount before confirming'],
    quiz: [
      {
        question: 'If someone sends you a QR code and asks you to scan it to receive money, what should you do?',
        options: ['Scan it and enter PIN to receive money', 'Do not scan — scanning + PIN always sends money', 'Scan it without entering PIN', 'Ask the sender to send a different QR'],
        answer: 1,
        explanation: 'Scanning a QR code and entering your UPI PIN always authorises a payment (debit). It never receives money. This is the most common UPI scam.',
      },
      {
        question: 'Who can ask for your UPI PIN?',
        options: ['Bank staff', 'Customer care', 'No one — never share your PIN', 'Government officials'],
        answer: 2,
        explanation: 'No legitimate entity will ever ask for your UPI PIN. Banks, customer care, and government officials never need your PIN.',
      },
    ],
  },
  {
    id: 'otp-security',
    title: 'OTP Security — Never Share',
    titleHi: 'OTP सुरक्षा — कभी साझा न करें',
    titleMr: 'OTP सुरक्षा — कधीच शेअर करू नका',
    category: 'Credential Safety',
    difficulty: 'beginner',
    content: 'OTP (One Time Password) is the final authorisation for your banking transactions. Once someone has your OTP, they can complete transactions from your account. Banks, government officials, customer care, and police will NEVER ask for your OTP. Anyone who asks for your OTP is a fraudster.',
    contentHi: 'OTP (वन टाइम पासवर्ड) आपके बैंकिंग लेनदेन के लिए अंतिम अधिकरण है। एक बार किसी के पास आपका OTP आ जाए, तो वे आपके खाते से लेनदेन पूरा कर सकते हैं। बैंक, सरकारी अधिकारी, और पुलिस कभी आपका OTP नहीं मांगते।',
    contentMr: 'OTP (वन टाईम पासवर्ड) तुमच्या बँकिंग व्यवहारासाठी अंतिम अधिकार आहे. एकदा कोणाकडे तुमचा OTP आला की, ते तुमच्या खात्यातून व्यवहार पूर्ण करू शकतात. बँक, सरकारी अधिकारी आणि पोलिस कधीच OTP मागत नाहीत.',
    warningSigns: ['Anyone asking you to read out an SMS code', 'OTP received for a transaction you did not initiate', 'Caller claims OTP is needed for "verification"', 'Asked to approve an incoming UPI collect request'],
    safePractices: ['Never share OTP with anyone — not even family for banking', 'Be suspicious of anyone asking about SMS codes', 'If you receive an unexpected OTP, do not share it', 'Report OTP theft attempts to your bank'],
    checklist: ['I never share OTP with anyone', 'I know banks never ask for OTP', 'I report unexpected OTP messages', 'I do not approve unexpected UPI collect requests'],
    quiz: [
      {
        question: 'A caller says they are from your bank and need your OTP to verify your account. What do you do?',
        options: ['Share the OTP since they are from the bank', 'Ask for their employee ID first, then share', 'Do not share — banks never ask for OTP', 'Share only the last 4 digits'],
        answer: 2,
        explanation: 'Banks never ask for OTP under any circumstances. Hang up immediately and call your bank using the number from their official website.',
      },
    ],
  },
  {
    id: 'phishing-awareness',
    title: 'Phishing, Smishing & Vishing',
    titleHi: 'फ़िशिंग, स्मिशिंग और विशिंग',
    titleMr: 'फिशिंग, स्मिशिंग आणि विशिंग',
    category: 'Social Engineering',
    difficulty: 'intermediate',
    content: 'Phishing (fake emails), smishing (fake SMS), and vishing (fake phone calls) are methods fraudsters use to steal credentials or money. They impersonate banks, government, or trusted companies. Key red flags: urgency, links to "verify" accounts, requests for OTP/PIN, and sender addresses that look almost but not exactly right.',
    contentHi: 'फ़िशिंग (नकली ईमेल), स्मिशिंग (नकली SMS), और विशिंग (नकली फोन कॉल) धोखेबाजों द्वारा क्रेडेंशियल या पैसे चुराने के तरीके हैं। वे बैंक, सरकार या भरोसेमंद कंपनियों का रूप धरते हैं।',
    contentMr: 'फिशिंग (जाली ईमेल), स्मिशिंग (जाली SMS), आणि विशिंग (जाली फोन कॉल) हे फसवणूक करणाऱ्यांचे क्रेडेन्शियल किंवा पैसे चोरण्याचे मार्ग आहेत.',
    warningSigns: ['Links in messages asking you to "verify" or "update"', 'Urgency: "account will be blocked in 24 hours"', 'Sender email almost matches but has small differences', 'Calls asking for PIN, OTP, or card details'],
    safePractices: ['Never click links in unsolicited emails or SMS', 'Type the official website URL directly in your browser', 'Verify by calling official helpline numbers only', 'Check sender email addresses character by character'],
    checklist: ['I do not click links in unsolicited messages', 'I verify sender addresses carefully', 'I use official websites directly, not links from messages', 'I know urgency is a scam tactic'],
    quiz: [
      {
        question: 'You receive an SMS: "Your SBI account is blocked. Click here to verify: bit.ly/sbi-verify". What should you do?',
        options: ['Click the link and verify', 'Reply to the SMS', 'Delete it and visit sbi.co.in directly', 'Forward it to friends to check'],
        answer: 2,
        explanation: 'Never click links in SMS messages claiming to be from your bank. Always go to the official website by typing it directly. Shortened URLs (bit.ly) are commonly used in phishing.',
      },
      {
        question: 'Which of these is NOT a phishing red flag?',
        options: ['Urgency to act immediately', 'Email from your bank at the address you registered', 'Links to "verify your account"', 'Requests for OTP or PIN'],
        answer: 1,
        explanation: 'An email from your bank to the address you registered is normal communication. However, always verify links before clicking, even from known senders.',
      },
    ],
  },
  {
    id: 'scheme-safety',
    title: 'Government Scheme Safety',
    titleHi: 'सरकारी योजना सुरक्षा',
    titleMr: 'सरकारी योजना सुरक्षा',
    category: 'Scheme Fraud',
    difficulty: 'beginner',
    content: 'Government schemes like PM-Kisan, PMAY, and PMJDY provide benefits to eligible citizens. Scammers impersonate government officials and demand "processing fees" or ask for documents to "release" benefits. Real government schemes never require you to pay money to individuals. All applications go through official portals.',
    contentHi: 'PM-Kisan, PMAY, और PMJDY जैसी सरकारी योजनाएं पात्र नागरिकों को लाभ प्रदान करती हैं। ठग सरकारी अधिकारियों का रूप धरते हैं और "प्रोसेसिंग फीस" मांगते हैं। असली सरकारी योजनाएं कभी व्यक्तियों को पैसे देने की आवश्यकता नहीं होती।',
    contentMr: 'PM-Kisan, PMAY, आणि PMJDY सारख्या सरकारी योजना पात्र नागरिकांना लाभ देतात. फसवणूक करणारे सरकारी अधिकाऱ्यांचे रूप धारण करतात आणि "प्रोसेसिंग फी" मागतात. खऱ्या सरकारी योजनांसाठी व्यक्तींना पैसे देणे आवश्यक नसते.',
    warningSigns: ['Asked to pay a fee for "free" government benefits', 'Caller claims to be from PM-Kisan or PMAY', 'Aadhaar or bank details requested over phone', 'Promises of benefits via WhatsApp or SMS'],
    safePractices: ['Apply only through official government portals', 'Government schemes never require payments to individuals', 'Verify scheme details on official websites', 'Contact your bank or post office for scheme applications'],
    checklist: ['I know government schemes never require fees to individuals', 'I apply through official portals only', 'I do not share Aadhaar/bank details over phone', 'I verify scheme offers on government websites'],
    quiz: [
      {
        question: 'Someone calls saying you are approved for PM-Kisan benefits but need to pay Rs 500 processing fee. What do you do?',
        options: ['Pay the fee to get the benefit', 'Ask for a discount on the fee', 'Do not pay — PM-Kisan never requires fees to individuals', 'Pay only if they send an official-looking letter'],
        answer: 2,
        explanation: 'PM-Kisan and all government schemes never require processing fees paid to individuals. Benefits are transferred directly to your bank account. Report such calls to cybercrime.gov.in.',
      },
    ],
  },
  {
    id: 'loan-fraud-awareness',
    title: 'Loan & Lending Fraud Awareness',
    titleHi: 'ऋण और उधार धोखाधड़ी जागरूकता',
    titleMr: 'कर्ज आणि उधार फसवणूक जागरूकता',
    category: 'Financial Fraud',
    difficulty: 'intermediate',
    content: 'Fake loan offers are a major scam category. Scammers send SMS or WhatsApp messages offering instant loans with no documentation. They demand "processing fees", "insurance", or "GST" upfront before disbursal. No legitimate lender charges upfront fees. Once you pay, no loan is disbursed and your documents may be misused.',
    contentHi: 'नकली ऋण प्रस्ताव एक बड़ी धोखाधड़ी श्रेणी है। ठग SMS या WhatsApp पर तुरंत ऋण की पेशकश करते हैं। वे "प्रोसेसिंग फीस" मांगते हैं। कोई भी वैध ऋणदाता पहले से शुल्क नहीं लेता।',
    contentMr: 'जाली कर्ज प्रस्ताव हा एक मोठा फसवणूक प्रकार आहे. फसवणूक करणारे SMS किंवा WhatsApp वर लगेच कर्जाची ऑफर देतात. ते "प्रोसेसिंग फी" मागतात. कोणताही वैध कर्ज देणारा अगोदर शुल्क घेत नाही.',
    warningSigns: ['Loan approved without any documentation', 'Upfront fee demanded before disbursal', 'No physical office or RBI registration number', 'Unsolicited loan offers via SMS/WhatsApp'],
    safePractices: ['Legitimate lenders never charge upfront fees', 'Verify lender is RBI-registered on the RBI website', 'Check for a physical office and verifiable contact', 'Use only banks and NBFCs you know'],
    checklist: ['I know lenders never charge upfront fees', 'I verify RBI registration before applying', 'I do not share documents with unknown lenders', 'I ignore unsolicited loan offers'],
    quiz: [
      {
        question: 'A WhatsApp message offers you a Rs 5 lakh instant loan with "just Rs 2,000 processing fee". What is this?',
        options: ['A legitimate loan offer', 'A scam — real lenders never charge upfront fees', 'A bank promotional offer', 'A government scheme'],
        answer: 1,
        explanation: 'This is a loan scam. Legitimate lenders deduct fees from the disbursed amount — they never demand upfront payment. Report to cybercrime.gov.in.',
      },
    ],
  },
  {
    id: 'deepfake-awareness',
    title: 'AI Deepfake & Voice Clone Scams',
    titleHi: 'AI डीपफेक और वॉइस क्लोन घोटाले',
    titleMr: 'AI डीपफेक आणि व्हॉईस क्लोन फसवणूक',
    category: 'Emerging Threat',
    difficulty: 'advanced',
    content: 'AI can now clone voices from short audio samples. Fraudsters use voice clones to impersonate family members in distress, claiming they need urgent money transfers. They may also use video deepfakes. Always verify money requests through a second channel — call the person back on their known number.',
    contentHi: 'AI अब छोटे ऑडियो सैंपल से आवाज क्लोन कर सकता है। धोखेबाज परिवार के सदस्यों की आवाज का अनुकरण करते हैं और तत्काल पैसे मांगते हैं। हमेशा दूसरे चैनल से सत्यापित करें।',
    contentMr: 'AI आता लहान ऑडिओ सँपलवरून आवाज क्लोन करू शकतो. फसवणूक करणारे कुटुंबातील सदस्यांची आवाज नक्कल करतात आणि लगेच पैसे मागतात. नेहमी दुसऱ्या चॅनेलवरून तपासा.',
    warningSigns: ['Voice/video call from "family" requesting urgent money', 'Caller sounds slightly different from usual', 'Request to keep the transfer secret', 'Emotional pressure and urgency'],
    safePractices: ['Verify money requests through a second channel', 'Call the person back on their known number', 'Establish a family code word for emergencies', 'Be suspicious of urgent, secret money requests'],
    checklist: ['I verify urgent money requests by calling back', 'I have a family code word for emergencies', 'I know AI can clone voices', 'I do not transfer money based on voice alone'],
    quiz: [
      {
        question: 'You get a call from your "son" saying he is in trouble and needs Rs 50,000 urgently. His voice sounds a bit different. What do you do?',
        options: ['Send the money immediately — it is your son', 'Ask him to send a photo', 'Call your son back on his known number to verify', 'Send half the amount to be safe'],
        answer: 2,
        explanation: 'AI can clone voices. Always call back on the known number to verify. If you cannot reach them, contact other family members. Never transfer money based on a single call.',
      },
    ],
  },
];

export default function LearningCenter() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { lang } = useI18n();
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('mm_learning_completed');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  const markComplete = (id: string) => {
    const updated = new Set(completedLessons);
    updated.add(id);
    setCompletedLessons(updated);
    localStorage.setItem('mm_learning_completed', JSON.stringify([...updated]));
  };

  const getTitle = (l: Lesson) => lang === 'hi' ? l.titleHi : lang === 'mr' ? l.titleMr : l.title;
  const getContent = (l: Lesson) => lang === 'hi' ? l.contentHi : lang === 'mr' ? l.contentMr : l.content;

  const difficultyBadge: Record<string, 'success' | 'warning' | 'error'> = {
    beginner: 'success', intermediate: 'warning', advanced: 'error',
  };

  const quizScore = selected ? selected.quiz.reduce((score, q, i) => score + (quizAnswers[i] === q.answer ? 1 : 0), 0) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Fraud Awareness & Learning Center</h1>
        <p className="mt-1 text-sm text-gray-500">Learn to identify and prevent fraud — multilingual resources for all users</p>
      </div>

      <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
        <div className="flex items-center gap-2">
          <Shield size={16} />
          <span>These are educational resources. Scenarios are fictional and clearly labeled. Learning progress is saved locally on your device.</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Lessons" value={LESSONS.length} icon={<BookOpen size={22} />} accent="primary" />
        <StatCard label="Completed" value={completedLessons.size} icon={<Award size={22} />} accent="success" />
        <StatCard label="Progress" value={`${Math.round((completedLessons.size / LESSONS.length) * 100)}%`} icon={<GraduationCap size={22} />} accent="warning" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {LESSONS.map((lesson) => (
          <Card key={lesson.id} className="cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => { setSelected(lesson); setQuizAnswers({}); setQuizSubmitted(false); }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={difficultyBadge[lesson.difficulty]}>{lesson.difficulty}</Badge>
                  <Badge variant="neutral">{lesson.category}</Badge>
                  {completedLessons.has(lesson.id) && <Badge variant="success"><CheckCircle size={10} className="inline mr-0.5" />Completed</Badge>}
                </div>
                <h3 className="mt-2 text-sm font-semibold">{getTitle(lesson)}</h3>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{getContent(lesson)}</p>
              </div>
              {completedLessons.has(lesson.id) ? (
                <Award size={20} className="flex-shrink-0 text-success-500" />
              ) : (
                <ChevronRight size={20} className="flex-shrink-0 text-gray-400" />
              )}
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={difficultyBadge[selected.difficulty]}>{selected.difficulty}</Badge>
                  <Badge variant="neutral">{selected.category}</Badge>
                </div>
                <h2 className="mt-2 text-lg font-bold">{getTitle(selected)}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost p-1.5 text-gray-400"><X size={18} /></button>
            </div>

            <div className="mt-4 space-y-5 text-sm">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lesson Content</h3>
                <p className="mt-1 text-gray-700 dark:text-gray-300">{getContent(selected)}</p>
                <p className="mt-2 text-xs text-gray-400 italic">This is a fictional educational scenario for awareness purposes.</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><AlertTriangle size={12} /> Warning Signs</h3>
                <ul className="mt-1 space-y-1">
                  {selected.warningSigns.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-warning-500" /> {w}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><Shield size={12} /> Safe Practices</h3>
                <ul className="mt-1 space-y-1">
                  {selected.safePractices.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300"><CheckCircle size={14} className="mt-0.5 flex-shrink-0 text-success-500" /> {s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><CheckCircle size={12} /> Prevention Checklist</h3>
                <div className="mt-2 space-y-2">
                  {selected.checklist.map((c, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                      <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quiz */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><Lightbulb size={12} /> Quick Quiz</h3>
                <div className="mt-2 space-y-4">
                  {selected.quiz.map((q, qi) => (
                    <div key={qi} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                      <p className="font-medium text-sm">{qi + 1}. {q.question}</p>
                      <div className="mt-2 space-y-1.5">
                        {q.options.map((opt, oi) => {
                          const isSelected = quizAnswers[qi] === oi;
                          const isCorrect = oi === q.answer;
                          const showResult = quizSubmitted;
                          return (
                            <button
                              key={oi}
                              onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [qi]: oi })}
                              disabled={quizSubmitted}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                showResult && isCorrect ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                                : showResult && isSelected && !isCorrect ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300'
                                : isSelected ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800'
                              }`}
                            >
                              <span className="font-semibold">{String.fromCharCode(65 + oi)}.</span> {opt}
                              {showResult && isCorrect && <CheckCircle size={14} className="ml-auto text-success-500" />}
                              {showResult && isSelected && !isCorrect && <X size={14} className="ml-auto text-error-500" />}
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted && (
                        <p className="mt-2 text-xs text-gray-500">{q.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
                {!quizSubmitted ? (
                  <button className="btn-primary mt-3" onClick={() => setQuizSubmitted(true)} disabled={Object.keys(quizAnswers).length < selected.quiz.length}>
                    Submit Quiz
                  </button>
                ) : (
                  <div className="mt-3 flex items-center gap-3">
                    <Badge variant={quizScore === selected.quiz.length ? 'success' : quizScore > 0 ? 'warning' : 'error'}>
                      Score: {quizScore}/{selected.quiz.length}
                    </Badge>
                    <button className="btn-secondary text-sm" onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}>Retry</button>
                    {quizScore === selected.quiz.length && !completedLessons.has(selected.id) && (
                      <button className="btn-success text-sm" onClick={() => markComplete(selected.id)}>
                        <Award size={14} /> Mark Lesson Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
