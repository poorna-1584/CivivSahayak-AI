import { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'card' | 'footer';
}

export function PWAInstallButton({ variant = 'navbar' }: PWAInstallButtonProps) {
  const { language } = useApp();
  const isTe = language === 'te';
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Native Chromium / Android / Edge install prompt available
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'footer'
            ? 'inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap'
            : variant === 'card'
            ? 'px-4 py-2.5 min-h-[42px] bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer'
            : 'px-3 py-2 min-h-[40px] border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{isTe ? 'యాప్ ఇన్‌స్టాల్' : 'Install App'}</span>
      </button>
    );
  }

  // In navbar, keep header crisp unless iOS or Chromium prompt is ready; in footer/card, always offer guided install
  if (variant === 'navbar' && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        className={
          variant === 'footer'
            ? 'inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap'
            : 'px-3.5 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-200 text-slate-700 hover:text-teal-800 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span>{isTe ? 'మొబైల్ యాప్' : 'Install Mobile App'}</span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isTe ? 'మొబైల్ యాప్ ఇన్‌స్టాలేషన్ సూచనలు' : 'Install CivicSahayak Mobile App'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {isTe ? 'ఫోన్‌లో CivicSahayak ఇన్‌స్టాల్ చేయండి' : 'Install CivicSahayak on Your Device'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isTe
                      ? 'ఆఫ్‌లైన్ పథకాల మార్గదర్శిగా హోమ్ స్క్రీన్‌కు జోడించండి'
                      : 'Add to your home screen for fast access & offline scheme viewing'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label={isTe ? 'మూసివేయండి' : 'Close'}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <li>
                  <span className="font-semibold">1.</span>{' '}
                  {isTe
                    ? 'Safari బ్రౌజర్ దిగువన ఉన్న Share చిహ్నంపై నొక్కండి.'
                    : 'Tap the Share icon in the Safari toolbar.'}
                </li>
                <li>
                  <span className="font-semibold">2.</span>{' '}
                  {isTe
                    ? 'క్రిందికి స్క్రోల్ చేసి "Add to Home Screen" ఎంచుకోండి.'
                    : 'Scroll down and tap "Add to Home Screen".'}
                </li>
                <li>
                  <span className="font-semibold">3.</span>{' '}
                  {isTe ? 'పైభాగంలో "Add" నొక్కండి.' : 'Tap "Add" in the top right corner.'}
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <li>
                  <span className="font-semibold">1.</span>{' '}
                  {isTe
                    ? 'బ్రౌజర్ చిరునామా పట్టీ లేదా మెను (⋮) లో "Install App" / "Add to Home screen" తెరవండి.'
                    : 'Open your browser menu (⋮) or address bar install icon.'}
                </li>
                <li>
                  <span className="font-semibold">2.</span>{' '}
                  {isTe
                    ? '"Install CivicSahayak" పై నొక్కండి — ఆపై ఇంటర్నెట్ లేకపోయినా సేవ్ చేసిన పథకాలు & పత్రాల జాబితా చూడవచ్చు.'
                    : 'Choose "Install App" / "Add to Home screen" to run CivicSahayak standalone with offline cached schemes.'}
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 min-h-[42px] bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors"
            >
              {isTe ? 'సరే, అర్థమైంది' : 'Got It'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
