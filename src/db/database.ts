import { Pool, QueryResultRow } from 'pg';

export const pool = new Pool({
  database: process.env.PGDATABASE || 'orbit',
  host: process.env.PGHOST || '/var/run/postgresql',
  user: process.env.PGUSER || 'koby',
});

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}
