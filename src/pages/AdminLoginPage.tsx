import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, extractApiError, setAdminToken } from '../services/api';
import { CivicLogo3D } from '../components/CivicLogo3D';

export function AdminLoginPage() {
  const { language, t, navigate, setAdminAuthenticated } = useApp();
  const isTe = language === 'te';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminLogin(email, password);
      setAdminToken(res.token);
      setAdminAuthenticated(true);
      navigate('admin-dashboard');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-3 text-center">
          <div className="py-1">
            <CivicLogo3D size="sm" variant="admin" spinKey="admin" label="Admin Vault 3D Logo" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{t.adminLoginTitle}</h1>
          <p className="text-xs text-slate-600">
            {isTe
              ? 'ప్రభుత్వ పథకాలు, PDF పత్రాలు మరియు వెక్టర్ ఇండెక్స్‌ను నిర్వహించడానికి అధీకృత అడ్మిన్ లాగిన్.'
              : 'Authorized administrator sign-in to manage schemes, official PDFs, source links, and vector re-indexing.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isTe ? 'అడ్మిన్ ఇమెయిల్' : 'Administrator Email'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@civicsahayak.gov.in"
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isTe ? 'పాస్‌వర్డ్' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-11 min-h-[44px] text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isTe ? 'సైన్ ఇన్ చేయండి' : 'Sign In to Admin Dashboard'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
          <p>
            {isTe
              ? 'డెమో / ప్రాజెక్ట్ మూల్యాంకనం కోసం డిఫాల్ట్ అడ్మిన్ క్రెడెన్షియల్స్ .env.example / README లో ఇవ్వబడ్డాయి.'
              : 'Default evaluation credentials are documented in .env.example and README.md (change via ADMIN_EMAIL / ADMIN_PASSWORD in production).'}
          </p>
          <p>
            <button
              type="button"
              onClick={() => navigate('auth', { authMode: 'login' })}
              className="font-semibold text-teal-700 hover:text-amber-700 hover:underline cursor-pointer"
            >
              {isTe ? 'పౌర లాగిన్ / కొత్త ఖాతాకు వెళ్ళండి' : 'Go to Citizen Sign In / Create Account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
