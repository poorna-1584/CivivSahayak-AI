import { PDFParse } from 'pdf-parse';
import { config } from './config.ts';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface PdfChunkItem {
  pageNumber: number;
  chunkIndex: number;
  content: string;
}

export function validatePdfBuffer(buffer: Buffer, mimeType: string, originalName: string): void {
  if (!buffer || buffer.length === 0) {
    throw new Error('Uploaded file is empty.');
  }
  if (buffer.length > config.maxPdfSizeBytes) {
    throw new Error('PDF file exceeds the maximum allowed size of 10 MB.');
  }
  const hasPdfExt = originalName.toLowerCase().endsWith('.pdf');
  const isPdfMime = mimeType === 'application/pdf' || mimeType === 'application/x-pdf';
  if (!hasPdfExt && !isPdfMime) {
    throw new Error('Invalid file type. Only PDF documents (.pdf) are supported.');
  }
  const header = buffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    throw new Error('Invalid PDF signature. Please upload a valid PDF file.');
  }
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{
  pageCount: number;
  pages: ExtractedPdfPage[];
}> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const pages: ExtractedPdfPage[] = (result.pages || [])
      .map((p) => ({
        pageNumber: p.num,
        text: (p.text || '').replace(/\s+/g, ' ').trim(),
      }))
      .filter((p) => p.text.length > 0);

    if (pages.length === 0) {
      throw new Error(
        'No selectable text could be extracted from this PDF. Scanned image-only PDFs without OCR text are not supported yet.'
      );
    }

    return {
      pageCount: result.total || pages.length,
      pages,
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export function chunkPdfPages(
  pages: ExtractedPdfPage[],
  chunkSize = 900,
  overlap = 150
): PdfChunkItem[] {
  const chunks: PdfChunkItem[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    if (text.length <= chunkSize) {
      chunks.push({
        pageNumber: page.pageNumber,
        chunkIndex: globalIndex++,
        content: text,
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + chunkSize * 0.6) {
          end = lastSpace;
        }
      }
      const slice = text.slice(start, end).trim();
      if (slice.length > 0) {
        chunks.push({
          pageNumber: page.pageNumber,
          chunkIndex: globalIndex++,
          content: slice,
        });
      }
      if (end >= text.length) break;
      start = Math.max(0, end - overlap);
    }
  }

  return chunks;
}
