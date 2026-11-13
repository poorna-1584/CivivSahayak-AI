import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import type Database from 'better-sqlite3';
import { config } from './server/config.ts';
import { createSchemeAlert, getDb } from './server/db.ts';
import { ensureInitialSchemeIndex } from './server/rag.ts';
import { fetchLiveSchemeUpdates } from './server/ai.ts';
import { createApiRouter } from './server/routes.ts';

export function createApp(customDb?: Database.Database): express.Express {
  const db = customDb || getDb();
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', createApiRouter(db));

  // Global error handler (including Multer file size errors)
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  );

  return app;
}

async function startServer(): Promise<void> {
  const db = getDb();
  const app = createApp(db);
  const httpServer = http.createServer(app);

  if (config.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        ws: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`CivicSahayak AI server running on http://0.0.0.0:${config.port}`);
    // Warm up RAG embeddings in background without blocking startup
    ensureInitialSchemeIndex(db).catch((err) => {
      console.warn('[CivicSahayak Initial Indexing]', err instanceof Error ? err.message : err);
    });

    // Periodic 6-hour background check for new scheme updates when GEMINI_API_KEY is configured
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const timer = setInterval(async () => {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        return;
      }
      try {
        const today = new Date().toISOString().slice(0, 10);
        const markerTitle = `Live Government Schemes Update (${today})`;
        const exists = db
          .prepare("SELECT id FROM scheme_alerts WHERE alert_type = 'live_update' AND published_at = ? AND title_en = ?")
          .get(today, markerTitle);
        if (exists) return;

        const res = await fetchLiveSchemeUpdates('en', 'all');
        if (res.summary) {
          createSchemeAlert(db, {
            title_en: markerTitle,
            title_te: `తాజా ప్రభుత్వ పథకాల లైవ్ అప్‌డేట్ (${today})`,
            category: 'All Categories',
            summary_en: res.summary.slice(0, 280),
            summary_te: res.summary.slice(0, 280),
            source_url: res.sources[0]?.url || 'https://ap.gov.in',
            alert_type: 'live_update',
            published_at: today,
            is_sample: false,
          });
        }
      } catch {
        // Silently skip if quota or network temporarily unavailable
      }
    }, SIX_HOURS_MS);
    timer.unref();
  });
}

// Only start HTTP listener when executed as main entry point (not during unit tests)
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isMain) {
  startServer().catch((err) => {
    console.error('Failed to start CivicSahayak AI server:', err);
    process.exit(1);
  });
}
