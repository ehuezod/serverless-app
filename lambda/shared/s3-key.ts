const UUID_V4_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UPLOAD_KEY_PATTERN = new RegExp(`^uploads/([^/]+)/(${UUID_V4_PATTERN})-(.+)$`, 'i');

export function buildUploadKey(userId: string, fileName: string, uploadId: string): { key: string; uploadId: string } {
    return { key: `uploads/${userId}/${uploadId}-${fileName}`, uploadId };
}

export function parseUploadKey(key: string): { userId: string; uploadId: string; fileName: string } | null {
    const match = UPLOAD_KEY_PATTERN.exec(key);
    if (!match) {
        return null;
    }
    const [, userId, uploadId, fileName] = match;
    return { userId, uploadId, fileName };
}
