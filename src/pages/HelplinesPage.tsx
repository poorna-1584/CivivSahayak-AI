import { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  PhoneCall,
  Search,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { AP_DISTRICTS } from '../i18n/translations';
import { api } from '../services/api';
import { ReadAloudButton } from '../components/ReadAloudButton';
import type { HelplinesDirectoryResponse } from '../types';

const HELPLINE_CATEGORIES = [
  { id: 'all', en: 'All Helplines', te: 'అన్ని హెల్ప్‌లైన్‌లు' },
  { id: 'general', en: 'Grievance & Pensions', te: 'ఫిర్యాదులు & పెన్షన్లు' },
  { id: 'health', en: 'Health (104)', te: 'ఆరోగ్యం (104)' },
  { id: 'agriculture', en: 'Farmers (Kisan)', te: 'రైతులు (కిసాన్)' },
  { id: 'scholarships', en: 'Scholarships', te: 'స్కాలర్‌షిప్‌లు' },
  { id: 'identity', en: 'Aadhaar & KYC', te: 'ఆధార్ & KYC' },
] as const;

export function HelplinesPage() {
  const { language, citizenUser } = useApp();
  const isTe = language === 'te';

  const [district, setDistrict] = useState<string>(citizenUser?.district || 'Guntur');
  const [area, setArea] = useState<string>('');
  const [category, setCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [directory, setDirectory] = useState<HelplinesDirectoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (citizenUser?.district) {
      setDistrict(citizenUser.district);
    }
  }, [citizenUser?.district]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getHelplines({ district, area, category, language })
      .then((res) => {
        if (active) setDirectory(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [district, area, category, language]);

  const handleCopyPhone = (id: string, phone: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(phone).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const helplines = (directory?.helplines || []).filter((item) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      item.name_en.toLowerCase().includes(q) ||
      item.name_te.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      item.purpose_en.toLowerCase().includes(q) ||
      item.purpose_te.toLowerCase().includes(q)
    );
  });

  const centers = directory?.centers || [];

  const readAloudText = isTe
    ? `ఆంధ్రప్రదేశ్ పౌర సేవా హెల్ప్‌లైన్‌లు. ప్రజా ఫిర్యాదుల కోసం 1902, వైద్య సహాయం కోసం 104, రైతు సహాయం కోసం 155261, ఆధార్ కోసం 1947, మరియు మహిళా అత్యవసర సహాయం కోసం 181 కు కాల్ చేయండి. ${district} జిల్లాలోని మీ సమీప గ్రామ సచివాలయం, రైతు సేవా కేంద్రం లేదా మీసేవా కేంద్రాన్ని ఇక్కడ కనుగొనండి.`
    : `Andhra Pradesh Citizen Helplines. Call 1902 for welfare and Sachivalayam grievances, 104 for Dr. NTR Vaidya Seva medical help, 155261 for PM-KISAN farmer support, 1947 for Aadhaar, and 181 for women support. Use the district finder below to locate your nearest Grama Sachivalayam, Rythu Seva Kendra, or MeeSeva center in ${district}.`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {isTe
              ? 'అధికారిక హెల్ప్‌లైన్‌లు & సమీప సేవా కేంద్రాలు'
              : 'Official Helplines & Local Center Finder'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-3xl">
            {isTe
              ? 'ఉచిత ప్రభుత్వ హెల్ప్‌లైన్‌లకు నేరుగా కాల్ చేయండి మరియు మీ జిల్లాలోని గ్రామ/వార్డు సచివాలయం, రైతు సేవా కేంద్రం (RSK) లేదా మీసేవా కేంద్రాన్ని కనుగొనండి.'
              : 'Call verified AP & Central toll-free helplines with one tap, or locate your nearest Grama/Ward Sachivalayam, Rythu Seva Kendra (RSK), and MeeSeva center by district.'}
          </p>
        </div>
        <div className="shrink-0">
          <ReadAloudButton text={readAloudText} language={language} />
        </div>
      </div>

      {/* Section 1: District-Wise Local Center Finder */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-700" />
              <span>
                {isTe
                  ? 'సమీప సచివాలయం, RSK & మీసేవా కేంద్రం వెతకండి'
                  : 'Find Nearest Sachivalayam, RSK & MeeSeva Center'}
              </span>
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {isTe
                ? 'మీ జిల్లా మరియు మండలం/గ్రామం పేరు నమోదు చేసి Google Maps లో దగ్గరి కేంద్రాన్ని చూడండి.'
                : 'Select your AP district and optionally enter your mandal, town, or village to open accurate local center directions.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[460px] shrink-0">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isTe ? 'ఆంధ్రప్రదేశ్ జిల్లా' : 'AP District'}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 min-h-[42px] text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                {AP_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isTe ? 'మండలం / గ్రామం / పట్టణం (ఐచ్ఛికం)' : 'Mandal / Town / Village (Optional)'}
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder={isTe ? 'ఉదా: తెనాలి / మంగళగిరి' : 'e.g., Tenali, Kuppam'}
                className="w-full px-3 py-2 min-h-[42px] text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {centers.map((center, idx) => (
            <motion.div
              key={center.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 bg-[#FAFCFB]"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {isTe ? center.type_te : center.type_en}
                    </h3>
                  </div>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  {district}
                  {area.trim() ? ` · ${area.trim()}` : ''}
                </p>
                <ul className="space-y-1 text-xs text-slate-700 leading-relaxed">
                  {(isTe ? center.handles_te : center.handles_en).map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200/70">
                <a
                  href={center.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 min-h-[40px] bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isTe ? 'Google Maps లో చూడండి' : 'Find Nearest on Maps'}</span>
                </a>
                <a
                  href={center.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 min-h-[40px] bg-white border border-slate-200 hover:border-teal-300 text-teal-800 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <span>{isTe ? 'అధికారిక పోర్టల్' : 'Official Portal'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section 2: One-Tap Official Helplines */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {isTe ? 'ప్రభుత్వ ఉచిత & అధికారిక హెల్ప్‌లైన్‌లు' : 'Verified Government Helplines'}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {isTe
                ? 'ఫోన్ ద్వారా నేరుగా కాల్ చేయడానికి "కాల్ చేయండి" బటన్‌పై నొక్కండి.'
                : 'Tap Call Now to dial directly from mobile, or copy the helpline number.'}
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isTe ? 'హెల్ప్‌లైన్ లేదా నంబర్ వెతకండి...' : 'Search helpline or number...'}
              className="w-full pl-9 pr-3 py-2 min-h-[42px] text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {HELPLINE_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3.5 py-2 min-h-[38px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-teal-700 border-teal-700 text-white font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isTe ? cat.te : cat.en}
              </button>
            );
          })}
        </div>

        {loading && !directory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : helplines.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
            {isTe
              ? 'మీ శోధనకు సరిపోయే హెల్ప్‌లైన్ కనుగొనబడలేదు.'
              : 'No matching helplines found for this filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {helplines.map((item) => {
              const copied = copiedId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-slate-500">
                          {item.toll_free
                            ? isTe
                              ? 'ఉచిత కాల్ (Toll-Free)'
                              : 'Toll-Free'
                            : isTe
                            ? 'అధికారిక హెల్ప్‌డెస్క్'
                            : 'Official Helpdesk'}{' '}
                          · {isTe ? item.hours_te : item.hours_en}
                        </p>
                        <h3 className="mt-0.5 font-display text-base font-semibold text-slate-900">
                          {isTe ? item.name_te : item.name_en}
                        </h3>
                      </div>
                      <span className="font-mono text-lg font-bold text-teal-800 tabular-nums shrink-0">
                        {item.phone}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {isTe ? item.purpose_te : item.purpose_en}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={item.tel_href}
                        className="px-3.5 py-2 min-h-[40px] bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{isTe ? `కాల్ ${item.phone}` : `Call ${item.phone}`}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(item.id, item.phone)}
                        className="px-3 py-2 min-h-[40px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="text-emerald-700">{isTe ? 'కాపీ అయింది' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isTe ? 'కాపీ' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <a
                      href={item.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-teal-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{isTe ? 'పోర్టల్' : 'Portal'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {directory && (
          <p className="text-xs text-slate-500">
            {isTe ? directory.disclaimer_te : directory.disclaimer_en}
          </p>
        )}
      </section>
    </div>
  );
}
