import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateUserId } from './userId';

describe('getOrCreateUserId', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('creates a new id and persists it when none exists', () => {
        const id = getOrCreateUserId();
        expect(id).toMatch(/^[0-9a-f-]{36}$/);
        expect(window.localStorage.getItem('supplierAnalyzerUserId')).toBe(id);
    });

    it('returns the same id on subsequent calls', () => {
        const first = getOrCreateUserId();
        const second = getOrCreateUserId();
        expect(second).toBe(first);
    });

    it('falls back to an in-memory id when localStorage throws', () => {
        const getSpy = vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        const first = getOrCreateUserId();
        const second = getOrCreateUserId();
        expect(first).toBe(second);
        expect(first).toMatch(/^[0-9a-f-]{36}$/);

        getSpy.mockRestore();
    });
});
