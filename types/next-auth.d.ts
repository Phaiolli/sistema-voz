import type { DefaultSession } from "next-auth";
import type { UserRole, UserPlan } from "@/lib/types";

declare module "next-auth" {
  /** Authenticated user fields exposed on the session. */
  interface Session {
    user: {
      id: string;
      role: UserRole;
      plan?: UserPlan;
    } & DefaultSession["user"];
  }

  /** Fields returned by the Credentials `authorize` callback. */
  interface User {
    role: UserRole;
    plan?: UserPlan;
  }
}

declare module "next-auth/jwt" {
  /** Claims persisted on the JWT between requests. */
  interface JWT {
    userId: string;
    role: UserRole;
    plan: UserPlan;
  }
}

// next-auth/jwt re-exports the `JWT` interface from @auth/core/jwt; augmenting
// the re-export alone does not always merge into the original declaration, so we
// augment the source module too.
declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    role: UserRole;
    plan: UserPlan;
  }
}
