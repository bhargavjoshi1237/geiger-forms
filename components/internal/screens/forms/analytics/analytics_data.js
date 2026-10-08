"use client";

import { useEffect, useMemo, useState } from "react";
import { useForms } from "@/lib/hooks/use-forms";
import { useResponses } from "@/lib/hooks/use-responses";
import { listFormEvents, listPartials } from "@/lib/supabase/responses";

// Shared analytics data + math for the Analytics group (dashboard, funnel, attribution, A/B, reports).

export const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

// Chart series colors come from theme tokens, never hard-coded hex.
export const SERIES = {
  views: "var(--chart-1)",
  starts: "var(--chart-3)",
  submits: "var(--foreground)",
};
export const GRID_STROKE = "var(--border)";
export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };

const DAY_MS = 24 * 60 * 60 * 1000;

export function sinceIso(days) {
  const start = new Date(Date.now() - Number(days) * DAY_MS);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export function pct(part, whole) {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export function formatPct(value) {
  return value == null ? "—" : `${value}%`;
}

export function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "—";
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function shortDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Submissions that count toward conversion (spam excluded).
export function isCountedResponse(r) {
  return r.status !== "Spam";
}

// Dedupes events per (form, type, session) so a refresh doesn't inflate views.
export function uniqueEvents(events) {
  const seen = new Set();
  const out = [];
  events.forEach((e, i) => {
    const key = `${e.formId}:${e.type}:${e.sessionId || `i${i}`}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(e);
  });
  return out;
}

// Loads project forms + responses, then range-scoped events (and optionally partials) for those forms.
export function useAnalyticsData({ days = 30, partials = false } = {}) {
  const { forms, loading: formsLoading, mergeSettings, refresh: refreshForms } = useForms();
  const { responses, loading: responsesLoading, refresh: refreshResponses } = useResponses();
  const formIdsKey = useMemo(() => forms.map((f) => f.id).join(","), [forms]);
  const [reloads, setReloads] = useState(0);
  const key = `${formIdsKey}|${days}|${partials}|${reloads}`;
  const [result, setResult] = useState({ key: null, events: [], partials: [], error: null });

  useEffect(() => {
    if (formsLoading) return undefined;
    let alive = true;
    const ids = formIdsKey ? formIdsKey.split(",") : [];
    (async () => {
      if (!ids.length) return { events: [], partials: [], error: null };
      try {
        const [events, partialRows] = await Promise.all([
          listFormEvents({ formIds: ids, since: sinceIso(days) }),
          partials ? listPartials({ formIds: ids }) : Promise.resolve([]),
        ]);
        return { events, partials: partialRows, error: null };
      } catch (err) {
        console.error("[analytics.load]", err);
        return { events: [], partials: [], error: err };
      }
    })().then((next) => {
      if (alive) setResult({ key, ...next });
    });
    return () => {
      alive = false;
    };
  }, [formsLoading, formIdsKey, days, partials, key]);

  const since = useMemo(() => sinceIso(days), [days]);
  const rangedResponses = useMemo(
    () => responses.filter((r) => r.submittedAt && r.submittedAt >= since),
    [responses, since],
  );

  return {
    forms,
    responses,
    rangedResponses,
    events: result.key === key ? result.events : [],
    partials: result.key === key ? result.partials : [],
    error: result.key === key ? result.error : null,
    loading: formsLoading || responsesLoading || result.key !== key,
    mergeSettings,
    refresh: () => {
      refreshForms();
      refreshResponses();
      setReloads((n) => n + 1);
    },
  };
}

// Per-form funnel metrics over the selected range.
export function buildFormMetrics(forms, events, responses) {
  const rows = new Map(
    forms.map((f) => [f.id, { id: f.id, name: f.name || f.title || "Untitled form", status: f.status, views: 0, starts: 0, submits: 0, timeSum: 0, timeCount: 0 }]),
  );
  for (const e of uniqueEvents(events)) {
    const row = rows.get(e.formId);
    if (!row) continue;
    if (e.type === "view") row.views += 1;
    else if (e.type === "start") row.starts += 1;
  }
  for (const r of responses) {
    const row = rows.get(r.formId);
    if (!row || !isCountedResponse(r)) continue;
    row.submits += 1;
    if (typeof r.completionMs === "number" && r.completionMs > 0) {
      row.timeSum += r.completionMs;
      row.timeCount += 1;
    }
  }
  return [...rows.values()].map((row) => ({
    ...row,
    conversion: pct(row.submits, row.views),
    startRate: pct(row.starts, row.views),
    completion: pct(row.submits, row.starts),
    avgMs: row.timeCount ? row.timeSum / row.timeCount : null,
  }));
}

export function totalsOf(metrics) {
  const t = metrics.reduce(
    (acc, m) => ({
      views: acc.views + m.views,
      starts: acc.starts + m.starts,
      submits: acc.submits + m.submits,
      timeSum: acc.timeSum + m.timeSum,
      timeCount: acc.timeCount + m.timeCount,
    }),
    { views: 0, starts: 0, submits: 0, timeSum: 0, timeCount: 0 },
  );
  return {
    ...t,
    conversion: pct(t.submits, t.views),
    startRate: pct(t.starts, t.views),
    completion: pct(t.submits, t.starts),
    avgMs: t.timeCount ? t.timeSum / t.timeCount : null,
  };
}

// Daily buckets of views / starts / submissions across the range.
export function buildDailySeries(days, events, responses) {
  const buckets = [];
  const index = new Map();
  const start = new Date(sinceIso(days));
  for (let i = 0; i <= Number(days); i += 1) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const k = d.toISOString().slice(0, 10);
    if (index.has(k)) continue;
    index.set(k, buckets.length);
    buckets.push({ day: k, label: shortDate(d.toISOString()), views: 0, starts: 0, submits: 0 });
  }
  const bump = (iso, field) => {
    if (!iso) return;
    const i = index.get(new Date(iso).toISOString().slice(0, 10));
    if (i !== undefined) buckets[i][field] += 1;
  };
  for (const e of uniqueEvents(events)) {
    if (e.type === "view") bump(e.createdAt, "views");
    else if (e.type === "start") bump(e.createdAt, "starts");
  }
  for (const r of responses) if (isCountedResponse(r)) bump(r.submittedAt, "submits");
  return buckets;
}

// UTM + referrer extraction tolerant of nested ({ utm: {...} }) and flat (utm_source) shapes.
export function attributionOf(metadata = {}) {
  const utm = metadata.utm && typeof metadata.utm === "object" ? metadata.utm : {};
  const pick = (k) => String(utm[k] || metadata[`utm_${k}`] || "").trim();
  let referrerHost = "";
  const ref = String(metadata.referrer || metadata.referer || "").trim();
  if (ref) {
    try {
      referrerHost = new URL(ref).hostname.replace(/^www\./, "");
    } catch {
      referrerHost = ref.replace(/^https?:\/\//, "").split("/")[0];
    }
  }
  return { source: pick("source"), medium: pick("medium"), campaign: pick("campaign"), referrerHost };
}

// Two-proportion z-test; returns { z, p, significant } (two-sided, 95%).
export function twoProportionTest(conv1, n1, conv2, n2) {
  if (!n1 || !n2) return null;
  const p1 = conv1 / n1;
  const p2 = conv2 / n2;
  const pooled = (conv1 + conv2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (!se) return null;
  const z = (p1 - p2) / se;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { z, p, significant: p < 0.05 };
}

// Abramowitz–Stegun approximation of the standard normal CDF.
function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

export function formOptions(forms) {
  return forms.map((f) => ({ value: f.id, label: f.name || f.title || "Untitled form" }));
}

// Partial progress may be stored as a 0–1 fraction or a 0–100 percent.
export function progressPct(value) {
  const n = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(n > 1 ? n : n * 100)));
}

// A partial idle this long without completing counts as abandoned rather than in progress.
const IDLE_MS = 30 * 60 * 1000;

export function isAbandoned(partial, now) {
  if (partial.completedAt) return false;
  const last = partial.updatedAt ? new Date(partial.updatedAt).getTime() : 0;
  return now - last > IDLE_MS;
}

export function fieldLabelOf(form, fieldId) {
  if (!fieldId) return "—";
  const field = (form?.fieldDefs || []).find((f) => f.id === fieldId);
  return field ? field.label || field.title || field.id : fieldId;
}
