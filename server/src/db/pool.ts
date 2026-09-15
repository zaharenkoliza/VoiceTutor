import { Pool } from 'pg';
import type { ServerConfig } from '../config.js';

export function createPool(config: ServerConfig): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
  });
}
