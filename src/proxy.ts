import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const user = session?.user as { role?: string } | undefined;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }
  }

  if (pathname.startsWith("/mediador")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
    if (user.role !== "admin" && user.role !== "mediador") {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/mediador/:path*", "/mediador/credenciamento/:path*"],
};
