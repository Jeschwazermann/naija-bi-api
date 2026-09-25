import { MongoClient, type Db } from 'mongodb';

// ✅ Best Practice: singleton connection — instantiate once per process,
// every repository reuses the same client/connection pool.
let client: MongoClient | undefined;
let db: Db | undefined;

export async function connectMongo(uri: string): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Mongo not connected — call connectMongo() during bootstrap first');
  }
  return db;
}

export async function pingMongo(): Promise<void> {
  await getDb().command({ ping: 1 });
}

export async function closeMongo(): Promise<void> {
  await client?.close();
  client = undefined;
  db = undefined;
}
