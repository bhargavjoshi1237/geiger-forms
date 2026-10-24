import { NextResponse } from "next/server";

// The shared suite session written by @supabase/ssr (split into .0, .1… chunks when large).
const AUTH_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;
// Suite sign-in lives on the hub (geiger-dash); unset means the hub serves this app on its own origin.
const DASH_ORIGIN = (process.env.NEXT_PUBLIC_DASH_ORIGIN || "").replace(/\/$/, "");

// Optimistic gate: a cookie check, not a Supabase round-trip, so cached workspace shells stay fast; RLS is the real boundary.
export function proxy(request) {
  if (request.cookies.getAll().some(({ name, value }) => value && AUTH_COOKIE.test(name))) return NextResponse.next();
  const login = new URL(`${DASH_ORIGIN}/login`, request.url);
  login.searchParams.set("next", "forms");
  return NextResponse.redirect(login);
}

export const config = {
  // Internal routes only; /forms/_next/* and /forms/<file> are the asset-prefix rewrites, not workspace pages.
  matcher: ["/project/:path*", "/forms", "/forms/((?!_next/|.*\\.\\w+$).*)", "/print/:path*"],
};
