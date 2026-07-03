import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

/**
 * Post-login dispatcher. Clerk sends users here after sign-in/up when no deep
 * link (`redirect_url`) was requested; it routes each role to its landing page,
 * preserving the behaviour the custom login form had before ADR-017.
 */
export default async function PosLoginPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/entrar");

  const role = sessionClaims?.metadata?.role;
  if (role === "superadmin") redirect("/plataforma");
  if (role === "admin") redirect("/admin/eventos");
  if (role === "owner") redirect("/dashboard");
  redirect("/mediador");
}
