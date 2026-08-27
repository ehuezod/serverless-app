export interface RawCsvRow {
    [column: string]: string;
}

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

export interface CategoryRule {
    name: string;
    matches: (transaction: Transaction) => boolean;
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
    analysis?: string;
}
