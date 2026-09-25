export interface StorageReader {
  readFile(url: string): Promise<Buffer>;
}
