import { getSummaries } from './apiClient';
import type { SummaryItem } from './types';

export class PollTimeoutError extends Error {
    constructor() {
        super('Timed out waiting for the file to finish processing.');
        this.name = 'PollTimeoutError';
    }
}

export interface PollForSummaryArgs {
    apiUrl: string;
    userId: string;
    /** The `key` returned by POST /upload-url — matched against SummaryItem.s3Key. */
    uploadKey: string;
    intervalMs?: number;
    timeoutMs?: number;
    /** Injectable for tests; defaults to the real getSummaries API client call. */
    fetchSummaries?: typeof getSummaries;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processing happens asynchronously (S3 event -> Lambda) with no push
 * notification, so the only way to know a specific upload finished is to
 * poll until an item with a matching s3Key shows up. Uses a setTimeout loop
 * rather than setInterval so a slow request never overlaps the next poll.
 * Transient fetch errors are swallowed and retried until the overall timeout.
 */
export async function pollForSummary({
    apiUrl,
    userId,
    uploadKey,
    intervalMs = 3000,
    timeoutMs = 120_000,
    fetchSummaries = getSummaries,
}: PollForSummaryArgs): Promise<SummaryItem> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const { uploads } = await fetchSummaries(apiUrl, userId, { limit: 10 });
            const match = uploads.find((u) => u.s3Key === uploadKey);
            if (match) {
                return match;
            }
        } catch {
            // transient error — keep polling until timeout
        }
        await delay(intervalMs);
    }

    throw new PollTimeoutError();
}
