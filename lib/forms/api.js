"use client";

import { withPrefix } from "@/lib/workspace/base-path";

// JSON fetch against this app's /api routes (prefix-aware). Resolves { ok, status, data }; never throws.
export async function callApi(path, { method = "GET", body, signal } = {}) {
  try {
    const res = await fetch(withPrefix(path), {
      method,
      signal,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.ok !== false, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e?.message || "Network error" } };
  }
}
