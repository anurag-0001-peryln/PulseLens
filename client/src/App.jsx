import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, UploadCloud, Plus, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import api, { getErrorMessage } from './api';
import MetricCards from './components/MetricCards.jsx';
import ChartsSection from './components/ChartsSection.jsx';
import FeedbackTable from './components/FeedbackTable.jsx';
import AddFeedbackModal from './components/AddFeedbackModal.jsx';
import CsvUploadModal from './components/CsvUploadModal.jsx';

export default function App() {
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAnalytics = useCallback(async () => {
    try {
      const { data } = await api.get('/feedback/analytics');
      setAnalytics(data);
    } catch (error) {
      notify('error', getErrorMessage(error));
    } finally {
      setAnalyticsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, refreshKey]);

  const refreshAll = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data } = await api.post('/feedback/seed');
      notify('success', data.message);
      refreshAll();
    } catch (error) {
      notify('error', getErrorMessage(error));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-sm">
              <Activity size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">PulseLens</h1>
              <p className="text-xs text-slate-500">Automated Feedback & Sentiment Analytics</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {seeding ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
              Seed Demo Data
            </button>
            <button
              onClick={() => setShowCsv(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <UploadCloud size={16} />
              Upload CSV
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus size={16} />
              Add Feedback
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <MetricCards analytics={analytics} loading={analyticsLoading} />
        <ChartsSection analytics={analytics} />
        <FeedbackTable refreshKey={refreshKey} onChanged={refreshAll} notify={notify} />
      </main>

      <AddFeedbackModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => {
          setShowAdd(false);
          notify('success', 'Feedback analyzed and saved');
          refreshAll();
        }}
      />

      <CsvUploadModal
        open={showCsv}
        onClose={() => setShowCsv(false)}
        onSuccess={() => {
          notify('success', 'CSV processed successfully');
          refreshAll();
        }}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] max-w-sm">
          <div
            className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                : 'bg-rose-50 text-rose-800 ring-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}