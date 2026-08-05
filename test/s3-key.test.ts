import { buildUploadKey, parseUploadKey } from '../lambda/shared/s3-key';

const SAMPLE_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('buildUploadKey / parseUploadKey', () => {
    test('round-trips userId, uploadId, and fileName', () => {
        const { key } = buildUploadKey('user-1', 'transactions.csv', SAMPLE_UUID);
        expect(key).toBe(`uploads/user-1/${SAMPLE_UUID}-transactions.csv`);

        const parsed = parseUploadKey(key);
        expect(parsed).toEqual({ userId: 'user-1', uploadId: SAMPLE_UUID, fileName: 'transactions.csv' });
    });

    test('round-trips a fileName containing dashes', () => {
        const { key } = buildUploadKey('user-2', 'q3-2026-transactions-final.csv', SAMPLE_UUID);
        const parsed = parseUploadKey(key);
        expect(parsed).toEqual({
            userId: 'user-2',
            uploadId: SAMPLE_UUID,
            fileName: 'q3-2026-transactions-final.csv',
        });
    });

    test('returns null for a key not matching the expected shape', () => {
        expect(parseUploadKey('not-an-upload-key.csv')).toBeNull();
        expect(parseUploadKey('uploads/user-1/not-a-uuid-file.csv')).toBeNull();
    });
});
