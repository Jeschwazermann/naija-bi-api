export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  businessId: string;
  businessName: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  businessName: string;
}

export interface SummaryResponse {
  totalAmountNaira: number;
  totalQuantity: number;
  orderCount: number;
  daysWithSales: number;
}

export interface TrendPoint {
  date: string;
  amountNaira: number;
  orderCount: number;
}

export interface TopProduct {
  product: string;
  amountNaira: number;
  quantity: number;
}

export type UploadStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'failed_partial';

export interface UploadStatusResponse {
  status: UploadStatus;
  rowsProcessed: number;
  rowsRejected: number;
}

export interface CreateUploadResponse {
  uploadId: string;
  status: UploadStatus;
}
