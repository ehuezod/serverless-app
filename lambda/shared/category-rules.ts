import { CategoryRule } from './types';
import {
    RELEVANT_MCC_CODES,
    OFFICE_MERCHANT_SUBSTRINGS,
    AMAZON_PRIME_INCLUDE_SUBSTRINGS,
    AMAZON_PRIME_EXCLUDE_SUBSTRINGS,
    BUSINESS_PRIME_SUBSTRING,
    CONSUMER_PRIME_SUBSTRING,
    TRIPS_TO_STORE_INCLUDE_SUBSTRINGS,
    TRIPS_TO_STORE_EXCLUDE_SUBSTRINGS,
    ECOMMERCE_INCLUDE_SUBSTRINGS,
    ECOMMERCE_EXCLUDE_SUBSTRINGS,
    IT_PERIPHERALS_MCC_CODES,
    MRO_MCC_CODES,
} from './category-rules.config';

function matchesAny(value: string, substrings: string[]): boolean {
    const lower = value.toLowerCase();
    return substrings.some((substring) => lower.includes(substring.toLowerCase()));
}

// Categories are independent, overlapping filters — a transaction can match more than one.
// To add a category later, append another { name, matches } entry here.
export const CATEGORY_RULES: CategoryRule[] = [
    {
        name: 'All Spend',
        matches: () => true,
    },
    {
        name: 'Relevant Spend',
        matches: (t) => RELEVANT_MCC_CODES.includes(t.mcc),
    },
    {
        name: 'Amazon + Prime Spend',
        matches: (t) =>
            matchesAny(t.merchantName, AMAZON_PRIME_INCLUDE_SUBSTRINGS) &&
            !matchesAny(t.merchantName, AMAZON_PRIME_EXCLUDE_SUBSTRINGS),
    },
    {
        name: 'Amazon + Prime Spend - Business Prime Subscriptions',
        matches: (t) => t.merchantName.toLowerCase().includes(BUSINESS_PRIME_SUBSTRING),
    },
    {
        name: 'Amazon + Prime Spend - Consumer Prime Subscriptions',
        matches: (t) => t.merchantName.toLowerCase().includes(CONSUMER_PRIME_SUBSTRING),
    },
    {
        name: 'Trips To Stores',
        matches: (t) =>
            matchesAny(t.merchantName, TRIPS_TO_STORE_INCLUDE_SUBSTRINGS) &&
            !matchesAny(t.merchantName, TRIPS_TO_STORE_EXCLUDE_SUBSTRINGS),
    },
    {
        name: 'E-Commerce',
        matches: (t) =>
            matchesAny(t.merchantName, ECOMMERCE_INCLUDE_SUBSTRINGS) &&
            !matchesAny(t.merchantName, ECOMMERCE_EXCLUDE_SUBSTRINGS) &&
            RELEVANT_MCC_CODES.includes(t.mcc),
    },
    {
        name: 'Office',
        matches: (t) => matchesAny(t.merchantName, OFFICE_MERCHANT_SUBSTRINGS),
    },
    {
        name: 'IT Peripherals',
        matches: (t) => IT_PERIPHERALS_MCC_CODES.includes(t.mcc),
    },
    {
        name: 'MRO',
        matches: (t) => MRO_MCC_CODES.includes(t.mcc),
    },
];
