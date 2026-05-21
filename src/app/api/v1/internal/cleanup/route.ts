import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServerClient } from "@/lib/supabase";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (auth.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const supabase = createServerClient();

  const [questionsResult, registrationsResult] = await Promise.all([
    supabase
      .from("questions")
      .update({ author_ip: null }, { count: "exact" })
      .lt("created_at", cutoff)
      .not("author_ip", "is", null),
    supabase
      .from("registrations")
      .update({ author_ip: null }, { count: "exact" })
      .lt("created_at", cutoff)
      .not("author_ip", "is", null),
  ]);

  if (questionsResult.error) throw questionsResult.error;
  if (registrationsResult.error) throw registrationsResult.error;

  const qCount = questionsResult.count ?? 0;
  const rCount = registrationsResult.count ?? 0;

  return NextResponse.json({
    deleted: qCount + rCount,
    cutoff,
    tables: { questions: qCount, registrations: rCount },
  });
}
