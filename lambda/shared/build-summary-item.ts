import { CategorySummary, RowError, SummaryItem } from './types';

const MAX_ERRORS = 20;

export function buildSk(processedAt: string, uploadId: string): string {
    return `UPLOAD#${processedAt}#${uploadId}`;
}

export function buildSummaryItem(args: {
    userId: string;
    uploadId: string;
    fileName: string;
    s3Key: string;
    processedAt: string;
    transactionCount: number;
    skippedRowCount: number;
    errors: RowError[];
    summaries: CategorySummary[];
    analysis?: string;
}): SummaryItem {
    return {
        userId: args.userId,
        sk: buildSk(args.processedAt, args.uploadId),
        uploadId: args.uploadId,
        fileName: args.fileName,
        s3Key: args.s3Key,
        processedAt: args.processedAt,
        transactionCount: args.transactionCount,
        skippedRowCount: args.skippedRowCount,
        errors: args.errors.slice(0, MAX_ERRORS),
        summaries: args.summaries,
        ...(args.analysis !== undefined && { analysis: args.analysis }),
    };
}
