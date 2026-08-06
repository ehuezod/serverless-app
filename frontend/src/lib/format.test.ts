import { describe, expect, it } from 'vitest';
import { formatCents, formatDollars } from './format';

describe('formatCents', () => {
    it('divides by 100 before formatting', () => {
        expect(formatCents(575)).toBe('$5.75');
    });

    it('handles zero', () => {
        expect(formatCents(0)).toBe('$0.00');
    });

    it('handles negative amounts (refunds)', () => {
        expect(formatCents(-1250)).toBe('-$12.50');
    });

    it('handles large amounts', () => {
        expect(formatCents(123456789)).toBe('$1,234,567.89');
    });
});

describe('formatDollars', () => {
    it('does not divide — input is already dollars', () => {
        expect(formatDollars(7.51)).toBe('$7.51');
    });

    it('handles zero', () => {
        expect(formatDollars(0)).toBe('$0.00');
    });
});
