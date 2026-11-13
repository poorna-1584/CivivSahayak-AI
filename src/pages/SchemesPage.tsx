import { useEffect, useMemo, useState } from 'react';
import { Bookmark, ExternalLink, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { CATEGORY_LABELS, SCHEME_CATEGORIES } from '../i18n/translations';
import { ShareSchemeButton } from '../components/ShareSchemeButton';

const CATEGORY_ACCENT_BAR: Record<string, string> = {
  'Education and Scholarships': 'bg-sky-600',
  'Agriculture and Farmer Welfare': 'bg-emerald-600',
  'Health and Family Welfare': 'bg-rose-600',
  'Women and Child Welfare': 'bg-amber-500',
  'Employment and Skill Development': 'bg-indigo-600',
  'Social Welfare': 'bg-teal-600',
  'Other Public Services': 'bg-slate-600',
};

export function SchemesPage() {
  const {
    language,
    t,
    schemes,
    schemesLoading,
    selectedSchemeSlug,
    navigate,
    bookmarkedIds,
    toggleBookmark,
  } = useApp();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'previous'>('All');

  useEffect(() => {
    if (selectedSchemeSlug && SCHEME_CATEGORIES.includes(selectedSchemeSlug as (typeof SCHEME_CATEGORIES)[number])) {
      setCategory(selectedSchemeSlug);
    }
  }, [selectedSchemeSlug]);

  const filtered = useMemo(() => {
    return schemes.filter((s) => {
      if (category !== 'All' && s.category !== category) return false;
      if (stateFilter !== 'All' && s.state !== stateFilter) return false;
      const schemeStatus = s.scheme_status === 'previous' ? 'previous' : 'active';
      if (statusFilter !== 'All' && schemeStatus !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${s.title_en} ${s.title_te} ${s.short_desc_en} ${s.short_desc_te} ${s.category} ${s.state} ${s.department_name_en || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [schemes, category, stateFilter, statusFilter, search]);

  const states = useMemo(() => {
    const set = new Set(schemes.map((s) => s.state));
    return ['All', ...Array.from(set)];
  }, [schemes]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {t.schemesTitle}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 max-w-3xl">{t.schemesSubtitle}</p>
        <p className="mt-3 text-xs text-slate-500">{t.sampleNotice}</p>
      </div>

      {/* Search + State Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus-within:border-teal-600">
          <Search className="w-4 h-4 text-teal-700 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full text-sm text-slate-900 bg-transparent focus:outline-none"
          />
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filter by state"
          className="px-3.5 py-2.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
        >
          {states.map((st) => (
            <option key={st} value={st}>
              {st === 'All'
                ? language === 'te'
                  ? 'అన్ని రాష్ట్రాలు / కేటగిరీలు'
                  : 'All Jurisdictions (AP & Central)'
                : st}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'All' | 'active' | 'previous')}
          aria-label="Filter by scheme timeline status"
          className="px-3.5 py-2.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
        >
          <option value="All">
            {language === 'te' ? 'అన్ని పథకాలు (ప్రస్తుత & గత)' : 'All Schemes (Current & Previous)'}
          </option>
          <option value="active">
            {language === 'te' ? 'ప్రస్తుతం అమలులో ఉన్నవి' : 'Current / Active Schemes'}
          </option>
          <option value="previous">
            {language === 'te' ? 'గత / పాత పథకాలు (ఆర్కైవ్)' : 'Previous / Legacy Schemes'}
          </option>
        </select>
      </div>

      {/* Interactive Category Tabs */}
      <div
        role="tablist"
        aria-label="Scheme categories"
        className="flex flex-wrap gap-1.5 p-1.5 bg-teal-50/70 border border-teal-100 rounded-xl"
      >
        {['All', ...SCHEME_CATEGORIES].map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-teal-900 hover:bg-white/70'
              }`}
            >
              {CATEGORY_LABELS[cat]?.[language] || cat}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {schemesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-64 bg-white border border-slate-200 rounded-xl p-6 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-600">
            {language === 'te'
              ? 'మీ శోధనకు సరిపోయే పథకాలు కనుగొనబడలేదు.'
              : 'No government schemes matched your current filter.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategory('All');
              setStateFilter('All');
              setStatusFilter('All');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
          >
            {language === 'te' ? 'ఫిల్టర్లు రీసెట్ చేయండి' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((s, idx) => {
            const bookmarked = bookmarkedIds.includes(s.id);
            const barClass = CATEGORY_ACCENT_BAR[s.category] || 'bg-teal-600';
            return (
              <motion.article
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2 }}
                className="bg-white border border-slate-200 hover:border-teal-300 hover:shadow-md rounded-xl overflow-hidden flex flex-col justify-between transition-all"
              >
                <div className={`h-1 w-full ${barClass}`} />
                <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                  <div>
                    {/* Unboxed clean metadata with typographic separators */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        {CATEGORY_LABELS[s.category]?.[language] || s.category} · {s.state} ·{' '}
                        <span
                          className={
                            s.scheme_status === 'previous'
                              ? 'font-semibold text-amber-700'
                              : 'font-semibold text-emerald-700'
                          }
                        >
                          {s.scheme_status === 'previous'
                            ? language === 'te'
                              ? 'గత పథకం (ఆర్కైవ్)'
                              : 'Previous / Legacy Scheme'
                            : language === 'te'
                            ? 'ప్రస్తుత పథకం'
                            : 'Active'}
                        </span>{' '}
                        ·{' '}
                        {s.is_sample
                          ? language === 'te'
                            ? 'నమూనా రికార్డు'
                            : 'Sample Record'
                          : 'Verified'}{' '}
                        · <span className="tabular-nums">{s.last_verified_at}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(s.id)}
                        aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark scheme'}
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                          bookmarked
                            ? 'text-teal-700 bg-teal-50'
                            : 'text-slate-400 hover:text-teal-700'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" fill={bookmarked ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <h2 className="mt-2 font-display text-lg font-semibold text-slate-900">
                      {language === 'te' ? s.title_te : s.title_en}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {language === 'te' ? s.department_name_te : s.department_name_en}
                    </p>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                      {language === 'te' ? s.short_desc_te : s.short_desc_en}
                    </p>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">
                          {language === 'te' ? 'అర్హత సారాంశం: ' : 'Eligibility: '}
                        </span>
                        {language === 'te' ? s.eligibility_summary_te : s.eligibility_summary_en}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          {language === 'te' ? 'ముఖ్య పత్రాలు: ' : 'Key Documents: '}
                        </span>
                        {s.documents
                          .slice(0, 3)
                          .map((d) => (language === 'te' ? d.name_te : d.name_en))
                          .join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('scheme-details', { schemeSlug: s.slug })}
                        className="px-3.5 py-2 text-xs font-medium bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {t.viewDetails}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('eligibility', { schemeSlug: s.slug })}
                        className="px-3.5 py-2 text-xs font-medium text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200/70 rounded-lg transition-colors cursor-pointer"
                      >
                        {t.checkEligibility}
                      </button>
                      <ShareSchemeButton scheme={s} compact />
                    </div>

                    <a
                      href={s.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-amber-700 hover:underline transition-colors"
                    >
                      <span>{t.officialPortal}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}

