import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';

export function Footer() {
  const { navigate, t, isAdminAuthenticated, language } = useApp();

  return (
    <footer className="no-print border-t border-teal-900/40 bg-[#0B252E] text-slate-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-11">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="max-w-xl">
            <p className="font-display text-base font-bold text-white tracking-wide">
              CivicSahayak <span className="text-amber-400">AI</span>
            </p>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">{t.footerDisclaimer}</p>
            <p className="mt-2.5 text-xs text-teal-200/80">
              {language === 'te'
                ? 'ఆంధ్రప్రదేశ్ పౌరుల సమాచార సహాయం · B.Tech AI & DS ప్రాజెక్ట్'
                : 'Andhra Pradesh Public Services Guidance · RAG & Gemini AI Platform'}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => navigate('dashboard')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              {t.footerDashboard}
            </button>
            <button
              type="button"
              onClick={() => navigate('schemes')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              {t.navSchemes}
            </button>
            <button
              type="button"
              onClick={() => navigate('eligibility')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              {t.navEligibility}
            </button>
            <button
              type="button"
              onClick={() => navigate('helplines')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'te' ? 'హెల్ప్‌లైన్‌లు & కేంద్రాలు' : 'Helplines & Centers'}
            </button>
            <button
              type="button"
              onClick={() => navigate('about')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              {t.footerAbout}
            </button>
            <button
              type="button"
              onClick={() => navigate('auth', { authMode: 'login' })}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'te' ? 'సైన్ ఇన్ / ఖాతా' : 'Sign In / Create Account'}
            </button>
            <button
              type="button"
              onClick={() => navigate(isAdminAuthenticated ? 'admin-dashboard' : 'admin-login')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              {t.footerAdmin}
            </button>
            <PWAInstallButton variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
