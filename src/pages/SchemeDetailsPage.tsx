import { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, ClipboardCheck, ExternalLink, FileCheck2, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { APPLICATION_STAGES, CATEGORY_LABELS } from '../i18n/translations';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { ShareSchemeButton } from '../components/ShareSchemeButton';
import type { Scheme, TrackedApplication } from '../types';

export function SchemeDetailsPage() {
  const {
    language,
    t,
    schemes,
    selectedSchemeSlug,
    navigate,
    bookmarkedIds,
    toggleBookmark,
    sessionId,
    citizenUser,
  } = useApp();

  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackedItem, setTrackedItem] = useState<TrackedApplication | null>(null);

  useEffect(() => {
    const slug = selectedSchemeSlug || schemes[0]?.slug;
    if (!slug) return;
    setLoading(true);
    api
      .getScheme(slug)
      .then(setScheme)
      .catch(() => {
        const local = schemes.find((s) => s.slug === slug) || schemes[0] || null;
        setScheme(local);
      })
      .finally(() => setLoading(false));
  }, [selectedSchemeSlug, schemes]);

  useEffect(() => {
    if (!scheme) return;
    api
      .getTrackedApplications(sessionId)
      .then((res) => {
        setTrackedItem(res.items.find((i) => i.scheme_id === scheme.id) || null);
      })
      .catch(() => setTrackedItem(null));
  }, [scheme, sessionId, citizenUser?.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-sm text-slate-600">Scheme record not found.</p>
        <button
          type="button"
          onClick={() => navigate('schemes')}
          className="mt-4 px-4 py-2 text-sm bg-blue-700 text-white rounded-lg cursor-pointer"
        >
          {t.navSchemes}
        </button>
      </div>
    );
  }

  const isTe = language === 'te';
  const bookmarked = bookmarkedIds.includes(scheme.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <button
        type="button"
        onClick={() => navigate('schemes')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.navSchemes}</span>
      </button>

      {/* Main Overview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">
              {CATEGORY_LABELS[scheme.category]?.[language] || scheme.category} · {scheme.state} ·{' '}
              <span
                className={
                  scheme.scheme_status === 'previous'
                    ? 'font-semibold text-amber-700'
                    : 'font-semibold text-emerald-700'
                }
              >
                {scheme.scheme_status === 'previous'
                  ? isTe
                    ? 'గత పథకం (ఆర్కైవ్)'
                    : 'Previous / Legacy Scheme'
                  : isTe
                  ? 'ప్రస్తుత పథకం'
                  : 'Active'}
              </span>{' '}
              ·{' '}
              {scheme.is_sample
                ? isTe
                  ? 'నమూనా రికార్డు'
                  : 'Sample Knowledge Base Record'
                : 'Verified Record'}{' '}
              · {isTe ? 'చివరి ధృవీకరణ:' : 'Verified:'}{' '}
              <span className="tabular-nums">{scheme.last_verified_at}</span>
            </p>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {isTe ? scheme.title_te : scheme.title_en}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isTe ? scheme.department_name_te : scheme.department_name_en}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ReadAloudButton
              language={language}
              text={`${isTe ? scheme.title_te : scheme.title_en}. ${
                isTe ? scheme.short_desc_te : scheme.short_desc_en
              }. ${isTe ? scheme.eligibility_summary_te : scheme.eligibility_summary_en}`}
            />
            <button
              type="button"
              onClick={() => toggleBookmark(scheme.id)}
              className={`px-3.5 py-2 min-h-[44px] text-xs font-medium rounded-lg border inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
                bookmarked
                  ? 'bg-teal-50 border-teal-200 text-teal-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={bookmarked ? 'currentColor' : 'none'} />
              <span>
                {bookmarked
                  ? isTe
                    ? 'సేవ్ చేయబడింది'
                    : 'Saved'
                  : isTe
                  ? 'సేవ్ చేయండి'
                  : 'Save Scheme'}
              </span>
            </button>
            <ShareSchemeButton scheme={scheme} />
          </div>
        </div>

        {scheme.scheme_status === 'previous' && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs sm:text-sm text-amber-950 leading-relaxed">
            <span className="font-semibold">
              {isTe ? 'చారిత్రక రిఫరెన్స్ గమనిక:' : 'Historical Reference Notice:'}
            </span>{' '}
            {isTe
              ? 'ఇది గతంలో (2019–2024) అమలులో ఉన్న పథకం రికార్డు. ప్రస్తుత అర్హత, నవీకరించబడిన పథకం పేరు మరియు తాజా దరఖాస్తు వివరాల కోసం అధికారిక ప్రభుత్వ పోర్టల్‌ను పరిశీలించండి.'
              : 'This entry documents a previous-cycle Andhra Pradesh welfare scheme (2019–2024) for citizen & academic reference. Review the successor scheme notes below and confirm current circulars on the official government portal.'}
          </div>
        )}

        <p className="text-base text-slate-700 leading-relaxed">
          {isTe ? scheme.short_desc_te : scheme.short_desc_en}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isTe ? 'ప్రయోజనం / సహాయం' : 'Benefit Summary'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              {isTe ? scheme.benefit_summary_te : scheme.benefit_summary_en}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isTe ? 'అర్హత సారాంశం' : 'Eligibility Summary'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              {isTe ? scheme.eligibility_summary_te : scheme.eligibility_summary_en}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('eligibility', { schemeSlug: scheme.slug })}
            className="px-4 py-2.5 text-sm font-medium bg-teal-700 hover:bg-teal-800 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t.checkEligibility}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('checklist', { schemeSlug: scheme.slug })}
            className="px-4 py-2.5 text-sm font-medium bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200/70 rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            {trackedItem ? <ClipboardCheck className="w-4 h-4" /> : <FileCheck2 className="w-4 h-4" />}
            <span>
              {trackedItem
                ? isTe
                  ? `ట్రాకర్ (${trackedItem.checked_doc_ids.length}/${scheme.documents.length})`
                  : `Tracked (${trackedItem.checked_doc_ids.length}/${scheme.documents.length} docs)`
                : t.generateChecklist}
            </span>
          </button>
          <a
            href={scheme.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 text-sm font-medium border border-slate-200 hover:border-teal-300 text-teal-700 hover:text-amber-700 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <span>{t.officialPortal}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={() => navigate('helplines')}
            className="px-4 py-2.5 text-sm font-medium border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800 rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>{isTe ? 'హెల్ప్‌లైన్ & సమీప కేంద్రం' : 'Helplines & Local Centers'}</span>
          </button>
        </div>
        {trackedItem && (
          <p className="text-xs text-teal-800 font-medium">
            {isTe ? 'ప్రస్తుత దశ:' : 'Saved Progress Stage:'}{' '}
            {APPLICATION_STAGES.find((st) => st.id === trackedItem.stage)?.[language] ||
              trackedItem.stage}
            {trackedItem.application_ref ? ` · ${trackedItem.application_ref}` : ''}
          </p>
        )}
      </div>

      {/* Required Documents */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">
          {isTe ? 'అవసరమైన పత్రాలు' : 'Required & Conditional Documents'}
        </h2>
        <div className="divide-y divide-slate-100">
          {scheme.documents.map((doc) => (
            <div key={doc.id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isTe ? doc.name_te : doc.name_en}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {isTe ? doc.instructions_te : doc.instructions_en}
                </p>
                {!doc.required && (doc.condition_en || doc.condition_te) && (
                  <p className="mt-1 text-xs text-amber-700">
                    {isTe ? doc.condition_te : doc.condition_en}
                  </p>
                )}
              </div>
              <div className="text-xs text-slate-500 shrink-0 text-left sm:text-right">
                <span className={doc.required ? 'font-semibold text-teal-700' : 'font-medium text-amber-700'}>
                  {doc.required
                    ? isTe
                      ? 'తప్పనిసరి'
                      : 'Required'
                    : isTe
                    ? 'షరతులతో కూడినది'
                    : 'Conditional'}
                </span>
                <p className="mt-0.5 text-[11px] text-slate-400">{doc.source_reference}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Application Procedure & Source Reference */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">
          {isTe ? 'దరఖాస్తు విధానం' : 'Application Procedure'}
        </h2>
        <ol className="space-y-3">
          {(isTe ? scheme.application_steps_te : scheme.application_steps_en).map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
              <span className="font-mono text-xs font-semibold text-teal-700 tabular-nums mt-0.5">
                0{i + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            {isTe ? 'మూల పత్రం:' : 'Source Reference:'} {scheme.source_document_name}
          </span>
          <a
            href={scheme.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 hover:text-amber-700 hover:underline"
          >
            {scheme.official_url}
          </a>
        </div>
      </div>
    </div>
  );
}
