import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const SENTIMENT_COLORS = {
  Positive: '#10b981',
  Neutral: '#f59e0b',
  Negative: '#ef4444',
};

const CATEGORY_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6'];

function EmptyState() {
  return (
    <div className="flex h-72 items-center justify-center text-sm text-slate-400">
      No data yet. Seed demo data or add feedback to see charts.
    </div>
  );
}

export default function ChartsSection({ analytics }) {
  const sentimentData = (analytics?.sentimentDistribution || []).filter((s) => s.count > 0);
  const categoryData = analytics?.categoryBreakdown || [];
  const hasData = (analytics?.summaryMetrics?.totalCount || 0) > 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Sentiment Distribution</h2>
        <p className="mb-2 text-xs text-slate-400">Share of positive, neutral and negative feedback</p>
        {!hasData ? (
          <EmptyState />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  dataKey="count"
                  nameKey="sentiment"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  stroke="none"
                >
                  {sentimentData.map((entry) => (
                    <Cell key={entry.sentiment} fill={SENTIMENT_COLORS[entry.sentiment]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={32} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Category Breakdown</h2>
        <p className="mb-2 text-xs text-slate-400">Feedback volume by topic</p>
        {!hasData ? (
          <EmptyState />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" name="Feedback" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry, i) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}