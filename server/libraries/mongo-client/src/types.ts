// ✅ Best Practice: these are the POJO shapes repositories return across
// every service — the single source of truth for the two-collection schema.

export type UploadStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'failed_partial';

export interface RejectedRow {
  rowNumber: number;
  reason: string;
  raw: Record<string, unknown>;
}

export interface UploadRecord {
  _id?: string;
  businessId: string;
  fileUrl: string;
  fileHash: string;
  originalFilename: string;
  status: UploadStatus;
  rowsProcessed: number;
  rowsRejected: number;
  rejectedRows?: RejectedRow[];
  uploadedAt: Date;
  completedAt?: Date;
}

export interface SalesRow {
  _id?: string;
  businessId: string;
  uploadId: string;
  date: Date;
  product?: string;
  category?: string;
  quantity: number;
  amountKobo: number; // money stored as integer kobo, never float naira
  rawRow: Record<string, unknown>;
}

export interface SalesAggregate {
  _id?: string;
  businessId: string;
  date: Date; // truncated to day
  totalAmountKobo: number;
  totalQuantity: number;
  orderCount: number;
  topProducts: { product: string; amountKobo: number }[];
}

export interface BusinessRecord {
  _id?: string;
  businessName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface RefreshTokenRecord {
  _id?: string;
  businessId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
}
