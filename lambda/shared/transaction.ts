import { RawCsvRow, RowError, Transaction } from './types';

// Optional leading '-', optional '$', digits with optional ',' thousands
// separators, exactly 2 decimal places — covers both "5.75" and the
// "-$1,270.69" style produced by the real exports this pipeline ingests.
const AMOUNT_PATTERN = /^\s*(-)?\$?([\d,]+)\.(\d{2})\s*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// "MM/DD/YY" as produced by the real exports; year is 2-digit, assumed 20xx.
const US_SHORT_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{2})$/;

// Parses a currency string (with optional '$' and ',' separators) into
// integer cents via string splitting (never float multiplication), so
// summation later never drifts.
export function parseAmountToCents(raw: string): number | null {
    const match = AMOUNT_PATTERN.exec(raw ?? '');
    if (!match) {
        return null;
    }
    const [, sign, wholePart, fractionPart] = match;
    const cents = Number(`${wholePart.replace(/,/g, '')}${fractionPart}`);
    return sign ? -cents : cents;
}

// Normalizes a transactionDate cell to "YYYY-MM-DD", accepting either the
// canonical ISO form or the "MM/DD/YY" form the real exports use.
function normalizeTransactionDate(raw: string): string | null {
    if (ISO_DATE_PATTERN.test(raw)) {
        return raw;
    }
    const match = US_SHORT_DATE_PATTERN.exec(raw);
    if (!match) {
        return null;
    }
    const [, month, day, year] = match;
    return `20${year}-${month}-${day}`;
}

function normalizeFieldName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Matches header names ignoring case and non-alphanumeric characters, so
// e.g. "Merchant Name" resolves to the "merchantName" field.
function getField(row: RawCsvRow, name: string): string | undefined {
    const target = normalizeFieldName(name);
    for (const key of Object.keys(row)) {
        if (normalizeFieldName(key) === target) {
            return row[key];
        }
    }
    return undefined;
}

export function validateRow(
    raw: RawCsvRow,
    rowIndex: number
): { ok: true; transaction: Transaction } | { ok: false; error: RowError } {
    const rawTransactionDate = getField(raw, 'transactionDate')?.trim();
    const employeeId = getField(raw, 'employeeId')?.trim();
    const merchantName = getField(raw, 'merchantName')?.trim();
    const mcc = getField(raw, 'mcc')?.trim();
    const transactionAmount = getField(raw, 'transactionAmount')?.trim();

    const transactionDate = rawTransactionDate ? normalizeTransactionDate(rawTransactionDate) : null;
    if (!transactionDate) {
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
