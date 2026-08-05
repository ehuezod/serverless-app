import { CategoryRule, CategorySummary, Transaction } from './types';

export function aggregate(transactions: Transaction[], rules: CategoryRule[]): CategorySummary[] {
    const totalsCents = new Map<string, number>();
    const counts = new Map<string, number>();

    for (const rule of rules) {
        totalsCents.set(rule.name, 0);
        counts.set(rule.name, 0);
    }

    for (const transaction of transactions) {
        for (const rule of rules) {
            if (rule.matches(transaction)) {
                totalsCents.set(rule.name, totalsCents.get(rule.name)! + transaction.amountCents);
                counts.set(rule.name, counts.get(rule.name)! + 1);
            }
        }
    }

    return rules.map((rule) => ({
        category: rule.name,
        totalSpend: Number((totalsCents.get(rule.name)! / 100).toFixed(2)),
        transactionCount: counts.get(rule.name)!,
    }));
}
