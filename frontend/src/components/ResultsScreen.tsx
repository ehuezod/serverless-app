import { useState } from 'react';
import type { SummaryItem } from '../lib/types';
import { formatCount, formatDollars } from '../lib/format';
import { EXCLUDED_FROM_CHART } from '../lib/constants';
import { StatTile } from './StatTile';
import { CategorySpendChart } from './CategorySpendChart';
import { CategoryCard } from './CategoryCard';
import { QuickAnalysisCard } from './QuickAnalysisCard';

interface ResultsScreenProps {
    summary: SummaryItem;
    onUploadAnother: () => void;
}

export function ResultsScreen({ summary, onUploadAnother }: ResultsScreenProps) {
    const [showErrors, setShowErrors] = useState(false);

    const allSpend = summary.summaries.find((s) => s.category === 'All Spend');
    const relevantSpend = summary.summaries.find((s) => s.category === 'Relevant Spend');
    const categoryCards = summary.summaries
        .filter((s) => !EXCLUDED_FROM_CHART.has(s.category))
        .slice()
        .sort((a, b) => b.totalSpend - a.totalSpend);

    return (
        <div>
            <div className="info-banner">
                {summary.fileName} — {summary.transactionCount} rows
                {summary.skippedRowCount > 0 && `, ${summary.skippedRowCount} skipped`}
                {summary.errors.length > 0 && (
                    <>
                        {' '}
                        <button className="errors-toggle" onClick={() => setShowErrors((v) => !v)}>
                            {showErrors ? 'hide' : 'show'} row errors
                        </button>
                        {showErrors && (
                            <ul className="errors-list">
                                {summary.errors.map((e, i) => (
                                    <li key={i}>
                                        Row {e.row}: {e.reason}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>

            <div className="stat-row">
                <StatTile
                    label="All spend"
                    value={formatDollars(allSpend?.totalSpend ?? 0)}
                    metrics={[
                        { label: 'Transactions', value: formatCount(allSpend?.transactionCount ?? 0) },
                        { label: 'Cardholders', value: formatCount(allSpend?.uniqueEmployeeCount ?? 0) },
                    ]}
                />
                <StatTile
                    label="Relevant spend"
                    value={formatDollars(relevantSpend?.totalSpend ?? 0)}
                    metrics={[
                        { label: 'Transactions', value: formatCount(relevantSpend?.transactionCount ?? 0) },
                        { label: 'Cardholders', value: formatCount(relevantSpend?.uniqueEmployeeCount ?? 0) },
                    ]}
                />
            </div>

            <div className="card chart-card">
                <p className="section-title">Spend by category</p>
                <CategorySpendChart summaries={summary.summaries} />
            </div>

            <div className="category-cards">
                {categoryCards.map((s) => (
                    <CategoryCard key={s.category} summary={s} />
                ))}
            </div>

            <QuickAnalysisCard analysis={summary.analysis} />

            <button className="secondary" style={{ marginTop: 20 }} onClick={onUploadAnother}>
                Upload another file
            </button>
        </div>
    );
}
