import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { computeSampleSummary, SAMPLE_CATEGORY_ORDER } from '../utils';

const COMPARISON_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];

interface SingleProps {
  mode: 'single';
  gevi: any;
  darkMode: boolean;
}

interface CompareProps {
  mode: 'compare';
  gevis: any[];
  darkMode: boolean;
}

type Props = SingleProps | CompareProps;

const getSafeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '');

const axisStyle = (dark: boolean) => ({ fill: dark ? '#9ca3af' : '#6b7280', fontSize: 11 });
const gridColor = (dark: boolean) => dark ? '#374151' : '#e5e7eb';

export function SampleUsageChart(props: Props) {
  const { darkMode } = props;

  if (props.mode === 'single') {
    const summary = computeSampleSummary(props.gevi.researchPapers);
    const data = SAMPLE_CATEGORY_ORDER
      .filter(cat => summary[cat] > 0)
      .map(cat => ({ category: cat, count: summary[cat] }));

    if (data.length === 0) return (
      <p className={`text-xs text-center py-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        No sample data available
      </p>
    );

    const barColor = darkMode ? '#60a5fa' : '#1e40af';

    return (
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor(darkMode)} vertical={false} />
            <XAxis dataKey="category" tick={axisStyle(darkMode)} tickLine={false} />
            <YAxis allowDecimals={false} tick={axisStyle(darkMode)} tickLine={false} axisLine={false} width={28} />
            <Tooltip
              contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: darkMode ? '#d1d5db' : '#111' }}
              cursor={{ fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
            />
            <Bar dataKey="count" name="Papers" radius={[3, 3, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={barColor} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Comparison mode
  const { gevis } = props;
  const summaries = gevis.map(g => computeSampleSummary(g.researchPapers));

  const activeCategories = SAMPLE_CATEGORY_ORDER.filter(cat =>
    summaries.some(s => (s[cat] || 0) > 0)
  );

  if (activeCategories.length === 0) return (
    <p className={`text-xs text-center py-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
      No sample data available
    </p>
  );

  const data = activeCategories.map(cat => {
    const entry: Record<string, any> = { category: cat };
    gevis.forEach((g, i) => { entry[getSafeName(g.name)] = summaries[i][cat] || 0; });
    return entry;
  });

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(darkMode)} vertical={false} />
          <XAxis dataKey="category" tick={axisStyle(darkMode)} tickLine={false} />
          <YAxis allowDecimals={false} tick={axisStyle(darkMode)} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: darkMode ? '#d1d5db' : '#111' }}
            cursor={{ fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {gevis.map((g, i) => (
            <Bar key={g.id} dataKey={getSafeName(g.name)} name={g.name} fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
