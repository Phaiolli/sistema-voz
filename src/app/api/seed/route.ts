/**
 * POST /api/seed
 * Idempotent seed — inserts the INCLUIR event and default admin user.
 * Requires SEED_SECRET in env to prevent accidental use in production.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { eventIncluir } from "@/lib/fixtures";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServerClient();

  // Upsert event
  const { data: existingEvent } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventIncluir.id)
    .limit(1)
    .maybeSingle();

  if (!existingEvent) {
    const { error: insertErr } = await supabase.from("events").insert({
      id: eventIncluir.id,
      slug: eventIncluir.slug,
      name: eventIncluir.name,
      starts_at: new Date(eventIncluir.startsAt).toISOString(),
      ends_at: new Date(eventIncluir.endsAt).toISOString(),
      place: eventIncluir.place,
      address: eventIncluir.address,
      status: eventIncluir.status,
      about: eventIncluir.about,
      theme: eventIncluir.theme,
      config: eventIncluir.config,
      organizer_id: eventIncluir.organizerId,
    });
    if (insertErr) throw insertErr;
  }

  // Upsert admin user
  const adminEmail = "admin@voz.app";
  const { data: existingAdmin } = await supabase
    .from("users")
    .select("id")
    .eq("email", adminEmail)
    .limit(1)
    .maybeSingle();

  let adminPassword = "";
  if (!existingAdmin) {
    adminPassword = randomBytes(12).toString("base64url");
    const hash = await bcrypt.hash(adminPassword, 12);
    const { error: userErr } = await supabase.from("users").insert({
      id: "usr_admin",
      name: "Admin",
      email: adminEmail,
      role: "admin",
      password_hash: hash,
    });
    if (userErr) throw userErr;
  }

  return NextResponse.json({
    ok: true,
    event: eventIncluir.slug,
    admin: existingAdmin ? "already exists" : { email: adminEmail, password: adminPassword },
  });
}
