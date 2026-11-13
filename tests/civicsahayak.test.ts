import http from 'node:http';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createApp } from '../server.ts';
import { getDb } from '../server/db.ts';
import { detectQueryLanguage } from '../server/ai.ts';
import { chunkPdfPages, validatePdfBuffer } from '../server/pdf.ts';
import { answerQuestionWithRag, retrieveRelevantChunks } from '../server/rag.ts';
import { evaluatePreliminaryEligibility } from '../server/eligibility.ts';
import { config } from '../server/config.ts';

let server: http.Server;
let baseUrl: string;
const testDb = getDb(':memory:');

async function apiRequest(
  path: string,
  options?: { method?: string; body?: unknown; token?: string }
): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers: Record<string, string> = {};
  if (options?.body) headers['Content-Type'] = 'application/json';
  if (options?.token) headers['Authorization'] = `Bearer ${options.token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method: options?.method || 'GET',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json()) as Record<string, unknown>;
  return { status: res.status, data };
}

beforeAll(async () => {
  const app = createApp(testDb);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  testDb.close();
});

describe('CivicSahayak AI — Unit & Integration Tests', () => {
  it('1. Detects English and Telugu Unicode queries accurately', () => {
    expect(detectQueryLanguage('What scholarships are available in AP?', 'en')).toBe('en');
    expect(detectQueryLanguage('ఆంధ్రప్రదేశ్ స్కాలర్‌షిప్ అర్హత ఏమిటి?', 'en')).toBe('te');
    expect(detectQueryLanguage('Explain Jnanabhumi in Telugu', 'en')).toBe('te');
  });

  it('2. Returns all 7 scheme categories and supports search filtering', async () => {
    const res = await apiRequest('/api/schemes');
    expect(res.status).toBe(200);
    const schemes = res.data.schemes as Array<{ category: string; title_en: string }>;
    expect(schemes.length).toBeGreaterThanOrEqual(7);

    const searchRes = await apiRequest('/api/schemes?search=Jnanabhumi');
    expect(searchRes.status).toBe(200);
    const matched = searchRes.data.schemes as Array<{ title_en: string }>;
    expect(matched.length).toBe(1);
    expect(matched[0].title_en).toContain('Jnanabhumi');
  });

  it('3. Evaluates preliminary eligibility with satisfied/not-satisfied breakdown and disclaimer', async () => {
    const schemesRes = await apiRequest('/api/schemes?search=Jnanabhumi');
    const scheme = (schemesRes.data.schemes as Array<{ id: number }>)[0];

    const eligibleRes = await apiRequest('/api/eligibility/check', {
      method: 'POST',
      body: {
        schemeId: scheme.id,
        age: 20,
        state: 'Andhra Pradesh',
        district: 'Guntur',
        educationLevel: 'Undergraduate',
        occupation: 'Student',
        annualIncomeInr: 120000,
        gender: 'female',
        hasRationOrRiceCard: true,
        language: 'en',
      },
    });

    expect(eligibleRes.status).toBe(200);
    expect(eligibleRes.data.preliminaryStatus).toBe('likely_eligible');
    expect((eligibleRes.data.satisfied as string[]).length).toBeGreaterThan(0);
    expect(String(eligibleRes.data.disclaimer)).toContain('preliminary assessment');

    // Out-of-state + high income mismatch
    const notEligibleRes = await apiRequest('/api/eligibility/check', {
      method: 'POST',
      body: {
        schemeId: scheme.id,
        age: 20,
        state: 'Other State',
        district: 'Guntur',
        educationLevel: 'Undergraduate',
        occupation: 'Student',
        annualIncomeInr: 800000,
        gender: 'male',
        language: 'te',
      },
    });
    expect(notEligibleRes.status).toBe(200);
    expect(notEligibleRes.data.preliminaryStatus).toBe('likely_not_eligible');
    expect((notEligibleRes.data.notSatisfied as string[]).length).toBeGreaterThanOrEqual(2);
  });

  it('4. Generates document checklist distinguishing required and conditional documents', async () => {
    const res = await apiRequest('/api/schemes/ap-post-matric-scholarship/checklist');
    expect(res.status).toBe(200);
    const docs = res.data.documents as Array<{ required: boolean; name_en: string }>;
    expect(docs.some((d) => d.required === true)).toBe(true);
    expect(docs.some((d) => d.required === false)).toBe(true);
  });

  it('5. Validates PDF files strictly and rejects invalid uploads', () => {
    expect(() => validatePdfBuffer(Buffer.from('not a pdf'), 'text/plain', 'notes.txt')).toThrow();
    expect(() => validatePdfBuffer(Buffer.alloc(0), 'application/pdf', 'empty.pdf')).toThrow();
    expect(() =>
      validatePdfBuffer(Buffer.from('%PDF-1.4\n...'), 'application/pdf', 'valid.pdf')
    ).not.toThrow();
  });

  it('6. Chunks extracted PDF pages while preserving exact page numbers', () => {
    const pages = [
      { pageNumber: 1, text: 'Page one content '.repeat(80) },
      { pageNumber: 2, text: 'Page two content regarding deadline and bank seeding.' },
    ];
    const chunks = chunkPdfPages(pages, 500, 100);
    expect(chunks.some((c) => c.pageNumber === 1)).toBe(true);
    expect(chunks.some((c) => c.pageNumber === 2)).toBe(true);
  });

  it('7. Retrieves relevant citations and blocks unverified/unrelated queries from hallucinating', async () => {
    const relevant = await retrieveRelevantChunks(
      testDb,
      'Jnanabhumi scholarship income limit attendance'
    );
    expect(relevant.length).toBeGreaterThan(0);

    const unrelated = await answerQuestionWithRag(testDb, {
      question: 'What is the Martian rover landing permit fee in Antarctica 2099?',
      preferredLanguage: 'en',
    });
    expect(unrelated.hasVerifiedContext).toBe(false);
    expect(unrelated.citations.length).toBe(0);
    expect(unrelated.answer.toLowerCase()).toContain('not currently available');
  });

  it('8. Protects admin routes and allows authenticated admin login + scheme creation', async () => {
    const unauth = await apiRequest('/api/admin/stats');
    expect(unauth.status).toBe(401);

    const loginRes = await apiRequest('/api/admin/login', {
      method: 'POST',
      body: { email: config.adminEmail, password: config.adminPassword },
    });
    expect(loginRes.status).toBe(200);
    const token = String(loginRes.data.token);
    expect(token.length).toBeGreaterThan(10);

    const statsRes = await apiRequest('/api/admin/stats', { token });
    expect(statsRes.status).toBe(200);
    expect((statsRes.data.stats as { totalSchemes: number }).totalSchemes).toBeGreaterThanOrEqual(7);

    const createRes = await apiRequest('/api/admin/schemes', {
      method: 'POST',
      token,
      body: {
        title_en: 'Test Sample Citizen Grant',
        title_te: 'పరీక్ష నమూనా పౌర గ్రాంట్',
        category: 'Social Welfare',
        short_desc_en: 'Sample verification record for integration test.',
        official_url: 'https://ap.gov.in',
        is_sample: true,
      },
    });
    expect(createRes.status).toBe(201);
    const createdId = (createRes.data.scheme as { id: number }).id;

    const delRes = await apiRequest(`/api/admin/schemes/${createdId}`, {
      method: 'DELETE',
      token,
    });
    expect(delRes.status).toBe(200);
  });

  it('9. Evaluates evaluatePreliminaryEligibility directly for unit correctness', async () => {
    const res = await apiRequest('/api/schemes/ap-deepam-women-welfare');
    const scheme = res.data.scheme as Parameters<typeof evaluatePreliminaryEligibility>[0];
    const check = await evaluatePreliminaryEligibility(scheme, {
      schemeId: scheme.id,
      age: 30,
      state: 'Andhra Pradesh',
      district: 'Visakhapatnam',
      educationLevel: 'Primary / High School (Class 1-10)',
      occupation: 'Homemaker',
      annualIncomeInr: 100000,
      gender: 'male',
      language: 'en',
    });
    expect(check.preliminaryStatus).toBe('likely_not_eligible');
    expect(check.notSatisfied.some((m) => m.toLowerCase().includes('female'))).toBe(true);
  });

  it('10. Validates voice transcription and TTS endpoints reject empty inputs cleanly', async () => {
    const emptyTranscribe = await fetch(`${baseUrl}/api/voice/transcribe`, {
      method: 'POST',
    });
    expect(emptyTranscribe.status).toBe(400);
    const transcribeJson = (await emptyTranscribe.json()) as { error?: string };
    expect(transcribeJson.error).toBeTruthy();

    const emptyTts = await apiRequest('/api/voice/tts', {
      method: 'POST',
      body: { text: '   ', language: 'te' },
    });
    expect(emptyTts.status).toBe(400);
    expect(emptyTts.data.error).toBeTruthy();
  });

  it('11. Filters Education and Scholarships schemes and validates live scholarship updates endpoint', async () => {
    const res = await apiRequest(
      '/api/schemes?category=' + encodeURIComponent('Education and Scholarships')
    );
    expect(res.status).toBe(200);
    const scholarships = res.data.schemes as Array<{ category: string; title_en: string }>;
    expect(scholarships.length).toBeGreaterThanOrEqual(2);
    expect(scholarships.every((s) => s.category === 'Education and Scholarships')).toBe(true);

    const liveRes = await apiRequest('/api/scholarships/live-updates', {
      method: 'POST',
      body: { language: 'en' },
    });
    // Returns 200 when GEMINI_API_KEY is available, or 503/500 cleanly with error string when absent in CI
    expect([200, 500, 503]).toContain(liveRes.status);
    if (liveRes.status === 200) {
      expect(typeof liveRes.data.summary).toBe('string');
      expect(Array.isArray(liveRes.data.sources)).toBe(true);
    } else {
      expect(typeof liveRes.data.error).toBe('string');
    }
  });

  it('12. Lists scheme alerts and emits automatic alerts when admin adds a new scheme', async () => {
    const initialAlerts = await apiRequest('/api/alerts');
    expect(initialAlerts.status).toBe(200);
    const listBefore = initialAlerts.data.alerts as Array<{ id: number; title_en: string }>;
    expect(listBefore.length).toBeGreaterThanOrEqual(3);

    const loginRes = await apiRequest('/api/admin/login', {
      method: 'POST',
      body: { email: config.adminEmail, password: config.adminPassword },
    });
    const token = String(loginRes.data.token);

    const createRes = await apiRequest('/api/admin/schemes', {
      method: 'POST',
      token,
      body: {
        title_en: 'Test New Scholarship Alert Scheme',
        title_te: 'పరీక్ష కొత్త స్కాలర్‌షిప్ అలర్ట్',
        category: 'Education and Scholarships',
        short_desc_en: 'Verifies automatic alert creation when new schemes arrive.',
        official_url: 'https://jnanabhumi.ap.gov.in',
        is_sample: true,
      },
    });
    expect(createRes.status).toBe(201);
    const createdId = (createRes.data.scheme as { id: number }).id;

    const afterAlerts = await apiRequest('/api/alerts');
    expect(afterAlerts.status).toBe(200);
    const listAfter = afterAlerts.data.alerts as Array<{ id: number; title_en: string }>;
    expect(listAfter[0].title_en).toContain('Test New Scholarship Alert Scheme');

    await apiRequest(`/api/admin/schemes/${createdId}`, {
      method: 'DELETE',
      token,
    });

    const liveAllRes = await apiRequest('/api/alerts/check-live', {
      method: 'POST',
      body: { language: 'en', focus: 'all' },
    });
    expect([200, 500, 503]).toContain(liveAllRes.status);
  });

  it('13. Includes previous AP legacy schemes and Central schemes with status filtering & RAG lookup', async () => {
    const allRes = await apiRequest('/api/schemes');
    expect(allRes.status).toBe(200);
    const allSchemes = allRes.data.schemes as Array<{
      slug: string;
      scheme_status: string;
      state: string;
    }>;
    expect(allSchemes.length).toBeGreaterThanOrEqual(18);

    const prevRes = await apiRequest('/api/schemes?status=previous');
    expect(prevRes.status).toBe(200);
    const prevSchemes = prevRes.data.schemes as Array<{ scheme_status: string; slug: string }>;
    expect(prevSchemes.length).toBe(7);
    expect(prevSchemes.every((s) => s.scheme_status === 'previous')).toBe(true);

    const centralRes = await apiRequest(
      '/api/schemes?state=' + encodeURIComponent('Central (All India / AP)')
    );
    expect(centralRes.status).toBe(200);
    const centralSchemes = centralRes.data.schemes as Array<{ state: string; slug: string }>;
    expect(centralSchemes.length).toBe(3);

    const ragPrev = await retrieveRelevantChunks(testDb, 'YSR Rythu Bharosa Annadata Sukhibhava');
    expect(ragPrev.length).toBeGreaterThan(0);
    expect(
      ragPrev.some((c) => c.schemeSlug === 'ap-ysr-rythu-bharosa' || c.title.includes('Rythu'))
    ).toBe(true);
  });

  it('14. Registers a citizen account, logs in, updates profile, and isolates citizen tokens from admin routes', async () => {
    const email = 'citizen.test@example.com';
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        full_name: 'Sita Ramayya',
        email,
        password: 'password123',
        district: 'Krishna',
        occupation: 'Farmer',
        preferred_language: 'te',
      },
    });
    expect(regRes.status).toBe(201);
    const token = String(regRes.data.token);
    expect(token.length).toBeGreaterThan(10);
    expect((regRes.data.user as { district: string }).district).toBe('Krishna');

    const dupRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        full_name: 'Duplicate',
        email,
        password: 'password123',
      },
    });
    expect(dupRes.status).toBe(409);

    const loginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'password123' },
    });
    expect(loginRes.status).toBe(200);
    const loginToken = String(loginRes.data.token);

    const meRes = await apiRequest('/api/auth/me', { token: loginToken });
    expect(meRes.status).toBe(200);
    expect((meRes.data.user as { email: string }).email).toBe(email);

    const updateRes = await apiRequest('/api/auth/profile', {
      method: 'PUT',
      token: loginToken,
      body: { district: 'Visakhapatnam', preferred_language: 'en' },
    });
    expect(updateRes.status).toBe(200);
    expect((updateRes.data.user as { district: string }).district).toBe('Visakhapatnam');

    // Citizen token must never grant admin access
    const adminAttempt = await apiRequest('/api/admin/stats', { token: loginToken });
    expect(adminAttempt.status).toBe(401);
  });

  it('15. Multi-scheme matcher evaluates farmer & student profiles across current and previous schemes', async () => {
    const badRes = await apiRequest('/api/eligibility/match-all', {
      method: 'POST',
      body: { age: 42 },
    });
    expect(badRes.status).toBe(400);

    const farmerRes = await apiRequest('/api/eligibility/match-all', {
      method: 'POST',
      body: {
        age: 42,
        state: 'Andhra Pradesh',
        occupation: 'Farmer',
        annualIncomeInr: 120000,
        landAcres: 2.5,
        language: 'en',
      },
    });
    expect(farmerRes.status).toBe(200);
    const farmerResults = farmerRes.data.results as Array<{ slug: string; matchStatus: string }>;
    const totalActive = Number(farmerRes.data.totalEvaluated);
    expect(totalActive).toBe(11);
    expect(
      farmerResults.some(
        (r) => r.slug === 'ap-annadata-sukhibhava' && r.matchStatus === 'likely_eligible'
      )
    ).toBe(true);
    expect(
      farmerResults.some(
        (r) => r.slug === 'central-pm-kisan' && r.matchStatus === 'likely_eligible'
      )
    ).toBe(true);

    const farmerWithPrev = await apiRequest('/api/eligibility/match-all', {
      method: 'POST',
      body: {
        age: 42,
        state: 'Andhra Pradesh',
        occupation: 'Farmer',
        annualIncomeInr: 120000,
        landAcres: 2.5,
        includePrevious: true,
        language: 'en',
      },
    });
    expect(farmerWithPrev.status).toBe(200);
    expect(Number(farmerWithPrev.data.totalEvaluated)).toBe(totalActive + 7);
    const prevResults = farmerWithPrev.data.results as Array<{ slug: string; matchStatus: string }>;
    expect(
      prevResults.some(
        (r) => r.slug === 'ap-ysr-rythu-bharosa' && r.matchStatus === 'likely_eligible'
      )
    ).toBe(true);

    const studentRes = await apiRequest('/api/eligibility/match-all', {
      method: 'POST',
      body: {
        age: 19,
        state: 'Andhra Pradesh',
        occupation: 'Student',
        educationLevel: 'Undergraduate',
        annualIncomeInr: 150000,
        language: 'te',
      },
    });
    expect(studentRes.status).toBe(200);
    const studentResults = studentRes.data.results as Array<{ slug: string; matchStatus: string }>;
    expect(
      studentResults.some(
        (r) =>
          (r.slug === 'ap-post-matric-scholarship' || r.slug === 'central-nsp-scholarships') &&
          r.matchStatus === 'likely_eligible'
      )
    ).toBe(true);
  });

  it('16. Validates Photo/Camera Notice Reader endpoint for missing, invalid, and image uploads', async () => {
    const emptyRes = await fetch(`${baseUrl}/api/notice/analyze-image`, {
      method: 'POST',
    });
    expect(emptyRes.status).toBe(400);

    const badForm = new FormData();
    badForm.append('image', new Blob(['not an image'], { type: 'text/plain' }), 'notes.txt');
    const badTypeRes = await fetch(`${baseUrl}/api/notice/analyze-image`, {
      method: 'POST',
      body: badForm,
    });
    expect(badTypeRes.status).toBe(400);

    // 1x1 PNG pixel bytes
    const pngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+X8sAAAAASUVORK5CYII=',
      'base64'
    );
    const validForm = new FormData();
    validForm.append('image', new Blob([pngBytes], { type: 'image/png' }), 'notice.png');
    validForm.append('language', 'te');
    validForm.append('question', 'ఈ నోటీసు సారాంశం చెప్పండి');

    const imgRes = await fetch(`${baseUrl}/api/notice/analyze-image`, {
      method: 'POST',
      body: validForm,
    });
    expect([200, 500]).toContain(imgRes.status);
    const payload = (await imgRes.json()) as Record<string, unknown>;
    if (imgRes.status === 200) {
      expect(typeof payload.summary).toBe('string');
      expect(Array.isArray(payload.requiredActions)).toBe(true);
    } else {
      expect(typeof payload.error).toBe('string');
    }
  });

  it('17. Persists document checklist and application progress stages per session and citizen account', async () => {
    const schemesRes = await apiRequest('/api/schemes');
    const firstScheme = (schemesRes.data.schemes as Array<{ id: number; slug: string }>)[0];
    expect(firstScheme).toBeTruthy();

    // Reject invalid stage and missing scheme cleanly
    const badStage = await apiRequest(`/api/tracker/${firstScheme.id}`, {
      method: 'PUT',
      body: { sessionId: 'sess-track-1', stage: 'invalid_stage', checkedDocIds: [] },
    });
    expect(badStage.status).toBe(400);

    const missingScheme = await apiRequest('/api/tracker/999999', {
      method: 'PUT',
      body: { sessionId: 'sess-track-1', stage: 'collecting_docs', checkedDocIds: [] },
    });
    expect(missingScheme.status).toBe(404);

    // Session save + read + update
    const saveSession = await apiRequest(`/api/tracker/${firstScheme.id}`, {
      method: 'PUT',
      body: {
        sessionId: 'sess-track-1',
        stage: 'applied',
        checkedDocIds: ['doc-aadhaar', 'doc-bonafide'],
        applicationRef: 'JNB-2026-4410',
        notes: 'Submitted at college scholarship desk',
      },
    });
    expect(saveSession.status).toBe(200);
    expect(saveSession.data.ownerType).toBe('session');

    const getSession = await apiRequest('/api/tracker?sessionId=sess-track-1');
    expect(getSession.status).toBe(200);
    const sessionItems = getSession.data.items as Array<{
      scheme_id: number;
      stage: string;
      checked_doc_ids: string[];
      application_ref: string;
    }>;
    expect(sessionItems.length).toBe(1);
    expect(sessionItems[0].stage).toBe('applied');
    expect(sessionItems[0].checked_doc_ids).toEqual(['doc-aadhaar', 'doc-bonafide']);
    expect(sessionItems[0].application_ref).toBe('JNB-2026-4410');

    // Citizen account login isolates tracker under ownerType = 'citizen'
    const loginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'citizen.test@example.com', password: 'password123' },
    });
    expect(loginRes.status).toBe(200);
    const citizenToken = String(loginRes.data.token);

    const saveCitizen = await apiRequest(`/api/tracker/${firstScheme.id}`, {
      method: 'PUT',
      token: citizenToken,
      body: {
        sessionId: 'sess-track-1',
        stage: 'kyc_verification',
        checkedDocIds: ['doc-aadhaar'],
        applicationRef: 'CIT-9901',
      },
    });
    expect(saveCitizen.status).toBe(200);
    expect(saveCitizen.data.ownerType).toBe('citizen');

    const getCitizen = await apiRequest('/api/tracker?sessionId=other-device', {
      token: citizenToken,
    });
    expect(getCitizen.status).toBe(200);
    expect(getCitizen.data.ownerType).toBe('citizen');
    const citizenItems = getCitizen.data.items as Array<{ stage: string; application_ref: string }>;
    expect(citizenItems[0].stage).toBe('kyc_verification');
    expect(citizenItems[0].application_ref).toBe('CIT-9901');

    // Delete tracked item
    const delCitizen = await apiRequest(`/api/tracker/${firstScheme.id}`, {
      method: 'DELETE',
      token: citizenToken,
    });
    expect(delCitizen.status).toBe(200);
    const afterDel = await apiRequest('/api/tracker', { token: citizenToken });
    expect((afterDel.data.items as unknown[]).length).toBe(0);
  });

  it('18. Returns official AP/Central helplines and district-specific local center Maps links', async () => {
    const allRes = await apiRequest('/api/helplines?district=Krishna&area=Machilipatnam&language=te');
    expect(allRes.status).toBe(200);
    expect(allRes.data.district).toBe('Krishna');
    const helplines = allRes.data.helplines as Array<{ phone: string; category: string }>;
    const centers = allRes.data.centers as Array<{ id: string; maps_url: string }>;
    expect(helplines.some((h) => h.phone === '1902')).toBe(true);
    expect(helplines.some((h) => h.phone === '104')).toBe(true);
    expect(centers.length).toBe(4);
    expect(centers[0].maps_url).toContain('Machilipatnam');
    expect(centers[0].maps_url).toContain('Krishna');

    const agriRes = await apiRequest('/api/helplines?category=agriculture');
    expect(agriRes.status).toBe(200);
    const agriHelplines = agriRes.data.helplines as Array<{ category: string; phone: string }>;
    expect(agriHelplines.length).toBeGreaterThanOrEqual(2);
    expect(agriHelplines.every((h) => h.category === 'agriculture')).toBe(true);
  });

  it('19. Provides compliant PWA icon assets and install metadata in index.html', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const root = process.cwd();

    for (const rel of [
      'public/icon.svg',
      'public/pwa-192x192.png',
      'public/pwa-512x512.png',
      'public/pwa-maskable-512x512.png',
      'public/apple-touch-icon.png',
    ]) {
      const fullPath = path.join(root, rel);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(200);
    }

    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('name="theme-color"');
    expect(indexHtml).toContain('apple-touch-icon');
  });
});







