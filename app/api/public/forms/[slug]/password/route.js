import { fail, ipHash, json, notFound, rateLimit, rateLimited, readJson, unavailable } from "@/lib/server/http";
import { isAdminConfigured } from "@/lib/server/supabase-admin";
import { loadPublishedForm } from "@/lib/server/forms";
import { checkPassword } from "@/lib/server/crypto";
import { passwordCookieName, passwordCookieValue } from "@/lib/server/public-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Unlocks a password-protected form: sets a signed, httpOnly cookie that later GET/submit calls honour.
export async function POST(request, { params }) {
  const { slug } = await params;
  if (!isAdminConfigured()) return unavailable();
  const { body, error } = await readJson(request, 2 * 1024);
  if (error) return error;
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  if (!(await rateLimit(`password:${form.id}:${ipHash(request)}`, 10, 900))) return rateLimited();
  if (form.settings.access?.mode !== "password") return json({ ok: true });
  if (!checkPassword(form.settings.access, body.password)) return fail("That password isn't right.", 401, { code: "gate" });
  const res = json({ ok: true });
  const value = passwordCookieValue(form);
  if (value) {
    res.cookies.set(passwordCookieName(form.id), value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 12 * 3600,
    });
  }
  return res;
}
