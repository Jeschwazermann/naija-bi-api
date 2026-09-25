import { parseNairaAmountToKobo } from './currency-normalizer';
import { parseNigerianDate } from './date-normalizer';
import type { SalesRow } from '@naija-bi/mongo-client';

export interface RawCsvRow {
  [key: string]: string;
}

export interface RowValidationResult {
  valid: boolean;
  reason?: string;
  row?: Omit<SalesRow, '_id' | 'businessId' | 'uploadId'>;
}

// ✅ Best Practice: column names are matched case-insensitively and against
// a few common aliases, since every POS export names columns differently.
function pick(row: RawCsvRow, ...aliases: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const key = keys.find((k) => k.trim().toLowerCase() === alias.toLowerCase());
    if (key && row[key] !== undefined && row[key] !== '') return row[key];
  }
  return undefined;
}

export function validateRow(row: RawCsvRow): RowValidationResult {
  const dateRaw = pick(row, 'date', 'sale date', 'transaction date');
  const amountRaw = pick(row, 'amount', 'total', 'price', 'sales amount');
  const quantityRaw = pick(row, 'quantity', 'qty', 'units');
  const product = pick(row, 'product', 'item', 'product name');
  const category = pick(row, 'category', 'product category');

  const date = parseNigerianDate(dateRaw);
  if (!date) {
    return { valid: false, reason: `Could not parse date: "${dateRaw ?? ''}"` };
  }

  const amountKobo = parseNairaAmountToKobo(amountRaw);
  if (amountKobo === null) {
    return { valid: false, reason: `Could not parse amount: "${amountRaw ?? ''}"` };
  }

  const quantity = quantityRaw ? Number(quantityRaw) : 1;
  if (Number.isNaN(quantity)) {
    return { valid: false, reason: `Could not parse quantity: "${quantityRaw ?? ''}"` };
  }

  return {
    valid: true,
    row: { date, amountKobo, quantity, product, category, rawRow: row },
  };
}
