import { CATEGORY_RULES } from '../lambda/shared/category-rules';
import { RELEVANT_MCC_CODES, OFFICE_MERCHANT_SUBSTRINGS } from '../lambda/shared/category-rules.config';
import { Transaction } from '../lambda/shared/types';

function txn(overrides: Partial<Transaction>): Transaction {
    return {
        transactionDate: '2026-08-01',
        employeeId: 'emp-1',
        merchantName: 'Random Shop',
        mcc: '0000',
        amountCents: 100,
        ...overrides,
    };
}

function ruleNamed(name: string) {
    const rule = CATEGORY_RULES.find((r) => r.name === name);
    if (!rule) throw new Error(`rule not found: ${name}`);
    return rule;
}

describe('All Transactions rule', () => {
    test('matches every transaction, including edge-case values', () => {
        const rule = ruleNamed('All Transactions');
        expect(rule.matches(txn({}))).toBe(true);
        expect(rule.matches(txn({ merchantName: '', mcc: '' }))).toBe(true);
    });
});

describe('Relevant Spend rule', () => {
    const rule = ruleNamed('Relevant Spend');

    test('matches when mcc is in the configured list', () => {
        expect(rule.matches(txn({ mcc: RELEVANT_MCC_CODES[0] }))).toBe(true);
    });

    test('does not match when mcc is not in the configured list', () => {
        expect(rule.matches(txn({ mcc: '9999' }))).toBe(false);
    });
});

describe('Office rule', () => {
    const rule = ruleNamed('Office');
    const substring = OFFICE_MERCHANT_SUBSTRINGS[0];

    test('matches a merchant name containing the configured substring', () => {
        expect(rule.matches(txn({ merchantName: `${substring} #123` }))).toBe(true);
    });

    test('matches case-insensitively', () => {
        expect(rule.matches(txn({ merchantName: substring.toUpperCase() }))).toBe(true);
        expect(rule.matches(txn({ merchantName: substring.toLowerCase() }))).toBe(true);
    });

    test('does not match an unrelated merchant name', () => {
        expect(rule.matches(txn({ merchantName: 'Starbucks' }))).toBe(false);
    });
});

describe('overlap', () => {
    test('a transaction can match multiple categories at once', () => {
        const matching = txn({ mcc: RELEVANT_MCC_CODES[0], merchantName: OFFICE_MERCHANT_SUBSTRINGS[0] });
        const matchedNames = CATEGORY_RULES.filter((r) => r.matches(matching)).map((r) => r.name);
        expect(matchedNames).toEqual(
            expect.arrayContaining(['All Transactions', 'Relevant Spend', 'Office'])
        );
    });
});
