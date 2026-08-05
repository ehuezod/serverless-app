import { aggregate } from '../lambda/shared/aggregate';
import { CategoryRule, Transaction } from '../lambda/shared/types';

function txn(overrides: Partial<Transaction>): Transaction {
    return {
        transactionDate: '2026-08-01',
        employeeId: 'emp-1',
        merchantName: 'Shop',
        mcc: '1111',
        amountCents: 0,
        ...overrides,
    };
}

const rules: CategoryRule[] = [
    { name: 'All', matches: () => true },
    { name: 'Even Only', matches: (t) => t.amountCents % 2 === 0 },
];

describe('aggregate', () => {
    test('sums totals and counts per rule', () => {
        const transactions = [txn({ amountCents: 100 }), txn({ amountCents: 251 }), txn({ amountCents: 400 })];
        const result = aggregate(transactions, rules);

        const all = result.find((r) => r.category === 'All')!;
        expect(all.totalSpend).toBe(7.51);
        expect(all.transactionCount).toBe(3);

        const even = result.find((r) => r.category === 'Even Only')!;
        expect(even.totalSpend).toBe(5.0);
        expect(even.transactionCount).toBe(2);
    });

    test('supports overlapping category membership without double counting a category incorrectly', () => {
        const overlapping: CategoryRule[] = [
            { name: 'MccA', matches: (t) => t.mcc === 'A' },
            { name: 'OfficeLike', matches: (t) => t.merchantName.includes('Office') },
        ];
        const transactions = [
            txn({ mcc: 'A', merchantName: 'Office Depot', amountCents: 1000 }),
            txn({ mcc: 'A', merchantName: 'Cafe', amountCents: 500 }),
        ];
        const result = aggregate(transactions, overlapping);

        expect(result.find((r) => r.category === 'MccA')).toEqual({
            category: 'MccA',
            totalSpend: 15.0,
            transactionCount: 2,
        });
        expect(result.find((r) => r.category === 'OfficeLike')).toEqual({
            category: 'OfficeLike',
            totalSpend: 10.0,
            transactionCount: 1,
        });
    });

    test('sums many rows without floating point drift', () => {
        // 0.1 + 0.2 famously != 0.3 in naive float arithmetic; cents-based summation must be exact.
        const transactions: Transaction[] = [];
        for (let i = 0; i < 1000; i++) {
            transactions.push(txn({ amountCents: 11 })); // $0.11 each
        }
        const result = aggregate(transactions, [{ name: 'All', matches: () => true }]);
        expect(result[0].totalSpend).toBe(110.0);
    });

    test('returns zeroed summaries for an empty transaction list', () => {
        const result = aggregate([], rules);
        expect(result).toEqual([
            { category: 'All', totalSpend: 0, transactionCount: 0 },
            { category: 'Even Only', totalSpend: 0, transactionCount: 0 },
        ]);
    });
});
