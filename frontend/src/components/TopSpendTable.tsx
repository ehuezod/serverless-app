import type { Transaction } from '../lib/types';
import { formatCents } from '../lib/format';

interface TopSpendTableProps {
    transactions: Transaction[];
}

export function TopSpendTable({ transactions }: TopSpendTableProps) {
    if (transactions.length === 0) {
        return <p style={{ color: 'var(--text-secondary)' }}>No transactions to show.</p>;
    }

    return (
        <div className="table-wrapper">
            <table className="spend-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Employee</th>
                        <th>Merchant</th>
                        <th>MCC</th>
                        <th className="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((t, i) => (
                        <tr key={`${t.transactionDate}-${t.employeeId}-${t.merchantName}-${i}`}>
                            <td>{t.transactionDate}</td>
                            <td>{t.employeeId}</td>
                            <td>{t.merchantName}</td>
                            <td>{t.mcc}</td>
                            <td className="amount">{formatCents(t.amountCents)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
