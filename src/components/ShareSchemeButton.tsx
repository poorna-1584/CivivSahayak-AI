import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Scheme } from '../types';

interface ShareSchemeButtonProps {
  scheme: Scheme;
  compact?: boolean;
}

export function ShareSchemeButton({ scheme, compact = false }: ShareSchemeButtonProps) {
  const { language } = useApp();
  const isTe = language === 'te';
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const title = isTe ? scheme.title_te : scheme.title_en;
    const benefit = isTe ? scheme.benefit_summary_te : scheme.benefit_summary_en;
    const eligibility = isTe ? scheme.eligibility_summary_te : scheme.eligibility_summary_en;

    const text = isTe
      ? `CivicSahayak AI — ప్రభుత్వ పథక సమాచారం\n\nపథకం: ${title}\nప్రయోజనం: ${benefit}\nఅర్హత: ${eligibility}\nఅధికారిక పోర్టల్: ${scheme.official_url}`
      : `CivicSahayak AI — Scheme Summary\n\nScheme: ${title}\nBenefit: ${benefit}\nEligibility: ${eligibility}\nOfficial Portal: ${scheme.official_url}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text,
          url: window.location.origin,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        // Fallback to clipboard if user cancels or share unavailable
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        compact
          ? 'px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 hover:text-teal-800 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0'
          : 'px-3.5 py-2 min-h-[44px] text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-200 text-slate-700 hover:text-teal-800 inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0'
      }
    >
      {shared ? (
        <>
          <Check className="w-4 h-4 text-emerald-700" />
          <span className="text-emerald-800 font-semibold">
            {isTe ? 'కాపీ అయింది' : 'Copied to Share'}
          </span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>{isTe ? 'షేర్ చేయండి' : 'Share'}</span>
        </>
      )}
    </button>
  );
}
