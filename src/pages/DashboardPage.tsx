import { useEffect, useState } from 'react';
import {
  Bookmark,
  ClipboardList,
  Clock,
  FileCheck2,
  FileText,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { APPLICATION_STAGES, CATEGORY_LABELS } from '../i18n/translations';
import { api } from '../services/api';
import { PWAInstallButton } from '../components/PWAInstallButton';
import type { TrackedApplication } from '../types';

export function DashboardPage() {
  const {
    language,
    t,
    schemes,
    bookmarkedIds,
    toggleBookmark,
    recentQueries,
    navigate,
    citizenUser,
    logoutCitizen,
    sessionId,
  } = useApp();

  const [tracked, setTracked] = useState<TrackedApplication[]>([]);

  useEffect(() => {
    api
      .getTrackedApplications(sessionId)
      .then((res) => setTracked(res.items))
      .catch(() => {});
  }, [sessionId, citizenUser?.id]);

  const savedSchemes = schemes.filter((s) => bookmarkedIds.includes(s.id));

  const quickActions = [
    {
      route: 'chat' as const,
      icon: MessageSquare,
      iconBox: 'bg-teal-100 text-teal-800',
      borderHover: 'hover:border-teal-300',
      title: t.navChat,
      desc:
        language === 'te'
          ? 'తెలుగు లేదా ఇంగ్లీష్‌లో పథకాలపై సందేహాలు అడగండి.'
          : 'Ask RAG-grounded questions in English or Telugu.',
    },
    {
      route: 'eligibility' as const,
      icon: ShieldCheck,
      iconBox: 'bg-emerald-100 text-emerald-800',
      borderHover: 'hover:border-emerald-300',
      title: t.checkEligibility,
      desc:
        language === 'te'
          ? 'ఆదాయం, వయస్సు ఆధారంగా ప్రాథమిక అర్హత పరిశీలన.'
          : 'Preliminary check against published guidelines.',
    },
    {
      route: 'checklist' as const,
      icon: FileCheck2,
      iconBox: 'bg-amber-100 text-amber-800',
      borderHover: 'hover:border-amber-300',
      title: t.generateChecklist,
      desc:
        language === 'te'
          ? 'దరఖాస్తుకు కావలసిన పత్రాల జాబితా ప్రింట్ చేయండి.'
          : 'Download or print official document checklists.',
    },
    {
      route: 'pdf-assistant' as const,
      icon: FileText,
      iconBox: 'bg-sky-100 text-sky-800',
      borderHover: 'hover:border-sky-300',
      title: t.navPdf,
      desc:
        language === 'te'
          ? 'ప్రభుత్వ లేఖల ఫోటో లేదా PDF లను తెలుగు/ఇంగ్లీష్‌లో సులభంగా చదవండి.'
          : 'Snap government letter photos or query PDF notifications.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-medium text-teal-800">
            Andhra Pradesh ·{' '}
            {citizenUser
              ? `${citizenUser.full_name} · ${citizenUser.district} · ${citizenUser.occupation}`
              : language === 'te'
              ? 'వ్యక్తిగత పౌర సహాయ కేంద్రం'
              : 'Citizen Self-Service'}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {citizenUser
              ? language === 'te'
                ? `స్వాగతం, ${citizenUser.full_name}`
                : `Welcome, ${citizenUser.full_name}`
              : t.dashboardTitle}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">{t.dashboardSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {citizenUser ? (
            <button
              type="button"
              onClick={logoutCitizen}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {language === 'te' ? 'సైన్ అవుట్' : 'Sign Out'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('auth', { authMode: 'register' })}
              className="px-4 py-2.5 bg-white hover:bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {language === 'te' ? 'సైన్ ఇన్ / కొత్త ఖాతా' : 'Sign In / Create Account'}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('helplines')}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {language === 'te' ? 'హెల్ప్‌లైన్‌లు & కేంద్రాలు' : 'Helplines & Centers'}
          </button>
          <PWAInstallButton variant="card" />
          <button
            type="button"
            onClick={() => navigate('chat')}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.heroAskBtn}
          </button>
        </div>
      </div>

      {/* Quick Citizen Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.route}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              onClick={() => navigate(card.route)}
              className={`text-left p-5 bg-white border border-slate-200 ${card.borderHover} hover:shadow-sm rounded-xl transition-all cursor-pointer`}
            >
              <span className={`w-9 h-9 rounded-lg inline-flex items-center justify-center mb-3 ${card.iconBox}`}>
                <Icon className="w-4 h-4" />
              </span>
              <h2 className="font-semibold text-sm text-slate-900">{card.title}</h2>
              <p className="mt-1 text-xs text-slate-600">{card.desc}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Saved Schemes & Recent Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-teal-700" />
              <span>
                {language === 'te' ? 'సేవ్ చేసిన పథకాలు' : 'Saved Schemes'} (
                <span className="tabular-nums">{savedSchemes.length}</span>)
              </span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('schemes')}
              className="text-xs font-medium text-teal-700 hover:underline cursor-pointer"
            >
              {t.heroExploreBtn}
            </button>
          </div>

          {savedSchemes.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
              <p className="text-sm text-slate-600">
                {language === 'te'
                  ? 'మీరు ఇంకా ఏ పథకాలను సేవ్ చేయలేదు. పథకాల పేజీలో బుక్‌మార్క్ చేయండి.'
                  : 'No schemes bookmarked yet. Bookmark any scheme from the Explorer for quick access.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('schemes')}
                className="mt-3 px-4 py-2 text-xs font-medium bg-teal-700 hover:bg-teal-800 text-white rounded-lg cursor-pointer"
              >
                {t.navSchemes}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {savedSchemes.map((s) => (
                <div key={s.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      {CATEGORY_LABELS[s.category]?.[language] || s.category} ·{' '}
                      {s.is_sample
                        ? language === 'te'
                          ? 'నమూనా రికార్డు'
                          : 'Sample Record'
                        : 'Verified'}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('scheme-details', { schemeSlug: s.slug })}
                      className="mt-0.5 font-medium text-sm text-slate-900 hover:text-teal-700 text-left cursor-pointer"
                    >
                      {language === 'te' ? s.title_te : s.title_en}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(s.id)}
                    className="text-xs text-slate-500 hover:text-rose-600 cursor-pointer shrink-0"
                  >
                    {language === 'te' ? 'తొలగించు' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-teal-700" />
            <span>{language === 'te' ? 'ఇటీవలి ప్రశ్నలు' : 'Recent Questions'}</span>
          </h2>

          {recentQueries.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
              <p className="text-sm text-slate-600">
                {language === 'te'
                  ? 'మీ ఇటీవలి AI ప్రశ్నలు ఇక్కడ కనిపిస్తాయి.'
                  : 'Your recent AI Chatbot questions will appear here for quick replay.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentQueries.map((item, idx) => (
                <button
                  key={`${item.timestamp}_${idx}`}
                  type="button"
                  onClick={() => navigate('chat', { chatPrompt: item.question })}
                  className="w-full text-left py-3 hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <p className="text-sm text-slate-800 line-clamp-2">{item.question}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.language === 'te' ? 'తెలుగు' : 'English'} ·{' '}
                    {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Application & Document Progress Tracker */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-teal-700" />
            <span>
              {language === 'te'
                ? 'నా దరఖాస్తు & పత్రాల పురోగతి'
                : 'My Application & Document Tracker'}{' '}
              (<span className="tabular-nums">{tracked.length}</span>)
            </span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('checklist')}
            className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
          >
            {language === 'te' ? 'చెక్‌లిస్ట్ తెరవండి →' : 'Open Checklist & Tracker →'}
          </button>
        </div>

        {tracked.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg space-y-2">
            <p className="text-sm text-slate-600">
              {language === 'te'
                ? 'మీరు సిద్ధం చేస్తున్న పత్రాలను మరియు దరఖాస్తు దశలను సేవ్ చేయడానికి పత్రాల జాబితాలో ఏదైనా పథకాన్ని ఎంచుకోండి.'
                : 'Track documents you have collected and your application stage (Applied, e-KYC, Approved) from any scheme checklist.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('checklist')}
              className="px-4 py-2 text-xs font-medium bg-teal-700 hover:bg-teal-800 text-white rounded-lg cursor-pointer"
            >
              {t.generateChecklist}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracked.map((item) => {
              const stageObj = APPLICATION_STAGES.find((st) => st.id === item.stage);
              const total = Math.max(1, item.total_documents);
              const ready = item.checked_doc_ids.length;
              const pct = Math.min(100, Math.round((ready / total) * 100));
              return (
                <div
                  key={item.scheme_id}
                  className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <p className="text-xs text-slate-500">
                      <span
                        className={
                          item.stage === 'approved'
                            ? 'font-semibold text-emerald-700'
                            : 'font-semibold text-teal-700'
                        }
                      >
                        {stageObj
                          ? language === 'te'
                            ? stageObj.te
                            : stageObj.en
                          : item.stage}
                      </span>
                      {item.application_ref && (
                        <>
                          {' '}
                          · <span className="font-mono">{item.application_ref}</span>
                        </>
                      )}
                    </p>
                    <h3 className="mt-1 font-semibold text-sm text-slate-900">
                      {language === 'te' ? item.scheme_title_te : item.scheme_title_en}
                    </h3>
                    {item.notes && (
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.notes}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                      <span>
                        {language === 'te' ? 'పత్రాల సిద్ధత' : 'Document Readiness'}
                      </span>
                      <span className="font-mono font-semibold">
                        {ready}/{item.total_documents} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => navigate('checklist', { schemeSlug: item.scheme_slug })}
                        className="font-semibold text-teal-700 hover:underline cursor-pointer"
                      >
                        {language === 'te' ? 'పురోగతి నవీకరించండి' : 'Update Progress'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteTrackedApplication(item.scheme_id, sessionId);
                          setTracked((prev) => prev.filter((x) => x.scheme_id !== item.scheme_id));
                        }}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        {language === 'te' ? 'తొలగించు' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
