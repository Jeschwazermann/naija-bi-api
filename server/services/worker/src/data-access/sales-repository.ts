import { getSalesRawCollection, getSalesAggregatesCollection } from '@naija-bi/mongo-client';
import type { SalesRow } from '@naija-bi/mongo-client';

export async function insertRows(rows: SalesRow[]): Promise<void> {
  if (rows.length === 0) return;
  await getSalesRawCollection().insertMany(rows);
}

// ✅ Best Practice: aggregation runs as a Mongo pipeline, not in application
// JS — the DB is far better at grouping millions of rows than Node is.
export async function recomputeDailyAggregate(businessId: string, date: Date): Promise<void> {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const [result] = await getSalesRawCollection()
    .aggregate([
      { $match: { businessId, date: { $gte: dayStart, $lt: dayEnd } } },
      {
        $group: {
          _id: { businessId: '$businessId', product: '$product' },
          amountKobo: { $sum: '$amountKobo' },
          quantity: { $sum: '$quantity' },
          orders: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.businessId',
          totalAmountKobo: { $sum: '$amountKobo' },
          totalQuantity: { $sum: '$quantity' },
          orderCount: { $sum: '$orders' },
          products: {
            $push: { product: '$_id.product', amountKobo: '$amountKobo' },
          },
        },
      },
      {
        $project: {
          totalAmountKobo: 1,
          totalQuantity: 1,
          orderCount: 1,
          topProducts: {
            $slice: [
              { $sortArray: { input: '$products', sortBy: { amountKobo: -1 } } },
              5,
            ],
          },
        },
      },
    ])
    .toArray();

  await getSalesAggregatesCollection().updateOne(
    { businessId, date: dayStart },
    {
      $set: {
        businessId,
        date: dayStart,
        totalAmountKobo: result?.totalAmountKobo ?? 0,
        totalQuantity: result?.totalQuantity ?? 0,
        orderCount: result?.orderCount ?? 0,
        topProducts: result?.topProducts ?? [],
      },
    },
    { upsert: true }
  );
}
