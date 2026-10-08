"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUser } from "@/lib/supabase/user";

// Supabase Realtime presence + "saved" broadcasts for everyone editing the same form.
export function useBuilderPresence(formId, { onRemoteSave } = {}) {
  const [others, setOthers] = useState([]);
  const channelRef = useRef(null);
  const profileRef = useRef(null);
  const handleRemoteSave = useEffectEvent((payload) => onRemoteSave?.(payload));

  useEffect(() => {
    if (!formId || !isSupabaseConfigured()) return undefined;
    let alive = true;
    let channel = null;
    const supabase = createClient();
    const key = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);

    getUser()
      .catch(() => null)
      .then((user) => {
        if (!alive) return;
        const profile = { key, userId: user?.id ?? null, name: user?.name || "Someone", email: user?.email || "", avatar: user?.avatar || null };
        profileRef.current = profile;
        channel = supabase.channel(`forms-builder:${formId}`, { config: { presence: { key }, broadcast: { self: false } } });
        channel
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState();
            const seen = new Set();
            const list = [];
            for (const [k, metas] of Object.entries(state)) {
              const meta = metas?.[0];
              if (k === key || !meta) continue;
              // One avatar per person even when they have several tabs open.
              const id = meta.userId || k;
              if (id === profile.userId || seen.has(id)) continue;
              seen.add(id);
              list.push(meta);
            }
            setOthers(list);
          })
          .on("broadcast", { event: "saved" }, ({ payload }) => handleRemoteSave(payload))
          .subscribe((status) => {
            if (status === "SUBSCRIBED") channel.track({ ...profile, since: new Date().toISOString() });
          });
        channelRef.current = channel;
      });

    return () => {
      alive = false;
      channelRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [formId]);

  // Tells co-editors a new version of the doc was saved (they decide whether to reload).
  const broadcastSaved = useCallback((signature) => {
    const channel = channelRef.current;
    const me = profileRef.current;
    if (!channel || !me) return;
    channel.send({ type: "broadcast", event: "saved", payload: { signature, key: me.key, userId: me.userId, name: me.name, at: Date.now() } });
  }, []);

  return { others, broadcastSaved };
}
