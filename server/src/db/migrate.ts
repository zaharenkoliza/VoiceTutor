import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig } from '../config.js';
import { createPool } from './pool.js';

const config = loadConfig();
const pool = createPool(config);
const migrations = [['001_initial', resolve(process.cwd(), 'migrations/001_initial.sql')]] as const;

try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const [version, path] of migrations) {
    const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
    if (exists.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(await readFile(path, 'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [version]);
      await client.query('COMMIT');
      console.log(`Applied migration ${version}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
} finally { await pool.end(); }
