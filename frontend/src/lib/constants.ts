// "All Spend" and "Relevant Spend" are near-total supersets of the other
// categories (see lambda/shared/category-rules.ts) — charting or carding them
// alongside the granular categories would dwarf every other entry. They're
// surfaced as the top-level stat tiles instead (see ResultsScreen).
export const EXCLUDED_FROM_CHART = new Set(['All Spend', 'Relevant Spend']);
