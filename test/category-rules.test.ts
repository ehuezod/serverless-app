import { CATEGORY_RULES } from '../lambda/shared/category-rules';
import {
    RELEVANT_MCC_CODES,
    OFFICE_MERCHANT_SUBSTRINGS,
    IT_PERIPHERALS_MCC_CODES,
    MRO_MCC_CODES,
} from '../lambda/shared/category-rules.config';
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

describe('All Spend rule', () => {
    test('matches every transaction, including edge-case values', () => {
        const rule = ruleNamed('All Spend');
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

describe('Amazon + Prime Spend rule', () => {
    const rule = ruleNamed('Amazon + Prime Spend');

    test('matches plain amazon, amzn, and b2b prime merchants', () => {
        expect(rule.matches(txn({ merchantName: 'Amazon.com' }))).toBe(true);
        expect(rule.matches(txn({ merchantName: 'AMZN Mktp US' }))).toBe(true);
        expect(rule.matches(txn({ merchantName: 'B2B Prime' }))).toBe(true);
    });

    test('excludes non-retail amazon merchants, case-insensitively', () => {
        expect(rule.matches(txn({ merchantName: 'Amazon Web Services' }))).toBe(false);
        expect(rule.matches(txn({ merchantName: 'amazon web services' }))).toBe(false);
        expect(rule.matches(txn({ merchantName: 'Prime Now' }))).toBe(false);
        expect(rule.matches(txn({ merchantName: 'AMAZON PAY' }))).toBe(false);
    });

    test('excludes AMZN Digital even though it contains "amzn"', () => {
        expect(rule.matches(txn({ merchantName: 'AMZN Digital' }))).toBe(false);
    });

    test('does not match unrelated merchants', () => {
        expect(rule.matches(txn({ merchantName: 'Target' }))).toBe(false);
    });
});

describe('Amazon + Prime Spend - Business Prime Subscriptions rule', () => {
    const rule = ruleNamed('Amazon + Prime Spend - Business Prime Subscriptions');

    test('matches only merchants containing b2b prime', () => {
        expect(rule.matches(txn({ merchantName: 'B2B Prime Subscription' }))).toBe(true);
        expect(rule.matches(txn({ merchantName: 'Amazon.com' }))).toBe(false);
        expect(rule.matches(txn({ merchantName: 'Amazon Prime' }))).toBe(false);
    });
});

describe('Amazon + Prime Spend - Consumer Prime Subscriptions rule', () => {
    const rule = ruleNamed('Amazon + Prime Spend - Consumer Prime Subscriptions');

    test('matches only merchants containing amazon prime', () => {
        expect(rule.matches(txn({ merchantName: 'Amazon Prime' }))).toBe(true);
        expect(rule.matches(txn({ merchantName: 'Amazon.com' }))).toBe(false);
        expect(rule.matches(txn({ merchantName: 'B2B Prime' }))).toBe(false);
    });
});

describe('Trips To Stores rule', () => {
    const rule = ruleNamed('Trips To Stores');

    test('matches whitelisted retailers', () => {
        expect(rule.matches(txn({ merchantName: 'Target' }))).toBe(true);
        expect(rule.matches(txn({ merchantName: 'Walmart' }))).toBe(true);
        expect(rule.matches(txn({ merchantName: 'Home Depot' }))).toBe(true);
    });

    test('excludes Target-adjacent merchants that are not in-store trips', () => {
        expect(rule.matches(txn({ merchantName: 'Target Plus' }))).toBe(false);
        expect(rule.matches(txn({ merchantName: 'ONTARGET JOBS' }))).toBe(false);
    });

    test('excludes Walmart Grocery', () => {
        expect(rule.matches(txn({ merchantName: 'Walmart Grocery' }))).toBe(false);
    });

    test('does not match an unrelated merchant', () => {
        expect(rule.matches(txn({ merchantName: 'Starbucks' }))).toBe(false);
    });
});

describe('E-Commerce rule', () => {
    const rule = ruleNamed('E-Commerce');
    const relevantMcc = RELEVANT_MCC_CODES[0];

    test('requires both a matching merchant pattern and a relevant MCC', () => {
        expect(rule.matches(txn({ merchantName: 'someshop.com', mcc: relevantMcc }))).toBe(true);
        expect(rule.matches(txn({ merchantName: 'someshop.com', mcc: '9999' }))).toBe(false);
    });

    test('excludes Amazon.com even with a relevant MCC', () => {
        expect(rule.matches(txn({ merchantName: 'Amazon.com', mcc: relevantMcc }))).toBe(false);
    });

    test('matches Amazon Pay, which is not excluded', () => {
        expect(rule.matches(txn({ merchantName: 'Amazon Pay', mcc: relevantMcc }))).toBe(true);
    });
});

describe('IT Peripherals rule', () => {
    const rule = ruleNamed('IT Peripherals');

    test('matches configured MCCs only', () => {
        for (const mcc of IT_PERIPHERALS_MCC_CODES) {
            expect(rule.matches(txn({ mcc }))).toBe(true);
        }
        expect(rule.matches(txn({ mcc: '9999' }))).toBe(false);
    });
});

describe('MRO rule', () => {
    const rule = ruleNamed('MRO');

    test('matches configured MCCs only', () => {
        for (const mcc of MRO_MCC_CODES) {
            expect(rule.matches(txn({ mcc }))).toBe(true);
        }
        expect(rule.matches(txn({ mcc: '9999' }))).toBe(false);
    });
});

describe('overlap', () => {
    test('a transaction can match multiple categories at once', () => {
        const matching = txn({ mcc: RELEVANT_MCC_CODES[0], merchantName: OFFICE_MERCHANT_SUBSTRINGS[0] });
        const matchedNames = CATEGORY_RULES.filter((r) => r.matches(matching)).map((r) => r.name);
        expect(matchedNames).toEqual(expect.arrayContaining(['All Spend', 'Relevant Spend', 'Office']));
    });
});
