import "server-only";
import { formsAdmin } from "@/lib/server/supabase-admin";

// Booking-field slot generation in the field's timezone, net of lead time and capacity already taken.

const DEFAULTS = { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00", slotMinutes: 30, capacity: 1, horizonDays: 30, leadHours: 2, timezone: "UTC" };

export function bookingConfig(field) {
  const c = { ...DEFAULTS, ...(field?.config || {}) };
  let timezone = c.timezone || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    timezone = "UTC";
  }
  return {
    days: Array.isArray(c.days) ? c.days.map(Number) : DEFAULTS.days,
    start: /^\d{1,2}:\d{2}$/.test(c.start) ? c.start : DEFAULTS.start,
    end: /^\d{1,2}:\d{2}$/.test(c.end) ? c.end : DEFAULTS.end,
    slotMinutes: Math.min(24 * 60, Math.max(5, Number(c.slotMinutes) || 30)),
    capacity: Math.max(1, Number(c.capacity) || 1),
    horizonDays: Math.max(0, Number(c.horizonDays) || 30),
    leadHours: Math.max(0, Number(c.leadHours) || 0),
    timezone,
  };
}

// Offset (ms) of `timeZone` from UTC at instant `utcMs`.
function zoneOffset(utcMs, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

// Wall-clock time in `timeZone` → UTC ms (two-pass to settle DST transitions).
function zonedToUtc(y, m, d, hh, mm, timeZone) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - zoneOffset(guess, timeZone);
  return guess - zoneOffset(first, timeZone);
}

// YYYY-MM-DD of an instant in `timeZone`.
export function zonedDate(utcMs, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(utcMs));
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Raw slots for a date (no capacity check): [{ start, end, startMs }].
function slotsForDate(config, date, now = Date.now()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!match) return [];
  const [y, m, d] = match.slice(1).map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (!config.days.includes(weekday)) return [];
  const today = zonedDate(now, config.timezone);
  const horizon = zonedDate(now + config.horizonDays * 86_400_000, config.timezone);
  if (date < today || date > horizon) return [];
  const earliest = now + config.leadHours * 3_600_000;
  const out = [];
  for (let t = toMinutes(config.start); t + config.slotMinutes <= toMinutes(config.end); t += config.slotMinutes) {
    const startMs = zonedToUtc(y, m, d, Math.floor(t / 60), t % 60, config.timezone);
    if (startMs < earliest) continue;
    out.push({ start: new Date(startMs).toISOString(), end: new Date(startMs + config.slotMinutes * 60_000).toISOString(), startMs });
  }
  return out;
}

// Bookings already holding each slot start (ISO → count), optionally ignoring one response (edits).
async function takenCounts(formId, fieldId, fromIso, toIso, exceptResponseId) {
  const db = formsAdmin();
  if (!db) return new Map();
  let query = db
    .from("bookings")
    .select("slot_start, response_id")
    .eq("form_id", formId)
    .eq("field_id", fieldId)
    .is("deleted_at", null)
    .gte("slot_start", fromIso)
    .lte("slot_start", toIso);
  if (exceptResponseId) query = query.neq("response_id", exceptResponseId);
  const { data, error } = await query;
  if (error) console.error("[booking.taken]", error.message);
  const map = new Map();
  for (const b of data || []) {
    const key = new Date(b.slot_start).toISOString();
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

export async function availableSlots(formId, field, date, { exceptResponseId } = {}) {
  const config = bookingConfig(field);
  const raw = slotsForDate(config, date);
  if (!raw.length) return [];
  const taken = await takenCounts(formId, field.id, raw[0].start, raw[raw.length - 1].start, exceptResponseId);
  return raw.map(({ start, end }) => ({ start, end, available: (taken.get(start) || 0) < config.capacity }));
}

// Validates a submitted slot; returns { start, end } when still bookable, else null.
export async function checkSlot(formId, field, value, opts) {
  const ms = Date.parse(String(value || ""));
  if (Number.isNaN(ms)) return null;
  const config = bookingConfig(field);
  const iso = new Date(ms).toISOString();
  const slots = await availableSlots(formId, field, zonedDate(ms, config.timezone), opts);
  const slot = slots.find((s) => s.start === iso);
  return slot?.available ? { start: slot.start, end: slot.end } : null;
}
