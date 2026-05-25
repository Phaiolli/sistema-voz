import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-migrate-token");
  if (!token || token !== process.env.MIGRATE_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};
  try {
    await db().execute(sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false NOT NULL`);
    results["is_anonymous"] = "ok";
  } catch (e) {
    results["is_anonymous"] = String(e);
  }
  try {
    await db().execute(sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS lgpd_accepted boolean DEFAULT false NOT NULL`);
    results["lgpd_accepted"] = "ok";
  } catch (e) {
    results["lgpd_accepted"] = String(e);
  }

  return NextResponse.json({ results });
}
