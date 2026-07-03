import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { logError } from "@/lib/log";
import type { UserRole, UserPlan } from "@/lib/types";

/**
 * Clerk → Supabase sync webhook.
 *
 * Keeps the `users` table (source of truth per ADR-017) in step with Clerk:
 *
 * - `user.created` — inserts the row (self sign-ups) and seeds Clerk
 *   `publicMetadata` with the default `role`/`plan` so the session token can
 *   gate routes. Migrated users are imported with metadata already set and do
 *   not fire this event.
 * - `user.updated` — reconciles email/name/role/plan from Clerk. Never writes
 *   back to Clerk, so seeding on `user.created` cannot loop.
 * - `user.deleted` — removes the row.
 *
 * Signature is verified by `verifyWebhook` (svix) using
 * `CLERK_WEBHOOK_SIGNING_SECRET`. The app user id is Clerk's `external_id` when
 * present (preserved across the migration) and the Clerk id otherwise.
 */
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    logError("clerk.webhook.verify", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const data = evt.data;
        const clerkId = data.id;
        const appUserId = data.external_id ?? clerkId;

        const emails = data.email_addresses ?? [];
        const primary =
          emails.find((e) => e.id === data.primary_email_address_id) ?? emails[0];
        const email = primary?.email_address ?? "";

        const name =
          [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
          data.username ||
          email;

        const meta = data.public_metadata as { role?: UserRole; plan?: UserPlan };
        const role: UserRole = meta?.role ?? "mediador";
        const plan: UserPlan = meta?.plan ?? "free";

        const { error } = await supabase
          .from("users")
          .upsert(
            { id: appUserId, clerk_id: clerkId, email, name, role, plan },
            { onConflict: "clerk_id" },
          );
        if (error) throw error;

        // Seed the session-token claims for brand-new sign-ups. Only on create,
        // and only when absent, so `user.updated` (fired by this write) is a
        // no-op that cannot loop.
        if (evt.type === "user.created" && (!meta?.role || !meta?.plan)) {
          const client = await clerkClient();
          await client.users.updateUserMetadata(clerkId, {
            publicMetadata: { role, plan },
          });
        }
        break;
      }

      case "user.deleted": {
        const clerkId = evt.data.id;
        if (clerkId) {
          const { error } = await supabase.from("users").delete().eq("clerk_id", clerkId);
          if (error) throw error;
        }
        break;
      }

      default:
        // Event we don't sync; acknowledge so Clerk stops retrying.
        break;
    }
  } catch (err) {
    logError(`clerk.webhook.${evt.type}`, err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
