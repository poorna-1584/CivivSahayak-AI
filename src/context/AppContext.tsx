import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getAdminToken, getCitizenToken, setAdminToken, setCitizenToken } from '../services/api';
import { UI_TEXT } from '../i18n/translations';
import type { CitizenUser, Language, PageRoute, Scheme, SchemeAlert } from '../types';

interface RecentQueryItem {
  question: string;
  language: Language;
  timestamp: string;
}

type BrowserAlertPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export const PROTECTED_CITIZEN_ROUTES: ReadonlySet<PageRoute> = new Set<PageRoute>([
  'chat',
  'schemes',
  'scheme-details',
  'eligibility',
  'checklist',
  'pdf-assistant',
  'dashboard',
  'helplines',
]);

interface PendingRedirect {
  route: PageRoute;
  schemeSlug?: string;
  chatPrompt?: string;
}

interface AuthPromptNotice {
  en: string;
  te: string;
}

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (typeof UI_TEXT)['en'];
  route: PageRoute;
  navigate: (
    route: PageRoute,
    options?: { schemeSlug?: string; chatPrompt?: string; authMode?: 'login' | 'register' }
  ) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  citizenUser: CitizenUser | null;
  citizenAuthChecked: boolean;
  pendingRedirect: PendingRedirect | null;
  authPromptNotice: AuthPromptNotice | null;
  clearAuthPrompt: () => void;
  completeAuthRedirect: (fallbackRoute?: PageRoute) => void;
  setCitizenSession: (token: string, user: CitizenUser) => void;
  logoutCitizen: () => void;
  selectedSchemeSlug: string | null;
  pendingChatPrompt: string | null;
  clearPendingChatPrompt: () => void;
  schemes: Scheme[];
  latestScholarships: Scheme[];
  schemesLoading: boolean;
  refreshSchemes: () => Promise<void>;
  alerts: SchemeAlert[];
  unseenAlertCount: number;
  markAlertsSeen: () => void;
  refreshAlerts: () => Promise<void>;
  browserAlertPermission: BrowserAlertPermission;
  enableBrowserAlerts: () => Promise<BrowserAlertPermission>;
  scholarshipsModalOpen: boolean;
  openScholarshipsModal: () => void;
  closeScholarshipsModal: () => void;
  bookmarkedIds: number[];
  toggleBookmark: (schemeId: number) => Promise<void>;
  recentQueries: RecentQueryItem[];
  recordRecentQuery: (question: string, language: Language) => void;
  isAdminAuthenticated: boolean;
  setAdminAuthenticated: (val: boolean) => void;
  logoutAdmin: () => void;
  sessionId: string;
}

const LAST_SEEN_ALERT_KEY = 'civicsahayak_last_seen_alert_id';
const CACHED_SCHEMES_KEY = 'civicsahayak_cached_schemes';

function readCachedSchemes(): Scheme[] {
  try {
    const raw = localStorage.getItem(CACHED_SCHEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Scheme[]) : [];
  } catch {
    return [];
  }
}

const AppContext = createContext<AppContextValue | null>(null);

function getOrCreateSessionId(): string {
  const key = 'civicsahayak_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `cit_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function readBrowserNotificationPermission(): BrowserAlertPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('civicsahayak_lang');
    return saved === 'te' ? 'te' : 'en';
  });
  const [route, setRoute] = useState<PageRoute>('home');
  const [selectedSchemeSlug, setSelectedSchemeSlug] = useState<string | null>(null);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>(() => readCachedSchemes());
  const [schemesLoading, setSchemesLoading] = useState(() => readCachedSchemes().length === 0);
  const [alerts, setAlerts] = useState<SchemeAlert[]>([]);
  const [lastSeenAlertId, setLastSeenAlertId] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(LAST_SEEN_ALERT_KEY) || '0');
    } catch {
      return 0;
    }
  });
  const [browserAlertPermission, setBrowserAlertPermission] = useState<BrowserAlertPermission>(() =>
    readBrowserNotificationPermission()
  );
  const [scholarshipsModalOpen, setScholarshipsModalOpen] = useState(false);
  const autoShownRef = useRef(false);
  const highestKnownAlertIdRef = useRef<number>(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [recentQueries, setRecentQueries] = useState<RecentQueryItem[]>(() => {
    try {
      const raw = localStorage.getItem('civicsahayak_recent_queries');
      return raw ? (JSON.parse(raw) as RecentQueryItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() =>
    Boolean(getAdminToken())
  );
  const [citizenUser, setCitizenUser] = useState<CitizenUser | null>(null);
  const [citizenAuthChecked, setCitizenAuthChecked] = useState<boolean>(() => !getCitizenToken());
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);
  const [authPromptNotice, setAuthPromptNotice] = useState<AuthPromptNotice | null>(null);
  const [guestSessionId] = useState<string>(() => getOrCreateSessionId());
  const sessionId = citizenUser ? `citizen_${citizenUser.id}` : guestSessionId;

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('civicsahayak_lang', lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'te' : 'en');
  }, [language, setLanguage]);

  const refreshAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      const incoming = data.alerts || [];
      setAlerts(incoming);

      const newest = incoming[0];
      if (newest) {
        if (
          highestKnownAlertIdRef.current > 0 &&
          newest.id > highestKnownAlertIdRef.current &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          const title = language === 'te' ? newest.title_te : newest.title_en;
          const body = language === 'te' ? newest.summary_te : newest.summary_en;
          try {
            new Notification(`CivicSahayak AI · ${title}`, { body });
          } catch {
            // Ignore browser notification restrictions
          }
        }
        highestKnownAlertIdRef.current = Math.max(highestKnownAlertIdRef.current, newest.id);
      }
    } catch {
      // Non-critical polling error
    }
  }, [language]);

  const refreshSchemes = useCallback(async () => {
    setSchemesLoading((prev) => (schemes.length === 0 ? true : prev));
    try {
      const list = await api.getSchemes();
      setSchemes(list);
      try {
        localStorage.setItem(CACHED_SCHEMES_KEY, JSON.stringify(list));
      } catch {
        // Ignore storage quota errors
      }
      await refreshAlerts();
    } catch (err) {
      console.error('Failed to load schemes:', err);
      const cached = readCachedSchemes();
      if (cached.length > 0) {
        setSchemes(cached);
      }
    } finally {
      setSchemesLoading(false);
    }
  }, [refreshAlerts, schemes.length]);

  useEffect(() => {
    refreshSchemes();

    if (getCitizenToken()) {
      api
        .citizenMe()
        .then(({ user }) => setCitizenUser(user))
        .catch(() => {
          setCitizenToken(null);
          setCitizenUser(null);
        })
        .finally(() => {
          setCitizenAuthChecked(true);
        });
    } else {
      setCitizenAuthChecked(true);
    }

    if (getAdminToken()) {
      api
        .adminMe()
        .then(() => setIsAdminAuthenticated(true))
        .catch(() => {
          setAdminToken(null);
          setIsAdminAuthenticated(false);
        });
    }
  }, [refreshSchemes]);

  useEffect(() => {
    api
      .getBookmarks(sessionId)
      .then(setBookmarkedIds)
      .catch(() => undefined);
  }, [sessionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAlerts();
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [refreshAlerts]);

  const latestScholarships = useMemo(() => {
    return schemes
      .filter((s) => s.category === 'Education and Scholarships')
      .sort((a, b) => {
        const aPrev = a.scheme_status === 'previous' ? 1 : 0;
        const bPrev = b.scheme_status === 'previous' ? 1 : 0;
        if (aPrev !== bPrev) return aPrev - bPrev;
        const dateCompare = b.last_verified_at.localeCompare(a.last_verified_at);
        return dateCompare !== 0 ? dateCompare : b.id - a.id;
      });
  }, [schemes]);

  const unseenAlertCount = useMemo(() => {
    return alerts.filter((a) => a.id > lastSeenAlertId).length;
  }, [alerts, lastSeenAlertId]);

  const markAlertsSeen = useCallback(() => {
    const maxId = alerts[0]?.id ?? 0;
    if (maxId > lastSeenAlertId) {
      setLastSeenAlertId(maxId);
      try {
        localStorage.setItem(LAST_SEEN_ALERT_KEY, String(maxId));
      } catch {
        // Ignore storage failures
      }
    }
  }, [alerts, lastSeenAlertId]);

  const enableBrowserAlerts = useCallback(async (): Promise<BrowserAlertPermission> => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setBrowserAlertPermission('unsupported');
      return 'unsupported';
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserAlertPermission(perm);
      return perm;
    } catch {
      return readBrowserNotificationPermission();
    }
  }, []);

  useEffect(() => {
    if (!citizenUser || autoShownRef.current || schemesLoading || latestScholarships.length === 0) return;
    if (route !== 'home') return;
    autoShownRef.current = true;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const dismissedDate = localStorage.getItem('civicsahayak_scholarship_popup_date');
      if (dismissedDate === today && unseenAlertCount === 0) return;
    } catch {
      // Proceed to open
    }
    const timer = window.setTimeout(() => {
      setScholarshipsModalOpen(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [citizenUser, schemesLoading, latestScholarships.length, route, unseenAlertCount]);

  const clearAuthPrompt = useCallback(() => {
    setAuthPromptNotice(null);
    setPendingRedirect(null);
  }, []);

  const navigate = useCallback(
    (
      nextRoute: PageRoute,
      options?: { schemeSlug?: string; chatPrompt?: string; authMode?: 'login' | 'register' }
    ) => {
      if (PROTECTED_CITIZEN_ROUTES.has(nextRoute) && !citizenUser) {
        setPendingRedirect({
          route: nextRoute,
          schemeSlug: options?.schemeSlug,
          chatPrompt: options?.chatPrompt,
        });
        setAuthPromptNotice(
          nextRoute === 'chat'
            ? {
                en: 'Please sign in or create a free Citizen Account to ask AI questions about government schemes.',
                te: 'ప్రభుత్వ పథకాలపై AI ప్రశ్నలు అడగడానికి దయచేసి సైన్ ఇన్ చేయండి లేదా ఉచిత పౌర ఖాతా తెరవండి.',
              }
            : {
                en: 'Please sign in or create a free Citizen Account to view scheme details, check eligibility, and access tools.',
                te: 'పథకాల వివరాలు, అర్హత తనిఖీ మరియు పౌర సాధనాలను చూడటానికి దయచేసి సైన్ ఇన్ చేయండి లేదా కొత్త ఖాతా తెరవండి.',
              }
        );
        setAuthMode(options?.authMode || 'login');
        setRoute('auth');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (nextRoute !== 'auth') {
        setAuthPromptNotice(null);
        setPendingRedirect(null);
      }

      if (options?.schemeSlug) {
        setSelectedSchemeSlug(options.schemeSlug);
      }
      if (options?.chatPrompt) {
        setPendingChatPrompt(options.chatPrompt);
      }
      if (options?.authMode) {
        setAuthMode(options.authMode);
      }
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [citizenUser]
  );

  const openScholarshipsModal = useCallback(() => {
    if (!citizenUser) {
      navigate('schemes');
      return;
    }
    setScholarshipsModalOpen(true);
  }, [citizenUser, navigate]);

  const closeScholarshipsModal = useCallback(() => {
    setScholarshipsModalOpen(false);
    markAlertsSeen();
  }, [markAlertsSeen]);

  const completeAuthRedirect = useCallback(
    (fallbackRoute: PageRoute = 'dashboard') => {
      const target = pendingRedirect;
      setPendingRedirect(null);
      setAuthPromptNotice(null);
      if (target) {
        if (target.schemeSlug) {
          setSelectedSchemeSlug(target.schemeSlug);
        }
        if (target.chatPrompt) {
          setPendingChatPrompt(target.chatPrompt);
        }
        setRoute(target.route);
      } else {
        setRoute(fallbackRoute);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [pendingRedirect]
  );

  const clearPendingChatPrompt = useCallback(() => {
    setPendingChatPrompt(null);
  }, []);

  const toggleBookmark = useCallback(
    async (schemeId: number) => {
      const exists = bookmarkedIds.includes(schemeId);
      if (exists) {
        setBookmarkedIds((prev) => prev.filter((id) => id !== schemeId));
        await api.removeBookmark(sessionId, schemeId).catch(() => undefined);
      } else {
        setBookmarkedIds((prev) => [...prev, schemeId]);
        await api.addBookmark(sessionId, schemeId).catch(() => undefined);
      }
    },
    [bookmarkedIds, sessionId]
  );

  const recordRecentQuery = useCallback((question: string, lang: Language) => {
    setRecentQueries((prev) => {
      const next = [
        { question, language: lang, timestamp: new Date().toISOString() },
        ...prev.filter((item) => item.question !== question),
      ].slice(0, 8);
      localStorage.setItem('civicsahayak_recent_queries', JSON.stringify(next));
      return next;
    });
  }, []);

  const setCitizenSession = useCallback(
    (token: string, user: CitizenUser) => {
      setCitizenToken(token);
      setCitizenUser(user);
      setCitizenAuthChecked(true);
      if (user.preferred_language === 'te' || user.preferred_language === 'en') {
        setLanguage(user.preferred_language);
      }
    },
    [setLanguage]
  );

  const logoutCitizen = useCallback(() => {
    setCitizenToken(null);
    setCitizenUser(null);
    setPendingRedirect(null);
    setAuthPromptNotice(null);
    setScholarshipsModalOpen(false);
    setRoute('home');
  }, []);

  const logoutAdmin = useCallback(() => {
    setAdminToken(null);
    setIsAdminAuthenticated(false);
    setRoute('home');
  }, []);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: UI_TEXT[language],
        route,
        navigate,
        authMode,
        setAuthMode,
        citizenUser,
        citizenAuthChecked,
        pendingRedirect,
        authPromptNotice,
        clearAuthPrompt,
        completeAuthRedirect,
        setCitizenSession,
        logoutCitizen,
        selectedSchemeSlug,
        pendingChatPrompt,
        clearPendingChatPrompt,
        schemes,
        latestScholarships,
        schemesLoading,
        refreshSchemes,
        alerts,
        unseenAlertCount,
        markAlertsSeen,
        refreshAlerts,
        browserAlertPermission,
        enableBrowserAlerts,
        scholarshipsModalOpen,
        openScholarshipsModal,
        closeScholarshipsModal,
        bookmarkedIds,
        toggleBookmark,
        recentQueries,
        recordRecentQuery,
        isAdminAuthenticated,
        setAdminAuthenticated: setIsAdminAuthenticated,
        logoutAdmin,
        sessionId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
