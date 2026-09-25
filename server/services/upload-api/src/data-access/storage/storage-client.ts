export interface SavedFile {
  url: string;
}

// ✅ Best Practice: port/adapter — the domain layer depends on this
// interface only, never on "local disk" or "S3" directly.
export interface StorageClient {
  saveFile(buffer: Buffer, key: string): Promise<SavedFile>;
}
