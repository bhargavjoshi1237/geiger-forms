"use client";

import { useCallback, useEffect } from "react";

function originOf(value) {
  try {
    const { origin } = new URL(value);
    return origin.startsWith("http") ? origin : null;
  } catch {
    return null;
  }
}

const ORIGIN_KEY = "geiger-forms:embed-origin";

// The embedding page's origin (browser-reported ancestor, else embed.js's hint, else the one first seen in this tab, else the referrer); null when not embedded.
function parentOrigin(embed) {
  if (!embed || typeof window === "undefined" || window.parent === window) return null;
  const reported = originOf(window.location.ancestorOrigins?.[0]) || originOf(new URLSearchParams(window.location.search).get("embed_origin"));
  // Cached because after an in-frame navigation the referrer is this app, not the host (Firefox has no ancestorOrigins).
  try {
    const origin = reported || window.sessionStorage.getItem(ORIGIN_KEY) || originOf(document.referrer);
    if (origin) window.sessionStorage.setItem(ORIGIN_KEY, origin);
    return origin;
  } catch {
    return reported || originOf(document.referrer);
  }
}

// In embed mode, reports height and unhandled Escape presses and announces submissions, posting only to the parent's origin.
export function useEmbedBridge(embed, slug) {
  useEffect(() => {
    const target = parentOrigin(embed);
    if (!target) return undefined;
    const send = (message) => window.parent.postMessage({ ...message, slug }, target);
    let last = 0;
    let frame = 0;
    const post = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(document.documentElement.scrollHeight);
        if (Math.abs(height - last) < 2) return;
        last = height;
        send({ type: "geiger-form:height", height });
      });
    };
    // Escape that no in-form popover consumed closes the host dialog.
    const onKey = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) send({ type: "geiger-form:escape" });
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(post) : null;
    observer?.observe(document.body);
    window.addEventListener("load", post);
    window.addEventListener("keydown", onKey);
    post();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("load", post);
      window.removeEventListener("keydown", onKey);
    };
  }, [embed, slug]);

  return useCallback(
    (data) => {
      const target = parentOrigin(embed);
      if (target) window.parent.postMessage({ type: "geiger-form:submitted", slug, responseId: data?.responseId || null, outcome: data?.outcome || null }, target);
    },
    [embed, slug],
  );
}
