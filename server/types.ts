export type Language = 'en' | 'te';

export interface DepartmentRecord {
  id: number;
  name_en: string;
  name_te: string;
  code: string;
  official_portal: string;
}

export interface EligibilityRules {
  states: string[];
  minAge?: number;
  maxAge?: number;
  maxAnnualIncomeInr?: number;
  allowedOccupations?: string[];
  educationLevels?: string[];
  gender?: 'all' | 'female' | 'male';
  maxWetLandAcres?: number;
  maxDryLandAcres?: number;
  notes_en: string[];
  notes_te: string[];
}

export interface DocumentRequirement {
  id: string;
  name_en: string;
  name_te: string;
  required: boolean;
  condition_en?: string;
  condition_te?: string;
  instructions_en: string;
  instructions_te: string;
  source_reference: string;
}

export interface SchemeRecord {
  id: number;
  slug: string;
  title_en: string;
  title_te: string;
  category: string;
  state: string;
  scheme_status: 'active' | 'previous';
  department_id: number;
  department_name_en?: string;
  department_name_te?: string;
  short_desc_en: string;
  short_desc_te: string;
  eligibility_summary_en: string;
  eligibility_summary_te: string;
  eligibility_rules: EligibilityRules;
  documents: DocumentRequirement[];
  application_steps_en: string[];
  application_steps_te: string[];
  benefit_summary_en: string;
  benefit_summary_te: string;
  official_url: string;
  source_document_name: string;
  last_verified_at: string;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadedDocumentRecord {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  page_count: number;
  scheme_id: number | null;
  source_type: 'citizen_pdf' | 'admin_notification';
  status: 'indexed' | 'processing' | 'failed';
  chunk_count?: number;
  created_at: string;
}

export interface RagCitation {
  chunkId: number;
  sourceType: 'scheme' | 'pdf';
  title: string;
  documentName: string;
  pageNumber: number | null;
  schemeSlug?: string;
  officialUrl?: string;
  isSample: boolean;
  snippet: string;
  score: number;
}

export interface RagChatResult {
  answer: string;
  detectedLanguage: Language;
  hasVerifiedContext: boolean;
  citations: RagCitation[];
  modelUsed: string;
  latencyMs: number;
}

export interface EligibilityInput {
  schemeId: number;
  age: number;
  state: string;
  district: string;
  educationLevel: string;
  occupation: string;
  annualIncomeInr: number;
  gender: 'female' | 'male' | 'other';
  landAcres?: number;
  hasRationOrRiceCard?: boolean;
  language: Language;
}

export interface EligibilityCheckResult {
  schemeId: number;
  schemeTitle: string;
  preliminaryStatus: 'likely_eligible' | 'needs_review' | 'likely_not_eligible';
  satisfied: string[];
  notSatisfied: string[];
  additionalInfoRequired: string[];
  relevantGuidelines: string[];
  officialUrl: string;
  sourceDocumentName: string;
  isSample: boolean;
  aiSummary?: string;
  disclaimer: string;
}

export interface MultiSchemeMatchInput {
  age: number;
  state: string;
  district: string;
  educationLevel: string;
  occupation: string;
  annualIncomeInr: number;
  gender: 'female' | 'male' | 'other';
  landAcres?: number;
  hasRationOrRiceCard?: boolean;
  includePrevious?: boolean;
  language: Language;
}

export interface MultiSchemeMatchItem {
  schemeId: number;
  slug: string;
  title_en: string;
  title_te: string;
  category: string;
  state: string;
  scheme_status: 'active' | 'previous';
  benefit_summary_en: string;
  benefit_summary_te: string;
  official_url: string;
  is_sample: boolean;
  matchStatus: 'likely_eligible' | 'needs_review' | 'likely_not_eligible';
  matchedChecks: number;
  totalChecks: number;
  matchScore: number;
  matchedReasons: string[];
  unmetReasons: string[];
  missingInfo: string[];
}

export interface MultiSchemeMatchResult {
  totalEvaluated: number;
  eligibleCount: number;
  reviewCount: number;
  results: MultiSchemeMatchItem[];
  disclaimer: string;
}

export interface SchemeAlertRecord {
  id: number;
  title_en: string;
  title_te: string;
  category: string;
  summary_en: string;
  summary_te: string;
  source_url: string;
  alert_type: 'new_scheme' | 'scholarship' | 'live_update' | 'pdf_notification';
  published_at: string;
  is_sample: boolean;
  created_at: string;
}

export interface CitizenRecord {
  id: number;
  full_name: string;
  email: string;
  district: string;
  occupation: string;
  preferred_language: Language;
  created_at: string;
}

export interface NoticeImageAnalysisResult {
  documentType: string;
  summary: string;
  keyDetails: string[];
  requiredActions: string[];
  importantDates: string[];
  extractedText: string;
  language: Language;
  modelUsed: string;
  disclaimer: string;
}

export type ApplicationStage = 'collecting_docs' | 'applied' | 'kyc_verification' | 'approved';

export interface TrackedApplicationRecord {
  id: number;
  owner_key: string;
  scheme_id: number;
  scheme_slug: string;
  scheme_title_en: string;
  scheme_title_te: string;
  scheme_category: string;
  official_url: string;
  total_documents: number;
  stage: ApplicationStage;
  checked_doc_ids: string[];
  notes: string;
  application_ref: string;
  updated_at: string;
  created_at: string;
}



