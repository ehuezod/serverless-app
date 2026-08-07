import { useState } from 'react';
import type { CategorySummary } from '../lib/types';
import { formatCount, formatDollars } from '../lib/format';
import { TopSpendTable } from './TopSpendTable';

interface CategoryCardProps {
    summary: CategorySummary;
}

export function CategoryCard({ summary }: CategoryCardProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="category-card">
            <button
                className="category-card-header"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
            >
                <span className="category-card-title">{summary.category}</span>
                <span className="category-card-chevron">{expanded ? '▾' : '▸'}</span>
            </button>
            <div className="category-card-metrics">
                <div className="category-card-metric">
                    <span className="category-card-metric-label">Total spend</span>
                    <span className="category-card-metric-value">{formatDollars(summary.totalSpend)}</span>
                </div>
                <div className="category-card-metric">
                    <span className="category-card-metric-label">Cardholders</span>
                    <span className="category-card-metric-value">{formatCount(summary.uniqueEmployeeCount)}</span>
                </div>
                <div className="category-card-metric">
                    <span className="category-card-metric-label">Transactions</span>
                    <span className="category-card-metric-value">{formatCount(summary.transactionCount)}</span>
                </div>
            </div>
            {expanded && (
                <div className="category-card-body">
                    <TopSpendTable transactions={summary.transactions} />
                </div>
            )}
        </div>
    );
}
