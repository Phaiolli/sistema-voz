import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-migrate-token");
  if (!token || token !== process.env.MIGRATE_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });

  const sql = postgres(url, { max: 1, ssl: "require", prepare: false });
  const results: Record<string, string> = {};
  try {
    await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false NOT NULL`;
    results["is_anonymous"] = "ok";
  } catch (e) {
    results["is_anonymous"] = String(e);
  }
  try {
    await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS lgpd_accepted boolean DEFAULT false NOT NULL`;
    results["lgpd_accepted"] = "ok";
  } catch (e) {
    results["lgpd_accepted"] = String(e);
  }
  await sql.end();
  return NextResponse.json({ results });
}
