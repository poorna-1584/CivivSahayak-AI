import type Database from 'better-sqlite3';
import {
  detectQueryLanguage,
  generateBatchEmbeddings,
  generateEmbedding,
  generateGroundedAnswer,
  getAiClient,
} from './ai.ts';
import { listSchemes } from './db.ts';
import type { PdfChunkItem } from './pdf.ts';
import type { Language, RagCitation, RagChatResult, SchemeRecord } from './types.ts';

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function tokenizeForSearch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => {
      const hasNonAscii = /[^\x00-\x7F]/.test(w);
      return hasNonAscii ? w.length >= 2 : w.length >= 3;
    });
}

const STOP_WORDS = new Set([
  'the', 'are', 'for', 'and', 'with', 'this', 'that', 'from', 'what', 'which',
  'how', 'can', 'apply', 'about', 'scheme', 'schemes', 'government', 'andhra', 'pradesh',
  'please', 'tell', 'explain', 'simple', 'when', 'where', 'who', 'have', 'has', 'was', 'were',
]);

function lexicalSimilarityScore(query: string, documentText: string): number {
  const queryTokens = Array.from(
    new Set(tokenizeForSearch(query).filter((t) => !STOP_WORDS.has(t)))
  );
  const rawTokens = queryTokens.length > 0 ? queryTokens : tokenizeForSearch(query);
  if (rawTokens.length === 0) return 0;

  const docTokenSet = new Set(tokenizeForSearch(documentText));
  let matched = 0;
  for (const token of rawTokens) {
    if (docTokenSet.has(token)) {
      matched += 1;
    }
  }
  return matched / rawTokens.length;
}

function buildSchemeChunks(scheme: SchemeRecord): Array<{ title: string; content: string }> {
  const docsEn = scheme.documents
    .map(
      (d) =>
        `- ${d.name_en} (${d.required ? 'Required' : `Conditional: ${d.condition_en || 'If applicable'}`}) — ${d.instructions_en}`
    )
    .join('\n');

  const docsTe = scheme.documents
    .map(
      (d) =>
        `- ${d.name_te} (${d.required ? 'తప్పనిసరి' : `షరతులతో కూడినది: ${d.condition_te || ''}`}) — ${d.instructions_te}`
    )
    .join('\n');

  const overviewChunk = [
    `Scheme: ${scheme.title_en} / ${scheme.title_te}`,
    `Category: ${scheme.category} | State: ${scheme.state}`,
    `Scheme Status: ${scheme.scheme_status === 'previous' ? 'Previous / Historical AP Scheme Archive (verify active successor scheme on official portal)' : 'Active / Current Scheme'}`,
    `Department: ${scheme.department_name_en || ''} / ${scheme.department_name_te || ''}`,
    `Record Status: ${scheme.is_sample ? 'Sample Knowledge Base Record (verify deadlines on official portal)' : 'Verified Record'}`,
    `Overview (English): ${scheme.short_desc_en}`,
    `Overview (Telugu): ${scheme.short_desc_te}`,
    `Benefits (English): ${scheme.benefit_summary_en}`,
    `Benefits (Telugu): ${scheme.benefit_summary_te}`,
    `Eligibility Summary (English): ${scheme.eligibility_summary_en}`,
    `Eligibility Summary (Telugu): ${scheme.eligibility_summary_te}`,
    `Eligibility Notes: ${scheme.eligibility_rules.notes_en.join(' ')}`,
    `Official URL: ${scheme.official_url} | Last Verified: ${scheme.last_verified_at}`,
  ].join('\n');

  const docsAndStepsChunk = [
    `Scheme: ${scheme.title_en} / ${scheme.title_te}`,
    `Required & Conditional Documents (English):\n${docsEn}`,
    `Required & Conditional Documents (Telugu):\n${docsTe}`,
    `Application Procedure (English):\n${scheme.application_steps_en.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    `Application Procedure (Telugu):\n${scheme.application_steps_te.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    `Official Source URL: ${scheme.official_url} | Source Doc: ${scheme.source_document_name}`,
  ].join('\n');

  return [
    { title: `${scheme.title_en} — Overview & Eligibility`, content: overviewChunk },
    { title: `${scheme.title_en} — Documents & Application Steps`, content: docsAndStepsChunk },
  ];
}

export async function indexSingleScheme(
  db: Database.Database,
  scheme: SchemeRecord
): Promise<number> {
  db.prepare("DELETE FROM document_chunks WHERE scheme_id = ? AND source_type = 'scheme'").run(
    scheme.id
  );

  const chunks = buildSchemeChunks(scheme);
  const embeddings = await generateBatchEmbeddings(chunks.map((c) => c.content));

  const insert = db.prepare(`
    INSERT INTO document_chunks (
      document_id, scheme_id, source_type, title, document_name,
      page_number, chunk_index, content, embedding_json, official_url, is_sample
    ) VALUES (NULL, ?, 'scheme', ?, ?, NULL, ?, ?, ?, ?, ?)
  `);

  chunks.forEach((c, idx) => {
    const emb = embeddings[idx];
    insert.run(
      scheme.id,
      c.title,
      scheme.source_document_name,
      idx,
      c.content,
      emb ? JSON.stringify(emb) : null,
      scheme.official_url,
      scheme.is_sample ? 1 : 0
    );
  });

  return chunks.length;
}

export async function indexPdfChunks(
  db: Database.Database,
  params: {
    documentId: number;
    originalName: string;
    schemeId?: number | null;
    officialUrl?: string | null;
    chunks: PdfChunkItem[];
    isSample?: boolean;
  }
): Promise<number> {
  db.prepare("DELETE FROM document_chunks WHERE document_id = ? AND source_type = 'pdf'").run(
    params.documentId
  );

  const texts = params.chunks.map((c) => c.content);
  const embeddings = await generateBatchEmbeddings(texts);

  const insert = db.prepare(`
    INSERT INTO document_chunks (
      document_id, scheme_id, source_type, title, document_name,
      page_number, chunk_index, content, embedding_json, official_url, is_sample
    ) VALUES (?, ?, 'pdf', ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const titleBase = params.originalName.replace(/\.pdf$/i, '');
  const tx = db.transaction(() => {
    params.chunks.forEach((c, idx) => {
      const emb = embeddings[idx];
      insert.run(
        params.documentId,
        params.schemeId ?? null,
        titleBase,
        params.originalName,
        c.pageNumber,
        c.chunkIndex,
        c.content,
        emb ? JSON.stringify(emb) : null,
        params.officialUrl ?? null,
        params.isSample ? 1 : 0
      );
    });
  });
  tx();

  return params.chunks.length;
}

export async function reindexAllKnowledgeBase(db: Database.Database): Promise<{
  schemesIndexed: number;
  chunksUpdated: number;
}> {
  const schemes = listSchemes(db);
  let totalChunks = 0;

  for (const scheme of schemes) {
    totalChunks += await indexSingleScheme(db, scheme);
  }

  // Also backfill embeddings for any PDF chunks missing embeddings
  const missingPdfChunks = db
    .prepare("SELECT id, content FROM document_chunks WHERE source_type = 'pdf' AND embedding_json IS NULL")
    .all() as Array<{ id: number; content: string }>;

  if (missingPdfChunks.length > 0) {
    const embs = await generateBatchEmbeddings(missingPdfChunks.map((c) => c.content));
    const upd = db.prepare('UPDATE document_chunks SET embedding_json = ? WHERE id = ?');
    const tx = db.transaction(() => {
      missingPdfChunks.forEach((chunk, i) => {
        if (embs[i]) {
          upd.run(JSON.stringify(embs[i]), chunk.id);
          totalChunks += 1;
        }
      });
    });
    tx();
  }

  return { schemesIndexed: schemes.length, chunksUpdated: totalChunks };
}

export async function ensureInitialSchemeIndex(db: Database.Database): Promise<void> {
  const count = db
    .prepare("SELECT COUNT(*) as cnt FROM document_chunks WHERE source_type = 'scheme'")
    .get() as { cnt: number };
  if (count.cnt === 0) {
    await reindexAllKnowledgeBase(db);
    return;
  }

  const missingRows = db
    .prepare(
      `SELECT s.id
       FROM schemes s
       LEFT JOIN document_chunks c ON c.scheme_id = s.id AND c.source_type = 'scheme'
       WHERE c.id IS NULL`
    )
    .all() as Array<{ id: number }>;

  if (missingRows.length > 0) {
    const missingIds = new Set(missingRows.map((r) => r.id));
    const schemesToIndex = listSchemes(db).filter((s) => missingIds.has(s.id));
    for (const scheme of schemesToIndex) {
      await indexSingleScheme(db, scheme);
    }
  }
}

export async function retrieveRelevantChunks(
  db: Database.Database,
  query: string,
  options?: { documentId?: number; topK?: number }
): Promise<RagCitation[]> {
  const topK = options?.topK ?? 5;
  await ensureInitialSchemeIndex(db);

  let sql = `
    SELECT c.id, c.source_type, c.title, c.document_name, c.page_number,
           c.content, c.embedding_json, c.official_url, c.is_sample,
           s.slug as scheme_slug
    FROM document_chunks c
    LEFT JOIN schemes s ON s.id = c.scheme_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (options?.documentId) {
    sql += ' AND c.document_id = ?';
    params.push(options.documentId);
  }

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  if (rows.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);

  const scored: RagCitation[] = rows.map((row) => {
    const content = String(row.content);
    const title = String(row.title);
    const lexical = lexicalSimilarityScore(query, `${title} ${content}`);

    let vectorScore = 0;
    if (queryEmbedding && row.embedding_json) {
      try {
        const chunkVec = JSON.parse(String(row.embedding_json)) as number[];
        vectorScore = Math.max(0, cosineSimilarity(queryEmbedding, chunkVec));
      } catch {
        vectorScore = 0;
      }
    }

    // Hybrid score: weighted vector cosine + lexical keyword match
    const finalScore =
      queryEmbedding && row.embedding_json
        ? vectorScore * 0.72 + lexical * 0.28
        : lexical;

    return {
      chunkId: Number(row.id),
      sourceType: String(row.source_type) as 'scheme' | 'pdf',
      title,
      documentName: String(row.document_name),
      pageNumber: row.page_number !== null ? Number(row.page_number) : null,
      schemeSlug: row.scheme_slug ? String(row.scheme_slug) : undefined,
      officialUrl: row.official_url ? String(row.official_url) : undefined,
      isSample: Boolean(row.is_sample),
      snippet: content.slice(0, 320) + (content.length > 320 ? '...' : ''),
      score: Number(finalScore.toFixed(4)),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Relevance threshold prevents unrelated hallucinations when query has no match
  const minThreshold = options?.documentId ? 0.12 : queryEmbedding ? 0.32 : 0.18;
  const relevant = scored.filter((item) => item.score >= minThreshold);

  return relevant.slice(0, topK);
}

export async function answerQuestionWithRag(
  db: Database.Database,
  params: {
    question: string;
    preferredLanguage: Language;
    documentId?: number;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    sessionId?: string;
  }
): Promise<RagChatResult> {
  const start = Date.now();
  const detectedLanguage = detectQueryLanguage(params.question, params.preferredLanguage);

  const citations = await retrieveRelevantChunks(db, params.question, {
    documentId: params.documentId,
    topK: 5,
  });

  // If no relevant verified/sample context found, do NOT guess or fabricate!
  if (citations.length === 0) {
    const unavailableMsg =
      detectedLanguage === 'te'
        ? 'క్షమించండి, మీరు అడిగిన ప్రశ్నకు సంబంధించిన ధృవీకరించబడిన సమాచారం ప్రస్తుతం CivicSahayak AI నాలెడ్జ్ బేస్‌లో అందుబాటులో లేదు. మేము ఊహాజనిత ప్రభుత్వ పథకాల వివరాలను అందించము. దయచేసి అధికారిక ఆంధ్రప్రదేశ్ ప్రభుత్వ పోర్టల్ (ap.gov.in) లేదా మీ సమీప గ్రామ/వార్డు సచివాలయాన్ని సంప్రదించండి, లేదా సంబంధిత ప్రభుత్వ PDF నోటిఫికేషన్‌ను అప్‌లోడ్ చేయండి.'
        : 'Verified information for this question is not currently available in the CivicSahayak AI knowledge base. To prevent misinformation, I do not generate unsupported scheme details. Please check the official Andhra Pradesh portal (ap.gov.in), consult your nearest Grama/Ward Sachivalayam, or upload the relevant government PDF notification in the PDF Assistant.';

    const latencyMs = Date.now() - start;
    db.prepare(
      'INSERT INTO query_logs (session_id, language, query_text, mode, retrieved_count, latency_ms) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      params.sessionId || 'anonymous',
      detectedLanguage,
      params.question.slice(0, 500),
      params.documentId ? 'pdf_qa' : 'chatbot',
      0,
      latencyMs
    );

    return {
      answer: unavailableMsg,
      detectedLanguage,
      hasVerifiedContext: false,
      citations: [],
      modelUsed: 'retrieval-guardrail',
      latencyMs,
    };
  }

  // Fetch full text of top retrieved chunks for LLM context
  const chunkIds = citations.map((c) => c.chunkId);
  const placeholders = chunkIds.map(() => '?').join(',');
  const fullChunks = db
    .prepare(`SELECT id, title, document_name, page_number, content, official_url, is_sample FROM document_chunks WHERE id IN (${placeholders})`)
    .all(...chunkIds) as Array<Record<string, unknown>>;

  const chunkMap = new Map(fullChunks.map((c) => [Number(c.id), c]));
  const contextBlocks = citations.map((cit, idx) => {
    const raw = chunkMap.get(cit.chunkId);
    const pageTag = cit.pageNumber ? `Page ${cit.pageNumber}` : 'Scheme Record';
    const sampleTag = cit.isSample ? 'SAMPLE RECORD' : 'UPLOADED DOCUMENT';
    return `[Source ${idx + 1}] (${sampleTag}) Title: ${cit.title} | Document: ${cit.documentName} | ${pageTag} | URL: ${cit.officialUrl || 'N/A'}\n${raw ? String(raw.content) : cit.snippet}`;
  });

  // Check if Gemini API key is configured; if missing, surface a clear setup message + retrieved facts
  if (!getAiClient()) {
    const fallbackNotice =
      detectedLanguage === 'te'
        ? `GEMINI_API_KEY సర్వర్‌లో కాన్ఫిగర్ చేయబడలేదు కాబట్టి LLM సారాంశం అందుబాటులో లేదు. అయితే నాలెడ్జ్ బేస్ నుండి క్రింది సంబంధిత పత్రాలు కనుగొనబడ్డాయి:\n\n${citations
            .map((c, i) => `${i + 1}. **${c.title}** (${c.documentName}${c.pageNumber ? `, పేజీ ${c.pageNumber}` : ''}): ${c.snippet}`)
            .join('\n\n')}`
        : `GEMINI_API_KEY is not configured on the server, so live LLM synthesis is paused. However, the RAG retriever matched these relevant source passages:\n\n${citations
            .map((c, i) => `${i + 1}. **${c.title}** (${c.documentName}${c.pageNumber ? `, Page ${c.pageNumber}` : ''}): ${c.snippet}`)
            .join('\n\n')}`;

    const latencyMs = Date.now() - start;
    return {
      answer: fallbackNotice,
      detectedLanguage,
      hasVerifiedContext: true,
      citations,
      modelUsed: 'retrieval-only',
      latencyMs,
    };
  }

  const aiResult = await generateGroundedAnswer({
    question: params.question,
    targetLanguage: detectedLanguage,
    citations,
    contextBlocks,
    history: params.history,
    isPdfScoped: Boolean(params.documentId),
  });

  const latencyMs = Date.now() - start;
  db.prepare(
    'INSERT INTO query_logs (session_id, language, query_text, mode, retrieved_count, latency_ms) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    params.sessionId || 'anonymous',
    detectedLanguage,
    params.question.slice(0, 500),
    params.documentId ? 'pdf_qa' : 'chatbot',
    citations.length,
    latencyMs
  );

  return {
    answer: aiResult.text,
    detectedLanguage,
    hasVerifiedContext: true,
    citations,
    modelUsed: aiResult.modelUsed,
    latencyMs,
  };
}
