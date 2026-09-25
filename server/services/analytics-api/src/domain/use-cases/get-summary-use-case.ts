import { AppError } from '@naija-bi/error-handling';
import * as analyticsRepository from '../../data-access/analytics-repository';

function parseDateRange(fromRaw?: string, toRaw?: string): { from: Date; to: Date } {
  const to = toRaw ? new Date(toRaw) : new Date();
  const from = fromRaw ? new Date(fromRaw) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError('invalid-date-range', 'from/to must be valid dates', 400, false);
  }
  return { from, to };
}

export async function getSummary(businessId: string, fromRaw?: string, toRaw?: string) {
  const { from, to } = parseDateRange(fromRaw, toRaw);
  return analyticsRepository.getSummary(businessId, from, to);
}

export async function getTrend(businessId: string, fromRaw?: string, toRaw?: string) {
  const { from, to } = parseDateRange(fromRaw, toRaw);
  return analyticsRepository.getTrend(businessId, from, to);
}

export async function getTopProducts(
  businessId: string,
  fromRaw?: string,
  toRaw?: string,
  limitRaw?: string
) {
  const { from, to } = parseDateRange(fromRaw, toRaw);
  const limit = limitRaw ? Number(limitRaw) : 10;
  return analyticsRepository.getTopProducts(businessId, from, to, limit);
}
