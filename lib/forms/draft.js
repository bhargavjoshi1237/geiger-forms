// Local draft + offline submit queue for the public filler. Every storage access is guarded (private mode, quota, SSR).

const DRAFT_PREFIX = "geiger-forms:draft:";
const QUEUE_PREFIX = "geiger-forms:queue:";
const SESSION_PREFIX = "geiger-forms:session:";
const PARTIAL_PREFIX = "geiger-forms:partial:";
const DRAFT_TTL_MS = 30 * 86_400_000;

function storage(kind = "local") {
  try {
    if (typeof window === "undefined") return null;
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function readJson(key, kind) {
  try {
    const raw = storage(kind)?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value, kind) {
  try {
    storage(kind)?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key, kind) {
  try {
    storage(kind)?.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

// Large binary-ish values (signature data URLs) are dropped from drafts to stay under quota.
function compactAnswers(answers) {
  const out = {};
  for (const [key, value] of Object.entries(answers || {})) {
    if (typeof value === "string" && value.startsWith("data:") && value.length > 2048) continue;
    out[key] = value;
  }
  return out;
}

export function loadDraft(slug) {
  const draft = readJson(DRAFT_PREFIX + slug);
  if (!draft || typeof draft !== "object" || !draft.answers) return null;
  if (draft.savedAt && Date.now() - draft.savedAt > DRAFT_TTL_MS) {
    remove(DRAFT_PREFIX + slug);
    return null;
  }
  return draft;
}

export function saveDraft(slug, { answers, pageIndex = 0 }) {
  return writeJson(DRAFT_PREFIX + slug, { answers: compactAnswers(answers), pageIndex, savedAt: Date.now() });
}

export function clearDraft(slug) {
  remove(DRAFT_PREFIX + slug);
}

// Offline queue: one pending submission per form (the latest wins).
export function loadQueued(slug) {
  const item = readJson(QUEUE_PREFIX + slug);
  return item && item.body ? item : null;
}

export function queueSubmission(slug, body) {
  return writeJson(QUEUE_PREFIX + slug, { body, queuedAt: Date.now() });
}

export function clearQueued(slug) {
  remove(QUEUE_PREFIX + slug);
}

// Random per-visit session id (sessionStorage), reused across reloads in the same tab.
export function sessionIdFor(slug) {
  const key = SESSION_PREFIX + slug;
  try {
    const existing = storage("session")?.getItem(key);
    if (existing) return existing;
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    storage("session")?.setItem(key, id);
    return id;
  } catch {
    return `s-${Math.random().toString(36).slice(2)}`;
  }
}

// Once-per-session flags (e.g. the 'view' event) so reloads don't double count.
export function markOnce(slug, flag) {
  const key = `${SESSION_PREFIX}${slug}:${flag}`;
  try {
    const store = storage("session");
    if (!store) return true;
    if (store.getItem(key)) return false;
    store.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

// The partial token for this browser, so drop-off tracking resumes the same partial row.
export function loadPartialToken(slug) {
  try {
    return storage()?.getItem(PARTIAL_PREFIX + slug) || null;
  } catch {
    return null;
  }
}

export function savePartialToken(slug, token) {
  try {
    if (token) storage()?.setItem(PARTIAL_PREFIX + slug, token);
    else storage()?.removeItem(PARTIAL_PREFIX + slug);
  } catch {
    // Storage unavailable — the token just won't survive a reload.
  }
}
