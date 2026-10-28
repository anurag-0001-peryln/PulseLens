import { useRef, useState } from 'react';
import { X, UploadCloud, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../api';

export default function CsvUploadModal({ open, onClose, onSuccess }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setDragging(false);
    setError('');
    setResult(null);
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const pickFile = (f) => {
    setError('');
    setResult(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a .csv file.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5 MB.');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/feedback/batch-csv', formData);
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Upload CSV</h3>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
            <p className="mb-2 font-semibold text-slate-700">Expected CSV format</p>
            <p className="mb-2">
              First row must be a header. Use a <code className="rounded bg-white px-1 py-0.5">text</code> column
              (also accepted: <code className="rounded bg-white px-1 py-0.5">feedback</code>,{' '}
              <code className="rounded bg-white px-1 py-0.5">review</code>) and an optional{' '}
              <code className="rounded bg-white px-1 py-0.5">rating</code> column (1-5). Max 500 rows.
            </p>
            <pre className="overflow-x-auto rounded bg-white p-2 text-[11px] leading-relaxed text-slate-700">
{`text,rating
"My son loves his tutor, very clear lessons",5
"The app crashes during live class",1`}
            </pre>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
            }`}
          >
            <UploadCloud size={32} className="mb-2 text-indigo-500" />
            <p className="text-sm font-medium text-slate-700">Drag & drop your CSV here</p>
            <p className="text-xs text-slate-400">or click to browse files</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          {file && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <FileText size={18} className="text-indigo-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          {result && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>
                {result.message}
                {result.skipped > 0 ? ` (${result.skipped} empty rows skipped)` : ''}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {uploading ? 'Analyzing rows...' : 'Upload & Analyze'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}