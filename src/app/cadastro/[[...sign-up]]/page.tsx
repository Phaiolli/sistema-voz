import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { VozWordmark } from "@/components/voz/wordmark";

/**
 * Sign-up screen backed by Clerk. Path-based routing needs a catch-all segment
 * so Clerk's sub-steps (email verification, …) resolve under `/cadastro`. New
 * users are synced into Supabase by the Clerk webhook; see ADR-017.
 *
 * The binding legal consent is enforced by Clerk itself: enable
 * "Require express consent" in the Clerk Dashboard (Legal) and point the Terms
 * and Privacy URLs to `/termos` and `/privacidade`. The notice below mirrors
 * that requirement for users who reach the page before the toggle propagates.
 */
export default function CadastroPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 p-6">
      <VozWordmark size={28} />
      <SignUp />
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Ao criar uma conta, você concorda com os{" "}
        <Link href="/termos" className="underline hover:text-foreground">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="underline hover:text-foreground">
          Política de Privacidade
        </Link>
        .
      </p>
    </main>
  );
}
