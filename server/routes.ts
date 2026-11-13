import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import type Database from 'better-sqlite3';
import { config } from './config.ts';
import {
  createCitizenAccount,
  createSchemeAlert,
  deleteTrackedApplication,
  getCitizenAuthByEmail,
  getCitizenById,
  getSchemeByIdOrSlug,
  listDepartments,
  listSchemeAlerts,
  listSchemes,
  listTrackedApplications,
  listUploadedDocuments,
  updateCitizenAccount,
  upsertTrackedApplication,
} from './db.ts';
import {
  getOptionalCitizen,
  hashPassword,
  requireAdmin,
  requireCitizen,
  signAdminToken,
  signCitizenToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth.ts';
import { aiRateLimiter } from './rateLimit.ts';
import { chunkPdfPages, extractTextFromPdfBuffer, validatePdfBuffer } from './pdf.ts';
import {
  answerQuestionWithRag,
  indexPdfChunks,
  indexSingleScheme,
  reindexAllKnowledgeBase,
} from './rag.ts';
import { evaluateAllSchemesMatch, evaluatePreliminaryEligibility } from './eligibility.ts';
import { buildCenterMapsUrl, filterHelplines } from './helplines.ts';
import {
  analyzeNoticeImage,
  detectQueryLanguage,
  fetchLiveSchemeUpdates,
  fetchLiveScholarshipUpdates,
  synthesizeCitizenSpeech,
  transcribeCitizenAudio,
  type LiveUpdateFocus,
} from './ai.ts';
import type { ApplicationStage, EligibilityInput, Language } from './types.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxPdfSizeBytes },
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function createApiRouter(db: Database.Database): express.Router {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    const schemeCount = (db.prepare('SELECT COUNT(*) as cnt FROM schemes').get() as { cnt: number }).cnt;
    const chunkCount = (db.prepare('SELECT COUNT(*) as cnt FROM document_chunks').get() as { cnt: number }).cnt;
    res.json({
      status: 'ok',
      service: 'CivicSahayak AI',
      schemes: schemeCount,
      indexedChunks: chunkCount,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      chatModel: config.chatModel,
      embedModel: config.embedModel,
    });
  });

  router.get('/departments', (_req, res) => {
    res.json({ departments: listDepartments(db) });
  });

  router.get('/helplines', (req, res) => {
    const district =
      typeof req.query.district === 'string' && req.query.district.trim()
        ? req.query.district.trim()
        : 'Guntur';
    const area = typeof req.query.area === 'string' ? req.query.area.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category : 'all';
    const language: Language = req.query.language === 'te' ? 'te' : 'en';

    const data = filterHelplines(category, language);
    const centersWithUrls = data.centers.map((c) => ({
      ...c,
      maps_url: buildCenterMapsUrl(c.maps_query_template, district, area),
    }));

    res.json({
      district,
      area,
      helplines: data.helplines,
      centers: centersWithUrls,
      disclaimer_en:
        'Verify emergency/department helpline extensions on the linked official portals if lines are busy.',
      disclaimer_te:
        'లైన్లు బిజీగా ఉంటే సంబంధిత అధికారిక ప్రభుత్వ పోర్టల్‌లో తాజా నంబర్లను తనిఖీ చేయండి.',
    });
  });

  router.get('/schemes', (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const schemes = listSchemes(db, { search, category, state, status });
    res.json({ schemes });
  });

  router.get('/schemes/:idOrSlug', (req, res) => {
    const scheme = getSchemeByIdOrSlug(db, req.params.idOrSlug);
    if (!scheme) {
      res.status(404).json({ error: 'Government scheme record not found.' });
      return;
    }
    res.json({ scheme });
  });

  router.get('/schemes/:idOrSlug/checklist', (req, res) => {
    const scheme = getSchemeByIdOrSlug(db, req.params.idOrSlug);
    if (!scheme) {
      res.status(404).json({ error: 'Scheme not found.' });
      return;
    }
    res.json({
      schemeId: scheme.id,
      slug: scheme.slug,
      title_en: scheme.title_en,
      title_te: scheme.title_te,
      department_name_en: scheme.department_name_en,
      department_name_te: scheme.department_name_te,
      official_url: scheme.official_url,
      source_document_name: scheme.source_document_name,
      last_verified_at: scheme.last_verified_at,
      is_sample: scheme.is_sample,
      documents: scheme.documents,
    });
  });

  router.get('/alerts', (_req, res) => {
    const alerts = listSchemeAlerts(db, 30);
    res.json({
      alerts,
      latestAlertId: alerts[0]?.id ?? 0,
      serverTime: new Date().toISOString(),
    });
  });

  router.post('/alerts/check-live', aiRateLimiter, async (req, res) => {
    try {
      const lang: Language = req.body?.language === 'te' ? 'te' : 'en';
      const focus: LiveUpdateFocus = req.body?.focus === 'scholarships' ? 'scholarships' : 'all';
      const result = await fetchLiveSchemeUpdates(lang, focus);

      // Record a daily live_update alert if not already logged today for this focus
      const today = new Date().toISOString().slice(0, 10);
      const markerTitle =
        focus === 'scholarships'
          ? `Live Scholarship Alert (${today})`
          : `Live Government Schemes Update (${today})`;
      const existing = db
        .prepare("SELECT id FROM scheme_alerts WHERE alert_type = 'live_update' AND published_at = ? AND title_en = ?")
        .get(today, markerTitle);

      if (!existing && result.summary) {
        createSchemeAlert(db, {
          title_en: markerTitle,
          title_te:
            focus === 'scholarships'
              ? `తాజా స్కాలర్‌షిప్ లైవ్ అప్‌డేట్ (${today})`
              : `తాజా ప్రభుత్వ పథకాల లైవ్ అప్‌డేట్ (${today})`,
          category: focus === 'scholarships' ? 'Education and Scholarships' : 'All Categories',
          summary_en: result.summary.slice(0, 280),
          summary_te: result.summary.slice(0, 280),
          source_url: result.sources[0]?.url || 'https://ap.gov.in',
          alert_type: 'live_update',
          published_at: today,
          is_sample: false,
        });
      }

      res.json(result);
    } catch (err) {
      console.error('[Live Alerts Error]', err);
      const message =
        err instanceof Error ? err.message : 'Unable to retrieve live scheme updates.';
      const status = message.includes('GEMINI_API_KEY is not configured') ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  router.post('/scholarships/live-updates', aiRateLimiter, async (req, res) => {
    try {
      const lang: Language = req.body?.language === 'te' ? 'te' : 'en';
      const result = await fetchLiveScholarshipUpdates(lang);
      res.json(result);
    } catch (err) {
      console.error('[Live Scholarships Error]', err);
      const message =
        err instanceof Error ? err.message : 'Unable to retrieve live scholarship updates.';
      const status = message.includes('GEMINI_API_KEY is not configured') ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  router.post('/eligibility/check', async (req, res) => {
    try {
      const body = req.body as Partial<EligibilityInput>;
      if (!body.schemeId || typeof body.age !== 'number' || !body.state || !body.occupation) {
        res.status(400).json({
          error: 'Please provide schemeId, age, state, and occupation for preliminary assessment.',
        });
        return;
      }

      const scheme = getSchemeByIdOrSlug(db, body.schemeId);
      if (!scheme) {
        res.status(404).json({ error: 'Selected government scheme was not found.' });
        return;
      }

      const input: EligibilityInput = {
        schemeId: scheme.id,
        age: Number(body.age),
        state: String(body.state),
        district: String(body.district || 'Guntur'),
        educationLevel: String(body.educationLevel || 'Undergraduate'),
        occupation: String(body.occupation),
        annualIncomeInr: Number(body.annualIncomeInr ?? 0),
        gender: (body.gender as EligibilityInput['gender']) || 'other',
        landAcres: typeof body.landAcres === 'number' ? body.landAcres : undefined,
        hasRationOrRiceCard:
          typeof body.hasRationOrRiceCard === 'boolean' ? body.hasRationOrRiceCard : true,
        language: body.language === 'te' ? 'te' : 'en',
      };

      const result = await evaluatePreliminaryEligibility(scheme, input);
      res.json(result);
    } catch (err) {
      console.error('[Eligibility Error]', err);
      res.status(500).json({ error: 'Unable to evaluate preliminary eligibility at this time.' });
    }
  });

  router.post('/eligibility/match-all', (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      if (typeof body.age !== 'number' || !body.state || !body.occupation) {
        res.status(400).json({
          error: 'Please provide age, state, and occupation to match matching schemes.',
        });
        return;
      }

      const allSchemes = listSchemes(db);
      const result = evaluateAllSchemesMatch(allSchemes, {
        age: Number(body.age),
        state: String(body.state),
        district: String(body.district || 'Guntur'),
        educationLevel: String(body.educationLevel || 'Undergraduate'),
        occupation: String(body.occupation),
        annualIncomeInr: Number(body.annualIncomeInr ?? 0),
        gender: (body.gender as EligibilityInput['gender']) || 'other',
        landAcres: typeof body.landAcres === 'number' ? body.landAcres : undefined,
        hasRationOrRiceCard:
          typeof body.hasRationOrRiceCard === 'boolean' ? body.hasRationOrRiceCard : true,
        includePrevious: Boolean(body.includePrevious),
        language: body.language === 'te' ? 'te' : 'en',
      });

      res.json(result);
    } catch (err) {
      console.error('[Match-All Error]', err);
      res.status(500).json({ error: 'Unable to run multi-scheme matching at this time.' });
    }
  });

  router.post('/chat', aiRateLimiter, async (req, res) => {
    try {
      const { question, language, history, sessionId } = req.body as {
        question?: string;
        language?: Language;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
        sessionId?: string;
      };

      if (!question || !question.trim()) {
        res.status(400).json({ error: 'Please enter a question in English or Telugu.' });
        return;
      }
      if (question.length > 2000) {
        res.status(400).json({ error: 'Question is too long (maximum 2,000 characters).' });
        return;
      }

      const result = await answerQuestionWithRag(db, {
        question: question.trim(),
        preferredLanguage: language === 'te' ? 'te' : 'en',
        history: Array.isArray(history) ? history : undefined,
        sessionId: sessionId || 'citizen-web',
      });
      res.json(result);
    } catch (err) {
      console.error('[Chat Error]', err);
      const message = err instanceof Error ? err.message : 'Failed to process your question.';
      res.status(500).json({ error: message });
    }
  });

  router.post('/voice/transcribe', aiRateLimiter, upload.single('audio'), async (req, res) => {
    try {
      const file = req.file;
      if (!file || file.buffer.length === 0) {
        res.status(400).json({ error: 'No audio recording was received.' });
        return;
      }
      if (file.buffer.length > 8 * 1024 * 1024) {
        res.status(400).json({ error: 'Audio clip is too large (max 8 MB).' });
        return;
      }
      const preferredLanguage: Language = req.body?.language === 'te' ? 'te' : 'en';
      const result = await transcribeCitizenAudio({
        audioBuffer: file.buffer,
        mimeType: file.mimetype || 'audio/webm',
        preferredLanguage,
      });
      res.json(result);
    } catch (err) {
      console.error('[Voice Transcribe Error]', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Could not transcribe voice recording.',
      });
    }
  });

  router.post('/voice/tts', aiRateLimiter, async (req, res) => {
    try {
      const { text, language } = req.body as { text?: string; language?: Language };
      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Text is required for speech playback.' });
        return;
      }
      const lang: Language = detectQueryLanguage(text, language === 'te' ? 'te' : 'en');
      const result = await synthesizeCitizenSpeech({ text, language: lang });
      res.json(result);
    } catch (err) {
      console.error('[Voice TTS Error]', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate spoken audio.',
      });
    }
  });

  router.get('/pdf/documents', (_req, res) => {
    res.json({ documents: listUploadedDocuments(db) });
  });

  router.post('/pdf/upload', aiRateLimiter, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Please choose a PDF file to upload.' });
        return;
      }

      validatePdfBuffer(file.buffer, file.mimetype, file.originalname);
      const extracted = await extractTextFromPdfBuffer(file.buffer);
      const chunks = chunkPdfPages(extracted.pages);

      const safeFilename = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`;
      fs.mkdirSync(config.uploadDir, { recursive: true });
      fs.writeFileSync(path.join(config.uploadDir, safeFilename), file.buffer);

      const schemeIdRaw = req.body?.schemeId;
      const schemeId = schemeIdRaw ? Number(schemeIdRaw) : null;

      const info = db
        .prepare(
          `INSERT INTO documents (filename, original_name, mime_type, size_bytes, page_count, scheme_id, source_type, status)
           VALUES (?, ?, ?, ?, ?, ?, 'citizen_pdf', 'indexed')`
        )
        .run(
          safeFilename,
          file.originalname,
          file.mimetype || 'application/pdf',
          file.size,
          extracted.pageCount,
          schemeId
        );

      const documentId = Number(info.lastInsertRowid);
      const indexedChunks = await indexPdfChunks(db, {
        documentId,
        originalName: file.originalname,
        schemeId,
        chunks,
        isSample: false,
      });

      res.status(201).json({
        document: {
          id: documentId,
          filename: safeFilename,
          original_name: file.originalname,
          page_count: extracted.pageCount,
          size_bytes: file.size,
          chunk_count: indexedChunks,
          status: 'indexed',
        },
        previewText: extracted.pages[0]?.text.slice(0, 400) || '',
      });
    } catch (err) {
      console.error('[PDF Upload Error]', err);
      const message = err instanceof Error ? err.message : 'PDF processing failed.';
      res.status(400).json({ error: message });
    }
  });

  router.post('/pdf/ask', aiRateLimiter, async (req, res) => {
    try {
      const { documentId, question, language, history, sessionId } = req.body as {
        documentId?: number;
        question?: string;
        language?: Language;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
        sessionId?: string;
      };

      if (!question || !question.trim()) {
        res.status(400).json({ error: 'Please enter a question about the PDF document.' });
        return;
      }

      if (documentId) {
        const docExists = db.prepare('SELECT id FROM documents WHERE id = ?').get(Number(documentId));
        if (!docExists) {
          res.status(404).json({ error: 'Selected PDF document was not found.' });
          return;
        }
      }

      const result = await answerQuestionWithRag(db, {
        question: question.trim(),
        preferredLanguage: language === 'te' ? 'te' : 'en',
        documentId: documentId ? Number(documentId) : undefined,
        history,
        sessionId: sessionId || 'citizen-pdf',
      });
      res.json(result);
    } catch (err) {
      console.error('[PDF Ask Error]', err);
      const message = err instanceof Error ? err.message : 'Failed to answer from PDF.';
      res.status(500).json({ error: message });
    }
  });

  router.post('/notice/analyze-image', aiRateLimiter, upload.single('image'), async (req, res) => {
    const startMs = Date.now();
    try {
      const file = req.file;
      if (!file || file.buffer.length === 0) {
        res.status(400).json({ error: 'Please capture or upload a photo of the notice or letter.' });
        return;
      }

      if (file.buffer.length > 8 * 1024 * 1024) {
        res.status(400).json({ error: 'Image size must be 8 MB or smaller.' });
        return;
      }

      const allowedMimes = new Set([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
      ]);
      const ext = path.extname(file.originalname || '').toLowerCase();
      const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);
      const normalizedMime =
        file.mimetype === 'image/jpg' ? 'image/jpeg' : (file.mimetype || '').toLowerCase();

      if (!allowedMimes.has(normalizedMime) && !allowedExts.has(ext)) {
        res.status(400).json({
          error: 'Unsupported image format. Please upload a JPG, PNG, WebP, or HEIC photo.',
        });
        return;
      }

      const fallbackMime =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
          ? 'image/webp'
          : ext === '.heic'
          ? 'image/heic'
          : ext === '.heif'
          ? 'image/heif'
          : 'image/jpeg';
      const effectiveMime = allowedMimes.has(normalizedMime) ? normalizedMime : fallbackMime;

      const language: Language = req.body?.language === 'te' ? 'te' : 'en';
      const question = typeof req.body?.question === 'string' ? req.body.question.slice(0, 500) : '';
      const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : 'citizen-notice';

      const result = await analyzeNoticeImage({
        imageBuffer: file.buffer,
        mimeType: effectiveMime,
        language,
        question,
      });

      const latencyMs = Date.now() - startMs;
      db.prepare(
        `INSERT INTO query_logs (session_id, language, query_text, mode, retrieved_count, latency_ms)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        sessionId,
        language,
        question.trim() || `Notice Photo Analysis (${file.originalname})`,
        'notice_vision',
        result.keyDetails.length,
        latencyMs
      );

      res.json(result);
    } catch (err) {
      console.error('[Notice Image Analysis Error]', err);
      const message =
        err instanceof Error ? err.message : 'Unable to analyze the uploaded notice photo.';
      res.status(500).json({ error: message });
    }
  });

  // Lightweight session bookmarks (no PII stored)
  router.get('/bookmarks', (req, res) => {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : 'default';
    const rows = db
      .prepare('SELECT scheme_id FROM citizen_bookmarks WHERE session_id = ?')
      .all(sessionId) as Array<{ scheme_id: number }>;
    res.json({ schemeIds: rows.map((r) => r.scheme_id) });
  });

  router.post('/bookmarks', (req, res) => {
    const { sessionId, schemeId } = req.body as { sessionId?: string; schemeId?: number };
    if (!schemeId) {
      res.status(400).json({ error: 'schemeId is required.' });
      return;
    }
    db.prepare('INSERT OR IGNORE INTO citizen_bookmarks (session_id, scheme_id) VALUES (?, ?)').run(
      sessionId || 'default',
      Number(schemeId)
    );
    res.status(201).json({ ok: true });
  });

  router.delete('/bookmarks/:schemeId', (req, res) => {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : 'default';
    db.prepare('DELETE FROM citizen_bookmarks WHERE session_id = ? AND scheme_id = ?').run(
      sessionId,
      Number(req.params.schemeId)
    );
    res.json({ ok: true });
  });

  // ---------------- Saved Document & Application Progress Tracker ----------------
  function resolveTrackerOwner(req: express.Request): {
    ownerKey: string;
    ownerType: 'citizen' | 'session';
  } {
    const citizen = getOptionalCitizen(req);
    if (citizen) {
      return { ownerKey: `citizen:${citizen.id}`, ownerType: 'citizen' };
    }
    const rawSession =
      (typeof req.query.sessionId === 'string' && req.query.sessionId) ||
      (typeof (req.body as Record<string, unknown>)?.sessionId === 'string' &&
        String((req.body as Record<string, unknown>).sessionId)) ||
      'default';
    return { ownerKey: `session:${rawSession.slice(0, 80)}`, ownerType: 'session' };
  }

  router.get('/tracker', (req, res) => {
    const { ownerKey, ownerType } = resolveTrackerOwner(req);
    const items = listTrackedApplications(db, ownerKey);
    res.json({ ownerType, items });
  });

  router.put('/tracker/:schemeId', (req, res) => {
    const schemeId = Number(req.params.schemeId);
    const scheme = getSchemeByIdOrSlug(db, schemeId);
    if (!scheme) {
      res.status(404).json({ error: 'Scheme not found.' });
      return;
    }

    const body = req.body as {
      stage?: string;
      checkedDocIds?: unknown;
      notes?: string;
      applicationRef?: string;
    };

    const validStages = new Set<ApplicationStage>([
      'collecting_docs',
      'applied',
      'kyc_verification',
      'approved',
    ]);
    const stage: ApplicationStage =
      body.stage && validStages.has(body.stage as ApplicationStage)
        ? (body.stage as ApplicationStage)
        : body.stage
        ? (() => {
            res.status(400).json({ error: 'Invalid application progress stage.' });
            return null as never;
          })()
        : 'collecting_docs';
    if (!stage) return;

    const checkedDocIds = Array.isArray(body.checkedDocIds)
      ? body.checkedDocIds.map((x) => String(x)).slice(0, 50)
      : [];

    const { ownerKey, ownerType } = resolveTrackerOwner(req);
    const item = upsertTrackedApplication(db, {
      ownerKey,
      schemeId: scheme.id,
      stage,
      checkedDocIds,
      notes: typeof body.notes === 'string' ? body.notes : '',
      applicationRef: typeof body.applicationRef === 'string' ? body.applicationRef : '',
    });
    res.json({ ownerType, item });
  });

  router.delete('/tracker/:schemeId', (req, res) => {
    const { ownerKey } = resolveTrackerOwner(req);
    deleteTrackedApplication(db, ownerKey, Number(req.params.schemeId));
    res.json({ ok: true });
  });

  // ---------------- Citizen Accounts (Registration, Sign In, Profile) ----------------
  router.post('/auth/register', (req, res) => {
    try {
      const { full_name, email, password, district, occupation, preferred_language } = req.body as {
        full_name?: string;
        email?: string;
        password?: string;
        district?: string;
        occupation?: string;
        preferred_language?: Language;
      };

      if (!full_name || full_name.trim().length < 2) {
        res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
        return;
      }
      const normalizedEmail = (email || '').trim().toLowerCase();
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!password || password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      const existing = getCitizenAuthByEmail(db, normalizedEmail);
      if (existing) {
        res.status(409).json({
          error: 'An account with this email already exists. Please sign in instead.',
        });
        return;
      }

      const user = createCitizenAccount(db, {
        full_name,
        email: normalizedEmail,
        password_hash: hashPassword(password),
        district,
        occupation,
        preferred_language: preferred_language === 'te' ? 'te' : 'en',
      });

      const token = signCitizenToken({ id: user.id, email: user.email });
      res.status(201).json({ token, user });
    } catch (err) {
      console.error('[Citizen Register Error]', err);
      res.status(500).json({ error: 'Unable to create account right now. Please try again.' });
    }
  });

  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const record = getCitizenAuthByEmail(db, email);
    if (!record || !verifyPassword(password, record.password_hash)) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    const { password_hash: _ignored, ...user } = record;
    const token = signCitizenToken({ id: user.id, email: user.email });
    res.json({ token, user });
  });

  router.get('/auth/me', requireCitizen, (req: AuthenticatedRequest, res) => {
    if (!req.citizen) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = getCitizenById(db, req.citizen.id);
    if (!user) {
      res.status(404).json({ error: 'Citizen account not found.' });
      return;
    }
    res.json({ user });
  });

  router.put('/auth/profile', requireCitizen, (req: AuthenticatedRequest, res) => {
    if (!req.citizen) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { full_name, district, occupation, preferred_language } = req.body as {
      full_name?: string;
      district?: string;
      occupation?: string;
      preferred_language?: Language;
    };
    const updated = updateCitizenAccount(db, req.citizen.id, {
      full_name,
      district,
      occupation,
      preferred_language,
    });
    if (!updated) {
      res.status(404).json({ error: 'Citizen account not found.' });
      return;
    }
    res.json({ user: updated });
  });

  // ---------------- Admin Authentication & Protected Routes ----------------
  router.post('/admin/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const admin = db
      .prepare('SELECT id, username, email, password_hash, role FROM admins WHERE email = ?')
      .get(email.trim().toLowerCase()) as
      | { id: number; username: string; email: string; password_hash: string; role: string }
      | undefined;

    if (!admin || !verifyPassword(password, admin.password_hash)) {
      res.status(401).json({ error: 'Invalid administrator email or password.' });
      return;
    }

    const token = signAdminToken({ id: admin.id, email: admin.email, role: admin.role });
    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  });

  router.get('/admin/me', requireAdmin, (req: AuthenticatedRequest, res) => {
    res.json({ admin: req.admin });
  });

  router.get('/admin/stats', requireAdmin, (_req, res) => {
    const totalSchemes = (db.prepare('SELECT COUNT(*) as cnt FROM schemes').get() as { cnt: number }).cnt;
    const totalDocuments = (db.prepare('SELECT COUNT(*) as cnt FROM documents').get() as { cnt: number }).cnt;
    const totalChunks = (db.prepare('SELECT COUNT(*) as cnt FROM document_chunks').get() as { cnt: number }).cnt;
    const embeddedChunks = (
      db
        .prepare('SELECT COUNT(*) as cnt FROM document_chunks WHERE embedding_json IS NOT NULL')
        .get() as { cnt: number }
    ).cnt;
    const totalQueries = (db.prepare('SELECT COUNT(*) as cnt FROM query_logs').get() as { cnt: number }).cnt;
    const teluguQueries = (
      db.prepare("SELECT COUNT(*) as cnt FROM query_logs WHERE language = 'te'").get() as { cnt: number }
    ).cnt;
    const recentLogs = db
      .prepare(
        'SELECT id, language, query_text, mode, retrieved_count, latency_ms, created_at FROM query_logs ORDER BY id DESC LIMIT 10'
      )
      .all();

    res.json({
      stats: {
        totalSchemes,
        totalDocuments,
        totalChunks,
        embeddedChunks,
        totalQueries,
        teluguQueries,
        englishQueries: totalQueries - teluguQueries,
      },
      recentLogs,
    });
  });

  router.post('/admin/schemes', requireAdmin, async (req, res) => {
    try {
      const b = req.body as Record<string, unknown>;
      if (!b.title_en || !b.category || !b.short_desc_en || !b.official_url) {
        res.status(400).json({
          error: 'title_en, category, short_desc_en, and official_url are required.',
        });
        return;
      }

      const slugBase = slugify(String(b.slug || b.title_en));
      const uniqueSlug = db.prepare('SELECT id FROM schemes WHERE slug = ?').get(slugBase)
        ? `${slugBase}-${Date.now().toString().slice(-4)}`
        : slugBase;

      const defaultRules = {
        states: [String(b.state || 'Andhra Pradesh')],
        minAge: typeof b.minAge === 'number' ? b.minAge : 0,
        maxAge: typeof b.maxAge === 'number' ? b.maxAge : 100,
        maxAnnualIncomeInr: typeof b.maxAnnualIncomeInr === 'number' ? b.maxAnnualIncomeInr : undefined,
        allowedOccupations: ['Any'],
        educationLevels: ['Any'],
        gender: 'all',
        notes_en: [String(b.eligibility_summary_en || 'Verify official scheme guidelines.')],
        notes_te: [String(b.eligibility_summary_te || b.eligibility_summary_en || 'అధికారిక మార్గదర్శకాలు పరిశీలించండి.')],
      };

      const info = db
        .prepare(
          `INSERT INTO schemes (
            slug, title_en, title_te, category, state, scheme_status, department_id,
            short_desc_en, short_desc_te,
            eligibility_summary_en, eligibility_summary_te,
            eligibility_rules_json, documents_json,
            application_steps_en_json, application_steps_te_json,
            benefit_summary_en, benefit_summary_te,
            official_url, source_document_name, last_verified_at, is_sample
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          uniqueSlug,
          String(b.title_en),
          String(b.title_te || b.title_en),
          String(b.category),
          String(b.state || 'Andhra Pradesh'),
          b.scheme_status === 'previous' ? 'previous' : 'active',
          Number(b.department_id || 1),
          String(b.short_desc_en),
          String(b.short_desc_te || b.short_desc_en),
          String(b.eligibility_summary_en || 'Refer to official notification.'),
          String(b.eligibility_summary_te || b.eligibility_summary_en || 'అధికారిక నోటిఫికేషన్ చూడండి.'),
          JSON.stringify(b.eligibility_rules || defaultRules),
          JSON.stringify(Array.isArray(b.documents) ? b.documents : []),
          JSON.stringify(Array.isArray(b.application_steps_en) ? b.application_steps_en : ['Apply via official government portal.']),
          JSON.stringify(Array.isArray(b.application_steps_te) ? b.application_steps_te : ['అధికారిక ప్రభుత్వ పోర్టల్ ద్వారా దరఖాస్తు చేయండి.']),
          String(b.benefit_summary_en || 'See official portal for current benefit schedule.'),
          String(b.benefit_summary_te || b.benefit_summary_en || 'ప్రయోజన వివరాల కోసం అధికారిక పోర్టల్ చూడండి.'),
          String(b.official_url),
          String(b.source_document_name || 'Admin_Added_Scheme_Record.pdf'),
          String(b.last_verified_at || new Date().toISOString().slice(0, 10)),
          b.is_sample === false ? 0 : 1
        );

      const created = getSchemeByIdOrSlug(db, Number(info.lastInsertRowid));
      if (created) {
        await indexSingleScheme(db, created);
        createSchemeAlert(db, {
          title_en: `New Scheme Added: ${created.title_en}`,
          title_te: `కొత్త పథకం చేర్చబడింది: ${created.title_te}`,
          category: created.category,
          summary_en: created.short_desc_en.slice(0, 240),
          summary_te: created.short_desc_te.slice(0, 240),
          source_url: created.official_url,
          alert_type:
            created.category === 'Education and Scholarships' ? 'scholarship' : 'new_scheme',
          published_at: created.last_verified_at,
          is_sample: created.is_sample,
        });
      }

      res.status(201).json({ scheme: created });
    } catch (err) {
      console.error('[Admin Create Scheme Error]', err);
      res.status(500).json({ error: 'Failed to create government scheme record.' });
    }
  });

  router.put('/admin/schemes/:id', requireAdmin, async (req, res) => {
    try {
      const existing = getSchemeByIdOrSlug(db, Number(req.params.id));
      if (!existing) {
        res.status(404).json({ error: 'Scheme not found.' });
        return;
      }

      const b = req.body as Record<string, unknown>;
      db.prepare(
        `UPDATE schemes SET
          title_en = ?,
          title_te = ?,
          category = ?,
          state = ?,
          scheme_status = ?,
          department_id = ?,
          short_desc_en = ?,
          short_desc_te = ?,
          eligibility_summary_en = ?,
          eligibility_summary_te = ?,
          official_url = ?,
          source_document_name = ?,
          last_verified_at = ?,
          is_sample = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        String(b.title_en ?? existing.title_en),
        String(b.title_te ?? existing.title_te),
        String(b.category ?? existing.category),
        String(b.state ?? existing.state),
        b.scheme_status === 'previous'
          ? 'previous'
          : b.scheme_status === 'active'
          ? 'active'
          : existing.scheme_status,
        Number(b.department_id ?? existing.department_id),
        String(b.short_desc_en ?? existing.short_desc_en),
        String(b.short_desc_te ?? existing.short_desc_te),
        String(b.eligibility_summary_en ?? existing.eligibility_summary_en),
        String(b.eligibility_summary_te ?? existing.eligibility_summary_te),
        String(b.official_url ?? existing.official_url),
        String(b.source_document_name ?? existing.source_document_name),
        String(b.last_verified_at ?? existing.last_verified_at),
        typeof b.is_sample === 'boolean' ? (b.is_sample ? 1 : 0) : existing.is_sample ? 1 : 0,
        existing.id
      );

      const updated = getSchemeByIdOrSlug(db, existing.id);
      if (updated) {
        await indexSingleScheme(db, updated);
      }

      res.json({ scheme: updated });
    } catch (err) {
      console.error('[Admin Update Scheme Error]', err);
      res.status(500).json({ error: 'Failed to update government scheme record.' });
    }
  });

  router.delete('/admin/schemes/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const info = db.prepare('DELETE FROM schemes WHERE id = ?').run(id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Scheme not found.' });
      return;
    }
    res.json({ ok: true });
  });

  router.get('/admin/documents', requireAdmin, (_req, res) => {
    res.json({ documents: listUploadedDocuments(db) });
  });

  router.post(
    '/admin/documents/upload',
    requireAdmin,
    upload.single('file'),
    async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: 'Please select a PDF file to upload.' });
          return;
        }
        validatePdfBuffer(file.buffer, file.mimetype, file.originalname);
        const extracted = await extractTextFromPdfBuffer(file.buffer);
        const chunks = chunkPdfPages(extracted.pages);

        const safeFilename = `admin_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`;
        fs.mkdirSync(config.uploadDir, { recursive: true });
        fs.writeFileSync(path.join(config.uploadDir, safeFilename), file.buffer);

        const schemeId = req.body?.schemeId ? Number(req.body.schemeId) : null;
        const officialUrl = req.body?.officialUrl ? String(req.body.officialUrl) : null;

        const info = db
          .prepare(
            `INSERT INTO documents (filename, original_name, mime_type, size_bytes, page_count, scheme_id, source_type, status)
             VALUES (?, ?, ?, ?, ?, ?, 'admin_notification', 'indexed')`
          )
          .run(
            safeFilename,
            file.originalname,
            file.mimetype || 'application/pdf',
            file.size,
            extracted.pageCount,
            schemeId
          );

        const documentId = Number(info.lastInsertRowid);
        const chunkCount = await indexPdfChunks(db, {
          documentId,
          originalName: file.originalname,
          schemeId,
          officialUrl,
          chunks,
          isSample: false,
        });

        createSchemeAlert(db, {
          title_en: `New Official PDF Notification: ${file.originalname}`,
          title_te: `కొత్త అధికారిక PDF నోటిఫికేషన్: ${file.originalname}`,
          category: 'Official Notification',
          summary_en: `Indexed ${extracted.pageCount} page(s) (${chunkCount} searchable passages). Ask AI or inspect in PDF Reader.`,
          summary_te: `${extracted.pageCount} పేజీలు ఇండెక్స్ చేయబడ్డాయి. PDF సహాయకుడిలో ప్రశ్నలు అడగండి.`,
          source_url: officialUrl || 'https://ap.gov.in',
          alert_type: 'pdf_notification',
          is_sample: false,
        });

        res.status(201).json({
          document: {
            id: documentId,
            original_name: file.originalname,
            page_count: extracted.pageCount,
            chunk_count: chunkCount,
            status: 'indexed',
          },
        });
      } catch (err) {
        console.error('[Admin PDF Upload Error]', err);
        res.status(400).json({ error: err instanceof Error ? err.message : 'PDF upload failed.' });
      }
    }
  );

  router.delete('/admin/documents/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const doc = db.prepare('SELECT filename FROM documents WHERE id = ?').get(id) as
      | { filename: string }
      | undefined;
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    const diskPath = path.join(config.uploadDir, doc.filename);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
    res.json({ ok: true });
  });

  router.post('/admin/reindex', requireAdmin, async (_req, res) => {
    try {
      const summary = await reindexAllKnowledgeBase(db);
      res.json({ ok: true, ...summary });
    } catch (err) {
      console.error('[Admin Reindex Error]', err);
      res.status(500).json({ error: 'Failed to re-index vector store.' });
    }
  });

  return router;
}
