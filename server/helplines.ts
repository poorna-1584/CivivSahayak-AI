import type { Language } from './types.ts';

export interface OfficialHelpline {
  id: string;
  name_en: string;
  name_te: string;
  phone: string;
  tel_href: string;
  category: 'general' | 'health' | 'agriculture' | 'scholarships' | 'identity';
  hours_en: string;
  hours_te: string;
  purpose_en: string;
  purpose_te: string;
  official_url: string;
  toll_free: boolean;
}

export interface LocalServiceCenterGuide {
  id: string;
  type_en: string;
  type_te: string;
  handles_en: string[];
  handles_te: string[];
  official_url: string;
  maps_query_template: string;
}

export const AP_OFFICIAL_HELPLINES: OfficialHelpline[] = [
  {
    id: 'ap-spandana-1902',
    name_en: 'AP Citizen Grievance & Welfare Helpline (1902)',
    name_te: 'ఆంధ్రప్రదేశ్ ప్రజా ఫిర్యాదులు & సంక్షేమ హెల్ప్‌లైన్ (1902)',
    phone: '1902',
    tel_href: 'tel:1902',
    category: 'general',
    hours_en: '24x7 Toll-Free',
    hours_te: '24x7 ఉచిత కాల్',
    purpose_en:
      'Report delays in NTR Bharosa pensions, Rice Card, Deepam 2.0, Sachivalayam services, or state scheme grievances.',
    purpose_te:
      'ఎన్టీఆర్ భరోసా పెన్షన్లు, రైస్ కార్డు, దీపం 2.0 మరియు గ్రామ/వార్డు సచివాలయ సేవల ఫిర్యాదుల కోసం.',
    official_url: 'https://gramawardsachivalayam.ap.gov.in',
    toll_free: true,
  },
  {
    id: 'ap-vaidya-seva-104',
    name_en: 'Dr. NTR Vaidya Seva & 104 Medical Helpline',
    name_te: 'డా. ఎన్టీఆర్ వైద్య సేవ & 104 ఆరోగ్య హెల్ప్‌లైన్',
    phone: '104',
    tel_href: 'tel:104',
    category: 'health',
    hours_en: '24x7 Medical Guidance',
    hours_te: '24x7 వైద్య సహాయం',
    purpose_en:
      'Find network hospitals, cashless Aarogyasri / NTR Vaidya Seva pre-authorization status, and emergency medical guidance.',
    purpose_te:
      'నెట్‌వర్క్ ఆసుపత్రులు, ఉచిత ఆరోగ్యశ్రీ / ఎన్టీఆర్ వైద్య సేవ చికిత్స స్థితి మరియు వైద్య సలహాల కోసం.',
    official_url: 'https://drntrvaidyaseva.ap.gov.in',
    toll_free: true,
  },
  {
    id: 'pm-kisan-farmer',
    name_en: 'PM-KISAN & Farmer Welfare Helpline',
    name_te: 'పీఎం-కిసాన్ & రైతు సంక్షేమ హెల్ప్‌లైన్',
    phone: '155261',
    tel_href: 'tel:155261',
    category: 'agriculture',
    hours_en: 'Mon–Sat · Working Hours',
    hours_te: 'సోమ–శని · పని వేళలు',
    purpose_en:
      'Verify PM-KISAN / Annadata Sukhibhava installment status, e-KYC issues, and land seeding checks.',
    purpose_te:
      'పీఎం-కిసాన్ / అన్నదాత సుఖీభవ విడతల స్థితి, e-KYC మరియు భూమి లింక్ వివరాల కోసం.',
    official_url: 'https://pmkisan.gov.in',
    toll_free: true,
  },
  {
    id: 'kisan-call-center',
    name_en: 'Kisan Call Centre (Agriculture Advisory)',
    name_te: 'కిసాన్ కాల్ సెంటర్ (వ్యవసాయ సలహా కేంద్రం)',
    phone: '1800-180-1551',
    tel_href: 'tel:18001801551',
    category: 'agriculture',
    hours_en: '6:00 AM – 10:00 PM Daily',
    hours_te: 'ప్రతిరోజూ ఉదయం 6 – రాత్రి 10',
    purpose_en:
      'Speak in Telugu with agricultural experts regarding crops, soil health, insurance (e-Panta / PMFBY), and subsidies.',
    purpose_te:
      'పంటలు, మట్టి ఆరోగ్యం, పంట బీమా మరియు వ్యవసాయ రాయితీలపై తెలుగులో నిపుణుల సలహాలు.',
    official_url: 'https://apagrisnet.gov.in',
    toll_free: true,
  },
  {
    id: 'nsp-scholarships',
    name_en: 'National Scholarship Portal (NSP) Helpdesk',
    name_te: 'నేషనల్ స్కాలర్‌షిప్ పోర్టల్ (NSP) హెల్ప్‌డెస్క్',
    phone: '0120-6619540',
    tel_href: 'tel:01206619540',
    category: 'scholarships',
    hours_en: 'Mon–Fri · 9:00 AM – 6:00 PM',
    hours_te: 'సోమ–శుక్ర · ఉదయం 9 – సాయంత్రం 6',
    purpose_en:
      'Central Ministry & AICTE scholarship verification, OTR (One Time Registration), and PFMS disbursement queries.',
    purpose_te:
      'కేంద్ర ప్రభుత్వ & AICTE స్కాలర్‌షిప్‌లు, OTR మరియు PFMS చెల్లింపుల సందేహాల కోసం.',
    official_url: 'https://scholarships.gov.in',
    toll_free: false,
  },
  {
    id: 'ap-jnanabhumi-edu',
    name_en: 'AP Jnanabhumi Post-Matric Scholarship Portal',
    name_te: 'AP జ్ఞానభూమి పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్ సహాయ కేంద్రం',
    phone: '1902',
    tel_href: 'tel:1902',
    category: 'scholarships',
    hours_en: 'Portal Support & Citizen Cell',
    hours_te: 'పోర్టల్ సహాయం & సచివాలయ సెల్',
    purpose_en:
      'College fee reimbursement, biometric attendance verification, and student bank NPCI mapping support.',
    purpose_te:
      'కళాశాల ఫీజు రీయింబర్స్‌మెంట్, బయోమెట్రిక్ హాజరు మరియు బ్యాంకు NPCI అనుసంధాన సమస్యల కోసం.',
    official_url: 'https://jnanabhumi.ap.gov.in',
    toll_free: true,
  },
  {
    id: 'uidai-aadhaar-1947',
    name_en: 'Aadhaar (UIDAI) & Biometric Update Helpline',
    name_te: 'ఆధార్ (UIDAI) & బయోమెట్రిక్ అప్‌డేట్ హెల్ప్‌లైన్',
    phone: '1947',
    tel_href: 'tel:1947',
    category: 'identity',
    hours_en: '24x7 IVR · Multi-language',
    hours_te: '24x7 సేవలు · తెలుగులో అందుబాటు',
    purpose_en:
      'Locate nearest Aadhaar center, mobile number seeding status, and biometric update tracking required for all AP schemes.',
    purpose_te:
      'సమీప ఆధార్ కేంద్రం, మొబైల్ నంబర్ లింక్ మరియు బయోమెట్రిక్ అప్‌డేట్ వివరాల కోసం.',
    official_url: 'https://myaadhaar.uidai.gov.in',
    toll_free: true,
  },
  {
    id: 'women-emergency-181',
    name_en: 'Women Helpline & Emergency Support (181 / 112)',
    name_te: 'మహిళా హెల్ప్‌లైన్ & అత్యవసర సహాయం (181 / 112)',
    phone: '181',
    tel_href: 'tel:181',
    category: 'general',
    hours_en: '24x7 Emergency & Welfare Support',
    hours_te: '24x7 అత్యవసర & మహిళా సహాయం',
    purpose_en:
      'Immediate support for women safety, SHG/DWACRA linkage guidance, and emergency police/medical dispatch (112).',
    purpose_te:
      'మహిళా భద్రత, డ్వాక్రా/సహాయక మార్గదర్శకత్వం మరియు అత్యవసర పోలీస్/వైద్య సహాయం కోసం.',
    official_url: 'https://wdcw.ap.gov.in',
    toll_free: true,
  },
];

export const LOCAL_CENTER_GUIDES: LocalServiceCenterGuide[] = [
  {
    id: 'sachivalayam',
    type_en: 'Grama / Ward Sachivalayam',
    type_te: 'గ్రామ / వార్డు సచివాలయం',
    handles_en: [
      'Aadhaar e-KYC & biometric verification',
      'NTR Bharosa Pensions & Deepam 2.0 LPG verification',
      'AP Rice Card additions & household income updates',
    ],
    handles_te: [
      'ఆధార్ e-KYC మరియు బయోమెట్రిక్ ధృవీకరణ',
      'ఎన్టీఆర్ భరోసా పెన్షన్ & దీపం 2.0 ఉచిత గ్యాస్ పరిశీలన',
      'రైస్ కార్డు మార్పులు & కుటుంబ ఆదాయ ధృవీకరణ',
    ],
    official_url: 'https://gramawardsachivalayam.ap.gov.in',
    maps_query_template: 'Grama Ward Sachivalayam {AREA} {DISTRICT} Andhra Pradesh',
  },
  {
    id: 'rsk',
    type_en: 'Rythu Seva Kendra (RSK / RBK)',
    type_te: 'రైతు సేవా కేంద్రం (RSK)',
    handles_en: [
      'Annadata Sukhibhava & PM-KISAN farmer registration',
      'e-Crop booking & CCRC tenant farmer cards',
      'Certified seeds, fertilizers, and crop insurance assistance',
    ],
    handles_te: [
      'అన్నదాత సుఖీభవ & పీఎం-కిసాన్ రైతు నమోదు',
      'ఈ-క్రాప్ నమోదు & కౌలు రైతు CCRC కార్డులు',
      'విత్తనాలు, ఎరువులు మరియు పంట బీమా సహాయం',
    ],
    official_url: 'https://apagrisnet.gov.in',
    maps_query_template: 'Rythu Bharosa Kendra Rythu Seva Kendra {AREA} {DISTRICT} Andhra Pradesh',
  },
  {
    id: 'meeseva',
    type_en: 'AP MeeSeva Citizen Center',
    type_te: 'ఆంధ్రప్రదేశ్ మీసేవా కేంద్రం',
    handles_en: [
      'Income, Caste / EWS & Residence Certificates',
      'Land Adangal, 1-B extracts & Encumbrance Certificates',
      'Birth / Death certificates and citizen service receipts',
    ],
    handles_te: [
      'ఆదాయ, కుల (Caste / EWS) & నివాస ధృవపత్రాలు',
      'భూమి అడంగల్, 1-B మరియు EC పత్రాలు',
      'జనన / మరణ ధృవపత్రాలు & ఇతర మీసేవా సేవలు',
    ],
    official_url: 'https://ap.meeseva.gov.in',
    maps_query_template: 'MeeSeva Center {AREA} {DISTRICT} Andhra Pradesh',
  },
  {
    id: 'collectorate',
    type_en: 'District Collectorate & Grievance Cell',
    type_te: 'జిల్లా కలెక్టరేట్ & ప్రజా ఫిర్యాదుల విభాగం',
    handles_en: [
      'Escalated Spandana / PGMS welfare grievances',
      'District Social Welfare & Backward Classes offices',
      'Higher-level scholarship & land dispute redressal',
    ],
    handles_te: [
      'జిల్లా స్థాయి ప్రజా ఫిర్యాదుల పరిష్కార విభాగం',
      'జిల్లా సాంఘిక సంక్షేమ & బీసీ సంక్షేమ కార్యాలయాలు',
      'స్కాలర్‌షిప్ & భూమి సమస్యల ఉన్నత స్థాయి పరిశీలన',
    ],
    official_url: 'https://www.ap.gov.in',
    maps_query_template: 'District Collectorate {DISTRICT} Andhra Pradesh',
  },
];

export function buildCenterMapsUrl(template: string, district: string, area?: string): string {
  const cleanArea = (area || '').trim();
  const query = template
    .replace('{AREA}', cleanArea)
    .replace('{DISTRICT}', district.trim())
    .replace(/\s+/g, ' ')
    .trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function filterHelplines(category?: string, language: Language = 'en') {
  const normalized = (category || 'all').toLowerCase();
  const helplines =
    normalized === 'all'
      ? AP_OFFICIAL_HELPLINES
      : AP_OFFICIAL_HELPLINES.filter((h) => h.category === normalized);
  return {
    language,
    helplines,
    centers: LOCAL_CENTER_GUIDES,
  };
}
