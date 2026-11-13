import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  ImagePlus,
  ListChecks,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { api, extractApiError } from '../services/api';
import { FormattedMessage } from '../components/FormattedMessage';
import { VoiceRecorderButton } from '../components/VoiceRecorderButton';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { RagThinkingBanner } from '../components/RagThinkingBanner';
import type { NoticeImageAnalysisResult, RagCitation, UploadedDocument } from '../types';

interface PdfQaTurn {
  id: string;
  question: string;
  answer: string;
  citations: RagCitation[];
  hasVerifiedContext: boolean;
}

type ReaderMode = 'photo' | 'pdf';

export function PdfAssistantPage() {
  const { language, t, sessionId } = useApp();
  const isTe = language === 'te';

  const [mode, setMode] = useState<ReaderMode>('photo');

  // --- Photo / Camera Notice Reader State ---
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [photoQuestion, setPhotoQuestion] = useState('');
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [noticeResult, setNoticeResult] = useState<NoticeImageAnalysisResult | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);

  // --- PDF Assistant State ---
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [turns, setTurns] = useState<PdfQaTurn[]>([]);

  const loadDocuments = async () => {
    try {
      const docs = await api.getPdfDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch {
      // handled silently
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);

    if (file.size > 8 * 1024 * 1024) {
      setPhotoError(
        isTe
          ? 'ఫోటో పరిమాణం 8 MB కంటే తక్కువగా ఉండాలి.'
          : 'Image size must be 8 MB or smaller.'
      );
      e.target.value = '';
      return;
    }

    const allowedExt = /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name);
    if (!file.type.startsWith('image/') && !allowedExt) {
      setPhotoError(
        isTe
          ? 'దయచేసి JPG, PNG, WebP లేదా HEIC ఫోటో మాత్రమే ఎంచుకోండి.'
          : 'Please choose a valid JPG, PNG, WebP, or HEIC image.'
      );
      e.target.value = '';
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setNoticeResult(null);
    setShowExtractedText(false);
    e.target.value = '';
  };

  const handleClearImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl(null);
    setNoticeResult(null);
    setPhotoError(null);
    setShowExtractedText(false);
  };

  const runPhotoAnalysis = async (customQuestion?: string, langOverride?: 'en' | 'te') => {
    if (!imageFile || analyzingPhoto) return;
    setAnalyzingPhoto(true);
    setPhotoError(null);
    try {
      const res = await api.analyzeNoticeImage({
        imageFile,
        language: langOverride || language,
        question: (customQuestion ?? photoQuestion).trim() || undefined,
        sessionId,
      });
      setNoticeResult(res);
    } catch (err) {
      setPhotoError(extractApiError(err));
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runPhotoAnalysis();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError(
        isTe
          ? 'చెల్లని ఫైల్ రకం. దయచేసి PDF (.pdf) ఫైల్ మాత్రమే అప్‌లోడ్ చేయండి.'
          : 'Invalid file format. Only PDF (.pdf) documents are supported.'
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(
        isTe ? 'PDF ఫైల్ పరిమాణం 10 MB కంటే తక్కువ ఉండాలి.' : 'PDF size must be 10 MB or smaller.'
      );
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadPdf(file);
      setUploadSuccess(
        isTe
          ? `"${res.document.original_name}" (${res.document.page_count} పేజీలు, ${res.document.chunk_count} విభాగాలు) ఇండెక్స్ చేయబడింది.`
          : `"${res.document.original_name}" indexed (${res.document.page_count} pages, ${res.document.chunk_count} chunks).`
      );
      await loadDocuments();
      setSelectedDocId(res.document.id);
      setTurns([]);
    } catch (err) {
      setUploadError(extractApiError(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submitPdfQuestion = async (qText: string, langOverride?: 'en' | 'te') => {
    const trimmed = qText.trim();
    if (!trimmed || asking) return;
    setAsking(true);
    setAskError(null);

    try {
      const res = await api.askPdf({
        documentId: selectedDocId || undefined,
        question: trimmed,
        language: langOverride || language,
        sessionId,
      });

      setTurns((prev) => [
        ...prev,
        {
          id: `pdfqa_${Date.now()}`,
          question: trimmed,
          answer: res.answer,
          citations: res.citations,
          hasVerifiedContext: res.hasVerifiedContext,
        },
      ]);
      setQuestion('');
    } catch (err) {
      setAskError(extractApiError(err));
    } finally {
      setAsking(false);
    }
  };

  const handleAskPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPdfQuestion(question);
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  const speechText = noticeResult
    ? [
        noticeResult.documentType,
        noticeResult.summary,
        ...noticeResult.requiredActions,
      ]
        .filter(Boolean)
        .join('. ')
    : '';

  const photoPromptChips = isTe
    ? [
        'ఈ లేఖలో ఏమి రాసి ఉందో సరళమైన తెలుగులో చెప్పండి.',
        'నేను సచివాలయానికి ఏ పత్రాలు తీసుకువెళ్లాలి?',
        'ఇందులో ఏదైనా చివరి తేదీ ఉందా?',
      ]
    : [
        'Explain what this notice means in simple words.',
        'Which documents do I need to submit?',
        'Is there any deadline or office I must visit?',
      ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t.pdfTitle}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-3xl">{t.pdfSubtitle}</p>
        </div>

        {/* 2-Mode Switcher */}
        <div
          role="tablist"
          aria-label={isTe ? 'రీడర్ మోడ్ ఎంపిక' : 'Choose reader mode'}
          className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'photo'}
            onClick={() => setMode('photo')}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              mode === 'photo'
                ? 'bg-white text-teal-800 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{isTe ? 'ఫోటో / కెమెరా నోటీసు' : 'Photo / Camera Notice'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'pdf'}
            onClick={() => setMode('pdf')}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              mode === 'pdf'
                ? 'bg-white text-teal-800 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isTe ? 'PDF నోటిఫికేషన్ Q&A' : 'PDF Notification Q&A'}</span>
          </button>
        </div>
      </div>

      {mode === 'photo' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Camera / Image Upload + Question Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  {isTe ? 'ప్రభుత్వ లేఖ లేదా నోటీసు ఫోటో తీయండి' : 'Capture or Upload Notice Photo'}
                </h2>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {isTe
                    ? 'సచివాలయం లేఖ, స్కాలర్‌షిప్ నోటీసు, SMS స్క్రీన్‌షాట్ లేదా పాస్‌బుక్ పేజీ ఫోటోను అప్‌లోడ్ చేయండి (గరిష్టంగా 8 MB).'
                    : 'Supports mobile camera photos or JPG, PNG, WebP screenshots of Sachivalayam notices, circulars, bank slips, or SMS alerts (max 8 MB).'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="sr-only">
                    {isTe ? 'కెమెరాతో ఫోటో తీయండి' : 'Take Photo with Camera'}
                  </span>
                  <div className="flex items-center justify-center gap-2 px-3.5 py-3 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap">
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>{isTe ? 'కెమెరాతో తీయండి' : 'Take Photo'}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    disabled={analyzingPhoto}
                    className="hidden"
                  />
                </label>

                <label className="block">
                  <span className="sr-only">
                    {isTe ? 'గ్యాలరీ నుండి అప్‌లోడ్ చేయండి' : 'Upload Image File'}
                  </span>
                  <div className="flex items-center justify-center gap-2 px-3.5 py-3 min-h-[44px] border border-dashed border-teal-400 bg-teal-50/60 hover:bg-teal-50 text-teal-800 text-sm font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap">
                    <ImagePlus className="w-4 h-4 shrink-0" />
                    <span>{isTe ? 'ఫోటో అప్‌లోడ్' : 'Upload Image'}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={handleImageSelect}
                    disabled={analyzingPhoto}
                    className="hidden"
                  />
                </label>
              </div>

              {imagePreviewUrl && imageFile && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="px-3.5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {imageFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        {Math.max(1, Math.round(imageFile.size / 1024))} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      disabled={analyzingPhoto}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                      aria-label={isTe ? 'ఫోటో తొలగించు' : 'Remove photo'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 flex justify-center max-h-64 overflow-hidden">
                    <img
                      src={imagePreviewUrl}
                      alt={isTe ? 'అప్‌లోడ్ చేసిన నోటీసు ప్రివ్యూ' : 'Uploaded government notice preview'}
                      className="max-h-56 w-auto rounded-lg object-contain border border-slate-200"
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handlePhotoSubmit} className="space-y-3 pt-1">
                <div>
                  <label
                    htmlFor="photo-question"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    {isTe
                      ? 'ప్రత్యేక ప్రశ్న (ఐచ్ఛికం — తెలుగు లేదా ఇంగ్లీష్)'
                      : 'Specific Question (Optional — English or Telugu)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="photo-question"
                      type="text"
                      value={photoQuestion}
                      onChange={(e) => setPhotoQuestion(e.target.value)}
                      placeholder={
                        isTe
                          ? 'ఉదా: ఈ లేఖ ప్రకారం నేను ఏమి చేయాలి?'
                          : 'e.g., What action do I need to take for this notice?'
                      }
                      disabled={analyzingPhoto}
                      className="flex-1 min-w-0 px-3.5 py-2.5 min-h-[44px] text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:bg-white"
                    />
                    <VoiceRecorderButton
                      language={language}
                      disabled={analyzingPhoto}
                      onTranscribed={(spokenText, detectedLang) => {
                        setPhotoQuestion(spokenText);
                        if (imageFile) {
                          runPhotoAnalysis(spokenText, detectedLang);
                        }
                      }}
                      onError={(msg) => setPhotoError(msg)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-slate-500">
                    {isTe ? 'త్వరిత ప్రశ్నలు:' : 'Quick prompts:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {photoPromptChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setPhotoQuestion(chip);
                          if (imageFile && !analyzingPhoto) {
                            runPhotoAnalysis(chip);
                          }
                        }}
                        className="text-left px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-200 rounded-lg cursor-pointer transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!imageFile || analyzingPhoto}
                  className="w-full px-4 py-3 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {analyzingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isTe ? 'ఫోటో చదివి వివరిస్తోంది...' : 'Reading Notice & Explaining...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isTe
                          ? 'నోటీసును చదివి వివరించండి'
                          : 'Read & Explain Notice'}
                      </span>
                    </>
                  )}
                </button>
              </form>

              {photoError && (
                <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{photoError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Structured Plain-Language Explanation + Audio Playback */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl min-h-[520px] flex flex-col shadow-2xs">
            <div className="border-b border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3 bg-teal-50/30 rounded-t-xl">
              <div>
                <p className="text-xs text-slate-500">
                  {isTe ? 'ఫోటో నోటీసు వివరణ:' : 'Notice Explanation:'}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {noticeResult
                    ? noticeResult.documentType
                    : isTe
                    ? 'మీ లేఖ లేదా నోటీసు ఫోటోను అప్‌లోడ్ చేయండి'
                    : 'Upload or capture any notice photo to read'}
                </p>
              </div>
              {noticeResult && (
                <ReadAloudButton text={speechText} language={noticeResult.language} />
              )}
            </div>

            <div className="flex-1 p-5 sm:p-6 space-y-6">
              {analyzingPhoto ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-900">
                    {isTe
                      ? 'చిత్రంలోని అక్షరాలను చదివి సరళమైన తెలుగులో సిద్ధం చేస్తోంది...'
                      : 'Reading text from your image and preparing a plain-language guide...'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isTe
                      ? 'దయచేసి కొన్ని సెకన్లు వేచి ఉండండి.'
                      : 'Extracting key dates, instructions, and required documents.'}
                  </p>
                </div>
              ) : !noticeResult ? (
                <div className="py-14 max-w-md mx-auto text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {isTe
                        ? 'కష్టమైన ప్రభుత్వ లేఖలను సులభంగా అర్థం చేసుకోండి'
                        : 'Understand confusing letters in plain words'}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {isTe
                        ? 'సచివాలయ నోటీసులు, e-KYC రిమైండర్‌లు, స్కాలర్‌షిప్ లేఖలు లేదా SMS స్క్రీన్‌షాట్‌ల ఫోటో అప్‌లోడ్ చేస్తే, CivicSahayak AI దాన్ని తెలుగు లేదా ఇంగ్లీష్‌లో చదివి వినిపిస్తుంది.'
                        : 'Upload a photo of any Sachivalayam circular, e-KYC notice, scholarship memo, or government SMS. CivicSahayak explains what it says, next steps, and deadlines—and reads it aloud.'}
                    </p>
                  </div>
                  <div className="pt-2 text-left bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">
                      {isTe ? 'మంచి ఫలితాల కోసం చిట్కాలు:' : 'Tips for clearest reading:'}
                    </p>
                    <p>
                      ·{' '}
                      {isTe
                        ? 'వెలుతురు ఉన్న చోట కాగితాన్ని నేరుగా ఉంచి ఫోటో తీయండి.'
                        : 'Place the letter on a flat surface in good light and keep text sharp.'}
                    </p>
                    <p>
                      ·{' '}
                      {isTe
                        ? 'తెలుగు లేదా ఇంగ్లీష్ భాషకు పైభాగంలోని బటన్‌తో మారండి.'
                        : 'Use the language toggle in the header anytime to get results in Telugu or English.'}
                    </p>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  {/* Plain Summary */}
                  <div className="bg-[#F8FAF9] border border-teal-100 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
                      {isTe ? 'సరళమైన సారాంశం' : 'Plain-Language Summary'}
                    </p>
                    <FormattedMessage content={noticeResult.summary} />
                  </div>

                  {/* Next Actions */}
                  {noticeResult.requiredActions.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-teal-700" />
                        <span>{isTe ? 'మీరు చేయాల్సిన తదుపరి చర్యలు' : 'Recommended Next Steps'}</span>
                      </h3>
                      <ol className="space-y-2">
                        {noticeResult.requiredActions.map((step, idx) => (
                          <li key={`${idx}_${step}`} className="flex items-start gap-2.5 text-sm text-slate-700">
                            <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Details & Important Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {noticeResult.keyDetails.length > 0 && (
                      <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                          {isTe ? 'గుర్తించిన ముఖ్య వివరాలు' : 'Key Details Found'}
                        </h3>
                        <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                          {noticeResult.keyDetails.map((detail, idx) => (
                            <li key={`${idx}_${detail}`}>· {detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {noticeResult.importantDates.length > 0 && (
                      <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-2">
                        <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>{isTe ? 'తేదీలు & గడువులు' : 'Dates & Deadlines'}</span>
                        </h3>
                        <ul className="space-y-1.5 text-xs text-amber-950 leading-relaxed">
                          {noticeResult.importantDates.map((dt, idx) => (
                            <li key={`${idx}_${dt}`}>· {dt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Extracted Raw Text Toggle */}
                  {noticeResult.extractedText && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowExtractedText((v) => !v)}
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                      >
                        <span>
                          {isTe
                            ? 'ఫోటో నుండి చదివిన అసలు పాఠ్యం చూడండి'
                            : 'View Readable Text Extracted from Photo'}
                        </span>
                        {showExtractedText ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {showExtractedText && (
                        <div className="p-4 bg-white text-xs text-slate-600 whitespace-pre-wrap leading-relaxed border-t border-slate-200">
                          {noticeResult.extractedText}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                    {noticeResult.disclaimer}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Upload + Indexed Document Selector */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                {isTe ? 'ప్రభుత్వ PDF అప్‌లోడ్ చేయండి' : 'Upload Government PDF'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isTe
                  ? 'గరిష్ట పరిమాణం 10 MB. సిస్టమ్ పేజీల వారీగా టెక్స్ట్ సేకరించి వెక్టర్ డేటాబేస్‌లో ఇండెక్స్ చేస్తుంది.'
                  : 'Max 10 MB. Text is extracted per page, split into overlapping chunks, embedded, and stored for grounded Q&A.'}
              </p>

              <label className="block">
                <span className="sr-only">{t.uploadPdfBtn}</span>
                <div className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-teal-400 bg-teal-50/60 hover:bg-teal-50 text-teal-800 text-sm font-medium rounded-lg cursor-pointer transition-colors">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {uploading ? (isTe ? 'ప్రాసెస్ చేస్తోంది...' : 'Processing PDF...') : t.uploadPdfBtn}
                  </span>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {uploadSuccess && (
                <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-semibold text-slate-900">
                {isTe ? 'ఇండెక్స్ చేసిన PDF పత్రాలు' : 'Indexed PDF Documents'}
              </h2>
              {documents.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {isTe ? 'ఇంకా PDF లు అప్‌లోడ్ చేయబడలేదు.' : 'No PDFs indexed yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => {
                    const active = doc.id === selectedDocId;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          setTurns([]);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? 'bg-teal-50 border-teal-300 text-slate-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{doc.original_name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                              {doc.page_count} {isTe ? 'పేజీలు' : 'pages'} · {doc.chunk_count || 0}{' '}
                              {isTe ? 'భాగాలు' : 'chunks'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Scoped PDF Q&A */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col min-h-[520px] shadow-2xs">
            <div className="border-b border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-2 bg-teal-50/30 rounded-t-xl">
              <div>
                <p className="text-xs text-slate-500">
                  {isTe ? 'ఎంచుకున్న పత్రం:' : 'Active PDF Document:'}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedDoc ? selectedDoc.original_name : 'All Indexed PDFs'}
                </p>
              </div>
              {selectedDoc && (
                <span className="text-xs font-mono text-teal-800 tabular-nums">
                  {selectedDoc.page_count} pages · {selectedDoc.status}
                </span>
              )}
            </div>

            <div className="flex-1 p-5 space-y-5 overflow-y-auto">
              {turns.length === 0 ? (
                <div className="py-10 text-center max-w-md mx-auto space-y-3">
                  <p className="text-sm font-medium text-slate-800">
                    {isTe
                      ? 'ఈ PDF గురించి తెలుగు లేదా ఇంగ్లీష్‌లో ప్రశ్న అడగండి'
                      : 'Ask questions about this notification PDF in English or Telugu'}
                  </p>
                  <div className="space-y-2 text-left">
                    {(isTe
                      ? [
                          'ఈ నోటిఫికేషన్‌లో పేర్కొన్న ఆదాయ పరిమితి మరియు హాజరు నిబంధన ఏమిటి?',
                          'అవసరమైన పత్రాలను సరళమైన తెలుగులో వివరించండి.',
                        ]
                      : [
                          'What are the attendance and bank seeding rules mentioned in this PDF?',
                          'Explain the required and conditional documents in simple Telugu.',
                        ]
                    ).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuestion(q)}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-200 rounded-lg cursor-pointer transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                turns.map((turn) => (
                  <motion.div
                    key={turn.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3 pb-4 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="bg-teal-700 text-white text-sm rounded-xl px-4 py-2.5 w-fit ml-auto shadow-2xs">
                      {turn.question}
                    </div>
                    <div className="bg-[#F8FAF9] border border-teal-100 rounded-xl p-4 space-y-3">
                      <FormattedMessage content={turn.answer} />
                      <div>
                        <ReadAloudButton text={turn.answer} language={language} />
                      </div>
                    </div>
                    {turn.citations.length > 0 && (
                      <div className="text-xs text-slate-600 space-y-1.5">
                        <p className="font-semibold text-teal-900">
                          {isTe ? 'పేజీ సూచనలు:' : 'Page References:'}
                        </p>
                        {turn.citations.map((c) => (
                          <div
                            key={c.chunkId}
                            className="bg-white border border-teal-100 rounded-lg p-2.5"
                          >
                            <p className="font-medium text-slate-900">
                              {c.documentName} ·{' '}
                              <span className="font-mono text-teal-700 tabular-nums">
                                {c.pageNumber ? `Page ${c.pageNumber}` : 'Excerpt'}
                              </span>
                            </p>
                            <p className="mt-1 text-slate-500">{c.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))
              )}

              {asking && <RagThinkingBanner language={language} mode="pdf" />}
              {askError && <p className="text-xs text-rose-700">{askError}</p>}
            </div>

            <form
              onSubmit={handleAskPdf}
              className="border-t border-slate-200 p-3.5 flex flex-wrap sm:flex-nowrap items-center gap-2.5"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t.askPdfPlaceholder}
                disabled={asking || documents.length === 0}
                className="flex-1 min-w-[180px] px-3.5 py-2.5 min-h-[44px] text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:bg-white"
              />
              <div className="flex items-center gap-2 shrink-0">
                <VoiceRecorderButton
                  language={language}
                  disabled={asking || documents.length === 0}
                  onTranscribed={(spokenText, detectedLang) => {
                    submitPdfQuestion(spokenText, detectedLang);
                  }}
                  onError={(msg) => setAskError(msg)}
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim() || documents.length === 0}
                  className="px-4 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.chatSend}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
