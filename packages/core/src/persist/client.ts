import { neon } from "@neondatabase/serverless";
import { MIGRATION_FILES } from "./sql.js";

export interface SqlClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
}

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(";") ? s : `${s};`));
}

export async function applyMigrations(client: SqlClient): Promise<void> {
  const sql = MIGRATION_FILES.map((f) => f.sql).join("\n");
  if (client.exec) {
    await client.exec(sql);
    return;
  }
  for (const statement of splitStatements(sql)) {
    await client.query(statement);
  }
}

export function neonClient(databaseUrl: string): SqlClient {
  const sql = neon(databaseUrl);
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await sql.query(text, params);
      return rows as T[];
    },
    async exec(text: string) {
      for (const statement of splitStatements(text)) {
        await sql.query(statement, []);
      }
    },
  };
}

let _neon: SqlClient | null = null;

export function getNeonClient(env: NodeJS.ProcessEnv = process.env): SqlClient | null {
  const url = env.DATABASE_URL;
  if (!url) return null;
  if (!_neon) _neon = neonClient(url);
  return _neon;
}

export function resetNeonClient(): void {
  _neon = null;
}
