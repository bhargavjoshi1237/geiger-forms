"use client";

import { useCallback, useEffect } from "react";

// In embed mode, reports the document height to the parent page and announces submissions.
export function useEmbedBridge(embed, slug) {
  useEffect(() => {
    if (!embed || typeof window === "undefined" || window.parent === window) return undefined;
    let last = 0;
    let frame = 0;
    const post = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(document.documentElement.scrollHeight);
        if (Math.abs(height - last) < 2) return;
        last = height;
        window.parent.postMessage({ type: "geiger-form:height", height, slug }, "*");
      });
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(post) : null;
    observer?.observe(document.body);
    window.addEventListener("load", post);
    post();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("load", post);
    };
  }, [embed, slug]);

  return useCallback(
    (data) => {
      if (!embed || typeof window === "undefined" || window.parent === window) return;
      window.parent.postMessage({ type: "geiger-form:submitted", slug, responseId: data?.responseId || null }, "*");
    },
    [embed, slug],
  );
}
