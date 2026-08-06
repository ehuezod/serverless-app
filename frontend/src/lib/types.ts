// Mirrors lambda/shared/types.ts. Kept as a hand-written copy rather than a
// cross-package import since the frontend has its own tsconfig/build target
// and doesn't share a module graph with the Lambda code. Keep in sync manually
// if the backend contract changes.

export interface Transaction {
    transactionDate: string;
    employeeId: string;
    merchantName: string;
    mcc: string;
    amountCents: number;
}

export interface RowError {
    row: number;
    reason: string;
}

export interface CategorySummary {
    category: string;
    totalSpend: number;
    transactionCount: number;
    uniqueEmployeeCount: number;
    transactions: Transaction[];
}

export interface SummaryItem {
    userId: string;
    sk: string;
    uploadId: string;
    fileName: string;
    s3Key: string;
    processedAt: string;
    transactionCount: number;
    skippedRowCount: number;
    errors: RowError[];
    summaries: CategorySummary[];
}

export interface SummariesResponse {
    userId: string;
    uploads: SummaryItem[];
    nextToken?: string;
}

export interface UploadUrlResponse {
    uploadUrl: string;
    key: string;
}
