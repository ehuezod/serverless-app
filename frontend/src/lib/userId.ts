const STORAGE_KEY = 'supplierAnalyzerUserId';

let memoryUserId: string | undefined;

/**
 * Anonymous per-browser identity: a random UUID persisted in localStorage so
 * repeat visits see their own upload history. Falls back to an in-memory id
 * for the current session if localStorage is unavailable (e.g. private
 * browsing in some browsers throws on access).
 */
export function getOrCreateUserId(): string {
    try {
        const existing = window.localStorage.getItem(STORAGE_KEY);
        if (existing) {
            return existing;
        }
        const created = crypto.randomUUID();
        window.localStorage.setItem(STORAGE_KEY, created);
        return created;
    } catch {
        if (!memoryUserId) {
            memoryUserId = crypto.randomUUID();
        }
        return memoryUserId;
    }
}
