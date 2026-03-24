import { Pool, QueryResult } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { ENV } from "./_core/env";
import * as schema from "../drizzle/schema";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = ENV.databaseUrl;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }
  return pool;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// Export db as the drizzle instance
export const db = getDb();

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;
  
  if (ENV.nodeEnv === "development") {
    console.log("Executed query", { text: text.substring(0, 100) + "...", duration, rows: result.rowCount });
  }
  
  return result;
}

export async function getClient() {
  const client = await getPool().connect();
  return client;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  dbInstance = null;
}

export async function testConnection(): Promise<boolean> {
  try {
    const result = await query("SELECT NOW() as now, version() as version, current_database() as database");
    console.log("PostgreSQL connection successful:", result.rows[0]);
    return true;
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
    return false;
  }
}
