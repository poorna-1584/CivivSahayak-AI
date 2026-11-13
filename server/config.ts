import path from 'node:path';

const DEPRECATED_CHAT_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
]);

function resolveChatModel(): string {
  const envModel = process.env.GEMINI_CHAT_MODEL?.trim();
  if (envModel && !DEPRECATED_CHAT_MODELS.has(envModel)) {
    return envModel;
  }
  return 'gemini-3.8-flash';
}

function resolveEmbedModel(): string {
  const envModel = process.env.GEMINI_EMBED_MODEL?.trim();
  if (envModel && envModel !== 'embedding-001') {
    return envModel;
  }
  return 'gemini-embedding-2';
}

export const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  chatModel: resolveChatModel(),
  embedModel: resolveEmbedModel(),
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'civicsahayak.db'),
  uploadDir: path.resolve(process.cwd(), 'data', 'uploads'),
  maxPdfSizeBytes: 10 * 1024 * 1024, // 10 MB
  adminEmail: process.env.ADMIN_EMAIL || 'admin@civicsahayak.gov.in',
  adminPassword: process.env.ADMIN_PASSWORD || 'CivicAdmin@2026',
  sessionSecret:
    process.env.SESSION_SECRET || 'civicsahayak-dev-secret-change-in-production-2026',
  rateLimitWindowMs: 60 * 1000,
  rateLimitMaxAiRequests: 25,
};
