import { MessageSquare, ThumbsUp, Bug, Sparkles } from 'lucide-react';

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

export default function MetricCards({ analytics, loading }) {
  const total = analytics?.summaryMetrics?.totalCount || 0;
  const positive =
    analytics?.sentimentDistribution?.find((s) => s.sentiment === 'Positive')?.count || 0;
  const bugs =
    analytics?.categoryBreakdown?.find((c) => c.category === 'Platform Bug')?.count || 0;
  const confidence = analytics?.summaryMetrics?.averageConfidence || 0;

  const cards = [
    {
      label: 'Total Feedback',
      value: total.toLocaleString(),
      sub: `Avg rating ${analytics?.summaryMetrics?.averageRating || 0} / 5`,
      icon: MessageSquare,
      accent: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: '% Positive',
      value: `${pct(positive, total)}%`,
      sub: `${positive} positive reviews`,
      icon: ThumbsUp,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: '% Platform Bugs',
      value: `${pct(bugs, total)}%`,
      sub: `${bugs} bug reports`,
      icon: Bug,
      accent: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Avg AI Confidence',
      value: `${Math.round(confidence * 1000) / 10}%`,
      sub: 'Classification certainty',
      icon: Sparkles,
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, sub, icon: Icon, accent }) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? <span className="inline-block h-8 w-20 animate-pulse rounded bg-slate-100" /> : value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{sub}</p>
            </div>
            <div className={`rounded-lg p-2.5 ${accent}`}>
              <Icon size={22} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}