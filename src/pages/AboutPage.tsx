import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

export function AboutPage() {
  const { language, t } = useApp();
  const isTe = language === 'te';

  const stack = [
    {
      layer: 'Frontend',
      items: 'React 19, TypeScript, Tailwind CSS v4, Motion Animations, Lucide Icons, Axios, Bilingual EN/TE UI',
    },
    {
      layer: 'Backend & API',
      items: 'Node.js, Express REST APIs, Multer PDF Upload, Rate Limiter, HMAC Admin Auth',
    },
    {
      layer: 'Generative AI & RAG',
      items:
        '@google/genai SDK (gemini-3.8-flash, gemini-3.8-flash-lite-tts, gemini-embedding-001), Hybrid Cosine + Lexical Retrieval, Grounded Citations',
    },
    {
      layer: 'Document & Database',
      items: 'pdf-parse v2 (Per-Page Extraction), SQLite Persistent Storage (PostgreSQL-ready schema)',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-medium text-teal-800">
          B.Tech Artificial Intelligence & Data Science · Civic Technology Architecture
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {t.aboutTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
          {isTe
            ? 'CivicSahayak AI అనేది ఆంధ్రప్రదేశ్ పౌరులకు ప్రభుత్వ పథకాలు, అర్హత నిబంధనలు, అవసరమైన పత్రాలు మరియు ప్రభుత్వ PDF నోటిఫికేషన్లను తెలుగు మరియు ఇంగ్లీష్‌లో సులభంగా వివరించడానికి రూపొందించిన RAG ఆధారిత AI సహాయకుడు.'
            : 'CivicSahayak AI is an intelligent multilingual Retrieval-Augmented Generation (RAG) web platform designed to make Andhra Pradesh government schemes, eligibility conditions, document requirements, and official notifications easy to understand in Telugu and English.'}
        </p>
      </div>

      {/* Visual Architecture & RAG Workflow Diagram */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            {isTe ? 'RAG పైప్‌లైన్ & సిస్టమ్ ఆర్కిటెక్చర్' : 'End-to-End RAG Workflow & System Architecture'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            User → Language Detection → Embedding → Vector Search → Relevance Check → Grounded LLM → Source Citations
          </p>
        </div>

        <div className="relative h-1 bg-teal-100 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-teal-600 via-emerald-500 to-amber-500 animate-civic-signal" />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px] grid grid-cols-7 gap-2 items-center text-center py-2">
            {[
              { title: '1. Citizen Query', sub: 'Voice / Text' },
              { title: '2. NLP Language', sub: 'English & తెలుగు' },
              { title: '3. Embedding', sub: 'Vector Encode' },
              { title: '4. Vector Search', sub: 'SQLite Index' },
              { title: '5. Relevance Gate', sub: 'Threshold Filter' },
              { title: '6. Gemini LLM', sub: 'gemini-3.8-flash' },
              { title: '7. Grounded Reply', sub: 'Citations & Audio' },
            ].map((node, idx) => (
              <motion.div
                key={node.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 bg-teal-50/60 border border-teal-200/70 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-900">{node.title}</p>
                  <p className="mt-1 text-[11px] font-mono text-teal-800">{node.sub}</p>
                </div>
                {idx < 6 && <span className="text-teal-500 font-bold">→</span>}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
          <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-lg p-4">
            <p className="font-semibold text-slate-900 mb-1">Ingestion Pipeline (PDF & Schemes)</p>
            <p>
              Uploaded government PDFs are validated (%PDF signature, max 10 MB), parsed page-by-page
              via pdf-parse, split into 900-char overlapping chunks with page numbers, embedded via
              Gemini Embeddings, and persisted in SQLite.
            </p>
          </div>
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-lg p-4">
            <p className="font-semibold text-slate-900 mb-1">Anti-Hallucination & Injection Defense</p>
            <p>
              If semantic + lexical similarity falls below threshold, CivicSahayak AI refuses to
              invent scheme facts and directs the citizen to official portals. Uploaded PDFs are
              explicitly isolated as untrusted data sources.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Stack Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">Technology Architecture</h2>
        <div className="divide-y divide-slate-100">
          {stack.map((row) => (
            <div key={row.layer} className="py-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm">
              <span className="font-semibold text-slate-900">{row.layer}</span>
              <span className="sm:col-span-3 text-slate-600">{row.items}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
