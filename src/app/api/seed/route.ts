/**
 * POST /api/seed
 * Idempotent seed — inserts the INCLUIR event and default admin user.
 * Requires SEED_SECRET in env to prevent accidental use in production.
 */
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { eventIncluir } from "@/lib/fixtures";
import { toJson } from "@/lib/api/mappers";
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
      theme: toJson(eventIncluir.theme),
      config: toJson(eventIncluir.config),
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
    // Clerk owns the credential (ADR-017). Create the identity there with a
    // stable external_id so `users.id` (referenced by FKs) stays "usr_admin",
    // then mirror the row into Supabase. `A1` suffix satisfies Clerk's password
    // complexity policy.
    adminPassword = `${randomBytes(12).toString("base64url")}A1`;
    const client = await clerkClient();
    const clerkUser = await client.users.createUser({
      externalId: "usr_admin",
      emailAddress: [adminEmail],
      password: adminPassword,
      firstName: "Admin",
      publicMetadata: { role: "admin", plan: "free" },
    });
    const { error: userErr } = await supabase.from("users").upsert({
      id: "usr_admin",
      clerk_id: clerkUser.id,
      name: "Admin",
      email: adminEmail,
      role: "admin",
    }, { onConflict: "clerk_id" });
    if (userErr) throw userErr;
  }

  return NextResponse.json({
    ok: true,
    event: eventIncluir.slug,
    admin: existingAdmin ? "already exists" : { email: adminEmail, password: adminPassword },
  });
}
