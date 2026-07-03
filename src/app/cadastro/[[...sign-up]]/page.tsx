import { SignUp } from "@clerk/nextjs";
import { VozWordmark } from "@/components/voz/wordmark";

/**
 * Sign-up screen backed by Clerk. Path-based routing needs a catch-all segment
 * so Clerk's sub-steps (email verification, …) resolve under `/cadastro`. New
 * users are synced into Supabase by the Clerk webhook; see ADR-017.
 */
export default function CadastroPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 p-6">
      <VozWordmark size={28} />
      <SignUp />
    </main>
  );
}
