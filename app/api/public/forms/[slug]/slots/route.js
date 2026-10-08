import { fail, json, notFound, unavailable } from "@/lib/server/http";
import { isAdminConfigured } from "@/lib/server/supabase-admin";
import { loadPublishedForm } from "@/lib/server/forms";
import { availableSlots, bookingConfig } from "@/lib/server/booking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Bookable slots for one date of a booking field.
export async function GET(request, { params }) {
  const { slug } = await params;
  if (!isAdminConfigured()) return unavailable();
  const url = new URL(request.url);
  const fieldId = url.searchParams.get("fieldId");
  const date = url.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Pass a date as YYYY-MM-DD.", 400);
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  const field = form.fieldDefs.find((f) => f.id === fieldId && f.type === "booking");
  if (!field) return notFound("Booking field not found.");
  const slots = await availableSlots(form.id, field, date);
  return json({ ok: true, slots, timezone: bookingConfig(field).timezone }, 200, { "Cache-Control": "no-store" });
}
