import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { S3Event, S3EventRecord } from 'aws-lambda';
import { parseUploadKey } from '../shared/s3-key';
import { parseCsv } from '../shared/csv';
import { validateRow } from '../shared/transaction';
import { aggregate } from '../shared/aggregate';
import { buildSummaryItem } from '../shared/build-summary-item';
import { CATEGORY_RULES } from '../shared/category-rules';
import { RowError, Transaction } from '../shared/types';

const s3 = new S3Client({});
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function processRecord(record: S3EventRecord): Promise<void> {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    const parsedKey = parseUploadKey(key);
    if (!parsedKey) {
        console.warn(`Skipping object with unexpected key shape: ${key}`);
        return;
    }
    const { userId, uploadId, fileName } = parsedKey;

    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const content = await object.Body!.transformToString('utf-8');

    const rawRows = parseCsv(content);

    const transactions: Transaction[] = [];
    const errors: RowError[] = [];
    rawRows.forEach((row, index) => {
        const result = validateRow(row, index + 1);
        if (result.ok) {
            transactions.push(result.transaction);
        } else {
            errors.push(result.error);
        }
    });

    const summaries = aggregate(transactions, CATEGORY_RULES);
    const processedAt = new Date().toISOString();

    const item = buildSummaryItem({
        userId,
        uploadId,
        fileName,
        s3Key: key,
        processedAt,
        transactionCount: rawRows.length,
        skippedRowCount: errors.length,
        errors,
        summaries,
    });

    await ddbDocClient.send(new PutCommand({ TableName: process.env.TABLE_NAME, Item: item }));

    console.log(
        JSON.stringify({
            message: 'processed upload',
            userId,
            uploadId,
            rowCount: rawRows.length,
            validCount: transactions.length,
            skippedRowCount: errors.length,
        })
    );
}

export const handler = async (event: S3Event): Promise<void> => {
    for (const record of event.Records) {
        try {
            await processRecord(record);
        } catch (err) {
            console.error(`Failed to process record for key ${record.s3.object.key}:`, err);
        }
    }
};
