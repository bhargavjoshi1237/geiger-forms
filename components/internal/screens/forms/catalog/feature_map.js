// Builder-only features (no form editor section) shown on the Feature Hub, with per-form usage via `detect(form)` → { on, note }.

const settingsOf = (form) => form.settings || {};
const plural = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;

export const STATUS_META = {
  available: { label: "Available", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  "requires-setup": { label: "Requires setup", variant: "info" },
};

export const FEATURE_MAP = {
  "builder.versions": {
    title: "Version History",
    description: "Every saved version of a form's fields and settings, with restore.",
    status: "available",
    builder: true,
    detect: (form) => ({ on: true, note: form.lastEdited ? `Edited ${form.lastEdited}` : "Tracked" }),
  },
  "collab.realtime": {
    title: "Real-time Co-editing",
    description: "Work on forms together without overwriting each other.",
    status: "partial",
    builder: true,
    detect: (form) => ({ on: (settingsOf(form).sharing || []).length > 0, note: (settingsOf(form).sharing || []).length ? plural(settingsOf(form).sharing.length, "collaborator") : "Just you" }),
  },
};

export function featureFor(view) {
  return FEATURE_MAP[view] || null;
}
