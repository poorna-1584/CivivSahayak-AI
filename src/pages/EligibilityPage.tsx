import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  Loader2,
  SearchCheck,
  ShieldCheck,
  Sprout,
  UserCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, extractApiError } from '../services/api';
import { AP_DISTRICTS, CATEGORY_LABELS } from '../i18n/translations';
import { ReadAloudButton } from '../components/ReadAloudButton';
import type { EligibilityResult, MultiSchemeMatchResult } from '../types';

export function EligibilityPage() {
  const { language, t, schemes, selectedSchemeSlug, citizenUser, navigate } = useApp();
  const isTe = language === 'te';

  const [checkerMode, setCheckerMode] = useState<'match-all' | 'single'>(() =>
    selectedSchemeSlug ? 'single' : 'match-all'
  );

  const [schemeId, setSchemeId] = useState<number>(0);
  const [age, setAge] = useState<number>(20);
  const [state, setState] = useState<string>('Andhra Pradesh');
  const [district, setDistrict] = useState<string>(citizenUser?.district || 'Guntur');
  const [educationLevel, setEducationLevel] = useState<string>('Undergraduate');
  const [occupation, setOccupation] = useState<string>(citizenUser?.occupation || 'Student');
  const [annualIncomeInr, setAnnualIncomeInr] = useState<number>(150000);
  const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');
  const [landAcres, setLandAcres] = useState<string>('');
  const [hasRationOrRiceCard, setHasRationOrRiceCard] = useState<boolean>(true);
  const [includePrevious, setIncludePrevious] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiSchemeMatchResult | null>(null);
  const [showUnmatched, setShowUnmatched] = useState(false);

  useEffect(() => {
    if (citizenUser) {
      if (citizenUser.district) setDistrict(citizenUser.district);
      if (citizenUser.occupation && citizenUser.occupation !== 'Citizen') {
        setOccupation(citizenUser.occupation);
      }
    }
  }, [citizenUser]);

  useEffect(() => {
    if (schemes.length === 0) return;
    if (selectedSchemeSlug) {
      const matched = schemes.find((s) => s.slug === selectedSchemeSlug);
      if (matched) {
        setSchemeId(matched.id);
        setCheckerMode('single');
        return;
      }
    }
    if (!schemeId) {
      setSchemeId(schemes[0].id);
    }
  }, [schemes, selectedSchemeSlug, schemeId]);

  const quickPresets = useMemo(
    () => [
      {
        id: 'farmer',
        label: isTe ? 'రైతు' : 'Farmer',
        icon: Sprout,
        accent: 'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100',
        apply: {
          occupation: 'Farmer',
          age: 42,
          gender: 'male' as const,
          educationLevel: 'None / Non-Formal',
          annualIncomeInr: 120000,
          landAcres: '2.5',
        },
      },
      {
        id: 'student',
        label: isTe ? 'విద్యార్థి' : 'Student',
        icon: GraduationCap,
        accent: 'border-sky-200 bg-sky-50/70 text-sky-900 hover:bg-sky-100',
        apply: {
          occupation: 'Student',
          age: 20,
          gender: 'female' as const,
          educationLevel: 'Undergraduate',
          annualIncomeInr: 150000,
          landAcres: '',
        },
      },
      {
        id: 'homemaker',
        label: isTe ? 'మహిళ / గృహిణి' : 'Woman / Homemaker',
        icon: HeartHandshake,
        accent: 'border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100',
        apply: {
          occupation: 'Homemaker',
          age: 34,
          gender: 'female' as const,
          educationLevel: 'Primary / High School (Class 1-10)',
          annualIncomeInr: 110000,
          landAcres: '',
        },
      },
      {
        id: 'senior',
        label: isTe ? 'వృద్ధులు (60+)' : 'Senior Citizen',
        icon: UserCheck,
        accent: 'border-teal-200 bg-teal-50/70 text-teal-900 hover:bg-teal-100',
        apply: {
          occupation: 'Senior Citizen',
          age: 65,
          gender: 'male' as const,
          educationLevel: 'None / Non-Formal',
          annualIncomeInr: 90000,
          landAcres: '',
        },
      },
      {
        id: 'artisan',
        label: isTe ? 'స్వయం ఉపాధి' : 'Self-Employed',
        icon: Wrench,
        accent: 'border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100',
        apply: {
          occupation: 'Self-Employed / Artisan',
          age: 32,
          gender: 'male' as const,
          educationLevel: 'ITI / Vocational',
          annualIncomeInr: 140000,
          landAcres: '',
        },
      },
    ],
    [isTe]
  );

  const runMatchAll = async (override?: Partial<{
    occupation: string;
    age: number;
    gender: 'female' | 'male' | 'other';
    educationLevel: string;
    annualIncomeInr: number;
    landAcres: string;
  }>) => {
    setLoading(true);
    setError(null);
    const nextAge = override?.age ?? age;
    const nextGender = override?.gender ?? gender;
    const nextEdu = override?.educationLevel ?? educationLevel;
    const nextOcc = override?.occupation ?? occupation;
    const nextIncome = override?.annualIncomeInr ?? annualIncomeInr;
    const nextLand = override?.landAcres ?? landAcres;

    try {
      const res = await api.matchAllSchemes({
        age: Number(nextAge),
        state,
        district,
        educationLevel: nextEdu,
        occupation: nextOcc,
        annualIncomeInr: Number(nextIncome),
        gender: nextGender,
        landAcres: nextLand.trim() !== '' ? Number(nextLand) : undefined,
        hasRationOrRiceCard,
        includePrevious,
        language,
      });
      setMultiResult(res);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkerMode === 'match-all') {
      await runMatchAll();
      return;
    }

    if (!schemeId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.checkEligibility({
        schemeId,
        age: Number(age),
        state,
        district,
        educationLevel,
        occupation,
        annualIncomeInr: Number(annualIncomeInr),
        gender,
        landAcres: landAcres.trim() !== '' ? Number(landAcres) : undefined,
        hasRationOrRiceCard,
        language,
      });
      setResult(res);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const applyPresetAndScan = async (preset: (typeof quickPresets)[number]) => {
    setOccupation(preset.apply.occupation);
    setAge(preset.apply.age);
    setGender(preset.apply.gender);
    setEducationLevel(preset.apply.educationLevel);
    setAnnualIncomeInr(preset.apply.annualIncomeInr);
    setLandAcres(preset.apply.landAcres);
    await runMatchAll(preset.apply);
  };

  const matchedItems = useMemo(
    () =>
      multiResult
        ? multiResult.results.filter(
            (r) => r.matchStatus === 'likely_eligible' || r.matchStatus === 'needs_review'
          )
        : [],
    [multiResult]
  );

  const unmatchedItems = useMemo(
    () =>
      multiResult
        ? multiResult.results.filter((r) => r.matchStatus === 'likely_not_eligible')
        : [],
    [multiResult]
  );

  const spokenMatchSummary = useMemo(() => {
    if (!multiResult) return '';
    if (matchedItems.length === 0) {
      return isTe
        ? 'ప్రస్తుత వివరాలకు నేరుగా సరిపోయే పథకాలు కనుగొనబడలేదు.'
        : 'No directly matching schemes were found for the current profile.';
    }
    const topTitles = matchedItems
      .slice(0, 4)
      .map((item) => (isTe ? item.title_te : item.title_en))
      .join(', ');
    return isTe
      ? `మీ వివరాల ప్రకారం ${matchedItems.length} పథకాలు సరిపోలాయి. ముఖ్యమైనవి: ${topTitles}.`
      : `Found ${matchedItems.length} matching schemes for your profile, including ${topTitles}.`;
  }, [multiResult, matchedItems, isTe]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {checkerMode === 'match-all'
              ? isTe
                ? 'నాకు సరిపోయే అన్ని పథకాలను కనుగొనండి'
                : 'Which Schemes Can I Get? — All-in-One Finder'
              : t.eligibilityTitle}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-3xl">
            {checkerMode === 'match-all'
              ? isTe
                ? 'మీ వృత్తి, వయస్సు మరియు ఆదాయ వివరాలతో ఆంధ్రప్రదేశ్ మరియు కేంద్ర ప్రభుత్వ పథకాలన్నింటినీ ఒకేసారి సరిపోల్చండి.'
                : 'Scan all Andhra Pradesh and Central schemes at once using your profile—no need to check one scheme at a time.'
              : t.eligibilitySubtitle}
          </p>
        </div>

        {/* Mode Switcher */}
        <div
          role="tablist"
          aria-label="Eligibility check mode"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={checkerMode === 'match-all'}
            onClick={() => setCheckerMode('match-all')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
              checkerMode === 'match-all'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <SearchCheck className="w-3.5 h-3.5" />
            <span>{isTe ? 'అన్ని పథకాల ఫైండర్' : 'Find All Matching'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={checkerMode === 'single'}
            onClick={() => setCheckerMode('single')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
              checkerMode === 'single'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isTe ? 'ఒక్క పథకం తనిఖీ' : 'Single Scheme Check'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Preliminary Assessment Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-900">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <p>
          {isTe
            ? 'ప్రకటన: ఇది AI సహాయంతో అందించే ప్రాథమిక అర్హత అంచనా మాత్రమే. ఇది అధికారిక ప్రభుత్వ అర్హత నిర్ధారణ లేదా మంజూరు కాదు. మేము అనవసర వ్యక్తిగత వివరాలను (ఆధార్ లేదా ఫోన్ నంబర్లు) సేకరించము.'
            : 'Disclaimer: This tool provides an AI-assisted preliminary assessment based on published scheme guidelines, not official eligibility confirmation or government approval. No personal IDs (such as Aadhaar or phone numbers) are collected.'}
        </p>
      </div>

      {/* 1-Tap Quick Citizen Presets when in Match-All mode */}
      {checkerMode === 'match-all' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">
              {isTe
                ? 'టైప్ చేయకుండా ఒక్క ట్యాప్‌తో సరిపోయే పథకాలను వెతకండి:'
                : 'One-Tap Quick Scan — pick who you are to instantly scan matching schemes:'}
            </p>
            <span className="text-[11px] text-slate-500">
              {isTe ? 'దిగువ ఫారమ్‌లో వివరాలను మార్చుకోవచ్చు' : 'Adjust details anytime in the form below'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {quickPresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPresetAndScan(preset)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] border rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${preset.accent}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleEvaluate}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          {checkerMode === 'single' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isTe ? 'పథకాన్ని ఎంచుకోండి' : 'Select Government Scheme'}
              </label>
              <select
                value={schemeId}
                onChange={(e) => setSchemeId(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {isTe ? s.title_te : s.title_en}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isTe ? 'వయస్సు (సంవత్సరాలు)' : 'Age (Years)'}
              </label>
              <input
                type="number"
                min={0}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isTe ? 'లింగం' : 'Gender'}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'female' | 'male' | 'other')}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                <option value="female">{isTe ? 'మహిళ' : 'Female'}</option>
                <option value="male">{isTe ? 'పురుషుడు' : 'Male'}</option>
                <option value="other">{isTe ? 'ఇతరులు' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isTe ? 'రాష్ట్రం' : 'State'}
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Telangana">Telangana</option>
                <option value="Other State">Other State</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isTe ? 'జిల్లా' : 'District'}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                {AP_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isTe ? 'విద్యార్హత స్థాయి' : 'Education Level'}
            </label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            >
              <option value="Primary / High School (Class 1-10)">
                Primary / High School (Class 1-10)
              </option>
              <option value="Intermediate (Class 11-12)">Intermediate (Class 11-12)</option>
              <option value="ITI / Vocational">ITI / Vocational</option>
              <option value="Diploma / Polytechnic">Diploma / Polytechnic</option>
              <option value="Undergraduate">Undergraduate (Degree / B.Tech / Medical)</option>
              <option value="Postgraduate">Postgraduate</option>
              <option value="None / Non-Formal">None / Non-Formal</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isTe ? 'వృత్తి' : 'Occupation'}
              </label>
              <select
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                <option value="Student">Student</option>
                <option value="Farmer">Farmer</option>
                <option value="Tenant Farmer">Tenant Farmer</option>
                <option value="Senior Citizen">Senior Citizen</option>
                <option value="Self-Employed / Artisan">Self-Employed / Artisan</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Homemaker">Homemaker</option>
                <option value="Daily Wage Worker">Daily Wage Worker</option>
                <option value="Private Employee">Private Employee</option>
                <option value="Government Employee">Government Employee</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isTe ? 'వార్షిక కుటుంబ ఆదాయం (₹)' : 'Annual Family Income (INR)'}
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                required
                value={annualIncomeInr}
                onChange={(e) => setAnnualIncomeInr(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isTe ? 'భూమి (ఎకరాలు - ఐచ్ఛికం)' : 'Landholding (Acres, optional)'}
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={landAcres}
                onChange={(e) => setLandAcres(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:border-teal-600"
              />
            </div>
            <label className="flex items-center gap-2 py-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasRationOrRiceCard}
                onChange={(e) => setHasRationOrRiceCard(e.target.checked)}
                className="rounded border-slate-300 text-teal-700 accent-teal-700"
              />
              <span>{isTe ? 'AP రైస్ కార్డు ఉంది' : 'Holds AP Rice Card'}</span>
            </label>
          </div>

          {checkerMode === 'match-all' && (
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrevious}
                onChange={(e) => setIncludePrevious(e.target.checked)}
                className="rounded border-slate-300 text-teal-700 accent-teal-700"
              />
              <span>
                {isTe
                  ? 'గత / పాత పథకాలను కూడా చూపండి'
                  : 'Also scan previous / legacy AP scheme archives'}
              </span>
            </label>
          )}

          {error && <p className="text-xs text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading || (checkerMode === 'single' && !schemeId)}
            className="w-full py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {checkerMode === 'match-all'
                ? isTe
                  ? 'అన్ని సరిపోయే పథకాలను కనుగొనండి'
                  : 'Find All Matching Schemes'
                : t.evaluateBtn}
            </span>
          </button>
        </form>

        {/* Results Panel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {checkerMode === 'match-all' ? (
            !multiResult ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-medium text-slate-800">
                  {isTe
                    ? 'పై నుండి ఒక ప్రొఫైల్ ట్యాప్ చేయండి లేదా మీ వివరాలను ఎడమవైపు సమర్పించండి.'
                    : 'Tap a quick profile preset above or submit your details to scan all AP & Central schemes.'}
                </p>
                <p className="text-xs text-slate-500">
                  {isTe
                    ? 'మీరు అర్హత పొందే అవకాశమున్న ప్రస్తుత AP మరియు కేంద్ర పథకాలు ఇక్కడ క్రమంలో చూపబడతాయి.'
                    : 'Matching schemes will be ranked cleanly with reasons, checklists, and spoken summary.'}
                </p>
              </div>
            ) : (
              <motion.div
                key={`multi-${multiResult.totalEvaluated}-${multiResult.eligibleCount}-${multiResult.reviewCount}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      {isTe ? 'పరిశీలించిన పథకాలు:' : 'Evaluated:'}{' '}
                      <span className="tabular-nums font-semibold">{multiResult.totalEvaluated}</span> ·{' '}
                      <span className="text-emerald-700 font-semibold tabular-nums">
                        {multiResult.eligibleCount} {isTe ? 'ప్రత్యక్ష సరిపోలిక' : 'Preliminary Matches'}
                      </span>
                      {multiResult.reviewCount > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          <span className="text-amber-700 font-semibold tabular-nums">
                            {multiResult.reviewCount} {isTe ? 'అదనపు తనిఖీ' : 'Needs Review'}
                          </span>
                        </>
                      )}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                      {isTe ? 'మీ ప్రొఫైల్‌కు సరిపోయే పథకాలు' : 'Matched Government Schemes'}
                    </h2>
                  </div>

                  {spokenMatchSummary && (
                    <ReadAloudButton language={language} text={spokenMatchSummary} />
                  )}
                </div>

                {matchedItems.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                    <p className="text-sm font-medium text-slate-800">
                      {isTe
                        ? 'ఈ వివరాలకు నేరుగా సరిపోయే పథకాలు లేవు.'
                        : 'No direct scheme matches found for these exact criteria.'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isTe
                        ? 'వయస్సు, ఆదాయం లేదా రాష్ట్రాన్ని మార్చి మళ్ళీ ప్రయత్నించండి.'
                        : 'Try adjusting your state, income, or occupation, or inspect criteria below.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {matchedItems.map((item) => (
                      <div key={item.schemeId} className="py-5 first:pt-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-slate-500">
                              {CATEGORY_LABELS[item.category]?.[language] || item.category} · {item.state} ·{' '}
                              <span className="font-mono tabular-nums font-medium text-slate-700">
                                {item.matchedChecks}/{item.totalChecks}{' '}
                                {isTe ? 'సరిపోలాయి' : 'matched'}
                              </span>
                              {item.scheme_status === 'previous' && (
                                <>
                                  {' '}
                                  ·{' '}
                                  <span className="text-amber-700 font-semibold">
                                    {isTe ? 'గత పథకం' : 'Previous / Legacy'}
                                  </span>
                                </>
                              )}
                            </p>
                            <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                              {isTe ? item.title_te : item.title_en}
                            </h3>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                              item.matchStatus === 'likely_eligible'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {item.matchStatus === 'likely_eligible' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <HelpCircle className="w-4 h-4" />
                            )}
                            <span>
                              {item.matchStatus === 'likely_eligible'
                                ? isTe
                                  ? 'అర్హత సూచన'
                                  : 'Preliminary Match'
                                : isTe
                                ? 'తనిఖీ అవసరం'
                                : 'Needs Review'}
                            </span>
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {isTe ? item.benefit_summary_te : item.benefit_summary_en}
                        </p>

                        {item.matchedReasons.length > 0 && (
                          <p className="text-xs text-emerald-800">
                            <span className="font-semibold">
                              {isTe ? 'సరిపోలినవి: ' : 'Matched: '}
                            </span>
                            {item.matchedReasons.join(' · ')}
                          </p>
                        )}

                        {item.missingInfo.length > 0 && (
                          <p className="text-xs text-amber-800">
                            <span className="font-semibold">
                              {isTe ? 'ధృవీకరించాలి: ' : 'Verify: '}
                            </span>
                            {item.missingInfo.join(' · ')}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium">
                          <button
                            type="button"
                            onClick={() => navigate('checklist', { schemeSlug: item.slug })}
                            className="inline-flex items-center gap-1 text-teal-700 hover:text-amber-700 hover:underline cursor-pointer"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>{t.generateChecklist}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSchemeId(item.schemeId);
                              setCheckerMode('single');
                            }}
                            className="text-slate-700 hover:text-teal-800 hover:underline cursor-pointer"
                          >
                            {isTe ? 'AI లోతైన తనిఖీ' : 'AI Deep Check'}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('scheme-details', { schemeSlug: item.slug })}
                            className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                          >
                            {t.viewDetails}
                          </button>
                          <a
                            href={item.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-teal-700 hover:underline ml-auto"
                          >
                            <span>{t.officialPortal}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {unmatchedItems.length > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowUnmatched((v) => !v)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                    >
                      {showUnmatched ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span>
                        {isTe
                          ? `సరిపోలని పథకాలు (${unmatchedItems.length}) చూడండి`
                          : `Show ${unmatchedItems.length} non-matching schemes & reasons`}
                      </span>
                    </button>

                    {showUnmatched && (
                      <div className="mt-4 divide-y divide-slate-100">
                        {unmatchedItems.map((item) => (
                          <div key={item.schemeId} className="py-3 space-y-1">
                            <p className="text-xs font-semibold text-slate-700">
                              {isTe ? item.title_te : item.title_en}
                            </p>
                            <p className="text-xs text-rose-700">
                              {item.unmetReasons.join(' · ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {multiResult.disclaimer}
                </p>
              </motion.div>
            )
          ) : !result ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-slate-800">
                {isTe
                  ? 'ప్రాథమిక ఫలితాలను చూడటానికి మీ వివరాలను ఎడమవైపు నమోదు చేయండి.'
                  : 'Complete the preliminary criteria form to compare against published scheme rules.'}
              </p>
              <p className="text-xs text-slate-500">
                {isTe
                  ? 'సంతృప్తి చెందినవి, సరిపోలనివి మరియు తదుపరి ధృవీకరణ అంశాలు స్పష్టంగా చూపబడతాయి.'
                  : 'Displays satisfied conditions, unmet conditions, and official portal verification steps.'}
              </p>
            </div>
          ) : (
            <motion.div
              key={`${result.schemeTitle}-${result.preliminaryStatus}-${result.satisfied.length}-${result.notSatisfied.length}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {result.isSample
                      ? isTe
                        ? 'నమూనా మార్గదర్శకాల అంచనా'
                        : 'Sample Guideline Assessment'
                      : 'Guideline Assessment'}{' '}
                    · {result.sourceDocumentName}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                    {result.schemeTitle}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ReadAloudButton
                    language={language}
                    text={`${result.schemeTitle}. ${result.aiSummary || ''} ${result.satisfied.join(' ')} ${result.notSatisfied.join(' ')}`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      result.preliminaryStatus === 'likely_eligible'
                        ? 'text-emerald-700'
                        : result.preliminaryStatus === 'needs_review'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {result.preliminaryStatus === 'likely_eligible'
                      ? isTe
                        ? 'ప్రాథమికంగా అర్హత సూచన'
                        : 'Preliminary Match'
                      : result.preliminaryStatus === 'needs_review'
                      ? isTe
                        ? 'అదనపు తనిఖీ అవసరం'
                        : 'Additional Verification Needed'
                      : isTe
                      ? 'నిబంధనలు సరిపోలలేదు'
                      : 'Criteria Mismatch Found'}
                  </span>
                </div>
              </div>

              {/* Animated Criteria Alignment Meter */}
              {(() => {
                const totalChecks = result.satisfied.length + result.notSatisfied.length;
                const matchRatio =
                  totalChecks > 0
                    ? result.satisfied.length / totalChecks
                    : result.preliminaryStatus === 'likely_eligible'
                    ? 1
                    : 0.5;
                const barColor =
                  result.preliminaryStatus === 'likely_eligible'
                    ? 'bg-emerald-600'
                    : result.preliminaryStatus === 'needs_review'
                    ? 'bg-amber-500'
                    : 'bg-rose-600';
                return (
                  <div className="bg-[#F8FAF9] border border-teal-100 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {isTe ? 'నిబంధనల సరిపోలిక స్థాయి' : 'Criteria Alignment Meter'}
                      </span>
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        {result.satisfied.length}/{totalChecks || 1}{' '}
                        {isTe ? 'నిబంధనలు సరిపోలాయి' : 'checks matched'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full origin-left ${barColor}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: Math.max(0.06, Math.min(1, matchRatio)) }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                );
              })()}

              {result.aiSummary && (
                <div className="bg-[#F8FAF9] border border-teal-100 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
                  {result.aiSummary}
                </div>
              )}

              {/* Satisfied */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isTe ? 'సరిపోలిన నిబంధనలు' : 'Requirements That Appear Satisfied'}
                  </span>
                </h3>
                {result.satisfied.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {isTe ? 'ఏవీ సరిపోలలేదు.' : 'None matched directly.'}
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    {result.satisfied.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Not Satisfied */}
              {result.notSatisfied.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-800 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>
                      {isTe
                        ? 'సరిపోలని నిబంధనలు'
                        : 'Requirements That Appear Not Satisfied'}
                    </span>
                  </h3>
                  <ul className="space-y-1.5 text-sm text-red-700">
                    {result.notSatisfied.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Additional Info Required */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-teal-700" />
                  <span>
                    {isTe ? 'అదనపు సమాచారం / ధృవీకరణ' : 'Additional Information & Checks'}
                  </span>
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {result.additionalInfoRequired.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>

              {/* Guidelines & Official Link */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">
                  {isTe ? 'సంబంధిత పథక మార్గదర్శకాలు' : 'Relevant Scheme Guidelines'}
                </h3>
                <ul className="space-y-1 text-xs text-slate-600">
                  {result.relevantGuidelines.map((g, i) => (
                    <li key={i}>• {g}</li>
                  ))}
                </ul>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">{result.disclaimer}</span>
                  <a
                    href={result.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-teal-700 hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    <span>{t.officialPortal}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
