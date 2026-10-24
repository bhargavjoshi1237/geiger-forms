"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { namesMember } from "@/lib/forms/response-utils";
import { listMembers, memberInitials } from "@/lib/supabase/rbac";
import { getUser } from "@/lib/supabase/user";

// One roster fetch per project per page session, shared by the inbox, the response panel and the comments feed.
const directories = new Map();
const NO_MEMBERS = [];

function selfMember(user) {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar, initials: memberInitials(user.name) };
}

async function fetchDirectory(projectId) {
  const [rows, user] = await Promise.all([projectId ? listMembers(projectId) : [], getUser()]);
  const me = user ? rows?.find((m) => m.id === user.id) || selfMember(user) : null;
  const others = (rows || []).filter((m) => m.id !== me?.id).sort((a, b) => a.name.localeCompare(b.name));
  return { members: me ? [me, ...others] : others, me, failed: rows === null };
}

function loadDirectory(projectId) {
  const key = projectId || "";
  if (!directories.has(key)) {
    const pending = fetchDirectory(projectId)
      .catch((err) => {
        console.error("[members.load]", err);
        return { members: [], me: null, failed: true };
      })
      .then((dir) => {
        if (dir.failed) directories.delete(key);
        return dir;
      });
    directories.set(key, pending);
  }
  return directories.get(key);
}

// A person for display: the live member by id, else the member a legacy name-only snapshot names, else the snapshot itself.
export function resolvePerson(id, name, byId) {
  if (id && byId.has(id)) return byId.get(id);
  const named = !id && name ? [...byId.values()].find((m) => namesMember(name, m)) : null;
  if (named) return named;
  return name ? { id, name, email: "", avatarUrl: null, initials: memberInitials(name) } : null;
}

// Workspace members (the signed-in user first) with an id lookup; an unscoped workspace lists only the user.
export function useMembers() {
  const { projectId } = useWorkspaceUrl();
  const key = projectId || "";
  const [state, setState] = useState({ key: null, members: [], me: null });

  useEffect(() => {
    let live = true;
    loadDirectory(projectId).then((dir) => live && setState({ key, members: dir.members, me: dir.me }));
    return () => {
      live = false;
    };
  }, [projectId, key]);

  const current = state.key === key;
  const members = current ? state.members : NO_MEMBERS;
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  return { members, byId, me: current ? state.me : null, loading: !current };
}
