import { parseAmountToCents, validateRow } from '../lambda/shared/transaction';

describe('parseAmountToCents', () => {
    test('parses a simple 2-decimal amount', () => {
        expect(parseAmountToCents('5.75')).toBe(575);
    });

    test('parses a negative amount', () => {
        expect(parseAmountToCents('-12.30')).toBe(-1230);
    });

    test('rejects non-numeric input', () => {
        expect(parseAmountToCents('abc')).toBeNull();
    });

    test('rejects amounts with the wrong number of decimals', () => {
        expect(parseAmountToCents('5.7')).toBeNull();
        expect(parseAmountToCents('5.750')).toBeNull();
        expect(parseAmountToCents('5')).toBeNull();
    });

    test('rejects empty/undefined input', () => {
        expect(parseAmountToCents('')).toBeNull();
        expect(parseAmountToCents(undefined as unknown as string)).toBeNull();
    });
});

describe('validateRow', () => {
    const validRaw = {
        transactionDate: '2026-08-01',
        employeeId: 'emp-1',
        merchantName: 'Starbucks',
        mcc: '5814',
        transactionAmount: '5.75',
    };

    test('accepts a fully valid row', () => {
        const result = validateRow(validRaw, 1);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.transaction).toEqual({
                transactionDate: '2026-08-01',
                employeeId: 'emp-1',
                merchantName: 'Starbucks',
                mcc: '5814',
                amountCents: 575,
            });
        }
    });

    test('keeps mcc as a string type', () => {
        const result = validateRow(validRaw, 1);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(typeof result.transaction.mcc).toBe('string');
        }
    });

    test('is case-insensitive on header names', () => {
        const result = validateRow(
            {
                TransactionDate: '2026-08-01',
                EmployeeID: 'emp-1',
                MerchantName: 'Starbucks',
                MCC: '5814',
                TransactionAmount: '5.75',
            },
            1
        );
        expect(result.ok).toBe(true);
    });

    test('rejects a row with a missing field', () => {
        const { employeeId, ...rest } = validRaw;
        const result = validateRow(rest as any, 2);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.reason).toMatch(/employeeId/);
        }
    });

    test('rejects a row with a malformed date', () => {
        const result = validateRow({ ...validRaw, transactionDate: '08/01/2026' }, 3);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.reason).toMatch(/transactionDate/);
        }
    });

    test('rejects a row with a non-numeric amount', () => {
        const result = validateRow({ ...validRaw, transactionAmount: 'free' }, 4);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.reason).toMatch(/transactionAmount/);
        }
    });
});
