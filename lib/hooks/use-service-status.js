"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/lib/forms/api";
import { isPlaygroundActive } from "@/lib/playground/mode";

// One check per page load shared by every consumer; a failed check is retried on the next mount.
let cached = null;
let pending = null;

function loadServices() {
  if (isPlaygroundActive()) return Promise.resolve(null);
  pending ??= callApi("/api/workspace/config").then((res) => {
    pending = null;
    if (res.ok && res.data?.services) cached = res.data.services;
    return cached;
  });
  return pending;
}

// Which env-gated services this deployment has configured ({ email: true, … }); `services` stays null in the playground or when the check fails.
export function useServiceStatus() {
  const [state, setState] = useState(() => ({ services: cached, loading: !cached }));
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    loadServices().then((services) => alive && setState({ services, loading: false }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
