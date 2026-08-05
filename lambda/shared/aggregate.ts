import { CategoryRule, CategorySummary, Transaction } from './types';

const MAX_STORED_TRANSACTIONS = 25;

export function aggregate(transactions: Transaction[], rules: CategoryRule[]): CategorySummary[] {
    const totalsCents = new Map<string, number>();
    const counts = new Map<string, number>();
    const employeeIds = new Map<string, Set<string>>();
    const matchedTransactions = new Map<string, Transaction[]>();

    for (const rule of rules) {
        totalsCents.set(rule.name, 0);
        counts.set(rule.name, 0);
        employeeIds.set(rule.name, new Set<string>());
        matchedTransactions.set(rule.name, []);
    }

    for (const transaction of transactions) {
        for (const rule of rules) {
            if (rule.matches(transaction)) {
                totalsCents.set(rule.name, totalsCents.get(rule.name)! + transaction.amountCents);
                counts.set(rule.name, counts.get(rule.name)! + 1);
                employeeIds.get(rule.name)!.add(transaction.employeeId);
                matchedTransactions.get(rule.name)!.push(transaction);
            }
        }
    }

    return rules.map((rule) => ({
        category: rule.name,
        totalSpend: Number((totalsCents.get(rule.name)! / 100).toFixed(2)),
        transactionCount: counts.get(rule.name)!,
        uniqueEmployeeCount: employeeIds.get(rule.name)!.size,
        transactions: matchedTransactions
            .get(rule.name)!
            .sort((a, b) => b.amountCents - a.amountCents)
            .slice(0, MAX_STORED_TRANSACTIONS),
    }));
}
