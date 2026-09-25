import { getUploadsCollection } from '@naija-bi/mongo-client';
import type { UploadStatus, RejectedRow } from '@naija-bi/mongo-client';

export async function findById(id: string) {
  const { ObjectId } = await import('mongodb');
  return getUploadsCollection().findOne({ _id: new ObjectId(id) as unknown as string });
}

export async function updateStatus(
  id: string,
  status: UploadStatus,
  extra: { rowsProcessed?: number; rowsRejected?: number; rejectedRows?: RejectedRow[] } = {}
): Promise<void> {
  const { ObjectId } = await import('mongodb');
  await getUploadsCollection().updateOne(
    { _id: new ObjectId(id) as unknown as string },
    {
      $set: {
        status,
        ...extra,
        ...(status === 'completed' || status === 'failed_partial' || status === 'failed'
          ? { completedAt: new Date() }
          : {}),
      },
    }
  );
}
