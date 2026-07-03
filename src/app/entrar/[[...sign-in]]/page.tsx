import { SignIn } from "@clerk/nextjs";
import { VozWordmark } from "@/components/voz/wordmark";

/**
 * Sign-in screen backed by Clerk. Path-based routing needs a catch-all segment
 * so Clerk's sub-steps (factor-one, SSO callback, …) resolve under `/entrar`.
 * Post-login landing is role-based via `/pos-login`; see ADR-017.
 */
export default function EntrarPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 p-6">
      <VozWordmark size={28} />
      <SignIn />
    </main>
  );
}
