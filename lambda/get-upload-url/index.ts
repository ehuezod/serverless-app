import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { buildUploadKey } from "../shared/s3-key";

const s3 = new S3Client({});

// API Gateway's auto-generated OPTIONS mock only covers the preflight;
// the actual Lambda response still needs this header on every path or
// browsers reject the response after a successful preflight.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export const handler = async (event: any) => {
    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const fileName = body.fileName || `upload-${randomUUID()}.csv`;
        const userId = body.userId;

        if (!userId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: "userId is required" }),
            };
        }

        const { key } = buildUploadKey(userId, fileName, randomUUID());

        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: key,
            ContentType: "text/csv",
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // URL valid for 5 minutes

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ uploadUrl, key }),
        };
    } catch (err) {
        console.error("Error generating upload URL:", err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: "Failed to generate upload URL" }),
        };
    }
};