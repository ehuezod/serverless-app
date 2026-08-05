import { CategoryRule } from './types';
import { RELEVANT_MCC_CODES, OFFICE_MERCHANT_SUBSTRINGS } from './category-rules.config';

// Categories are independent, overlapping filters — a transaction can match more than one.
// To add a category later, append another { name, matches } entry here.
export const CATEGORY_RULES: CategoryRule[] = [
    {
        name: 'All Transactions',
        matches: () => true,
    },
    {
        name: 'Relevant Spend',
        matches: (t) => RELEVANT_MCC_CODES.includes(t.mcc),
    },
    {
        name: 'Office',
        matches: (t) =>
            OFFICE_MERCHANT_SUBSTRINGS.some((substring) =>
                t.merchantName.toLowerCase().includes(substring.toLowerCase())
            ),
    },
];
