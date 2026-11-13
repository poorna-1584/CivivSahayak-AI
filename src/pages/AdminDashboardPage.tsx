import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  DatabaseZap,
  Edit3,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, extractApiError } from '../services/api';
import { SCHEME_CATEGORIES } from '../i18n/translations';
import type { AdminStats, Department, QueryLogItem, Scheme, UploadedDocument } from '../types';

export function AdminDashboardPage() {
  const { language, schemes, refreshSchemes, logoutAdmin, navigate, isAdminAuthenticated } = useApp();
  const isTe = language === 'te';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<QueryLogItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);

  // Add/Edit Scheme Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [titleEn, setTitleEn] = useState('');
  const [titleTe, setTitleTe] = useState('');
  const [category, setCategory] = useState<string>(SCHEME_CATEGORIES[0]);
  const [departmentId, setDepartmentId] = useState<number>(1);
  const [shortDescEn, setShortDescEn] = useState('');
  const [shortDescTe, setShortDescTe] = useState('');
  const [eligSummaryEn, setEligSummaryEn] = useState('');
  const [officialUrl, setOfficialUrl] = useState('');
  const [lastVerifiedAt, setLastVerifiedAt] = useState(new Date().toISOString().slice(0, 10));
  const [isSample, setIsSample] = useState(true);
  const [savingScheme, setSavingScheme] = useState(false);

  // Upload PDF State
  const [uploadSchemeId, setUploadSchemeId] = useState<string>('');
  const [uploadOfficialUrl, setUploadOfficialUrl] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsData, depts, docs] = await Promise.all([
        api.adminGetStats(),
        api.getDepartments(),
        api.getPdfDocuments(),
      ]);
      setStats(statsData.stats);
      setRecentLogs(statsData.recentLogs);
      setDepartments(depts);
      if (depts.length > 0 && !editingId) setDepartmentId(depts[0].id);
      setDocuments(docs);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('admin-login');
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAuthenticated]);

  const resetForm = () => {
    setEditingId(null);
    setTitleEn('');
    setTitleTe('');
    setCategory(SCHEME_CATEGORIES[0]);
    setDepartmentId(departments[0]?.id || 1);
    setShortDescEn('');
    setShortDescTe('');
    setEligSummaryEn('');
    setOfficialUrl('');
    setLastVerifiedAt(new Date().toISOString().slice(0, 10));
    setIsSample(true);
  };

  const startEdit = (s: Scheme) => {
    setEditingId(s.id);
    setTitleEn(s.title_en);
    setTitleTe(s.title_te);
    setCategory(s.category);
    setDepartmentId(s.department_id);
    setShortDescEn(s.short_desc_en);
    setShortDescTe(s.short_desc_te);
    setEligSummaryEn(s.eligibility_summary_en);
    setOfficialUrl(s.official_url);
    setLastVerifiedAt(s.last_verified_at);
    setIsSample(s.is_sample);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingScheme(true);
    setError(null);
    setNotice(null);

    try {
      const payload = {
        title_en: titleEn,
        title_te: titleTe || titleEn,
        category,
        department_id: departmentId,
        short_desc_en: shortDescEn,
        short_desc_te: shortDescTe || shortDescEn,
        eligibility_summary_en: eligSummaryEn,
        official_url: officialUrl,
        last_verified_at: lastVerifiedAt,
        is_sample: isSample,
      };

      if (editingId) {
        await api.adminUpdateScheme(editingId, payload);
        setNotice('Scheme record updated and re-indexed in vector database.');
      } else {
        await api.adminCreateScheme(payload);
        setNotice('New scheme record created and indexed in vector database.');
      }
      resetForm();
      await Promise.all([refreshSchemes(), loadAll()]);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSavingScheme(false);
    }
  };

  const handleDeleteScheme = async (id: number) => {
    setError(null);
    setNotice(null);
    try {
      await api.adminDeleteScheme(id);
      setNotice('Scheme record removed from database.');
      await Promise.all([refreshSchemes(), loadAll()]);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handleAdminPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    setError(null);
    setNotice(null);

    try {
      await api.adminUploadDocument(
        file,
        uploadSchemeId ? Number(uploadSchemeId) : undefined,
        uploadOfficialUrl || undefined
      );
      setNotice(`Official document "${file.name}" extracted and indexed.`);
      setUploadOfficialUrl('');
      await loadAll();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setUploadingPdf(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await api.adminDeleteDocument(id);
      setNotice('Document and its vector chunks deleted.');
      await loadAll();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.adminReindex();
      setNotice(
        `Re-indexed ${res.schemesIndexed} schemes (${res.chunksUpdated} vector chunks updated).`
      );
      await loadAll();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs text-slate-500">
            CivicSahayak AI · {isTe ? 'జ్ఞాన కోశ నిర్వహణ' : 'Knowledge Base Governance'}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900">
            {isTe ? 'అడ్మిన్ డాష్‌బోర్డ్' : 'Administrator Dashboard'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleReindex}
            disabled={reindexing}
            className="px-4 py-2 text-xs sm:text-sm font-medium bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            {reindexing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DatabaseZap className="w-4 h-4" />
            )}
            <span>{isTe ? 'వెక్టర్ DB రీ-ఇండెక్స్' : 'Re-Index Vector Store'}</span>
          </button>

          <button
            type="button"
            onClick={logoutAdmin}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{isTe ? 'లాగ్ అవుట్' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Usage Statistics */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Total Schemes</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {stats.totalSchemes}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Indexed PDFs</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {stats.totalDocuments}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Vector Chunks (Embedded / Total)</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {stats.embeddedChunks} / {stats.totalChunks}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Queries (EN / TE)</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {stats.totalQueries}{' '}
              <span className="text-xs font-normal text-slate-500">
                ({stats.englishQueries} / {stats.teluguQueries})
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Scheme + Upload Official Notification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSaveScheme}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-700" />
              <span>{editingId ? 'Edit Scheme Record' : 'Add Government Scheme'}</span>
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-600 hover:underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheme Title (English)
              </label>
              <input
                type="text"
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheme Title (Telugu)
              </label>
              <input
                type="text"
                value={titleTe}
                onChange={(e) => setTitleTe(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
              >
                {SCHEME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Description (English)
            </label>
            <textarea
              rows={2}
              required
              value={shortDescEn}
              onChange={(e) => setShortDescEn(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Description (Telugu, optional)
            </label>
            <textarea
              rows={2}
              value={shortDescTe}
              onChange={(e) => setShortDescTe(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Eligibility Summary (English)
            </label>
            <input
              type="text"
              value={eligSummaryEn}
              onChange={(e) => setEligSummaryEn(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Source URL
              </label>
              <input
                type="url"
                required
                value={officialUrl}
                onChange={(e) => setOfficialUrl(e.target.value)}
                placeholder="https://ap.gov.in"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Verified Date
              </label>
              <input
                type="date"
                value={lastVerifiedAt}
                onChange={(e) => setLastVerifiedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isSample}
              onChange={(e) => setIsSample(e.target.checked)}
              className="rounded border-slate-300 text-teal-700 accent-teal-700"
            />
            <span>Label this entry as a Sample Record (uncheck only for verified official GO)</span>
          </label>

          <button
            type="submit"
            disabled={savingScheme}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            {savingScheme && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{editingId ? 'Update Scheme' : 'Save & Index Scheme'}</span>
          </button>
        </form>

        {/* Official Notification PDF Upload */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Upload Official Notification PDF
          </h2>
          <p className="text-xs text-slate-600">
            Link an official notification PDF to a scheme and index its pages into the vector store.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Link to Scheme (Optional)
            </label>
            <select
              value={uploadSchemeId}
              onChange={(e) => setUploadSchemeId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
            >
              <option value="">General Government Notification</option>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Source URL (Optional)
            </label>
            <input
              type="url"
              value={uploadOfficialUrl}
              onChange={(e) => setUploadOfficialUrl(e.target.value)}
              placeholder="https://goir.ap.gov.in"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <label className="block">
            <div className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 text-teal-800 text-sm font-medium rounded-lg cursor-pointer transition-colors">
              {uploadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{uploadingPdf ? 'Indexing PDF...' : 'Select & Index PDF'}</span>
            </div>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleAdminPdfUpload}
              disabled={uploadingPdf}
              className="hidden"
            />
          </label>

          {/* Uploaded Documents Table */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <h3 className="text-xs font-semibold text-slate-700">
              Indexed Documents ({documents.length})
            </h3>
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {documents.map((d) => (
                <div key={d.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{d.original_name}</p>
                    <p className="text-slate-500 tabular-nums">
                      {d.page_count} pages · {d.chunk_count || 0} chunks · {d.source_type}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(d.id)}
                    aria-label="Delete document"
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schemes Management Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Manage Scheme Records ({schemes.length})
          </h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Scheme Name</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Verified Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schemes.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-medium text-slate-900">{s.title_en}</td>
                  <td className="py-3 px-4 text-slate-600">{s.category}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {s.is_sample ? 'Sample Record' : 'Verified'}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                    {s.last_verified_at}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded cursor-pointer mr-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScheme(s.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Usage Logs */}
      {recentLogs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Recent Anonymous Query Logs
          </h2>
          <div className="divide-y divide-slate-100 text-xs">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-800">{log.query_text}</span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {log.language.toUpperCase()} · {log.mode} · {log.retrieved_count} hits ·{' '}
                  {log.latency_ms} ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
