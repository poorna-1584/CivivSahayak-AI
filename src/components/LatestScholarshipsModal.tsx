import { useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  Check,
  ExternalLink,
  Globe,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { api, extractApiError } from '../services/api';
import { ReadAloudButton } from './ReadAloudButton';
import type { LiveScholarshipUpdate } from '../types';

const POPUP_DISMISS_DATE_KEY = 'civicsahayak_scholarship_popup_date';

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LatestScholarshipsModal() {
  const {
    language,
    t,
    navigate,
    citizenUser,
    latestScholarships,
    alerts,
    unseenAlertCount,
    markAlertsSeen,
    refreshAlerts,
    browserAlertPermission,
    enableBrowserAlerts,
    scholarshipsModalOpen,
    closeScholarshipsModal,
  } = useApp();

  const isTe = language === 'te';
  const [activeTab, setActiveTab] = useState<'records' | 'alerts' | 'live'>('records');
  const [liveFocus, setLiveFocus] = useState<'all' | 'scholarships'>('all');
  const [hideToday, setHideToday] = useState<boolean>(() => {
    try {
      return localStorage.getItem(POPUP_DISMISS_DATE_KEY) === getTodayDateString();
    } catch {
      return false;
    }
  });

  const [liveData, setLiveData] = useState<LiveScholarshipUpdate | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    if (!scholarshipsModalOpen) return;
    if (unseenAlertCount > 0 && activeTab === 'records') {
      // Mark seen when user reviews alerts or closes
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeScholarshipsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scholarshipsModalOpen, closeScholarshipsModal, unseenAlertCount, activeTab]);

  const handleFetchLive = async (focusOverride?: 'all' | 'scholarships') => {
    const targetFocus = focusOverride || liveFocus;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await api.checkLiveSchemeAlerts(language, targetFocus);
      setLiveData(res);
      await refreshAlerts();
    } catch (err) {
      setLiveError(extractApiError(err));
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    if (
      scholarshipsModalOpen &&
      activeTab === 'live' &&
      (!liveData || liveData.language !== language || liveData.focus !== liveFocus) &&
      !liveLoading
    ) {
      handleFetchLive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scholarshipsModalOpen, activeTab, language, liveFocus]);

  const handleTabChange = (tab: 'records' | 'alerts' | 'live') => {
    setActiveTab(tab);
    if (tab === 'alerts') {
      markAlertsSeen();
    }
  };

  const handleToggleHideToday = (checked: boolean) => {
    setHideToday(checked);
    try {
      if (checked) {
        localStorage.setItem(POPUP_DISMISS_DATE_KEY, getTodayDateString());
      } else {
        localStorage.removeItem(POPUP_DISMISS_DATE_KEY);
      }
    } catch {
      // Ignore storage failures
    }
  };

  const handleNavigateAndClose = (
    nextRoute: 'schemes' | 'scheme-details' | 'eligibility' | 'admin-login',
    schemeSlug?: string
  ) => {
    closeScholarshipsModal();
    navigate(nextRoute, schemeSlug ? { schemeSlug } : undefined);
  };

  const alertTypeLabel = (type: string) => {
    if (type === 'scholarship') return isTe ? 'స్కాలర్‌షిప్' : 'Scholarship';
    if (type === 'pdf_notification') return isTe ? 'అధికారిక PDF' : 'Official PDF';
    if (type === 'live_update') return isTe ? 'లైవ్ వెబ్ అప్‌డేట్' : 'Live Web Update';
    return isTe ? 'కొత్త పథకం' : 'New Scheme';
  };

  return (
    <AnimatePresence>
      {citizenUser && scholarshipsModalOpen && (
        <motion.div
          key="latest-scholarships-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={closeScholarshipsModal}
          className="fixed inset-0 z-50 bg-[#0B252E]/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <motion.div
            key="latest-scholarships-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="latest-scholarships-heading"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[88vh] bg-white border border-teal-200/80 rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Top gradient civic stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-600 via-teal-600 to-amber-500 shrink-0" />

            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-gradient-to-b from-sky-50/60 to-white shrink-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-teal-800">
                    {isTe
                      ? 'ఆంధ్రప్రదేశ్ పౌర అలర్ట్‌లు · స్కాలర్‌షిప్‌లు & కొత్త పథకాలు'
                      : 'Andhra Pradesh Citizen Alerts · Scholarships & New Schemes'}
                  </p>
                  <h2
                    id="latest-scholarships-heading"
                    className="mt-0.5 font-display text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
                  >
                    {isTe
                      ? 'తాజా స్కాలర్‌షిప్‌లు & కొత్త పథకాల అలర్ట్‌లు'
                      : 'Latest Scholarships & New Scheme Alerts'}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeScholarshipsModal}
                aria-label={isTe ? 'పాప్-అప్ మూసివేయండి' : 'Close latest alerts dialog'}
                className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Mode Tabs + Browser Alert Toggle */}
            <div className="px-5 sm:px-6 pt-3 pb-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div
                role="tablist"
                aria-label={isTe ? 'అప్‌డేట్ విభాగాలు' : 'Scheme alert tabs'}
                className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'records'}
                  onClick={() => handleTabChange('records')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'records'
                      ? 'bg-white text-teal-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isTe
                    ? `స్కాలర్‌షిప్‌లు (${latestScholarships.length})`
                    : `Scholarships (${latestScholarships.length})`}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'alerts'}
                  onClick={() => handleTabChange('alerts')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                    activeTab === 'alerts'
                      ? 'bg-white text-teal-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {isTe ? `అన్ని అలర్ట్‌లు (${alerts.length})` : `All Alerts (${alerts.length})`}
                  </span>
                  {unseenAlertCount > 0 && (
                    <span className="font-mono text-[11px] font-semibold text-amber-700">
                      · {unseenAlertCount} {isTe ? 'కొత్తవి' : 'new'}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'live'}
                  onClick={() => handleTabChange('live')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                    activeTab === 'live'
                      ? 'bg-white text-teal-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  <span>{isTe ? 'లైవ్ వెబ్ అప్‌డేట్లు' : 'Live Web Updates'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {browserAlertPermission !== 'unsupported' && (
                  <button
                    type="button"
                    onClick={enableBrowserAlerts}
                    disabled={browserAlertPermission === 'granted' || browserAlertPermission === 'denied'}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                      browserAlertPermission === 'granted'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-default'
                        : browserAlertPermission === 'denied'
                        ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 cursor-pointer'
                    }`}
                  >
                    {browserAlertPermission === 'granted' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {browserAlertPermission === 'granted'
                        ? isTe
                          ? 'బ్రౌజర్ అలర్ట్‌లు ఆన్‌లో ఉన్నాయి'
                          : 'Browser Alerts On'
                        : browserAlertPermission === 'denied'
                        ? isTe
                          ? 'బ్రౌజర్‌లో బ్లాక్ చేయబడింది'
                          : 'Alerts Blocked'
                        : isTe
                        ? 'బ్రౌజర్ అలర్ట్‌లు ఆన్ చేయండి'
                        : 'Enable Browser Alerts'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleNavigateAndClose('admin-login')}
                  className="text-xs font-medium text-teal-700 hover:text-amber-700 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isTe ? '+ కొత్తవి జోడించండి' : '+ Publish Scheme'}
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-[#F6F8F7]">
              {activeTab === 'records' ? (
                latestScholarships.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
                    {isTe
                      ? 'ప్రస్తుతం విద్యా మరియు స్కాలర్‌షిప్ విభాగంలో పథకాలు లేవు.'
                      : 'No scholarship schemes are currently saved in the knowledge base.'}
                  </div>
                ) : (
                  latestScholarships.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white border border-slate-200 hover:border-teal-300 rounded-xl overflow-hidden transition-colors"
                    >
                      <div className="h-1 w-full bg-sky-600" />
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500">
                              {s.state} ·{' '}
                              {s.is_sample
                                ? isTe
                                  ? 'నమూనా రికార్డు'
                                  : 'Sample Record'
                                : isTe
                                ? 'ధృవీకరించబడింది'
                                : 'Verified'}{' '}
                              · <span className="tabular-nums">{s.last_verified_at}</span>
                            </p>
                            <h3 className="mt-1 font-display text-base sm:text-lg font-semibold text-slate-900">
                              {isTe ? s.title_te : s.title_en}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {isTe ? s.department_name_te : s.department_name_en}
                            </p>
                          </div>

                          <ReadAloudButton
                            language={language}
                            text={`${isTe ? s.title_te : s.title_en}. ${
                              isTe ? s.short_desc_te : s.short_desc_en
                            } ${isTe ? s.eligibility_summary_te : s.eligibility_summary_en}`}
                          />
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed">
                          {isTe ? s.short_desc_te : s.short_desc_en}
                        </p>

                        <p className="text-xs text-slate-600 bg-[#F8FAF9] border border-teal-100 rounded-lg p-3 leading-relaxed">
                          <span className="font-semibold text-slate-800">
                            {isTe ? 'అర్హత & ప్రయోజనం: ' : 'Eligibility & Benefit: '}
                          </span>
                          {isTe ? s.eligibility_summary_te : s.eligibility_summary_en}
                        </p>

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleNavigateAndClose('scheme-details', s.slug)}
                              className="px-3.5 py-2 min-h-[40px] text-xs font-medium bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {t.viewDetails}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNavigateAndClose('eligibility', s.slug)}
                              className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{t.checkEligibility}</span>
                            </button>
                          </div>

                          <a
                            href={s.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-amber-700 hover:underline whitespace-nowrap shrink-0"
                          >
                            <span>{t.officialPortal}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : activeTab === 'alerts' ? (
                alerts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
                    {isTe ? 'ఇంకా కొత్త పథకం అలర్ట్‌లు నమోదు కాలేదు.' : 'No scheme alerts recorded yet.'}
                  </div>
                ) : (
                  alerts.map((al) => (
                    <div
                      key={al.id}
                      className="bg-white border border-slate-200 hover:border-teal-300 rounded-xl overflow-hidden transition-colors"
                    >
                      <div
                        className={`h-1 w-full ${
                          al.alert_type === 'scholarship'
                            ? 'bg-sky-600'
                            : al.alert_type === 'live_update'
                            ? 'bg-emerald-600'
                            : al.alert_type === 'pdf_notification'
                            ? 'bg-amber-500'
                            : 'bg-teal-600'
                        }`}
                      />
                      <div className="p-4 sm:p-5 space-y-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-slate-500">
                              {alertTypeLabel(al.alert_type)} · {al.category} ·{' '}
                              {al.is_sample
                                ? isTe
                                  ? 'నమూనా రికార్డు'
                                  : 'Sample Record'
                                : isTe
                                ? 'ధృవీకరించిన అలర్ట్'
                                : 'Published Alert'}{' '}
                              · <span className="tabular-nums">{al.published_at}</span>
                            </p>
                            <h3 className="mt-1 font-display text-base font-semibold text-slate-900">
                              {isTe ? al.title_te : al.title_en}
                            </h3>
                          </div>
                          <ReadAloudButton
                            language={language}
                            text={`${isTe ? al.title_te : al.title_en}. ${
                              isTe ? al.summary_te : al.summary_en
                            }`}
                          />
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {isTe ? al.summary_te : al.summary_en}
                        </p>
                        <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleNavigateAndClose('schemes')}
                            className="font-medium text-teal-700 hover:underline cursor-pointer"
                          >
                            {t.heroExploreBtn}
                          </button>
                          <a
                            href={al.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-teal-700 hover:text-amber-700 hover:underline"
                          >
                            <span>{t.officialPortal}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-display text-base font-semibold text-slate-900">
                        {isTe
                          ? 'అధికారిక పోర్టల్స్ నుండి తాజా పథకాలు & స్కాలర్‌షిప్‌లు'
                          : 'Live Official Schemes & Scholarships Search'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isTe
                          ? 'Google Search ఆధారంగా కొత్త AP & కేంద్ర ప్రభుత్వ పథకాల అప్‌డేట్లు.'
                          : 'Grounded via Google Search against official AP & Central portals.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setLiveFocus('all')}
                          className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                            liveFocus === 'all'
                              ? 'bg-white text-teal-900 shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          {isTe ? 'అన్ని పథకాలు' : 'All Schemes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLiveFocus('scholarships')}
                          className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                            liveFocus === 'scholarships'
                              ? 'bg-white text-teal-900 shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          {isTe ? 'స్కాలర్‌షిప్‌లు' : 'Scholarships'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFetchLive()}
                        disabled={liveLoading}
                        className="px-3.5 py-2 min-h-[38px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        {liveLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>{isTe ? 'రిఫ్రెష్' : 'Refresh'}</span>
                      </button>
                    </div>
                  </div>

                  {liveLoading ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="h-1.5 max-w-xs mx-auto bg-teal-100 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-gradient-to-r from-teal-600 via-sky-500 to-amber-500 animate-civic-signal rounded-full" />
                      </div>
                      <p className="text-xs text-slate-600">
                        {isTe
                          ? 'అధికారిక ప్రభుత్వ నోటిఫికేషన్లను శోధిస్తోంది...'
                          : 'Searching official government portals for latest announcements...'}
                      </p>
                    </div>
                  ) : liveError ? (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                      <p className="font-semibold">
                        {isTe
                          ? 'లైవ్ వెబ్ శోధన ప్రస్తుతం అందుబాటులో లేదు.'
                          : 'Live web search is unavailable right now.'}
                      </p>
                      <p>{liveError}</p>
                      <p className="text-slate-600">
                        {isTe
                          ? 'మీరు స్కాలర్‌షిప్‌లు లేదా అన్ని అలర్ట్‌లు ట్యాబ్‌లో సేవ్ చేసిన పథకాలను చూడవచ్చు.'
                          : 'You can browse saved scholarships and newly published scheme alerts in the first two tabs.'}
                      </p>
                    </div>
                  ) : liveData ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 tabular-nums">
                          {isTe ? 'అప్‌డేట్ సమయం:' : 'Updated:'}{' '}
                          {new Date(liveData.fetchedAt).toLocaleString()}
                        </span>
                        <ReadAloudButton language={language} text={liveData.summary} />
                      </div>

                      <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-[#F8FAF9] border border-teal-100 rounded-lg p-4">
                        {liveData.summary}
                      </div>

                      {liveData.sources.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-700">
                            {isTe ? 'ధృవీకరించబడిన వెబ్ లింక్‌లు:' : 'Verified Search Sources:'}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {liveData.sources.map((src) => (
                              <a
                                key={src.url}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-amber-700 hover:underline"
                              >
                                <span className="truncate max-w-[240px]">{src.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideToday}
                  onChange={(e) => handleToggleHideToday(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 accent-teal-700"
                />
                <span>
                  {isTe
                    ? 'ఈరోజు మళ్లీ ఆటోమేటిక్‌గా చూపించవద్దు'
                    : "Don't pop up automatically again today"}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleNavigateAndClose('schemes', 'Education and Scholarships')
                  }
                  className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isTe ? 'అన్ని స్కాలర్‌షిప్‌లు చూడండి' : 'Explore All Scholarships'}
                </button>
                <button
                  type="button"
                  onClick={closeScholarshipsModal}
                  className="px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isTe ? 'మూసివేయండి' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
