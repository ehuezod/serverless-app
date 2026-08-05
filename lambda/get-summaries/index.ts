import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function decodeNextToken(token: string | undefined): Record<string, unknown> | undefined {
    if (!token) return undefined;
    try {
        return JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    } catch {
        return undefined;
    }
}

function encodeNextToken(key: Record<string, unknown> | undefined): string | undefined {
    if (!key) return undefined;
    return Buffer.from(JSON.stringify(key)).toString('base64');
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = event.pathParameters?.userId;
    if (!userId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
    }

    const rawLimit = Number(event.queryStringParameters?.limit);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
    const exclusiveStartKey = decodeNextToken(event.queryStringParameters?.nextToken);

    try {
        const result = await ddbDocClient.send(
            new QueryCommand({
                TableName: process.env.TABLE_NAME,
                KeyConditionExpression: 'userId = :userId AND begins_with(sk, :prefix)',
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':prefix': 'UPLOAD#',
                },
                ScanIndexForward: false,
                Limit: limit,
                ExclusiveStartKey: exclusiveStartKey,
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                userId,
                uploads: result.Items ?? [],
                nextToken: encodeNextToken(result.LastEvaluatedKey),
            }),
        };
    } catch (err) {
        console.error('Error querying summaries:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch summaries' }) };
    }
};
