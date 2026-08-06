const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

/** Transaction.amountCents is integer cents — divide by 100 before formatting. */
export function formatCents(cents: number): string {
    return currencyFormatter.format(cents / 100);
}

/** CategorySummary.totalSpend is already dollars — do not divide. */
export function formatDollars(dollars: number): string {
    return currencyFormatter.format(dollars);
}
