import { AppError } from '@naija-bi/error-handling';

interface UploadedFile {
  mimetype: string;
  size: number;
  originalname: string;
}

const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

export function assertUploadFileIsValid(
  file: UploadedFile | undefined,
  maxSizeMb: number
): asserts file is UploadedFile {
  if (!file) {
    throw new AppError('missing-file', 'No file was uploaded — expected field "file"', 400, false);
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) && !file.originalname.toLowerCase().endsWith('.csv')) {
    throw new AppError(
      'invalid-file-type',
      `Expected a CSV file, got "${file.mimetype}"`,
      400,
      false
    );
  }
  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError(
      'file-too-large',
      `File exceeds the ${maxSizeMb}MB limit`,
      400,
      false
    );
  }
}
