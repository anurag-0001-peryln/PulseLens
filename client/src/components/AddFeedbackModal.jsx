import { useState } from 'react';
import { X, Star, Loader2, Send } from 'lucide-react';
import api, { getErrorMessage } from '../api';

export default function AddFeedbackModal({ open, onClose, onSuccess }) {
  const [rawText, setRawText] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const reset = () => {
    setRawText('');
    setRating(0);
    setHover(0);
    setError('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setError('Please enter some feedback text.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = { rawText: rawText.trim() };
      if (rating > 0) payload.rating = rating;
      const { data } = await api.post('/feedback', payload);
      reset();
      onSuccess?.(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Add Feedback</h3>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Feedback</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="e.g. My son enjoys the live classes, but the app keeps logging him out..."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{rawText.length} / 2000</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Rating <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className="rounded p-1 transition hover:scale-110"
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  <Star
                    size={28}
                    className={n <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-slate-500">{rating ? `${rating} / 5` : 'Not rated'}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'Analyzing...' : 'Submit & Analyze'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}