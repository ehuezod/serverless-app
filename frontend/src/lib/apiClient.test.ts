import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getSummaries, requestUploadUrl, uploadFileToS3 } from './apiClient';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('requestUploadUrl', () => {
    it('POSTs to upload-url with userId and fileName', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ uploadUrl: 'https://s3/signed', key: 'uploads/u1/x-file.csv' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await requestUploadUrl('https://api.example.com/', 'u1', 'file.csv');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.com/upload-url',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'u1', fileName: 'file.csv' }),
            })
        );
        expect(result).toEqual({ uploadUrl: 'https://s3/signed', key: 'uploads/u1/x-file.csv' });
    });

    it('normalizes an apiUrl without a trailing slash', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
        vi.stubGlobal('fetch', fetchMock);

        await requestUploadUrl('https://api.example.com', 'u1');

        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/upload-url', expect.anything());
    });

    it('throws ApiError on non-2xx', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
        await expect(requestUploadUrl('https://api.example.com/', 'u1')).rejects.toBeInstanceOf(ApiError);
    });

    it('throws ApiError on network failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
        await expect(requestUploadUrl('https://api.example.com/', 'u1')).rejects.toBeInstanceOf(ApiError);
    });
});

describe('uploadFileToS3', () => {
    it('PUTs the file with the literal text/csv content type', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        const file = new File(['a,b\n1,2'], 'file.csv', { type: 'application/vnd.ms-excel' });

        await uploadFileToS3('https://s3/signed', file);

        expect(fetchMock).toHaveBeenCalledWith('https://s3/signed', {
            method: 'PUT',
            headers: { 'Content-Type': 'text/csv' },
            body: file,
        });
    });

    it('throws ApiError when S3 rejects the upload', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
        const file = new File(['x'], 'file.csv');
        await expect(uploadFileToS3('https://s3/signed', file)).rejects.toBeInstanceOf(ApiError);
    });
});

describe('getSummaries', () => {
    it('GETs summaries/{userId} with encoded query params', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ userId: 'u1', uploads: [] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        await getSummaries('https://api.example.com/', 'u1', { limit: 5, nextToken: 'abc' });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.com/summaries/u1?limit=5&nextToken=abc'
        );
    });

    it('throws ApiError on non-2xx', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
        await expect(getSummaries('https://api.example.com/', 'u1')).rejects.toBeInstanceOf(ApiError);
    });
});
