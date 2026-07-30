// lib/db.ts
import { neon } from '@neondatabase/serverless';
import { ensureDatabaseConfigured } from './env';

type SqlClient = ReturnType<typeof neon>;

let client: SqlClient | undefined;

function getClient(): SqlClient {
  if (!client) {
    const databaseUrl = ensureDatabaseConfigured();
    client = neon(databaseUrl);
  }
  return client;
}

export const sql = new Proxy(((...args: Parameters<SqlClient>) => {
  return getClient()(...args);
}) as SqlClient, {
  get(_target, prop) {
    const value = (getClient() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(getClient()) : value;
  },
});
