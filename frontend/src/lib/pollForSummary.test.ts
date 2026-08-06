import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pollForSummary, PollTimeoutError } from './pollForSummary';
import type { SummaryItem } from './types';

function makeSummary(s3Key: string): SummaryItem {
    return {
        userId: 'u1',
        sk: 'UPLOAD#2026-01-01T00:00:00.000Z#id',
        uploadId: 'id',
        fileName: 'f.csv',
        s3Key,
        processedAt: '2026-01-01T00:00:00.000Z',
        transactionCount: 1,
        skippedRowCount: 0,
        errors: [],
        summaries: [],
    };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('pollForSummary', () => {
    it('resolves as soon as a matching s3Key appears', async () => {
        const fetchSummaries = vi
            .fn()
            .mockResolvedValueOnce({ userId: 'u1', uploads: [makeSummary('uploads/u1/other.csv')] })
            .mockResolvedValueOnce({ userId: 'u1', uploads: [makeSummary('uploads/u1/target.csv')] });

        const promise = pollForSummary({
            apiUrl: 'https://api',
            userId: 'u1',
            uploadKey: 'uploads/u1/target.csv',
            intervalMs: 1000,
            timeoutMs: 10000,
            fetchSummaries,
        });

        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(1000);

        const result = await promise;
        expect(result.s3Key).toBe('uploads/u1/target.csv');
        expect(fetchSummaries).toHaveBeenCalledTimes(2);
    });

    it('ignores non-matching entries and keeps polling', async () => {
        const fetchSummaries = vi.fn().mockResolvedValue({
            userId: 'u1',
            uploads: [makeSummary('uploads/u1/unrelated-from-prior-session.csv')],
        });

        const promise = pollForSummary({
            apiUrl: 'https://api',
            userId: 'u1',
            uploadKey: 'uploads/u1/target.csv',
            intervalMs: 1000,
            timeoutMs: 3000,
            fetchSummaries,
        });
        promise.catch(() => {});

        await vi.advanceTimersByTimeAsync(3000);

        await expect(promise).rejects.toBeInstanceOf(PollTimeoutError);
        expect(fetchSummaries.mock.calls.length).toBeGreaterThan(1);
    });

    it('keeps polling through transient fetch errors up to the timeout', async () => {
        // Uses real timers with tiny durations rather than fake timers — a
        // rejecting mock combined with vitest's fake-timer async advancement
        // hangs indefinitely (a known fake-timer/rejected-promise
        // interaction), whereas real timers exercise the same retry-through-
        // errors behavior reliably in a few milliseconds.
        vi.useRealTimers();
        const fetchSummaries = vi.fn().mockRejectedValue(new Error('network blip'));

        await expect(
            pollForSummary({
                apiUrl: 'https://api',
                userId: 'u1',
                uploadKey: 'uploads/u1/target.csv',
                intervalMs: 5,
                timeoutMs: 25,
                fetchSummaries,
            })
        ).rejects.toBeInstanceOf(PollTimeoutError);

        expect(fetchSummaries.mock.calls.length).toBeGreaterThan(1);
    });

    it('rejects with PollTimeoutError after timeoutMs elapses with no match', async () => {
        const fetchSummaries = vi.fn().mockResolvedValue({ userId: 'u1', uploads: [] });

        const promise = pollForSummary({
            apiUrl: 'https://api',
            userId: 'u1',
            uploadKey: 'uploads/u1/target.csv',
            intervalMs: 1000,
            timeoutMs: 2000,
            fetchSummaries,
        });
        promise.catch(() => {});

        await vi.advanceTimersByTimeAsync(2000);

        await expect(promise).rejects.toBeInstanceOf(PollTimeoutError);
    });
});
