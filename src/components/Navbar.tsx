import { useState } from 'react';
import { Lock, Menu, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import type { PageRoute } from '../types';

export function Navbar() {
  const { route, navigate, t, toggleLanguage, language, citizenUser } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ id: PageRoute; label: string }> = [
    { id: 'schemes', label: t.navSchemes },
    { id: 'chat', label: t.navChat },
    { id: 'eligibility', label: t.navEligibility },
    { id: 'checklist', label: t.navChecklist },
    { id: 'pdf-assistant', label: t.navPdf },
  ];

  const handleNav = (id: PageRoute, options?: { authMode?: 'login' | 'register' }) => {
    setMobileOpen(false);
    navigate(id, options);
  };

  const firstName = citizenUser?.full_name.trim().split(/\s+/)[0] || '';

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
      <div className="h-[3px] w-full bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-700" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          CivicSahayak <span className="text-teal-700">AI</span>
        </button>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => {
            const active =
              route === item.id || (item.id === 'schemes' && route === 'scheme-details');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative py-2 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active ? 'text-teal-800 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title={
                  !citizenUser
                    ? language === 'te'
                      ? 'తెరవడానికి సైన్ ఇన్ అవసరం'
                      : 'Sign in required to access'
                    : undefined
                }
              >
                {!citizenUser && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
                <span>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="civic-nav-underline"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-teal-700 to-amber-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Sign In text link + primary language action + mobile toggle */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={() =>
              citizenUser
                ? handleNav('dashboard')
                : handleNav('auth', { authMode: 'login' })
            }
            className={`hidden sm:inline-flex items-center text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              route === 'auth'
                ? 'text-teal-800 font-semibold underline underline-offset-4'
                : 'text-slate-600 hover:text-teal-800 hover:underline underline-offset-4'
            }`}
          >
            {citizenUser
              ? firstName
              : language === 'te'
              ? 'సైన్ ఇన్'
              : 'Sign In'}
          </button>

          {!citizenUser && (
            <button
              type="button"
              onClick={() => handleNav('auth', { authMode: 'register' })}
              className="hidden lg:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              {language === 'te' ? 'కొత్త ఖాతా' : 'Create Account'}
            </button>
          )}

          <PWAInstallButton variant="navbar" />

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={toggleLanguage}
            aria-label="Switch interface language between English and Telugu"
            className="px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {t.switchLanguage}
          </motion.button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium cursor-pointer ${
                route === item.id
                  ? 'bg-teal-50 text-teal-800 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleNav('auth', { authMode: 'login' })}
              className="px-3 py-2 text-sm font-semibold text-teal-800 hover:text-teal-900"
            >
              {citizenUser
                ? firstName
                : language === 'te'
                ? 'సైన్ ఇన్ / కొత్త ఖాతా'
                : 'Sign In / Create Account'}
            </button>
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              {t.footerDashboard}
            </button>
            <button
              type="button"
              onClick={() => handleNav('helplines')}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              {language === 'te' ? 'హెల్ప్‌లైన్‌లు & కేంద్రాలు' : 'Helplines & Centers'}
            </button>
            <button
              type="button"
              onClick={() => handleNav('about')}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              {t.footerAbout}
            </button>
            <button
              type="button"
              onClick={() => handleNav('admin-login')}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              {t.footerAdmin}
            </button>
            <div className="w-full pt-1">
              <PWAInstallButton variant="card" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

