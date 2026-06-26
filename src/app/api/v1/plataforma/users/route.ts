import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

async function requireSuperAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (user.role !== "superadmin") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  return null;
}

export async function GET() {
  const deny = await requireSuperAdmin();
  if (deny) return deny;

  const supabase = createServerClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, role, plan, created_at, last_seen_at")
    .neq("role", "superadmin")
    .order("created_at", { ascending: false });

  if (!users?.length) {
    return NextResponse.json({ users: [] });
  }

  const userIds = users.map(u => u.id);

  const { data: eventCounts } = await supabase
    .from("events")
    .select("organizer_id")
    .in("organizer_id", userIds);

  const countMap: Record<string, number> = {};
  for (const row of eventCounts ?? []) {
    countMap[row.organizer_id] = (countMap[row.organizer_id] ?? 0) + 1;
  }

  return NextResponse.json({
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      plan: u.plan,
      eventsCount: countMap[u.id] ?? 0,
      createdAt: u.created_at,
      lastSeenAt: u.last_seen_at,
    })),
  });
}
