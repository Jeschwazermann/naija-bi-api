import IORedis, { type Redis } from 'ioredis';

// ✅ Best Practice: BullMQ requires maxRetriesPerRequest: null on the
// connection it's handed — otherwise blocking commands (used internally by
// workers) fail after ioredis's default retry limit.
let connection: Redis | undefined;

export function getRedisConnection(redisUrl: string): Redis {
  if (!connection) {
    connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  }
  return connection;
}

export async function pingRedis(redisUrl: string): Promise<void> {
  await getRedisConnection(redisUrl).ping();
}

export async function closeRedisConnection(): Promise<void> {
  await connection?.quit();
  connection = undefined;
}
