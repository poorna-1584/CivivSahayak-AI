# CivicSahayak AI — Multilingual Government Schemes Assistant

CivicSahayak AI is a full-stack Retrieval-Augmented Generation (RAG) web application that helps citizens understand **Andhra Pradesh government schemes**, eligibility criteria, required documents, and official PDF notifications in **English** and **Telugu (తెలుగు)**.

> **Transparency Notice**: Pre-loaded scheme records are clearly labelled **Sample Knowledge Base Records** for citizen guidance and academic demonstration. Citizens should always confirm final deadlines and Government Orders (GOs) on official AP government portals.

---

## Key Features & Modules

1. **AI Government Schemes Chatbot**: Bilingual Telugu & English Q&A with automatic Unicode language detection, semantic + lexical RAG retrieval, inline source citations, and an anti-hallucination guardrail when verified data is unavailable.
2. **Government Schemes Explorer**: Organized across 7 public welfare categories (Education & Scholarships, Agriculture & Farmer Welfare, Health & Family Welfare, Women & Child Welfare, Employment & Skill Development, Social Welfare, and Other Public Services) with live search, state filter, bookmarks, and Scheme Details view.
3. **Smart Preliminary Eligibility Checker**: Compares basic citizen profile inputs against published scheme rules and displays satisfied conditions, unmet conditions, additional checks needed, and an explicit non-official disclaimer.
4. **Document Checklist Generator**: Generates Required vs. Conditional document checklists with official source references, interactive progress checkboxes, **Print** support, and **Download (.txt)**.
5. **Government PDF Notification Assistant**: Validates uploaded PDFs (`%PDF-` signature, max 10 MB), extracts text per page, chunks with overlap, embeds using `gemini-embedding-2`, and answers Telugu/English questions with **page-number citations**.
6. **Bilingual Interface (English + తెలుగు)**: Instant top-bar language toggle with `Noto Sans Telugu` Unicode typography.
7. **Protected Admin Dashboard**: Authenticated knowledge-base governance with real SQLite statistics, Add/Edit/Delete schemes, official notification PDF uploads, document management, and one-click vector re-indexing.

---

## System Architecture & RAG Workflow

```text
Citizen (English / తెలుగు)
   │
   ▼
React + TypeScript + Tailwind UI (Axios Client)
   │
   ▼
Express REST API (server.ts & server/routes.ts)
   ├── Rate Limiter & HMAC Admin Auth (server/auth.ts)
   ├── PDF Extractor & Sliding Chunker (server/pdf.ts — pdf-parse)
   ├── Preliminary Eligibility Engine (server/eligibility.ts)
   └── RAG Orchestrator (server/rag.ts)
         ├── 1. Language Detection (Unicode Telugu + intent)
         ├── 2. Embedding Generation (gemini-embedding-2)
         ├── 3. Hybrid Cosine + Lexical Retrieval (SQLite document_chunks)
         ├── 4. Relevance Threshold Gate (prevents fabricated facts)
         └── 5. Grounded Answer Generation (gemini-3.8-flash) + Citations
```

---

## Folder Structure

```text
├── server.ts                  # Express + Vite unified server entrypoint (port 3000)
├── server/
│   ├── ai.ts                  # @google/genai client, embeddings, grounded LLM generation
│   ├── auth.ts                # scrypt password hashing & HMAC-SHA256 admin tokens
│   ├── config.ts              # Environment configuration
│   ├── db.ts                  # SQLite schema & clearly labelled AP sample seed data
│   ├── eligibility.ts         # Preliminary rule evaluation engine
│   ├── pdf.ts                 # PDF validation, per-page extraction & chunking
│   ├── rag.ts                 # Vector indexing, hybrid search & RAG pipeline
│   ├── rateLimit.ts           # Sliding-window AI rate limiter
│   ├── routes.ts              # Public & protected Admin REST endpoints
│   └── types.ts               # Shared backend domain types
├── src/
│   ├── App.tsx                # 11-page application router & layout
│   ├── components/            # Navbar, Footer, ResilientImage
│   ├── context/               # Bilingual AppProvider & session state
│   ├── i18n/                  # English & Telugu UI translations
│   ├── pages/                 # All 11 citizen & admin pages
│   └── services/              # Axios API client
├── tests/
│   └── civicsahayak.test.ts   # Vitest unit & API integration tests
├── .env.example               # Environment variable template
└── package.json
```

---

## Setup & Execution

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and set your `GEMINI_API_KEY` (automatically injected in AI Studio Secrets).
   Default evaluation admin credentials (override in production):
   - Email: `admin@civicsahayak.gov.in`
   - Password: `CivicAdmin@2026`

3. **Run in development**:
   ```bash
   npm run dev
   ```
   Opens on `http://localhost:3000`.

4. **Type-check, test, and build**:
   ```bash
   npm run lint
   npm test
   npm run build
   npm start
   ```

---

## Deployment

- **Container / Cloud Run / Render**: Build the frontend with `npm run build` and run `npm start` (`node server.ts`) on port `3000` with a persistent disk mounted at `./data` for `civicsahayak.db` and uploaded PDFs.
- **Database Migration Path**: `server/db.ts` uses clean normalized relational tables (`departments`, `schemes`, `documents`, `document_chunks`, `admins`, `query_logs`, `citizen_bookmarks`) ready for PostgreSQL + `pgvector` migration.
