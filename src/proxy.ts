import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if (pathname.startsWith("/plataforma")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
    if (user.role !== "superadmin") {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }
  }

  if (pathname.startsWith("/mediador")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
    if (user.role !== "admin" && user.role !== "mediador" && user.role !== "superadmin") {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }
  }

  if (pathname.startsWith("/conta")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
    if (user.role !== "owner" && user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/mediador/:path*", "/mediador/credenciamento/:path*", "/dashboard/:path*", "/plataforma/:path*", "/conta/:path*", "/conta"],
};
