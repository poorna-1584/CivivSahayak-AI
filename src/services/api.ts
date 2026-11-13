import axios from 'axios';
import type {
  AdminStats,
  ApplicationStage,
  CitizenUser,
  Department,
  EligibilityResult,
  HelplinesDirectoryResponse,
  Language,
  LiveScholarshipUpdate,
  MultiSchemeMatchResult,
  NoticeImageAnalysisResult,
  QueryLogItem,
  RagChatResponse,
  Scheme,
  SchemeAlert,
  TrackedApplication,
  UploadedDocument,
} from '../types';

const TOKEN_KEY = 'civicsahayak_admin_token';
const CITIZEN_TOKEN_KEY = 'civicsahayak_citizen_token';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 45000,
});

apiClient.interceptors.request.use((config) => {
  const url = config.url || '';
  if (url.startsWith('/auth') || url.startsWith('/tracker')) {
    const citizenToken = localStorage.getItem(CITIZEN_TOKEN_KEY);
    if (citizenToken) {
      config.headers.Authorization = `Bearer ${citizenToken}`;
    }
  } else {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function setAdminToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setCitizenToken(token: string | null): void {
  if (token) {
    localStorage.setItem(CITIZEN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(CITIZEN_TOKEN_KEY);
  }
}

export function getCitizenToken(): string | null {
  return localStorage.getItem(CITIZEN_TOKEN_KEY);
}

export function extractApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (err.message) return err.message;
  }
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

export const api = {
  async getHealth() {
    const res = await apiClient.get('/health');
    return res.data;
  },

  async getDepartments(): Promise<Department[]> {
    const res = await apiClient.get<{ departments: Department[] }>('/departments');
    return res.data.departments;
  },

  async getHelplines(params?: {
    district?: string;
    area?: string;
    category?: string;
    language?: Language;
  }): Promise<HelplinesDirectoryResponse> {
    const res = await apiClient.get<HelplinesDirectoryResponse>('/helplines', { params });
    return res.data;
  },

  async getSchemes(params?: {
    search?: string;
    category?: string;
    state?: string;
    status?: string;
  }): Promise<Scheme[]> {
    const res = await apiClient.get<{ schemes: Scheme[] }>('/schemes', { params });
    return res.data.schemes;
  },

  async getScheme(idOrSlug: string | number): Promise<Scheme> {
    const res = await apiClient.get<{ scheme: Scheme }>(`/schemes/${idOrSlug}`);
    return res.data.scheme;
  },

  async getLiveScholarshipUpdates(language: Language): Promise<LiveScholarshipUpdate> {
    const res = await apiClient.post<LiveScholarshipUpdate>('/scholarships/live-updates', {
      language,
    });
    return res.data;
  },

  async getAlerts(): Promise<{ alerts: SchemeAlert[]; latestAlertId: number; serverTime: string }> {
    const res = await apiClient.get<{
      alerts: SchemeAlert[];
      latestAlertId: number;
      serverTime: string;
    }>('/alerts');
    return res.data;
  },

  async checkLiveSchemeAlerts(
    language: Language,
    focus: 'all' | 'scholarships' = 'all'
  ): Promise<LiveScholarshipUpdate> {
    const res = await apiClient.post<LiveScholarshipUpdate>('/alerts/check-live', {
      language,
      focus,
    });
    return res.data;
  },

  async checkEligibility(payload: {
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
  }): Promise<EligibilityResult> {
    const res = await apiClient.post<EligibilityResult>('/eligibility/check', payload);
    return res.data;
  },

  async matchAllSchemes(payload: {
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
  }): Promise<MultiSchemeMatchResult> {
    const res = await apiClient.post<MultiSchemeMatchResult>('/eligibility/match-all', payload);
    return res.data;
  },

  async askChatbot(payload: {
    question: string;
    language: Language;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    sessionId?: string;
  }): Promise<RagChatResponse> {
    const res = await apiClient.post<RagChatResponse>('/chat', payload);
    return res.data;
  },

  async transcribeVoice(
    audioBlob: Blob,
    language: Language
  ): Promise<{ text: string; detectedLanguage: Language }> {
    const form = new FormData();
    const ext = audioBlob.type.includes('mp4')
      ? 'm4a'
      : audioBlob.type.includes('ogg')
      ? 'ogg'
      : 'webm';
    form.append('audio', audioBlob, `voice-query.${ext}`);
    form.append('language', language);
    const res = await apiClient.post<{ text: string; detectedLanguage: Language }>(
      '/voice/transcribe',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 18000 }
    );
    return res.data;
  },

  async synthesizeSpeech(
    text: string,
    language: Language
  ): Promise<{ audioBase64: string; mimeType: string }> {
    const res = await apiClient.post<{ audioBase64: string; mimeType: string }>('/voice/tts', {
      text,
      language,
    });
    return res.data;
  },

  async getPdfDocuments(): Promise<UploadedDocument[]> {
    const res = await apiClient.get<{ documents: UploadedDocument[] }>('/pdf/documents');
    return res.data.documents;
  },

  async uploadPdf(file: File, schemeId?: number): Promise<{
    document: UploadedDocument;
    previewText: string;
  }> {
    const form = new FormData();
    form.append('file', file);
    if (schemeId) form.append('schemeId', String(schemeId));
    const res = await apiClient.post('/pdf/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async askPdf(payload: {
    documentId?: number;
    question: string;
    language: Language;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    sessionId?: string;
  }): Promise<RagChatResponse> {
    const res = await apiClient.post<RagChatResponse>('/pdf/ask', payload);
    return res.data;
  },

  async analyzeNoticeImage(params: {
    imageFile: File;
    language: Language;
    question?: string;
    sessionId?: string;
  }): Promise<NoticeImageAnalysisResult> {
    const form = new FormData();
    form.append('image', params.imageFile);
    form.append('language', params.language);
    if (params.question?.trim()) {
      form.append('question', params.question.trim());
    }
    if (params.sessionId) {
      form.append('sessionId', params.sessionId);
    }
    const res = await apiClient.post<NoticeImageAnalysisResult>('/notice/analyze-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000,
    });
    return res.data;
  },

  async getBookmarks(sessionId: string): Promise<number[]> {
    const res = await apiClient.get<{ schemeIds: number[] }>('/bookmarks', {
      params: { sessionId },
    });
    return res.data.schemeIds;
  },

  async addBookmark(sessionId: string, schemeId: number): Promise<void> {
    await apiClient.post('/bookmarks', { sessionId, schemeId });
  },

  async removeBookmark(sessionId: string, schemeId: number): Promise<void> {
    await apiClient.delete(`/bookmarks/${schemeId}`, { params: { sessionId } });
  },

  async getTrackedApplications(
    sessionId: string
  ): Promise<{ ownerType: 'citizen' | 'session'; items: TrackedApplication[] }> {
    const res = await apiClient.get<{
      ownerType: 'citizen' | 'session';
      items: TrackedApplication[];
    }>('/tracker', { params: { sessionId } });
    return res.data;
  },

  async saveTrackedApplication(
    schemeId: number,
    payload: {
      sessionId: string;
      stage: ApplicationStage;
      checkedDocIds: string[];
      notes?: string;
      applicationRef?: string;
    }
  ): Promise<{ ownerType: 'citizen' | 'session'; item: TrackedApplication }> {
    const res = await apiClient.put<{
      ownerType: 'citizen' | 'session';
      item: TrackedApplication;
    }>(`/tracker/${schemeId}`, payload);
    return res.data;
  },

  async deleteTrackedApplication(schemeId: number, sessionId: string): Promise<void> {
    await apiClient.delete(`/tracker/${schemeId}`, { params: { sessionId } });
  },

  async adminLogin(email: string, password: string): Promise<{
    token: string;
    admin: { id: number; username: string; email: string; role: string };
  }> {
    const res = await apiClient.post('/admin/login', { email, password });
    return res.data;
  },

  async adminMe(): Promise<{ admin: { id: number; email: string; role: string } }> {
    const res = await apiClient.get('/admin/me');
    return res.data;
  },

  async adminGetStats(): Promise<{ stats: AdminStats; recentLogs: QueryLogItem[] }> {
    const res = await apiClient.get('/admin/stats');
    return res.data;
  },

  async adminCreateScheme(payload: Record<string, unknown>): Promise<Scheme> {
    const res = await apiClient.post<{ scheme: Scheme }>('/admin/schemes', payload);
    return res.data.scheme;
  },

  async adminUpdateScheme(id: number, payload: Record<string, unknown>): Promise<Scheme> {
    const res = await apiClient.put<{ scheme: Scheme }>(`/admin/schemes/${id}`, payload);
    return res.data.scheme;
  },

  async adminDeleteScheme(id: number): Promise<void> {
    await apiClient.delete(`/admin/schemes/${id}`);
  },

  async adminUploadDocument(file: File, schemeId?: number, officialUrl?: string): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    if (schemeId) form.append('schemeId', String(schemeId));
    if (officialUrl) form.append('officialUrl', officialUrl);
    await apiClient.post('/admin/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async adminDeleteDocument(id: number): Promise<void> {
    await apiClient.delete(`/admin/documents/${id}`);
  },

  async adminReindex(): Promise<{ schemesIndexed: number; chunksUpdated: number }> {
    const res = await apiClient.post('/admin/reindex');
    return res.data;
  },

  async citizenRegister(payload: {
    full_name: string;
    email: string;
    password: string;
    district: string;
    occupation: string;
    preferred_language: Language;
  }): Promise<{ token: string; user: CitizenUser }> {
    const res = await apiClient.post<{ token: string; user: CitizenUser }>('/auth/register', payload);
    return res.data;
  },

  async citizenLogin(email: string, password: string): Promise<{ token: string; user: CitizenUser }> {
    const res = await apiClient.post<{ token: string; user: CitizenUser }>('/auth/login', {
      email,
      password,
    });
    return res.data;
  },

  async citizenMe(): Promise<{ user: CitizenUser }> {
    const res = await apiClient.get<{ user: CitizenUser }>('/auth/me');
    return res.data;
  },

  async citizenUpdateProfile(payload: {
    full_name?: string;
    district?: string;
    occupation?: string;
    preferred_language?: Language;
  }): Promise<{ user: CitizenUser }> {
    const res = await apiClient.put<{ user: CitizenUser }>('/auth/profile', payload);
    return res.data;
  },
};
