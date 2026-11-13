import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, ExternalLink, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { api, extractApiError } from '../services/api';
import { FormattedMessage } from '../components/FormattedMessage';
import { VoiceRecorderButton } from '../components/VoiceRecorderButton';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { RagThinkingBanner } from '../components/RagThinkingBanner';
import type { Language, RagCitation } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  language: Language;
  hasVerifiedContext?: boolean;
  citations?: RagCitation[];
  latencyMs?: number;
  modelUsed?: string;
}

export function ChatbotPage() {
  const {
    language,
    setLanguage,
    t,
    pendingChatPrompt,
    clearPendingChatPrompt,
    recordRecentQuery,
    sessionId,
    navigate,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      language,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    recordRecentQuery(trimmed, language);

    try {
      const history = messages.slice(-4).map((m) => ({ role: m.role, text: m.text }));
      const res = await api.askChatbot({
        question: trimmed,
        language,
        history,
        sessionId,
      });

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: res.answer,
        language: res.detectedLanguage,
        hasVerifiedContext: res.hasVerifiedContext,
        citations: res.citations,
        latencyMs: res.latencyMs,
        modelUsed: res.modelUsed,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pendingChatPrompt) {
      const prompt = pendingChatPrompt;
      clearPendingChatPrompt();
      sendMessage(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const starterPrompts =
    language === 'te'
      ? [
          'ఆంధ్రప్రదేశ్‌లో కాలేజీ విద్యార్థులకు ఏ స్కాలర్‌షిప్‌లు అందుబాటులో ఉన్నాయి?',
          'పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్‌కు ఏ పత్రాలు అవసరం మరియు ఆదాయ పరిమితి ఎంత?',
          'అన్నదాత సుఖీభవ పథకానికి ఎలా దరఖాస్తు చేయాలి?',
          'దీపం 2.0 ఉచిత గ్యాస్ పథకం అర్హత వివరాలు సరళమైన తెలుగులో చెప్పండి.',
        ]
      : [
          'What scholarships are available for college students in Andhra Pradesh?',
          'What are the eligibility requirements and documents for AP Post-Matric Scholarship?',
          'How can a tenant farmer apply for Annadata Sukhibhava?',
          'Explain Dr. NTR Vaidya Seva in simple Telugu.',
        ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t.chatTitle}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">{t.chatSubtitle}</p>
        </div>

        <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-teal-50/70 border border-teal-200 rounded-lg text-xs font-medium text-teal-900 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => setAutoSpeak(e.target.checked)}
            className="rounded border-teal-300 text-teal-700"
          />
          <span>
            {language === 'te'
              ? 'సమాధానం చదివి వినిపించు'
              : 'Read answers aloud'}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Conversation Column */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col min-h-[540px] max-h-[75vh] shadow-2xs">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 ? (
              <div className="py-10 text-center max-w-lg mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 text-teal-700" strokeWidth={1.75} />
                </div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  {language === 'te'
                    ? 'తెలుగు లేదా ఇంగ్లీష్‌లో మీ ప్రశ్న అడగండి'
                    : 'Ask about Andhra Pradesh schemes in English or Telugu'}
                </h2>
                <p className="text-sm text-slate-600">
                  {language === 'te'
                    ? 'ప్రతి సమాధానం నాలెడ్జ్ బేస్‌లోని పత్రాల నుండి ధృవీకరించి మూల సూచనలతో అందించబడుతుంది.'
                    : 'Answers are retrieved via semantic RAG from indexed scheme guidelines and government PDFs with source citations.'}
                </p>
                <div className="pt-2 space-y-2 text-left">
                  {starterPrompts.map((prompt) => (
                    <motion.button
                      key={prompt}
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-slate-700 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-200 rounded-lg transition-colors cursor-pointer"
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-teal-700 text-white whitespace-pre-wrap shadow-2xs'
                        : 'bg-[#F8FAF9] border border-teal-100 text-slate-800'
                    }`}
                  >
                    {m.role === 'user' ? m.text : <FormattedMessage content={m.text} />}
                  </div>

                  {m.role === 'assistant' && (
                    <div className="mt-2.5 max-w-[90%] space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <ReadAloudButton
                          text={m.text}
                          language={m.language}
                          autoPlay={autoSpeak}
                        />
                        <p className="text-[11px] text-slate-500">
                          {m.language === 'te' ? 'భాష: తెలుగు' : 'Language: English'} ·{' '}
                          {m.hasVerifiedContext
                            ? language === 'te'
                              ? 'ఆధార పత్రాలు లభించాయి'
                              : 'Grounded in retrieved context'
                            : t.chatNoContextHint}
                          {typeof m.latencyMs === 'number' && (
                            <span className="tabular-nums"> · {m.latencyMs} ms</span>
                          )}
                        </p>
                      </div>

                      {m.citations && m.citations.length > 0 && (
                        <div className="bg-white border border-teal-100 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-semibold text-teal-900">
                            {t.chatCitationsTitle}
                          </p>
                          <div className="divide-y divide-slate-100">
                            {m.citations.map((c) => (
                              <div key={c.chunkId} className="py-2 first:pt-0 last:pb-0 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-slate-900">{c.title}</span>
                                  <span className="text-slate-500 font-mono tabular-nums">
                                    {c.pageNumber ? `Page ${c.pageNumber}` : 'Scheme Record'} ·{' '}
                                    {c.isSample ? 'Sample' : 'Uploaded PDF'}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-slate-500">
                                  {c.documentName}
                                  {c.officialUrl && (
                                    <>
                                      {' · '}
                                      <a
                                        href={c.officialUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal-700 hover:underline inline-flex items-center gap-0.5"
                                      >
                                        <span>{t.officialPortal}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </>
                                  )}
                                  {c.schemeSlug && (
                                    <>
                                      {' · '}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          navigate('scheme-details', { schemeSlug: c.schemeSlug })
                                        }
                                        className="text-teal-700 hover:underline cursor-pointer"
                                      >
                                        {t.viewDetails}
                                      </button>
                                    </>
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}

            {loading && <RagThinkingBanner language={language} mode="chat" />}

            {error && (
              <div className="flex items-start gap-2.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-200 p-3.5 flex flex-wrap sm:flex-nowrap items-center gap-2.5 bg-white rounded-b-xl"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chatPlaceholder}
              aria-label={t.chatPlaceholder}
              disabled={loading}
              className="flex-1 min-w-[180px] px-3.5 py-2.5 min-h-[44px] text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:bg-white"
            />
            <div className="flex items-center gap-2 shrink-0">
              <VoiceRecorderButton
                language={language}
                disabled={loading}
                onTranscribed={(spokenText, detectedLang) => {
                  setLanguage(detectedLang);
                  setAutoSpeak(true);
                  sendMessage(spokenText);
                }}
                onError={(msg) => setError(msg)}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{t.chatSend}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Grounding Guardrails & Quick Starters */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-gradient-to-br from-teal-50/80 to-white border border-teal-200/70 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-teal-950">
              {language === 'te' ? 'ఖచ్చితత్వ నియమాలు' : 'Verification Guardrails'}
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li>
                {language === 'te'
                  ? '• నాలెడ్జ్ బేస్‌లో ఉన్న సమాచారం నుండి మాత్రమే సమాధానాలు వస్తాయి.'
                  : '• Answers strictly use retrieved scheme records and indexed PDFs.'}
              </li>
              <li>
                {language === 'te'
                  ? '• ధృవీకరించని పథకాల తేదీలు లేదా నియమాలు కల్పించబడవు.'
                  : '• If no verified information exists, the assistant explicitly notifies you.'}
              </li>
              <li>
                {language === 'te'
                  ? '• తెలుగు ప్రశ్నలకు ఆటోమేటిక్‌గా తెలుగులో సమాధానం అందుతుంది.'
                  : '• Auto-detects Telugu Unicode script and replies in simple Telugu or English.'}
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-slate-900">
              {language === 'te' ? 'సత్వర ప్రశ్నలు' : 'Sample Questions'}
            </h2>
            <div className="space-y-2">
              {starterPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendMessage(p)}
                  disabled={loading}
                  className="w-full text-left text-xs text-slate-700 hover:text-teal-800 py-2 px-3 bg-slate-50 hover:bg-teal-50 rounded-lg border border-slate-200 hover:border-teal-200 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

