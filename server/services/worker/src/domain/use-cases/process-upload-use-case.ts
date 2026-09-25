import { parse } from 'csv-parse';
import { Readable } from 'stream';
import type { Logger } from '@naija-bi/logger';
import type { SalesRow, RejectedRow } from '@naija-bi/mongo-client';
import * as uploadRepository from '../../data-access/upload-repository';
import * as salesRepository from '../../data-access/sales-repository';
import { validateRow, type RawCsvRow } from '../services/row-validator';
import type { StorageReader } from '../../data-access/storage';

const BATCH_SIZE = 500;

interface ProcessUploadDTO {
  uploadId: string;
  businessId: string;
  fileUrl: string;
}

// ✅ Best Practice: one bad row never fails the whole job — every row is
// either accepted or collected as a RejectedRow with a human-readable reason.
export async function processUpload(
  dto: ProcessUploadDTO,
  storageReader: StorageReader,
  logger: Logger
): Promise<void> {
  await uploadRepository.updateStatus(dto.uploadId, 'processing');

  const fileBuffer = await storageReader.readFile(dto.fileUrl);
  const parser = Readable.from(fileBuffer).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true })
  );

  let batch: SalesRow[] = [];
  const rejectedRows: RejectedRow[] = [];
  const touchedDates = new Set<string>();
  let rowNumber = 0;
  let rowsProcessed = 0;

  const flushBatch = async () => {
    if (batch.length === 0) return;
    await salesRepository.insertRows(batch);
    rowsProcessed += batch.length;
    batch = [];
  };

  for await (const rawRow of parser as AsyncIterable<RawCsvRow>) {
    rowNumber += 1;
    const result = validateRow(rawRow);

    if (!result.valid || !result.row) {
      rejectedRows.push({ rowNumber, reason: result.reason ?? 'unknown', raw: rawRow });
      // eslint-disable-next-line no-continue
      continue;
    }

    batch.push({ ...result.row, businessId: dto.businessId, uploadId: dto.uploadId });
    touchedDates.add(result.row.date.toISOString().slice(0, 10));

    if (batch.length >= BATCH_SIZE) {
      // eslint-disable-next-line no-await-in-loop
      await flushBatch();
    }
  }
  await flushBatch();

  // ✅ Best Practice: only recompute aggregates for dates this file actually
  // touched — not the business's whole history — so large re-uploads stay cheap.
  for (const isoDate of touchedDates) {
    // eslint-disable-next-line no-await-in-loop
    await salesRepository.recomputeDailyAggregate(dto.businessId, new Date(isoDate));
  }

  const status = rejectedRows.length > 0 && rowsProcessed > 0 ? 'failed_partial' : rejectedRows.length > 0 && rowsProcessed === 0 ? 'failed' : 'completed';

  await uploadRepository.updateStatus(dto.uploadId, status, {
    rowsProcessed,
    rowsRejected: rejectedRows.length,
    rejectedRows: rejectedRows.slice(0, 200), // cap stored detail, counts stay accurate
  });

  logger.info('upload processed', {
    uploadId: dto.uploadId,
    rowsProcessed,
    rowsRejected: rejectedRows.length,
    status,
  });
}
