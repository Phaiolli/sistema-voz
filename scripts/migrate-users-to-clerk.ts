/**
 * One-off migration: import existing Supabase users into Clerk (ADR-017).
 *
 * For every `users` row not yet linked to Clerk (`clerk_id IS NULL`), this
 * creates a Clerk identity that:
 *   - preserves the bcrypt password hash (`passwordDigest` + `passwordHasher`),
 *     so users keep logging in with their current password;
 *   - sets `externalId = users.id`, so the app user id (referenced by FKs like
 *     `events.organizer_id`) stays stable;
 *   - mirrors `role`/`plan` into `publicMetadata`, which feeds the session token
 *     the middleware reads.
 * It then writes the new Clerk id back into `users.clerk_id`.
 *
 * Idempotent: rows already linked are skipped, and if a Clerk user already
 * exists for the email (e.g. a re-run), it is looked up and linked instead of
 * duplicated. Logs carry only the app user id — never email or password — per
 * the project's zero-PII-in-logs rule.
 *
 * Usage (loads secrets from .env):
 *   pnpm migrate:clerk
 */
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/database.types";
import { splitName } from "../src/lib/api/clerk-users";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function main() {
  const clerk = createClerkClient({ secretKey: requireEnv("CLERK_SECRET_KEY") });
  const supabase = createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  const { data: users, error } = await supabase
    .from("users")
    .select("id, name, email, role, plan, password_hash")
    .is("clerk_id", null);
  if (error) throw error;

  const pending = users ?? [];
  console.log(`Users to migrate (clerk_id IS NULL): ${pending.length}`);

  let migrated = 0;
  let linked = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const user of pending) {
    try {
      const { firstName, lastName } = splitName(user.name);
      let clerkId: string;

      if (user.password_hash) {
        const created = await clerk.users.createUser({
          externalId: user.id,
          emailAddress: [user.email],
          passwordDigest: user.password_hash,
          passwordHasher: "bcrypt",
          firstName,
          lastName,
          publicMetadata: { role: user.role, plan: user.plan },
          skipPasswordChecks: true,
          skipLegalChecks: true,
        });
        clerkId = created.id;
        migrated += 1;
      } else {
        // No local password (already Clerk-managed or invited). Link if a Clerk
        // user already exists for this email; otherwise skip and report.
        const { data: existing } = await clerk.users.getUserList({
          emailAddress: [user.email],
          limit: 1,
        });
        if (existing[0]) {
          clerkId = existing[0].id;
          linked += 1;
        } else {
          skipped += 1;
          console.warn(`SKIP ${user.id}: no password hash and no Clerk user for email`);
          continue;
        }
      }

      const { error: updateErr } = await supabase
        .from("users")
        .update({ clerk_id: clerkId })
        .eq("id", user.id);
      if (updateErr) throw updateErr;

      console.log(`OK ${user.id} -> ${clerkId}`);
    } catch (err) {
      // A duplicate-email error means the Clerk user already exists — link it.
      try {
        const { data: existing } = await clerk.users.getUserList({
          emailAddress: [user.email],
          limit: 1,
        });
        if (existing[0]) {
          await supabase.from("users").update({ clerk_id: existing[0].id }).eq("id", user.id);
          linked += 1;
          console.log(`LINK ${user.id} -> ${existing[0].id} (already in Clerk)`);
          continue;
        }
      } catch {
        // fall through to failure reporting
      }
      failures.push(user.id);
      const message = err instanceof Error ? err.message : String(err);
      console.error(`FAIL ${user.id}: ${message}`);
    }
  }

  console.log("\n── Migration summary ─────────────────────────");
  console.log(`  created:  ${migrated}`);
  console.log(`  linked:   ${linked}`);
  console.log(`  skipped:  ${skipped}`);
  console.log(`  failed:   ${failures.length}${failures.length ? ` (${failures.join(", ")})` : ""}`);

  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
