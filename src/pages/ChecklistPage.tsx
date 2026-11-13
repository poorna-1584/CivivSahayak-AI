import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  Loader2,
  Printer,
  Save,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { api, extractApiError } from '../services/api';
import { APPLICATION_STAGES } from '../i18n/translations';
import type { ApplicationStage, TrackedApplication } from '../types';

export function ChecklistPage() {
  const { language, t, schemes, selectedSchemeSlug, sessionId, citizenUser, navigate } = useApp();
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [stage, setStage] = useState<ApplicationStage>('collecting_docs');
  const [applicationRef, setApplicationRef] = useState('');
  const [notes, setNotes] = useState('');

  const [trackedItems, setTrackedItems] = useState<TrackedApplication[]>([]);
  const [ownerType, setOwnerType] = useState<'citizen' | 'session'>('session');
  const [saving, setSaving] = useState(false);
  const [savedAtText, setSavedAtText] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hydratedSchemeIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (schemes.length === 0) return;
    if (selectedSchemeSlug && schemes.some((s) => s.slug === selectedSchemeSlug)) {
      setSelectedSlug(selectedSchemeSlug);
    } else if (!selectedSlug) {
      setSelectedSlug(schemes[0].slug);
    }
  }, [schemes, selectedSchemeSlug, selectedSlug]);

  const loadTracker = async () => {
    try {
      const res = await api.getTrackedApplications(sessionId);
      setTrackedItems(res.items);
      setOwnerType(res.ownerType);
    } catch {
      // handled gracefully
    }
  };

  useEffect(() => {
    loadTracker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, citizenUser?.id]);

  const scheme = schemes.find((s) => s.slug === selectedSlug) || schemes[0];
  const isTe = language === 'te';

  // Hydrate saved state when selected scheme or trackedItems change
  useEffect(() => {
    if (!scheme) return;
    const saved = trackedItems.find((item) => item.scheme_id === scheme.id);
    if (saved) {
      const nextMap: Record<string, boolean> = {};
      for (const id of saved.checked_doc_ids) {
        nextMap[id] = true;
      }
      setCheckedIds(nextMap);
      setStage(saved.stage);
      setApplicationRef(saved.application_ref);
      setNotes(saved.notes);
      hydratedSchemeIdRef.current = scheme.id;
    } else if (hydratedSchemeIdRef.current !== scheme.id) {
      setCheckedIds({});
      setStage('collecting_docs');
      setApplicationRef('');
      setNotes('');
      hydratedSchemeIdRef.current = scheme.id;
    }
  }, [scheme, trackedItems]);

  const persistProgress = async (overrides?: {
    nextCheckedIds?: Record<string, boolean>;
    nextStage?: ApplicationStage;
    nextRef?: string;
    nextNotes?: string;
  }) => {
    if (!scheme) return;
    const map = overrides?.nextCheckedIds ?? checkedIds;
    const docIds = Object.entries(map)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    const nextStage = overrides?.nextStage ?? stage;
    const nextRef = overrides?.nextRef ?? applicationRef;
    const nextNotes = overrides?.nextNotes ?? notes;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.saveTrackedApplication(scheme.id, {
        sessionId,
        stage: nextStage,
        checkedDocIds: docIds,
        notes: nextNotes,
        applicationRef: nextRef,
      });
      setOwnerType(res.ownerType);
      setTrackedItems((prev) => {
        const filtered = prev.filter((item) => item.scheme_id !== scheme.id);
        return [res.item, ...filtered];
      });
      setSavedAtText(
        isTe
          ? res.ownerType === 'citizen'
            ? 'మీ ఖాతాలో సేవ్ చేయబడింది'
            : 'సెషన్‌లో సేవ్ చేయబడింది'
          : res.ownerType === 'citizen'
          ? 'Saved to your citizen account'
          : 'Saved to this browser session'
      );
    } catch (err) {
      setSaveError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleDoc = (id: string) => {
    const nextMap = { ...checkedIds, [id]: !checkedIds[id] };
    setCheckedIds(nextMap);
    persistProgress({ nextCheckedIds: nextMap });
  };

  const handleStageChange = (nextStage: ApplicationStage) => {
    setStage(nextStage);
    persistProgress({ nextStage });
  };

  const handleRemoveTracked = async (schemeId: number) => {
    try {
      await api.deleteTrackedApplication(schemeId, sessionId);
      setTrackedItems((prev) => prev.filter((i) => i.scheme_id !== schemeId));
      if (scheme && scheme.id === schemeId) {
        setCheckedIds({});
        setStage('collecting_docs');
        setApplicationRef('');
        setNotes('');
        setSavedAtText(null);
      }
    } catch {
      // ignore
    }
  };

  const totalDocs = scheme ? scheme.documents.length : 0;
  const readyDocs = scheme ? scheme.documents.filter((d) => checkedIds[d.id]).length : 0;
  const readinessRatio = totalDocs > 0 ? readyDocs / totalDocs : 0;
  const currentTracked = scheme ? trackedItems.find((i) => i.scheme_id === scheme.id) : undefined;

  const handleDownloadTxt = () => {
    if (!scheme) return;
    const stageObj = APPLICATION_STAGES.find((s) => s.id === stage);
    const lines = [
      `CivicSahayak AI — Document Checklist & Progress`,
      `Scheme: ${scheme.title_en} (${scheme.title_te})`,
      `Department: ${scheme.department_name_en || ''}`,
      `Application Stage: ${stageObj ? stageObj.en : stage}`,
      applicationRef ? `Application Reference ID: ${applicationRef}` : '',
      notes ? `Citizen Notes: ${notes}` : '',
      `Official Portal: ${scheme.official_url}`,
      `Last Verified: ${scheme.last_verified_at}`,
      ``,
      `DOCUMENTS:`,
      ...scheme.documents.map((doc, idx) => {
        const status = doc.required
          ? 'REQUIRED'
          : `CONDITIONAL (${doc.condition_en || 'If applicable'})`;
        const checked = checkedIds[doc.id] ? '[x]' : '[ ]';
        return `${idx + 1}. ${checked} ${doc.name_en} — ${status}\n   Instructions: ${doc.instructions_en}\n   Source: ${doc.source_reference}`;
      }),
    ].filter((l) => l !== '');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scheme.slug}-document-checklist.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="no-print border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t.checklistTitle}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">{t.checklistSubtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 min-h-[40px] text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printChecklist}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadTxt}
            className="px-4 py-2 min-h-[40px] text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadChecklist}</span>
          </button>
        </div>
      </div>

      {/* Sync / Account Hint + Tracked Schemes Quick Jump */}
      <div className="no-print space-y-4">
        {!citizenUser && (
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-teal-900">
            <span>
              {isTe
                ? 'మీ పత్రాలు & దరఖాస్తు దశలను శాశ్వతంగా సేవ్ చేయడానికి పౌర ఖాతాలోకి సైన్ ఇన్ చేయండి.'
                : 'Sign in to your citizen account to sync saved document checklists and application status across sessions.'}
            </span>
            <button
              type="button"
              onClick={() => navigate('auth', { authMode: 'login' })}
              className="font-semibold text-teal-800 hover:underline shrink-0 cursor-pointer"
            >
              {isTe ? 'సైన్ ఇన్ చేయండి →' : 'Sign In to Sync →'}
            </button>
          </div>
        )}

        {trackedItems.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-teal-700" />
                <span>
                  {isTe
                    ? `మీరు ట్రాక్ చేస్తున్న పథకాలు (${trackedItems.length})`
                    : `Your Tracked Applications (${trackedItems.length})`}
                </span>
              </p>
              <span className="text-[11px] text-slate-500">
                {ownerType === 'citizen'
                  ? isTe
                    ? 'ఖాతాకు సేవ్ చేయబడింది'
                    : 'Synced to Account'
                  : isTe
                  ? 'సెషన్ సేవ్'
                  : 'Session Saved'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trackedItems.map((item) => {
                const active = scheme?.id === item.scheme_id;
                const stageMeta = APPLICATION_STAGES.find((s) => s.id === item.stage);
                return (
                  <button
                    key={item.scheme_id}
                    type="button"
                    onClick={() => {
                      hydratedSchemeIdRef.current = null;
                      setSelectedSlug(item.scheme_slug);
                      setSavedAtText(null);
                    }}
                    className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      active
                        ? 'bg-teal-50 border-teal-300 text-teal-950 font-semibold'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <p className="line-clamp-1 max-w-[240px]">
                      {isTe ? item.scheme_title_te : item.scheme_title_en}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                      {stageMeta ? (isTe ? stageMeta.te : stageMeta.en) : item.stage} ·{' '}
                      {item.checked_doc_ids.length}/{item.total_documents}{' '}
                      {isTe ? 'పత్రాలు' : 'docs'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Scheme Selector */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5">
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          {isTe ? 'పథకాన్ని ఎంచుకోండి' : 'Select Scheme for Checklist & Progress Tracking'}
        </label>
        <select
          value={selectedSlug}
          onChange={(e) => {
            hydratedSchemeIdRef.current = null;
            setSelectedSlug(e.target.value);
            setSavedAtText(null);
          }}
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
        >
          {schemes.map((s) => (
            <option key={s.id} value={s.slug}>
              {isTe ? s.title_te : s.title_en}
            </option>
          ))}
        </select>
      </div>

      {/* Printable Checklist Sheet + Application Tracker */}
      {scheme && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                {scheme.is_sample
                  ? isTe
                    ? 'నమూనా మార్గదర్శక పత్రాల జాబితా'
                    : 'Sample Guideline Checklist'
                  : 'Official Checklist'}{' '}
                · {isTe ? 'చివరి ధృవీకరణ:' : 'Verified:'}{' '}
                <span className="tabular-nums">{scheme.last_verified_at}</span>
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                {isTe ? scheme.title_te : scheme.title_en}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTe ? scheme.department_name_te : scheme.department_name_en}
              </p>
            </div>
            <div className="no-print flex items-center gap-3 shrink-0">
              {currentTracked && (
                <button
                  type="button"
                  onClick={() => handleRemoveTracked(scheme.id)}
                  className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isTe ? 'ట్రాకింగ్ తొలగించు' : 'Clear Saved'}</span>
                </button>
              )}
              <a
                href={scheme.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-amber-700 hover:underline shrink-0"
              >
                <span>{t.officialPortal}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 4-Stage Application Progress Tracker */}
          <div className="no-print bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                {isTe ? 'దరఖాస్తు దశ ట్రాకర్' : 'Application Stage Tracker'}
              </h3>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                    <span>{isTe ? 'సేవ్ చేస్తోంది...' : 'Saving...'}</span>
                  </>
                ) : savedAtText ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-800 font-medium">{savedAtText}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {APPLICATION_STAGES.map((st, idx) => {
                const selected = stage === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStageChange(st.id)}
                    className={`px-3 py-2.5 min-h-[44px] rounded-lg border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-teal-700 border-teal-700 text-white font-semibold'
                        : 'bg-white border-slate-200 hover:border-teal-300 text-slate-700'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-mono tabular-nums ${
                        selected ? 'text-teal-100' : 'text-slate-400'
                      }`}
                    >
                      0{idx + 1}
                    </p>
                    <p className="text-xs leading-snug mt-0.5">{isTe ? st.te : st.en}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {isTe ? 'దరఖాస్తు ఐడి / రసీదు సంఖ్య (ఐచ్ఛికం)' : 'Application / Receipt ID (Optional)'}
                </label>
                <input
                  type="text"
                  value={applicationRef}
                  onChange={(e) => setApplicationRef(e.target.value)}
                  placeholder={isTe ? 'ఉదా: AP2026-88412' : 'e.g., JNB-2026-10492'}
                  className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {isTe ? 'మీ గమనిక (సచివాలయం / తేదీ)' : 'Personal Reminder Note (Sachivalayam / Date)'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isTe
                      ? 'ఉదా: సోమవారం MRO ఆఫీసులో ఆదాయ పత్రం'
                      : 'e.g., Visit Ward Sachivalayam for biometric e-KYC'
                  }
                  className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={() => persistProgress()}
                  disabled={saving}
                  className="w-full px-3 py-2 min-h-[40px] bg-white hover:bg-teal-50 border border-teal-300 text-teal-800 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isTe ? 'సేవ్' : 'Save'}</span>
                </button>
              </div>
            </div>

            {saveError && <p className="text-xs text-rose-700">{saveError}</p>}
          </div>

          {/* Animated Document Readiness Meter */}
          <div className="no-print bg-teal-50/60 border border-teal-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
              <span>{isTe ? 'సిద్ధమైన పత్రాల పురోగతి' : 'Document Readiness Progress'}</span>
              <span className="font-mono tabular-nums">
                {readyDocs} / {totalDocs} {isTe ? 'సిద్ధం' : 'ready'}
              </span>
            </div>
            <div className="h-2 w-full bg-teal-100 rounded-full overflow-hidden">
              <motion.div
                initial={false}
                animate={{ scaleX: readinessRatio }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left center' }}
                className="h-full w-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {scheme.documents.map((doc) => {
              const checked = Boolean(checkedIds[doc.id]);
              return (
                <label
                  key={doc.id}
                  className="py-4 flex items-start gap-3.5 cursor-pointer hover:bg-teal-50/40 px-2 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDoc(doc.id)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-700"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          checked ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {isTe ? doc.name_te : doc.name_en}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          doc.required ? 'text-teal-700' : 'text-amber-700'
                        }`}
                      >
                        {doc.required
                          ? isTe
                            ? 'తప్పనిసరి (Required)'
                            : 'Required'
                          : isTe
                          ? 'షరతులతో కూడినది (Conditional)'
                          : 'Conditional'}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {isTe ? doc.instructions_te : doc.instructions_en}
                    </p>
                    {!doc.required && (doc.condition_en || doc.condition_te) && (
                      <p className="mt-1 text-xs text-amber-800">
                        {isTe ? 'షరతు: ' : 'Condition: '}
                        {isTe ? doc.condition_te : doc.condition_en}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">
                      {isTe ? 'మూలం:' : 'Source Reference:'} {doc.source_reference}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <p className="pt-4 border-t border-slate-200 text-xs text-slate-500">
            {isTe
              ? 'గమనిక: అధికారిక నోటిఫికేషన్‌లో తప్పనిసరి అని నిర్ధారించబడిన పత్రాలు మాత్రమే "తప్పనిసరి"గా గుర్తించబడ్డాయి.'
              : 'Note: Only documents explicitly confirmed by the scheme guidelines are marked Required; conditional items apply only under the stated conditions.'}
          </p>
        </div>
      )}
    </div>
  );
}
