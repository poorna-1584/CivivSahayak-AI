import type { Language } from '../types';

export const SCHEME_CATEGORIES = [
  'Education and Scholarships',
  'Agriculture and Farmer Welfare',
  'Health and Family Welfare',
  'Women and Child Welfare',
  'Employment and Skill Development',
  'Social Welfare',
  'Other Public Services',
] as const;

export const CATEGORY_LABELS: Record<string, { en: string; te: string }> = {
  All: { en: 'All Categories', te: 'అన్ని వర్గాలు' },
  'Education and Scholarships': {
    en: 'Education and Scholarships',
    te: 'విద్య మరియు స్కాలర్‌షిప్‌లు',
  },
  'Agriculture and Farmer Welfare': {
    en: 'Agriculture and Farmer Welfare',
    te: 'వ్యవసాయం మరియు రైతు సంక్షేమం',
  },
  'Health and Family Welfare': {
    en: 'Health and Family Welfare',
    te: 'ఆరోగ్యం మరియు కుటుంబ సంక్షేమం',
  },
  'Women and Child Welfare': {
    en: 'Women and Child Welfare',
    te: 'మహిళా మరియు శిశు సంక్షేమం',
  },
  'Employment and Skill Development': {
    en: 'Employment and Skill Development',
    te: 'ఉపాధి మరియు నైపుణ్యాభివృద్ధి',
  },
  'Social Welfare': {
    en: 'Social Welfare',
    te: 'సామాజిక సంక్షేమం',
  },
  'Other Public Services': {
    en: 'Other Public Services',
    te: 'ఇతర ప్రజా సేవలు',
  },
};

export const AP_DISTRICTS = [
  'Alluri Sitharama Raju',
  'Anakapalli',
  'Ananthapuramu',
  'Annamayya',
  'Bapatla',
  'Chittoor',
  'Dr. B.R. Ambedkar Konaseema',
  'East Godavari',
  'Eluru',
  'Guntur',
  'Kakinada',
  'Krishna',
  'Kurnool',
  'Nandyal',
  'NTR',
  'Palnadu',
  'Parvathipuram Manyam',
  'Prakasam',
  'Sri Potti Sriramulu Nellore',
  'Sri Sathya Sai',
  'Srikakulam',
  'Tirupati',
  'Visakhapatnam',
  'Vizianagaram',
  'West Godavari',
  'YSR Kadapa',
];

export const APPLICATION_STAGES = [
  {
    id: 'collecting_docs',
    en: 'Collecting Docs',
    te: 'పత్రాలు సిద్ధం',
  },
  {
    id: 'applied',
    en: 'Applied',
    te: 'దరఖాస్తు చేశాను',
  },
  {
    id: 'kyc_verification',
    en: 'e-KYC / Check',
    te: 'e-KYC / పరిశీలన',
  },
  {
    id: 'approved',
    en: 'Approved',
    te: 'ఆమోదించబడింది',
  },
] as const;

export const UI_TEXT: Record<
  Language,
  {
    brand: string;
    navSchemes: string;
    navChat: string;
    navEligibility: string;
    navChecklist: string;
    navPdf: string;
    switchLanguage: string;
    heroKicker: string;
    heroTitle: string;
    heroSubtitle: string;
    heroPlaceholder: string;
    heroAskBtn: string;
    heroExploreBtn: string;
    sampleNotice: string;
    exploreCategoriesTitle: string;
    exploreCategoriesDesc: string;
    howItWorksTitle: string;
    howItWorksDesc: string;
    footerDashboard: string;
    footerAbout: string;
    footerAdmin: string;
    footerDisclaimer: string;
    chatTitle: string;
    chatSubtitle: string;
    chatPlaceholder: string;
    chatSend: string;
    chatThinking: string;
    chatCitationsTitle: string;
    chatNoContextHint: string;
    schemesTitle: string;
    schemesSubtitle: string;
    searchPlaceholder: string;
    viewDetails: string;
    checkEligibility: string;
    generateChecklist: string;
    officialPortal: string;
    eligibilityTitle: string;
    eligibilitySubtitle: string;
    evaluateBtn: string;
    checklistTitle: string;
    checklistSubtitle: string;
    printChecklist: string;
    downloadChecklist: string;
    pdfTitle: string;
    pdfSubtitle: string;
    uploadPdfBtn: string;
    askPdfPlaceholder: string;
    dashboardTitle: string;
    dashboardSubtitle: string;
    adminLoginTitle: string;
    aboutTitle: string;
  }
> = {
  en: {
    brand: 'CivicSahayak AI',
    navSchemes: 'Schemes',
    navChat: 'AI Chat',
    navEligibility: 'Eligibility',
    navChecklist: 'Checklists',
    navPdf: 'Notice & PDF',
    switchLanguage: 'తెలుగు',
    heroKicker: 'Andhra Pradesh Public Services · Multilingual RAG Assistant',
    heroTitle: 'Understand government schemes clearly in Telugu and English.',
    heroSubtitle:
      'Ask questions about Andhra Pradesh scholarships, farmer support, healthcare, pensions, and uploaded government PDF notifications—grounded in verified records with source references.',
    heroPlaceholder: 'Ask about AP scholarships, eligibility, required documents, or deadlines...',
    heroAskBtn: 'Ask AI Assistant',
    heroExploreBtn: 'Explore Schemes',
    sampleNotice:
      'Transparency Notice: Pre-loaded scheme entries are clearly labelled sample knowledge-base records for academic and citizen guidance. Always confirm final dates and GO circulars on official government portals.',
    exploreCategoriesTitle: 'Scheme Categories',
    exploreCategoriesDesc:
      'Browse organized public welfare schemes across seven Andhra Pradesh service sectors.',
    howItWorksTitle: 'How CivicSahayak RAG Works',
    howItWorksDesc:
      'Every answer follows a grounded Retrieval-Augmented Generation pipeline to prevent fabricated scheme rules.',
    footerDashboard: 'Citizen Dashboard',
    footerAbout: 'About & Architecture',
    footerAdmin: 'Admin Portal',
    footerDisclaimer:
      'CivicSahayak AI provides AI-assisted citizen guidance and preliminary checks only. It is not an official government portal or approval authority.',
    chatTitle: 'AI Government Schemes Assistant',
    chatSubtitle:
      'Ask in English or Telugu (తెలుగు). Responses are grounded in retrieved scheme guidelines and indexed PDFs.',
    chatPlaceholder: 'Type your question in English or తెలుగు...',
    chatSend: 'Send Question',
    chatThinking: 'Retrieving guidelines and generating response...',
    chatCitationsTitle: 'Retrieved Source References',
    chatNoContextHint: 'No matching verified record was found in the knowledge base.',
    schemesTitle: 'Explore Government Schemes',
    schemesSubtitle:
      'Search Andhra Pradesh schemes by category, review eligibility summaries, required documents, and official links.',
    searchPlaceholder: 'Search schemes by name, department, or keyword...',
    viewDetails: 'View Scheme Details',
    checkEligibility: 'Check Eligibility',
    generateChecklist: 'Document Checklist',
    officialPortal: 'Official Portal',
    eligibilityTitle: 'Smart Preliminary Eligibility Checker',
    eligibilitySubtitle:
      'Compare your basic profile against published scheme guidelines. We do not store unnecessary personal details.',
    evaluateBtn: 'Run Preliminary Check',
    checklistTitle: 'Document Checklist Generator',
    checklistSubtitle:
      'Generate a printable and downloadable list of required and conditional documents from official scheme guidelines.',
    printChecklist: 'Print Checklist',
    downloadChecklist: 'Download (.txt)',
    pdfTitle: 'Photo Notice & PDF Reader',
    pdfSubtitle:
      'Snap or upload a photo of any government letter, GO circular, or SMS—or upload an official PDF notification—to understand it in plain English or Telugu with voice playback.',
    uploadPdfBtn: 'Upload & Index PDF',
    askPdfPlaceholder: 'Ask about eligibility, dates, or clauses in this PDF...',
    dashboardTitle: 'Citizen Workspace Dashboard',
    dashboardSubtitle:
      'Quick access to your bookmarked schemes, recent questions, and multilingual self-service tools.',
    adminLoginTitle: 'Administrator Sign In',
    aboutTitle: 'About CivicSahayak AI & RAG Architecture',
  },
  te: {
    brand: 'CivicSahayak AI',
    navSchemes: 'పథకాలు',
    navChat: 'AI చాట్',
    navEligibility: 'అర్హత',
    navChecklist: 'పత్రాలు',
    navPdf: 'నోటీసు & PDF',
    switchLanguage: 'English',
    heroKicker: 'ఆంధ్రప్రదేశ్ ప్రజా సేవలు · తెలుగు & ఇంగ్లీష్ RAG సహాయకుడు',
    heroTitle: 'ప్రభుత్వ పథకాలను తెలుగు మరియు ఇంగ్లీష్‌లో సులభంగా తెలుసుకోండి.',
    heroSubtitle:
      'ఆంధ్రప్రదేశ్ స్కాలర్‌షిప్‌లు, రైతు సహాయం, ఆరోగ్య బీమా, పెన్షన్లు మరియు ప్రభుత్వ PDF నోటిఫికేషన్ల గురించి అడగండి—ఆధారాలతో కూడిన స్పష్టమైన సమాధానాలు పొందండి.',
    heroPlaceholder: 'స్కాలర్‌షిప్‌లు, అర్హత, అవసరమైన పత్రాలు లేదా చివరి తేదీల గురించి అడగండి...',
    heroAskBtn: 'AI ని అడగండి',
    heroExploreBtn: 'పథకాలు చూడండి',
    sampleNotice:
      'ముఖ్య గమనిక: ప్రస్తుతం ఉన్న పథకాల వివరాలు విద్యా/మార్గదర్శక నమూనా (Sample) రికార్డులుగా గుర్తించబడ్డాయి. దరఖాస్తు చేసే ముందు అధికారిక ప్రభుత్వ వెబ్‌సైట్‌లలో తుది తేదీలను నిర్ధారించుకోండి.',
    exploreCategoriesTitle: 'ప్రభుత్వ పథకాల విభాగాలు',
    exploreCategoriesDesc:
      'ఆంధ్రప్రదేశ్ ఏడు ప్రధాన ప్రజా సంక్షేమ విభాగాలలో పథకాలను శోధించండి.',
    howItWorksTitle: 'CivicSahayak RAG ఎలా పనిచేస్తుంది',
    howItWorksDesc:
      'ఊహాజనిత సమాచారం లేకుండా ప్రతి సమాధానం ఆధారభూతమైన పత్రాల నుండి రూపొందించబడుతుంది.',
    footerDashboard: 'పౌర డాష్‌బోర్డ్',
    footerAbout: 'ప్రాజెక్ట్ & ఆర్కిటెక్చర్',
    footerAdmin: 'అడ్మిన్ పోర్టల్',
    footerDisclaimer:
      'CivicSahayak AI కేవలం పౌరుల అవగాహన మరియు ప్రాథమిక తనిఖీ కోసం మాత్రమే. ఇది అధికారిక ప్రభుత్వ ఆమోద పోర్టల్ కాదు.',
    chatTitle: 'AI ప్రభుత్వ పథకాల సహాయకుడు',
    chatSubtitle:
      'తెలుగు లేదా ఇంగ్లీష్‌లో ప్రశ్నలు అడగండి. సమాధానాలు ధృవీకరించిన పత్రాల ఆధారంగా అందించబడతాయి.',
    chatPlaceholder: 'మీ ప్రశ్నను తెలుగు లేదా ఇంగ్లీష్‌లో టైప్ చేయండి...',
    chatSend: 'పంపండి',
    chatThinking: 'పత్రాలను పరిశీలించి సమాధానం సిద్ధం చేస్తోంది...',
    chatCitationsTitle: 'ఆధార పత్రాల సూచనలు',
    chatNoContextHint: 'నాలెడ్జ్ బేస్‌లో సరిపోయే ధృవీకరించబడిన సమాచారం కనుగొనబడలేదు.',
    schemesTitle: 'ప్రభుత్వ పథకాలను అన్వేషించండి',
    schemesSubtitle:
      'విభాగం వారీగా ఆంధ్రప్రదేశ్ పథకాలు, అర్హత, అవసరమైన పత్రాలు మరియు అధికారిక లింక్‌లను చూడండి.',
    searchPlaceholder: 'పథకం పేరు, శాఖ లేదా కీవర్డ్ ద్వారా వెతకండి...',
    viewDetails: 'పూర్తి వివరాలు',
    checkEligibility: 'అర్హత తనిఖీ',
    generateChecklist: 'పత్రాల జాబితా',
    officialPortal: 'అధికారిక పోర్టల్',
    eligibilityTitle: 'స్మార్ట్ ప్రాథమిక అర్హత తనిఖీ',
    eligibilitySubtitle:
      'ప్రచురించబడిన పథక నిబంధనలతో మీ వివరాలను సరిపోల్చండి. వ్యక్తిగత సమాచారం సేవ్ చేయబడదు.',
    evaluateBtn: 'ప్రాథమిక అర్హత తనిఖీ చేయండి',
    checklistTitle: 'అవసరమైన పత్రాల జాబితా (Checklist)',
    checklistSubtitle:
      'పథకం మార్గదర్శకాల ప్రకారం తప్పనిసరి మరియు షరతులతో కూడిన పత్రాల జాబితాను ప్రింట్ లేదా డౌన్‌లోడ్ చేయండి.',
    printChecklist: 'ప్రింట్ చేయండి',
    downloadChecklist: 'డౌన్‌లోడ్ (.txt)',
    pdfTitle: 'ఫోటో నోటీసు & ప్రభుత్వ PDF సహాయకుడు',
    pdfSubtitle:
      'ప్రభుత్వ లేఖ, నోటీసు ఫోటో తీయండి లేదా అప్‌లోడ్ చేయండి—లేదా PDF నోటిఫికేషన్ అప్‌లోడ్ చేసి తెలుగు లేదా ఇంగ్లీష్‌లో సరళమైన వివరణ మరియు వాయిస్ ద్వారా వినండి.',
    uploadPdfBtn: 'PDF అప్‌లోడ్ & ఇండెక్స్ చేయండి',
    askPdfPlaceholder: 'ఈ PDF లోని అర్హత, తేదీలు లేదా నిబంధనల గురించి అడగండి...',
    dashboardTitle: 'పౌర వర్క్‌స్పేస్ డాష్‌బోర్డ్',
    dashboardSubtitle:
      'మీరు సేవ్ చేసిన పథకాలు, ఇటీవలి ప్రశ్నలు మరియు ముఖ్య సాధనాలకు సులభ ప్రవేశం.',
    adminLoginTitle: 'అడ్మినిస్ట్రేటర్ లాగిన్',
    aboutTitle: 'CivicSahayak AI & RAG నిర్మాణ వివరాలు',
  },
};
