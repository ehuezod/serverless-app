const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

const countFormatter = new Intl.NumberFormat('en-US');

/** Transaction.amountCents is integer cents — divide by 100 before formatting. */
export function formatCents(cents: number): string {
    return currencyFormatter.format(cents / 100);
}

/** CategorySummary.totalSpend is already dollars — do not divide. */
export function formatDollars(dollars: number): string {
    return currencyFormatter.format(dollars);
}

/** Formats a plain count (transactions, cardholders) with thousands separators. */
export function formatCount(n: number): string {
    return countFormatter.format(n);
}
