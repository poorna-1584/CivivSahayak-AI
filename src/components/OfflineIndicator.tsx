import { WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { language } = useApp();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-4 left-4 right-4 sm:right-auto z-50 max-w-md flex items-center gap-2.5 rounded-xl bg-amber-900 text-amber-50 border border-amber-700 px-4 py-2.5 text-xs font-medium shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
      <span>
        {language === 'te'
          ? 'ఆఫ్‌లైన్ మోడ్ · సేవ్ చేసిన పథకాలు, పత్రాల జాబితా & హెల్ప్‌లైన్‌లు అందుబాటులో ఉన్నాయి.'
          : 'Offline Mode · Cached AP schemes, document checklists & helplines remain available.'}
      </span>
    </div>
  );
}
