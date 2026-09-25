// ✅ Best Practice: isCatastrophic distinguishes "expected" errors (bad
// input, not found) from unexpected ones that might mean the process is in
// a bad state and should be restarted after cleanup.
export class AppError extends Error {
  public readonly code: string;

  public readonly httpCode: number;

  public readonly isCatastrophic: boolean;

  public readonly cause?: unknown;

  constructor(
    code: string,
    message: string,
    httpCode = 500,
    isCatastrophic = true,
    cause?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpCode = httpCode;
    this.isCatastrophic = isCatastrophic;
    this.cause = cause;
    Error.captureStackTrace(this, AppError);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
