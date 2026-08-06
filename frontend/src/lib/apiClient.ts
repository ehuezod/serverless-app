import type { SummariesResponse, UploadUrlResponse } from './types';

export class ApiError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = 'ApiError';
    }
}

function normalizeBaseUrl(apiUrl: string): string {
    return apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
}

export async function requestUploadUrl(
    apiUrl: string,
    userId: string,
    fileName?: string
): Promise<UploadUrlResponse> {
    let res: Response;
    try {
        res = await fetch(`${normalizeBaseUrl(apiUrl)}upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fileName }),
        });
    } catch {
        throw new ApiError('Could not reach the upload service. Check your network connection.');
    }
    if (!res.ok) {
        throw new ApiError('Failed to request an upload URL.', res.status);
    }
    return (await res.json()) as UploadUrlResponse;
}

export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
    let res: Response;
    try {
        // Content-Type must be the exact literal string signed into the presigned
        // URL by the backend (see lambda/get-upload-url/index.ts) — do not use
        // file.type, which is browser/OS-dependent and unreliable for .csv files.
        res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/csv' },
            body: file,
        });
    } catch {
        throw new ApiError('Upload to storage failed. This can happen if the browser blocked the request (CORS) or the network dropped.');
    }
    if (!res.ok) {
        throw new ApiError('Upload to storage was rejected.', res.status);
    }
}

export async function getSummaries(
    apiUrl: string,
    userId: string,
    opts?: { limit?: number; nextToken?: string }
): Promise<SummariesResponse> {
    const query = new URLSearchParams();
    if (opts?.limit) query.set('limit', String(opts.limit));
    if (opts?.nextToken) query.set('nextToken', opts.nextToken);
    const qs = query.toString();

    let res: Response;
    try {
        res = await fetch(
            `${normalizeBaseUrl(apiUrl)}summaries/${encodeURIComponent(userId)}${qs ? `?${qs}` : ''}`
        );
    } catch {
        throw new ApiError('Could not reach the summaries service. Check your network connection.');
    }
    if (!res.ok) {
        throw new ApiError('Failed to fetch summaries.', res.status);
    }
    return (await res.json()) as SummariesResponse;
}
