import { parse } from 'csv-parse/sync';
import { RawCsvRow } from './types';

export function parseCsv(content: string): RawCsvRow[] {
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });
}
