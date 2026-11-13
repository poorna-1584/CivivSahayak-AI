import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  BellRing,
  Check,
  ExternalLink,
  FileCheck2,
  FileText,
  Flame,
  GraduationCap,
  HeartPulse,
  Lock,
  Mic,
  Search,
  ShieldCheck,
  Sprout,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { CATEGORY_LABELS, SCHEME_CATEGORIES } from '../i18n/translations';
import { ResilientImage } from '../components/ResilientImage';
import { VoiceRecorderButton } from '../components/VoiceRecorderButton';
import { ReadAloudButton } from '../components/ReadAloudButton';

export function HomePage() {
  const {
    language,
    setLanguage,
    t,
    navigate,
    citizenUser,
    schemes,
    latestScholarships,
    alerts,
    unseenAlertCount,
    browserAlertPermission,
    enableBrowserAlerts,
    openScholarshipsModal,
  } = useApp();
  const [question, setQuestion] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      navigate('chat');
      return;
    }
    navigate('chat', { chatPrompt: question.trim() });
  };

  const sampleQuestions =
    language === 'te'
      ? [
          'ఆంధ్రప్రదేశ్‌లో కాలేజీ విద్యార్థులకు ఏ స్కాలర్‌షిప్‌లు ఉన్నాయి?',
          'అన్నదాత సుఖీభవ పథకానికి ఏ పత్రాలు అవసరం?',
          'ఎన్టీఆర్ వైద్య సేవ ఆదాయ పరిమితి ఎంత?',
        ]
      : [
          'What scholarships are available for college students in Andhra Pradesh?',
          'Which documents are required for Annadata Sukhibhava?',
          'Explain Dr. NTR Vaidya Seva eligibility in simple terms.',
        ];

  const featuredSpotlights = [
    {
      category: 'Education and Scholarships',
      image: '/src/assets/images/category_education_1794558960949.jpg',
      accentBar: 'bg-sky-600',
      kickerColor: 'text-sky-700',
      title:
        language === 'te'
          ? 'విద్య & స్కాలర్‌షిప్‌లు'
          : 'Education & Scholarships',
      desc:
        language === 'te'
          ? 'పోస్ట్-మెట్రిక్ జ్ఞానభూమి ఫీజు రీయింబర్స్‌మెంట్ మరియు పాఠశాల విద్యార్థుల సహాయం.'
          : 'Post-Matric Jnanabhumi fee reimbursement and school student assistance programs.',
    },
    {
      category: 'Agriculture and Farmer Welfare',
      image: '/src/assets/images/category_agriculture_1794558961275.jpg',
      accentBar: 'bg-emerald-600',
      kickerColor: 'text-emerald-700',
      title:
        language === 'te'
          ? 'వ్యవసాయం & రైతు సంక్షేమం'
          : 'Agriculture & Farmer Welfare',
      desc:
        language === 'te'
          ? 'భూమి కలిగిన రైతులు మరియు CCRC కౌలు రైతులకు పెట్టుబడి సహాయం మరియు పత్రాలు.'
          : 'Direct crop investment support, Webland records, and tenant farmer CCRC guidance.',
    },
    {
      category: 'Health and Family Welfare',
      image: '/src/assets/images/category_healthcare_1794558961478.jpg',
      accentBar: 'bg-rose-600',
      kickerColor: 'text-rose-700',
      title:
        language === 'te'
          ? 'ఆరోగ్యం & కుటుంబ సంక్షేమం'
          : 'Health & Family Welfare',
      desc:
        language === 'te'
          ? 'నెట్‌వర్క్ ఆసుపత్రులలో నగదు రహిత వైద్య చికిత్స మరియు ఆరోగ్య కార్డు మార్గదర్శకాలు.'
          : 'Cashless secondary and tertiary treatment guidelines across network hospitals.',
    },
  ];

  const workflowSteps =
    language === 'te'
      ? [
          {
            num: '01.',
            accent: 'text-teal-700',
            dotBg: 'bg-teal-600',
            title: 'ప్రశ్న & భాషా గుర్తింపు',
            body: 'మీరు తెలుగు లేదా ఇంగ్లీష్‌లో అడిగిన ప్రశ్నను సిస్టమ్ గుర్తించి NLP ప్రాసెసింగ్ చేస్తుంది.',
          },
          {
            num: '02.',
            accent: 'text-emerald-700',
            dotBg: 'bg-emerald-600',
            title: 'వెక్టర్ సెర్చ్ & పత్రాల ఎంపిక',
            body: 'ప్రభుత్వ పథకాల రికార్డులు మరియు అప్‌లోడ్ చేసిన PDF పేజీల నుండి సంబంధిత భాగాలను వెతుకుతుంది.',
          },
          {
            num: '03.',
            accent: 'text-amber-700',
            dotBg: 'bg-amber-600',
            title: 'ఆధారభూతమైన AI సమాధానం',
            body: 'ధృవీకరించబడిన సమాచారం ఆధారంగా మాత్రమే Gemini AI సరళమైన సమాధానం ఇస్తుంది.',
          },
          {
            num: '04.',
            accent: 'text-sky-700',
            dotBg: 'bg-sky-600',
            title: 'అధికారిక పత్రాల సూచనలు',
            body: 'ప్రతి సమాధానంతో పాటు సోర్స్ డాక్యుమెంట్ పేరు, పేజీ నంబర్ మరియు అధికారిక పోర్టల్ లింక్ అందుతుంది.',
          },
        ]
      : [
          {
            num: '01.',
            accent: 'text-teal-700',
            dotBg: 'bg-teal-600',
            title: 'Bilingual Query Processing',
            body: 'Automatically detects English or Telugu (తెలుగు) intent and normalizes your scheme question.',
          },
          {
            num: '02.',
            accent: 'text-emerald-700',
            dotBg: 'bg-emerald-600',
            title: 'Semantic Vector Retrieval',
            body: 'Searches indexed Andhra Pradesh scheme guidelines and uploaded PDF chunks using embeddings.',
          },
          {
            num: '03.',
            accent: 'text-amber-700',
            dotBg: 'bg-amber-600',
            title: 'Strictly Grounded LLM Answer',
            body: 'Gemini generates a plain-language explanation constrained strictly to retrieved verified passages.',
          },
          {
            num: '04.',
            accent: 'text-sky-700',
            dotBg: 'bg-sky-600',
            title: 'Source Citations & Official Links',
            body: 'Displays document names, PDF page references, and direct links to official AP government portals.',
          },
        ];

  const citizenShortcuts = [
    {
      icon: Sprout,
      cardBg: 'bg-emerald-50/90 hover:bg-emerald-100/80 border-emerald-200',
      iconBox: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-950',
      label: language === 'te' ? 'రైతు సహాయం' : 'Farmer Help',
      prompt:
        language === 'te'
          ? 'రైతులకు అన్నదాత సుఖీభవ పథకం ఎలా వస్తుంది? ఏ పత్రాలు కావాలి?'
          : 'Explain Annadata Sukhibhava farmer support and required documents in simple words.',
    },
    {
      icon: Users,
      cardBg: 'bg-indigo-50/90 hover:bg-indigo-100/80 border-indigo-200',
      iconBox: 'bg-indigo-600 text-white',
      textColor: 'text-indigo-950',
      label: language === 'te' ? 'పింఛన్' : 'Pension',
      prompt:
        language === 'te'
          ? 'ఎన్టీఆర్ భరోసా వృద్ధాప్య మరియు వితంతు పెన్షన్ వివరాలు చెప్పండి.'
          : 'Explain NTR Bharosa monthly pension eligibility and documents in simple words.',
    },
    {
      icon: HeartPulse,
      cardBg: 'bg-rose-50/90 hover:bg-rose-100/80 border-rose-200',
      iconBox: 'bg-rose-600 text-white',
      textColor: 'text-rose-950',
      label: language === 'te' ? 'ఉచిత వైద్యం' : 'Free Health',
      prompt:
        language === 'te'
          ? 'డాక్టర్ ఎన్టీఆర్ వైద్య సేవ ఉచిత వైద్య చికిత్స ఎలా పొందాలి?'
          : 'How can a family get free cashless treatment under Dr. NTR Vaidya Seva?',
    },
    {
      icon: GraduationCap,
      cardBg: 'bg-sky-50/90 hover:bg-sky-100/80 border-sky-200',
      iconBox: 'bg-sky-600 text-white',
      textColor: 'text-sky-950',
      label: language === 'te' ? 'విద్యార్థి సహాయం' : 'Scholarship',
      prompt:
        language === 'te'
          ? 'కాలేజీ విద్యార్థుల జ్ఞానభూమి స్కాలర్‌షిప్ అర్హత ఏమిటి?'
          : 'Explain AP Post-Matric Jnanabhumi college scholarship in simple words.',
    },
    {
      icon: Flame,
      cardBg: 'bg-amber-50/90 hover:bg-amber-100/80 border-amber-200',
      iconBox: 'bg-amber-600 text-white',
      textColor: 'text-amber-950',
      label: language === 'te' ? 'ఉచిత గ్యాస్' : 'LPG Subsidy',
      prompt:
        language === 'te'
          ? 'దీపం 2.0 ఉచిత గ్యాస్ సిలిండర్ పథకం వివరాలు చెప్పండి.'
          : 'Explain Deepam 2.0 LPG subsidy scheme for women in simple words.',
    },
  ];

  const actionTools = [
    {
      route: 'schemes' as const,
      title: t.navSchemes,
      desc:
        language === 'te'
          ? '7 ప్రధాన విభాగాలలో AP పథకాలను వెతకండి.'
          : 'Browse AP schemes across 7 public welfare categories.',
      iconBg: 'bg-teal-50 text-teal-700',
      badge: `${schemes.length} ${language === 'te' ? 'నమూనా' : 'sample'}`,
      icon: null,
    },
    {
      route: 'eligibility' as const,
      title: t.checkEligibility,
      desc:
        language === 'te'
          ? 'ఆదాయం, వయస్సు, జిల్లా ఆధారంగా ప్రాథమిక తనిఖీ.'
          : 'Preliminary rule-based check with clear guideline breakdown.',
      iconBg: 'bg-emerald-50 text-emerald-700',
      badge: null,
      icon: ShieldCheck,
    },
    {
      route: 'checklist' as const,
      title: t.generateChecklist,
      desc:
        language === 'te'
          ? 'తప్పనిసరి & షరతులతో కూడిన పత్రాల ప్రింటబుల్ జాబితా.'
          : 'Printable and downloadable required document checklists.',
      iconBg: 'bg-amber-50 text-amber-700',
      badge: null,
      icon: FileCheck2,
    },
    {
      route: 'pdf-assistant' as const,
      title: t.navPdf,
      desc:
        language === 'te'
          ? 'ప్రభుత్వ లేఖల ఫోటో తీసి లేదా PDF అప్‌లోడ్ చేసి తెలుగు/ఇంగ్లీష్‌లో వివరణ పొందండి.'
          : 'Snap a photo of any government letter or upload PDFs for clear explanations.',
      iconBg: 'bg-sky-50 text-sky-700',
      badge: null,
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-16 pb-12">
      {/* Section 1: Hero Split + Ask AI */}
      <section className="civic-hero-surface border-b border-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              <p className="text-xs font-semibold text-teal-800 tracking-wide mb-3">
                {t.heroKicker}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-slate-900 tracking-tight leading-[1.15] text-balance">
                {language === 'te' ? (
                  <>
                    ప్రభుత్వ పథకాలను{' '}
                    <span className="text-teal-700">తెలుగు మరియు ఇంగ్లీష్‌లో</span> సులభంగా తెలుసుకోండి.
                  </>
                ) : (
                  <>
                    Understand government schemes clearly in{' '}
                    <span className="text-teal-700">Telugu and English.</span>
                  </>
                )}
              </h1>
              <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-2xl">
                {t.heroSubtitle}
              </p>

              {!citizenUser && (
                <div className="mt-5 p-4 rounded-xl bg-white/90 border border-teal-200 shadow-2xs max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {language === 'te'
                          ? 'ప్రశ్నలు అడగడానికి & పథకాలు చూడటానికి సైన్ ఇన్ అవసరం'
                          : 'Sign in required to ask questions or explore schemes'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'te'
                        ? 'సమగ్ర AP పథకాలు, AI చాట్, అర్హత తనిఖీ మరియు నోటీసు రీడర్‌ను ఉపయోగించడానికి మీ ఉచిత ఖాతాలోకి లాగిన్ అవ్వండి.'
                        : 'Log in or create a free Citizen Account in 30 seconds to ask questions, check scheme eligibility, and save checklists.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate('auth', { authMode: 'login' })}
                      className="px-4 py-2 min-h-[40px] bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {language === 'te' ? 'సైన్ ఇన్' : 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('auth', { authMode: 'register' })}
                      className="px-3.5 py-2 min-h-[40px] bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {language === 'te' ? 'కొత్త ఖాతా' : 'Create Account'}
                    </button>
                  </div>
                </div>
              )}

              {/* Ask AI Form with Microphone Voice Input */}
              <form onSubmit={handleAskSubmit} className="mt-6 max-w-2xl">
                <div className="flex flex-col sm:flex-row gap-2.5 p-2 bg-white border border-teal-200/80 shadow-sm rounded-xl focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/10 transition-all">
                  <div className="flex items-center gap-2.5 flex-1 px-2">
                    <Search className="w-5 h-5 text-teal-700 shrink-0" />
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={t.heroPlaceholder}
                      aria-label={t.heroPlaceholder}
                      className="w-full py-2 text-sm text-slate-900 bg-transparent placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {citizenUser ? (
                      <VoiceRecorderButton
                        language={language}
                        labelVariant="full"
                        onTranscribed={(spokenText, detectedLang) => {
                          setVoiceError(null);
                          setLanguage(detectedLang);
                          navigate('chat', { chatPrompt: spokenText });
                        }}
                        onError={setVoiceError}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('chat')}
                        className="px-3.5 py-2.5 min-h-[44px] text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Mic className="w-4 h-4" />
                        <span>{language === 'te' ? 'వాయిస్' : 'Voice'}</span>
                      </button>
                    )}
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {!citizenUser && <Lock className="w-3.5 h-3.5" />}
                      <span>{t.heroAskBtn}</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
                {voiceError && <p className="mt-2 text-xs text-rose-700">{voiceError}</p>}
              </form>

              {/* 1-Tap Farmer & Citizen Easy Shortcuts */}
              <div className="mt-6 max-w-2xl">
                <p className="text-xs font-semibold text-slate-600 mb-2.5">
                  {language === 'te'
                    ? 'టైప్ చేయకుండా ఒక్క ట్యాప్‌తో తెలుసుకోండి:'
                    : 'One-tap help for farmers & citizens (no typing needed):'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {citizenShortcuts.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.label}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.28,
                          delay: 0.06 * idx,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('chat', { chatPrompt: item.prompt })}
                        className={`flex flex-col items-center justify-center gap-2 px-2.5 py-3 min-h-[78px] border rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center shadow-2xs ${item.cardBg} ${item.textColor}`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-2xs ${item.iconBox}`}
                        >
                          <Icon className="w-4 h-4" strokeWidth={2} />
                        </span>
                        <span>{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Quick sample queries as clean clickable text links */}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">
                  {language === 'te' ? 'ఉదాహరణ ప్రశ్నలు:' : 'Try asking:'}
                </span>
                {sampleQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => navigate('chat', { chatPrompt: q })}
                    className="text-left text-teal-800 hover:text-amber-700 hover:underline cursor-pointer transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5"
            >
              <div className="relative h-full min-h-[280px] rounded-2xl overflow-hidden border border-teal-200/70 shadow-sm bg-teal-950">
                <ResilientImage
                  src="/src/assets/images/hero_civic_portal_1794558959569.jpg"
                  alt="Andhra Pradesh citizen facilitation center desk helping citizens access digital public schemes"
                  fallbackTitle="CivicSahayak Citizen Facilitation"
                  className="w-full h-full lg:h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B252E]/90 via-[#0B252E]/50 to-transparent p-5 pt-14">
                  <p className="text-xs font-medium text-amber-300">
                    {language === 'te'
                      ? 'ఆంధ్రప్రదేశ్ పౌర సహాయ సేవ'
                      : 'Andhra Pradesh Citizen Facilitation'}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">
                    {language === 'te'
                      ? 'వాయిస్ ప్రశ్నలు, అర్హత తనిఖీ & PDF మార్గదర్శనం'
                      : 'Voice Q&A, Eligibility Guidance & Verified PDF Help'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 4-column Action Tools Strip in full-width row below hero split */}
          <div className="mt-10 pt-8 border-t border-teal-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {actionTools.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  key={tool.route}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: 0.1 + idx * 0.05,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ y: -2 }}
                  onClick={() => navigate(tool.route)}
                  className="text-left p-4 rounded-xl border border-slate-200/90 bg-white hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-900 font-semibold text-sm">
                    <span>{tool.title}</span>
                    {tool.badge ? (
                      <span className="font-mono text-xs text-teal-700 font-semibold tabular-nums">
                        {tool.badge}
                      </span>
                    ) : Icon ? (
                      <span className={`p-1.5 rounded-lg ${tool.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{tool.desc}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 1.5: Latest Scholarships (Authenticated) or Brief Capabilities Summary (Logged Out) */}
      {!citizenUser ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-teal-200/80 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xs">
            <div className="space-y-2 max-w-3xl">
              <p className="text-xs font-semibold text-teal-700 inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {language === 'te'
                    ? 'సభ్యుల యాక్సెస్ · పూర్తి పథకాలు & AI సహాయం'
                    : 'Citizen Member Access · Full Schemes & AI Guidance'}
                </span>
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {language === 'te'
                  ? 'ప్రభుత్వ పథకాలు, స్కాలర్‌షిప్ అలర్ట్‌లు మరియు వ్యక్తిగత అర్హత తనిఖీని అన్‌లాక్ చేయండి'
                  : 'Sign in to Explore Schemes, Ask Questions & Check Your Eligibility'}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {language === 'te'
                  ? 'CivicSahayak AI ద్వారా మీరు 18+ AP & కేంద్ర ప్రభుత్వ పథకాలను శోధించవచ్చు, తెలుగు/ఇంగ్లీష్ వాయిస్ ద్వారా ప్రశ్నలు అడగవచ్చు, ప్రభుత్వ లేఖల ఫోటోలను చదవవచ్చు మరియు దరఖాస్తు పత్రాలను ట్రాక్ చేయవచ్చు.'
                  : 'With a free Citizen Account, you can ask questions in Telugu or English, browse 18+ Andhra Pradesh & Central welfare schemes, match your profile across all schemes at once, read government notice photos, and track document checklists.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => navigate('auth', { authMode: 'login' })}
                className="px-5 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{language === 'te' ? 'సైన్ ఇన్ చేయండి' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('auth', { authMode: 'register' })}
                className="px-4 py-2.5 min-h-[44px] bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {language === 'te' ? 'ఉచిత ఖాతా తెరవండి' : 'Create Free Account'}
              </button>
            </div>
          </div>
        </section>
      ) : latestScholarships.length > 0 ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-sky-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-sky-700">
                    {language === 'te'
                      ? 'విద్య & విద్యార్థి సహాయ విభాగం · తాజా జాబితా'
                      : 'Education & Student Support · Latest Records'}
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {language === 'te'
                      ? 'తాజా స్కాలర్‌షిప్‌లు & ఫీజు రీయింబర్స్‌మెంట్'
                      : 'Latest Scholarships & Fee Reimbursement'}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={openScholarshipsModal}
                  className="px-4 py-2 min-h-[40px] text-xs sm:text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BellRing className="w-4 h-4" />
                  <span>
                    {language === 'te'
                      ? 'స్కాలర్‌షిప్‌లు & కొత్త పథకాల అలర్ట్‌లు'
                      : 'Latest Alerts & Pop-Up'}
                    {unseenAlertCount > 0 ? ` (${unseenAlertCount})` : ''}
                  </span>
                </button>
                {browserAlertPermission === 'default' && (
                  <button
                    type="button"
                    onClick={enableBrowserAlerts}
                    className="px-3.5 py-2 min-h-[40px] text-xs sm:text-sm font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    <span>{language === 'te' ? 'అలర్ట్‌లు ఆన్ చేయండి' : 'Enable Alerts'}</span>
                  </button>
                )}
                {browserAlertPermission === 'granted' && (
                  <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1 whitespace-nowrap">
                    <Check className="w-3.5 h-3.5" />
                    <span>{language === 'te' ? 'అలర్ట్‌లు ఆన్‌లో ఉన్నాయి' : 'Alerts Active'}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => navigate('schemes', { schemeSlug: 'Education and Scholarships' })}
                  className="px-3.5 py-2 min-h-[40px] text-xs sm:text-sm font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{language === 'te' ? 'అన్నీ చూడండి' : 'View All'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {alerts.length > 0 && (
              <div className="mt-4 pt-3 border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <p className="truncate max-w-3xl">
                  <span className="font-semibold text-teal-800">
                    {language === 'te' ? 'తాజా అలర్ట్: ' : 'Latest Alert: '}
                  </span>
                  {language === 'te' ? alerts[0].title_te : alerts[0].title_en} ·{' '}
                  <span className="tabular-nums text-slate-500">{alerts[0].published_at}</span>
                </p>
                <button
                  type="button"
                  onClick={openScholarshipsModal}
                  className="font-medium text-teal-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {language === 'te'
                    ? `అన్ని ${alerts.length} అలర్ట్‌లు చూడండి`
                    : `View all ${alerts.length} alerts`}
                </button>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {latestScholarships.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-200 hover:border-sky-300 bg-[#F8FAF9] overflow-hidden flex flex-col justify-between transition-colors"
                >
                  <div className="h-1 w-full bg-sky-600" />
                  <div className="p-4 sm:p-5 space-y-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {s.is_sample
                          ? language === 'te'
                            ? 'నమూనా రికార్డు'
                            : 'Sample Record'
                          : language === 'te'
                          ? 'ధృవీకరించబడింది'
                          : 'Verified'}{' '}
                        · <span className="tabular-nums">{s.last_verified_at}</span>
                      </p>
                      <ReadAloudButton
                        language={language}
                        text={`${language === 'te' ? s.title_te : s.title_en}. ${
                          language === 'te' ? s.short_desc_te : s.short_desc_en
                        }`}
                      />
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-semibold text-slate-900">
                      {language === 'te' ? s.title_te : s.title_en}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {language === 'te' ? s.short_desc_te : s.short_desc_en}
                    </p>
                  </div>

                  <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('scheme-details', { schemeSlug: s.slug })}
                        className="px-3 py-1.5 text-xs font-medium bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {t.viewDetails}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('eligibility', { schemeSlug: s.slug })}
                        className="px-3 py-1.5 text-xs font-medium text-teal-900 bg-white hover:bg-teal-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {t.checkEligibility}
                      </button>
                    </div>
                    <a
                      href={s.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-amber-700 hover:underline whitespace-nowrap shrink-0"
                    >
                      <span>{t.officialPortal}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 2: Featured Category Spotlights + All 7 Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {t.exploreCategoriesTitle}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
              {t.exploreCategoriesDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('schemes')}
            className="text-sm font-semibold text-teal-700 hover:text-amber-700 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <span>{t.heroExploreBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredSpotlights.map((item, idx) => (
            <motion.button
              key={item.category}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              onClick={() => navigate('schemes', { schemeSlug: item.category })}
              className="group text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
            >
              <div className={`h-1 w-full ${item.accentBar}`} />
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <ResilientImage
                  src={item.image}
                  alt={item.title}
                  fallbackTitle={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <p className={`text-xs font-medium ${item.kickerColor}`}>
                  Andhra Pradesh · {language === 'te' ? 'సంక్షేమ విభాగం' : 'Public Welfare'}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* All 7 Categories clean directory bar */}
        <div className="mt-8 bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 mb-3">
            {language === 'te'
              ? 'అన్ని 7 ప్రభుత్వ పథకాల విభాగాలు:'
              : 'All 7 Scheme Categories:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {SCHEME_CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('schemes', { schemeSlug: cat })}
                className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 hover:border-teal-200 rounded-lg transition-colors cursor-pointer"
              >
                {CATEGORY_LABELS[cat][language]}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: How RAG Works + Transparency Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="max-w-2xl mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              {t.howItWorksTitle}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">{t.howItWorksDesc}</p>
          </div>

          {/* Animated RAG Signal Flow */}
          <div className="relative">
            <div className="hidden lg:block relative h-1 bg-slate-100 rounded-full mb-6 overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-teal-600 via-emerald-500 to-amber-500 animate-civic-signal" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {workflowSteps.map((step, idx) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.28, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2 p-4 rounded-xl bg-slate-50/70 border border-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <p className={`font-mono text-sm font-bold tabular-nums ${step.accent}`}>
                      {step.num}
                    </p>
                    <span className={`h-1.5 w-6 rounded-full ${step.dotBg}`} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-8 text-xs sm:text-sm text-amber-950 bg-amber-50/80 rounded-lg p-4 border border-amber-200/80">
            {t.sampleNotice}
          </div>
        </div>
      </section>
    </div>
  );
}

