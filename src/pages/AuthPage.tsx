import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Shield, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { AP_DISTRICTS } from '../i18n/translations';
import { api, extractApiError } from '../services/api';
import { CivicLogo3D } from '../components/CivicLogo3D';
import type { Language } from '../types';

const OCCUPATIONS = [
  'Student',
  'Farmer',
  'Agricultural Worker',
  'Homemaker',
  'Self-Employed / Artisan',
  'Senior Citizen',
  'Citizen',
];

export function AuthPage() {
  const {
    language,
    authMode,
    setAuthMode,
    setCitizenSession,
    navigate,
    citizenUser,
    authPromptNotice,
    pendingRedirect,
    completeAuthRedirect,
  } = useApp();
  const isTe = language === 'te';

  const [mode, setMode] = useState<'login' | 'register'>(authMode);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Create Account state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [district, setDistrict] = useState('Guntur');
  const [occupation, setOccupation] = useState('Student');
  const [preferredLang, setPreferredLang] = useState<Language>(language);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(authMode);
    setError(null);
    setSuccessMsg(null);
  }, [authMode]);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setAuthMode(next);
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.citizenLogin(loginEmail, loginPassword);
      setCitizenSession(res.token, res.user);
      completeAuthRedirect('dashboard');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.citizenRegister({
        full_name: fullName,
        email: regEmail,
        password: regPassword,
        district,
        occupation,
        preferred_language: preferredLang,
      });
      setCitizenSession(res.token, res.user);
      setSuccessMsg(
        isTe
          ? 'మీ పౌర ఖాతా విజయవంతంగా రూపొందించబడింది!'
          : 'Your citizen account has been created!'
      );
      window.setTimeout(() => completeAuthRedirect('dashboard'), 450);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const benefits = isTe
    ? [
        'మీ సేవ్ చేసిన పథకాలు & స్కాలర్‌షిప్ అలర్ట్‌లు అన్ని పరికరాల్లో సింక్ అవుతాయి.',
        'మీ జిల్లా & వృత్తి ఆధారంగా అర్హత తనిఖీ ఫారమ్ ఆటో-ఫిల్ అవుతుంది.',
        'ఆధార్ లేదా ఫోన్ నంబర్ లేకుండా సురక్షితమైన ఉచిత పౌర ఖాతా.',
      ]
    : [
        'Sync your bookmarked AP & Central schemes across sessions.',
        'Auto-fill your District and Occupation when checking scheme eligibility.',
        'Privacy-first free account — no Aadhaar or mobile number required.',
      ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Architectural Showcase with 3D Animated Emblem */}
        <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#0B252E] via-[#0F3842] to-[#0B252E] text-white p-7 sm:p-8 flex flex-col justify-between border border-teal-900/60 shadow-sm">
          <div className="space-y-6">
            <p className="text-xs font-medium text-amber-300 tracking-wide">
              Andhra Pradesh · {isTe ? 'పౌర పోర్టల్ ఖాతా' : 'Citizen Access Portal'}
            </p>

            {/* 3D Animated Emblem Stage */}
            <div className="py-3">
              <CivicLogo3D
                spinKey={mode}
                size="lg"
                variant="citizen"
                label="Interactive 3D CivicSahayak AI Logo"
              />
              <p className="mt-4 text-center text-[11px] text-teal-200/75">
                {isTe
                  ? '3D లోగోను చూడటానికి కర్సర్‌ను కదిలించండి'
                  : 'Move pointer across the emblem for interactive 3D tilt'}
              </p>
            </div>

            <div>
              <h1 className="font-display text-2xl font-bold text-white tracking-tight text-balance">
                {mode === 'login'
                  ? isTe
                    ? 'మీ పౌర ఖాతాలోకి సైన్ ఇన్ చేయండి'
                    : 'Welcome back to CivicSahayak AI'
                  : isTe
                  ? 'కొత్త పౌర ఖాతాను సృష్టించండి'
                  : 'Create your free Citizen Account'}
              </h1>
              <p className="mt-2 text-sm text-teal-100/85 leading-relaxed">
                {isTe
                  ? 'ప్రభుత్వ పథకాలు, స్కాలర్‌షిప్‌లు, అర్హత తనిఖీ మరియు PDF మార్గదర్శనం ఒకే చోట పొందండి.'
                  : 'Personalize Andhra Pradesh & Central scheme discovery, save checklists, and stay notified on new releases.'}
              </p>
            </div>

            <ul className="space-y-2.5 pt-2 border-t border-white/10 text-xs text-teal-100/90">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-teal-200/80">
            <span>English · తెలుగు</span>
            <button
              type="button"
              onClick={() => navigate('admin-login')}
              className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 hover:underline cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isTe ? 'అడ్మిన్ లాగిన్' : 'Administrator Sign In'}</span>
            </button>
          </div>
        </div>

        {/* Right Interactive Login / Create Account Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {!citizenUser && authPromptNotice && (
              <div
                role="status"
                className="mb-6 p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-xs sm:text-sm text-amber-950 space-y-1.5"
              >
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">{authPromptNotice[language]}</p>
                </div>
                {pendingRedirect?.chatPrompt && (
                  <p className="pl-6 text-xs text-teal-900 bg-white/70 border border-amber-200/70 rounded-lg px-3 py-1.5">
                    <span className="font-semibold">
                      {isTe ? 'మీ ప్రశ్న సేవ్ చేయబడింది:' : 'Saved question:'}
                    </span>{' '}
                    “{pendingRedirect.chatPrompt}”
                  </p>
                )}
              </div>
            )}

            {citizenUser && (
              <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3 text-xs text-teal-900">
                <span>
                  {isTe ? 'ప్రస్తుతం సైన్ ఇన్ అయిన ఖాతా:' : 'Signed in as'}{' '}
                  <strong className="font-semibold">{citizenUser.full_name}</strong> ({citizenUser.email})
                </span>
                <button
                  type="button"
                  onClick={() => navigate('dashboard')}
                  className="font-semibold text-teal-800 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isTe ? 'డాష్‌బోర్డ్' : 'Open Dashboard'}
                </button>
              </div>
            )}

            {/* Mode Switcher */}
            <div
              role="tablist"
              aria-label="Account authentication mode"
              className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-xl mb-7"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`relative py-2.5 px-4 min-h-[44px] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'login' ? 'text-teal-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'login' && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  />
                )}
                <LogIn className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{isTe ? 'సైన్ ఇన్' : 'Sign In'}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchMode('register')}
                className={`relative py-2.5 px-4 min-h-[44px] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'register' ? 'text-teal-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'register' && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  />
                )}
                <UserPlus className="w-4 h-4 relative z-10" />
                <span className="relative z-10">
                  {isTe ? 'కొత్త ఖాతా' : 'Create Account'}
                </span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      {isTe ? 'పౌర ఖాతా లాగిన్' : 'Citizen Sign In'}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {isTe
                        ? 'మీరు నమోదు చేసిన ఇమెయిల్ మరియు పాస్‌వర్డ్‌ను నమోదు చేయండి.'
                        : 'Enter your registered email address and password to access your workspace.'}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="citizen-login-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      {isTe ? 'ఇమెయిల్ చిరునామా' : 'Email Address'}
                    </label>
                    <input
                      id="citizen-login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="citizen@example.com"
                      className="w-full px-3.5 py-2.5 min-h-[44px] text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="citizen-login-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      {isTe ? 'పాస్‌వర్డ్' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        id="citizen-login-password"
                        type={showLoginPw ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-11 min-h-[44px] text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw((v) => !v)}
                        aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      {error}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3 px-4 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isTe ? 'సైన్ ఇన్ చేయండి' : 'Sign In to CivicSahayak'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </motion.button>

                  <p className="text-xs text-slate-500 text-center pt-2">
                    {isTe ? 'ఇంకా ఖాతా లేదా?' : "Don't have an account yet?"}{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-semibold text-teal-700 hover:text-amber-700 hover:underline cursor-pointer"
                    >
                      {isTe ? 'కొత్త ఖాతా సృష్టించండి' : 'Create Account'}
                    </button>
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="register-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      {isTe ? 'కొత్త పౌర ఖాతా నమోదు' : 'Create Citizen Account'}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {isTe
                        ? 'మీ పథకాలను సేవ్ చేయడానికి మరియు అర్హత వివరాలను త్వరగా నింపడానికి ఖాతా తెరవండి.'
                        : 'Set up your profile in 30 seconds — save schemes and pre-fill eligibility checks.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="citizen-reg-name"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        {isTe ? 'పూర్తి పేరు' : 'Full Name'}
                      </label>
                      <input
                        id="citizen-reg-name"
                        type="text"
                        required
                        minLength={2}
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={isTe ? 'ఉదా: రమేష్ కుమార్' : 'e.g. Ramesh Kumar'}
                        className="w-full px-3.5 py-2.5 min-h-[44px] text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="citizen-reg-email"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        {isTe ? 'ఇమెయిల్ చిరునామా' : 'Email Address'}
                      </label>
                      <input
                        id="citizen-reg-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="citizen@example.com"
                        className="w-full px-3.5 py-2.5 min-h-[44px] text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="citizen-reg-password"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        {isTe ? 'పాస్‌వర్డ్ (కనీసం 6 అక్షరాలు)' : 'Password (min 6 chars)'}
                      </label>
                      <div className="relative">
                        <input
                          id="citizen-reg-password"
                          type={showRegPw ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 pr-11 min-h-[44px] text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw((v) => !v)}
                          aria-label={showRegPw ? 'Hide password' : 'Show password'}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="citizen-reg-district"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        {isTe ? 'ఆంధ్రప్రదేశ్ జిల్లా' : 'AP District'}
                      </label>
                      <select
                        id="citizen-reg-district"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                      >
                        {AP_DISTRICTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="citizen-reg-occupation"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        {isTe ? 'వృత్తి / విభాగం' : 'Profile / Occupation'}
                      </label>
                      <select
                        id="citizen-reg-occupation"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                      >
                        {OCCUPATIONS.map((occ) => (
                          <option key={occ} value={occ}>
                            {occ}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {isTe ? 'ప్రాధాన్య భాష' : 'Preferred Language'}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPreferredLang('en')}
                          className={`py-2 px-3 min-h-[40px] text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            preferredLang === 'en'
                              ? 'bg-teal-50 border-teal-600 text-teal-900'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreferredLang('te')}
                          className={`py-2 px-3 min-h-[40px] text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            preferredLang === 'te'
                              ? 'bg-teal-50 border-teal-600 text-teal-900'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          తెలుగు (Telugu)
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                      {successMsg}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3 px-4 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isTe ? 'పౌర ఖాతా సృష్టించండి' : 'Create Citizen Account'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </motion.button>

                  <p className="text-xs text-slate-500 text-center pt-1">
                    {isTe ? 'ఇప్పటికే ఖాతా ఉందా?' : 'Already have an account?'}{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="font-semibold text-teal-700 hover:text-amber-700 hover:underline cursor-pointer"
                    >
                      {isTe ? 'సైన్ ఇన్ చేయండి' : 'Sign In'}
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            {isTe
              ? 'మీ వివరాలు కేవలం పథక సిఫార్సులు మరియు బుక్‌మార్క్‌ల కోసం మాత్రమే ఉపయోగించబడతాయి.'
              : 'Citizen accounts store only your display name, district, occupation, and language preference.'}
          </div>
        </div>
      </div>
    </div>
  );
}
