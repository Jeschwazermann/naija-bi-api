import { getSalesAggregatesCollection, getSalesRawCollection } from '@naija-bi/mongo-client';

export interface TopProduct {
  [key: string]: any;
  product: string;
  amountNaira: number;
  quantity: number;
}

// ✅ Best Practice: dashboards read from the small pre-aggregated
// collection, not from sales_raw — stays fast no matter how many raw rows exist.
export async function getSummary(businessId: string, from: Date, to: Date) {
  const results = await getSalesAggregatesCollection()
    .aggregate([
      { $match: { businessId, date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          totalAmountKobo: { $sum: '$totalAmountKobo' },
          totalQuantity: { $sum: '$totalQuantity' },
          orderCount: { $sum: '$orderCount' },
          daysWithSales: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const summary = results[0] ?? {
    totalAmountKobo: 0,
    totalQuantity: 0,
    orderCount: 0,
    daysWithSales: 0,
  };

  return {
    totalAmountNaira: summary.totalAmountKobo / 100,
    totalQuantity: summary.totalQuantity,
    orderCount: summary.orderCount,
    daysWithSales: summary.daysWithSales,
  };
}

export async function getTrend(businessId: string, from: Date, to: Date) {
  const rows = await getSalesAggregatesCollection()
    .find({ businessId, date: { $gte: from, $lte: to } })
    .sort({ date: 1 })
    .toArray();

  return rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    amountNaira: row.totalAmountKobo / 100,
    orderCount: row.orderCount,
  }));
}

// ✅ Best Practice: this one genuinely needs raw rows (product-level detail
// isn't pre-aggregated across the whole range) — kept as an explicit,
// clearly-named exception rather than the default query path.
export async function getTopProducts(
  businessId: string,
  from: Date,
  to: Date,
  limit: number
): Promise<TopProduct[]> {
  return getSalesRawCollection()
    .aggregate<TopProduct>([
      { $match: { businessId, date: { $gte: from, $lte: to }, product: { $ne: null } } },
      {
        $group: {
          _id: '$product',
          totalAmountKobo: { $sum: '$amountKobo' },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { totalAmountKobo: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          product: '$_id',
          amountNaira: { $divide: ['$totalAmountKobo', 100] },
          quantity: '$totalQuantity',
        },
      },
    ])
    .toArray();
}
