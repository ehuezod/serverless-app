import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps, TooltipValueType } from 'recharts';
import type { CategorySummary } from '../lib/types';
import { formatDollars } from '../lib/format';
import { EXCLUDED_FROM_CHART } from '../lib/constants';

interface CategorySpendChartProps {
    summaries: CategorySummary[];
}

function ChartTooltip({ active, payload }: TooltipContentProps<TooltipValueType, string | number>) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as CategorySummary;
    return (
        <div
            style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: '0.85rem',
            }}
        >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatDollars(point.totalSpend)}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{point.category}</div>
        </div>
    );
}

export function CategorySpendChart({ summaries }: CategorySpendChartProps) {
    const data = summaries
        .filter((s) => !EXCLUDED_FROM_CHART.has(s.category))
        .slice()
        .sort((a, b) => b.totalSpend - a.totalSpend);

    if (data.length === 0) {
        return null;
    }

    const height = Math.max(data.length * 44 + 24, 160);

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--gridline)" />
                <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatDollars(v)}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--baseline)' }}
                    tickLine={false}
                />
                <YAxis
                    type="category"
                    dataKey="category"
                    width={220}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--baseline)' }}
                    tickLine={false}
                />
                <Tooltip content={ChartTooltip} cursor={{ fill: 'var(--gridline)', opacity: 0.4 }} />
                <Bar dataKey="totalSpend" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList
                        dataKey="totalSpend"
                        position="right"
                        formatter={(v: unknown) => (typeof v === 'number' ? formatDollars(v) : '')}
                        style={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
