import { useCallback, useEffect, useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react';
import api, { getErrorMessage } from '../api';

const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];
const CATEGORIES = ['Instructor', 'Platform Bug', 'Pricing', 'Course Content', 'Customer Support'];

const sentimentBadge = {
  Positive: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Neutral: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Negative: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

const categoryBadge = {
  Instructor: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  'Platform Bug': 'bg-red-50 text-red-700 ring-red-600/20',
  Pricing: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  'Course Content': 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  'Customer Support': 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function FeedbackTable({ refreshKey, onChanged, notify }) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (sentiment) params.sentiment = sentiment;
      if (category) params.category = category;
      const { data } = await api.get('/feedback', { params });
      setRows(data.data);
      setPagination(data.pagination);
    } catch (error) {
      notify?.('error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page, search, sentiment, category, notify]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows, refreshKey]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback record?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/feedback/${id}`);
      notify?.('success', 'Feedback deleted');
      // If last row on a page > 1 was removed, go back a page
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      onChanged?.();
    } catch (error) {
      notify?.('error', getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Feedback Explorer</h2>
          <p className="text-xs text-slate-400">{pagination.total} records match your filters</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search feedback..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:w-60"
            />
          </div>

          <select
            value={sentiment}
            onChange={(e) => {
              setSentiment(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All sentiments</option>
            {SENTIMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Feedback</th>
              <th className="px-5 py-3">Sentiment</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Rating</th>
              <th className="px-5 py-3">Confidence</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                  <Loader2 className="mx-auto mb-2 animate-spin" size={22} />
                  Loading feedback...
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                  <Inbox className="mx-auto mb-2" size={26} />
                  No feedback found. Try seeding demo data or changing filters.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => (
                <tr key={row._id} className="align-top hover:bg-slate-50/60">
                  <td className="max-w-md px-5 py-4">
                    <p className="font-medium text-slate-800">{row.summary || '—'}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{row.rawText}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${sentimentBadge[row.sentiment]}`}>
                      {row.sentiment}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${categoryBadge[row.category]}`}>
                      {row.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                    {row.rating ? `${row.rating} / 5` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                    {typeof row.confidenceScore === 'number'
                      ? `${Math.round(row.confidenceScore * 100)}%`
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{row.source}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(row._id)}
                      disabled={deletingId === row._id}
                      className="inline-flex items-center rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      title="Delete feedback"
                    >
                      {deletingId === row._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
            disabled={page >= pagination.totalPages || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}