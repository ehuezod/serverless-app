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

    test('parses a dollar-sign-prefixed amount', () => {
        expect(parseAmountToCents('$301.65')).toBe(30165);
    });

    test('parses a negative dollar-sign-prefixed amount (sign before $)', () => {
        expect(parseAmountToCents('-$272.19')).toBe(-27219);
    });

    test('parses a dollar amount with comma thousands separators', () => {
        expect(parseAmountToCents('$1,270.69')).toBe(127069);
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

    test('accepts and normalizes a MM/DD/YY date', () => {
        const result = validateRow({ ...validRaw, transactionDate: '08/21/23' }, 5);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.transaction.transactionDate).toBe('2023-08-21');
        }
    });

    test('matches a "Merchant Name" header (with a space) to merchantName', () => {
        const { merchantName, ...rest } = validRaw;
        const result = validateRow({ ...rest, 'Merchant Name': 'Starbucks' } as any, 6);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.transaction.merchantName).toBe('Starbucks');
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
