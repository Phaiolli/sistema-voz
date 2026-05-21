import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // Supabase Transaction pooler: max 1 connection for serverless
    const client = postgres(url, { max: 1, ssl: "require", prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}
