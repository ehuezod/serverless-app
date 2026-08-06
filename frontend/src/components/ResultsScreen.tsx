import { useState } from 'react';
import type { SummaryItem } from '../lib/types';
import { formatDollars } from '../lib/format';
import { StatTile } from './StatTile';
import { CategorySpendChart } from './CategorySpendChart';
import { TopSpendTable } from './TopSpendTable';

interface ResultsScreenProps {
    summary: SummaryItem;
    onUploadAnother: () => void;
}

export function ResultsScreen({ summary, onUploadAnother }: ResultsScreenProps) {
    const [showErrors, setShowErrors] = useState(false);

    const allSpend = summary.summaries.find((s) => s.category === 'All Spend');
    const relevantSpend = summary.summaries.find((s) => s.category === 'Relevant Spend');
    const topSpendLines = allSpend?.transactions ?? [];

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
                <StatTile label="All spend" value={formatDollars(allSpend?.totalSpend ?? 0)} />
                <StatTile label="Relevant spend" value={formatDollars(relevantSpend?.totalSpend ?? 0)} />
            </div>

            <div className="card chart-card">
                <p className="section-title">Spend by category</p>
                <CategorySpendChart summaries={summary.summaries} />
            </div>

            <div className="card">
                <p className="section-title">Top spend lines</p>
                <TopSpendTable transactions={topSpendLines} />
            </div>

            <button className="secondary" style={{ marginTop: 20 }} onClick={onUploadAnother}>
                Upload another file
            </button>
        </div>
    );
}
