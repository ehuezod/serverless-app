import { RawCsvRow, RowError, Transaction } from './types';

const AMOUNT_PATTERN = /^\s*(-?)(\d+)\.(\d{2})\s*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Parses a 2-decimal currency string into integer cents via string splitting
// (never float multiplication), so summation later never drifts.
export function parseAmountToCents(raw: string): number | null {
    const match = AMOUNT_PATTERN.exec(raw ?? '');
    if (!match) {
        return null;
    }
    const [, sign, wholePart, fractionPart] = match;
    return Number(`${sign}${wholePart}${fractionPart}`);
}

function getField(row: RawCsvRow, name: string): string | undefined {
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(row)) {
        if (key.toLowerCase() === lowerName) {
            return row[key];
        }
    }
    return undefined;
}

export function validateRow(
    raw: RawCsvRow,
    rowIndex: number
): { ok: true; transaction: Transaction } | { ok: false; error: RowError } {
    const transactionDate = getField(raw, 'transactionDate')?.trim();
    const employeeId = getField(raw, 'employeeId')?.trim();
    const merchantName = getField(raw, 'merchantName')?.trim();
    const mcc = getField(raw, 'mcc')?.trim();
    const transactionAmount = getField(raw, 'transactionAmount')?.trim();

    if (!transactionDate || !DATE_PATTERN.test(transactionDate)) {
        return { ok: false, error: { row: rowIndex, reason: 'invalid or missing transactionDate' } };
    }
    if (!employeeId) {
        return { ok: false, error: { row: rowIndex, reason: 'missing employeeId' } };
    }
    if (!merchantName) {
        return { ok: false, error: { row: rowIndex, reason: 'missing merchantName' } };
    }
    if (!mcc) {
        return { ok: false, error: { row: rowIndex, reason: 'missing mcc' } };
    }
    if (!transactionAmount) {
        return { ok: false, error: { row: rowIndex, reason: 'missing transactionAmount' } };
    }

    const amountCents = parseAmountToCents(transactionAmount);
    if (amountCents === null) {
        return {
            ok: false,
            error: { row: rowIndex, reason: `invalid transactionAmount: ${transactionAmount}` },
        };
    }

    return {
        ok: true,
        transaction: { transactionDate, employeeId, merchantName, mcc, amountCents },
    };
}
