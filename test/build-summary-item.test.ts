import { buildSk, buildSummaryItem } from '../lambda/shared/build-summary-item';

describe('buildSk', () => {
    test('formats as UPLOAD#<processedAt>#<uploadId>', () => {
        expect(buildSk('2026-08-01T00:00:00.000Z', 'upload-1')).toBe(
            'UPLOAD#2026-08-01T00:00:00.000Z#upload-1'
        );
    });

    test('sorts lexicographically by timestamp, earliest first', () => {
        const earlier = buildSk('2026-08-01T00:00:00.000Z', 'a');
        const later = buildSk('2026-08-02T00:00:00.000Z', 'b');
        expect([later, earlier].sort()).toEqual([earlier, later]);
    });
});

describe('buildSummaryItem', () => {
    const baseArgs = {
        userId: 'user-1',
        uploadId: 'upload-1',
        fileName: 'transactions.csv',
        s3Key: 'uploads/user-1/upload-1-transactions.csv',
        processedAt: '2026-08-01T00:00:00.000Z',
        transactionCount: 10,
        skippedRowCount: 1,
        errors: [{ row: 5, reason: 'bad amount' }],
        summaries: [{ category: 'All Transactions', totalSpend: 100, transactionCount: 9 }],
    };

    test('assembles the sk and passes fields through', () => {
        const item = buildSummaryItem(baseArgs);
        expect(item.sk).toBe('UPLOAD#2026-08-01T00:00:00.000Z#upload-1');
        expect(item.userId).toBe('user-1');
        expect(item.summaries).toEqual(baseArgs.summaries);
    });

    test('truncates errors to a bounded length', () => {
        const manyErrors = Array.from({ length: 50 }, (_, i) => ({ row: i, reason: 'bad row' }));
        const item = buildSummaryItem({ ...baseArgs, errors: manyErrors });
        expect(item.errors.length).toBe(20);
    });
});
