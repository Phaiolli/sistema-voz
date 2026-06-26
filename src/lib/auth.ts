/**
 * NextAuth v5 configuration with JWT strategy and Credentials provider.
 *
 * - Session strategy: JWT (stateless, suitable for serverless)
 * - Provider: Credentials (email/password with bcrypt verification)
 * - Rate limiting: 5 attempts per email per 15 minutes (prevents brute force)
 * - Session augmentation: `Session.user` enriched with `id`, `role`, `plan`
 *
 * See `types/next-auth.d.ts` for `Session` interface augmentation.
 */
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createServerClient } from "./supabase";
import { rateLimit } from "./api/rate-limit";
import type { UserRole, UserPlan } from "./types";
import type { JWT } from "next-auth/jwt";

/**
 * NextAuth singleton instance exported for use in API routes and server actions.
 *
 * @example
 * // In a route handler
 * const session = await auth();
 * if (!session) return res.status(401).json({ error: "Unauthorized" });
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Throttle login attempts per email. Returns null when blocked so the
        // caller cannot distinguish "rate limited" from "wrong credentials"
        // (no information leak). Limit is per-process — see ADR 011.
        const limit = rateLimit(`login:${credentials.email as string}`, { max: 5, windowMs: 15 * 60 * 1000 });
        if (!limit.ok) return null;
        const supabase = createServerClient();
        const { data: user } = await supabase
          .from("users")
          .select("id, name, email, role, plan, password_hash")
          .eq("email", credentials.email as string)
          .limit(1)
          .maybeSingle();
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password as string, user.password_hash as string);
        if (!ok) return null;
        return {
          id: user.id as string,
          name: user.name as string,
          email: user.email as string,
          role: user.role as UserRole,
          plan: (user.plan ?? "free") as UserPlan,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.userId = user.id ?? "";
        token.plan = user.plan ?? "free";
      }
      return token;
    },
    session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.userId;
        session.user.plan = token.plan;
      }
      return session;
    },
  },
  pages: {
    signIn: "/entrar",
  },
});
