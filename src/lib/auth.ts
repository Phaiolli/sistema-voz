import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createServerClient } from "./supabase";

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
        const supabase = createServerClient();
        const { data: user } = await supabase
          .from("users")
          .select("id, name, email, role, password_hash")
          .eq("email", credentials.email as string)
          .limit(1)
          .maybeSingle();
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password as string, user.password_hash as string);
        if (!ok) return null;
        return { id: user.id as string, name: user.name as string, email: user.email as string, role: user.role as string };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { role: string; id: string }).role = token.role as string;
        (session.user as unknown as { id: string }).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/entrar",
  },
});
