// Builder-only features (no form editor section) shown on the Feature Hub, with per-form usage via `detect(form)` → { on, note }.

import { plural } from "@/lib/utils";

const settingsOf = (form) => form.settings || {};

export const STATUS_META = {
  available: { label: "Available", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  "requires-setup": { label: "Requires setup", variant: "info" },
};

export const FEATURE_MAP = {
  "builder.versions": {
    title: "Version History",
    description: "Snapshots of a form's fields and settings that you save from the builder, with preview and restore.",
    status: "available",
    builder: true,
    detect: (form) => ({ on: true, note: form.lastEdited ? `Edited ${form.lastEdited}` : "Available" }),
  },
  "collab.realtime": {
    title: "Live Presence",
    description: "See who else has a form open in the builder and get a reload prompt when they save. Edits aren't merged: the latest save of the fields wins.",
    status: "available",
    builder: true,
    detect: (form) => ({ on: (settingsOf(form).sharing || []).length > 0, note: (settingsOf(form).sharing || []).length ? plural(settingsOf(form).sharing.length, "collaborator") : "Not shared" }),
  },
};

export function featureFor(view) {
  return FEATURE_MAP[view] || null;
}
