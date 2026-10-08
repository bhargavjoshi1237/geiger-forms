// Lookups & formatters for the Responses area. Config only — never row data.
import { RESPONSE_PRIORITIES, RESPONSE_STATUSES } from "@/lib/forms/schema";

export { RESPONSE_PRIORITIES, RESPONSE_STATUSES };

// status → StatusPill meta (Badge variants from @geiger/ui).
export const RESPONSE_STATUS_MAP = {
  Complete: { label: "Complete", variant: "success", dotClass: "bg-emerald-400" },
  "Needs review": { label: "Needs review", variant: "warning", dotClass: "bg-amber-400" },
  Pending: { label: "Pending", variant: "neutral", dotClass: "bg-muted-foreground" },
  "In progress": { label: "In progress", variant: "info", dotClass: "bg-sky-400" },
  Approved: { label: "Approved", variant: "success", dotClass: "bg-emerald-400" },
  Rejected: { label: "Rejected", variant: "danger", dotClass: "bg-red-400" },
  "Awaiting payment": { label: "Awaiting payment", variant: "purple", dotClass: "bg-violet-400" },
  Spam: { label: "Spam", variant: "outline", dotClass: "bg-text-tertiary" },
};

export const RESPONSE_PRIORITY_MAP = {
  High: { label: "High", variant: "danger", dotClass: "bg-red-400" },
  Medium: { label: "Medium", variant: "warning", dotClass: "bg-amber-400" },
  Low: { label: "Low", variant: "neutral", dotClass: "bg-muted-foreground" },
};

export const FORM_STATUS_MAP = {
  Published: { label: "Published", variant: "success", dotClass: "bg-emerald-400" },
  Draft: { label: "Draft", variant: "neutral", dotClass: "bg-text-tertiary" },
  Archived: { label: "Archived", variant: "outline", dotClass: "bg-muted-foreground" },
};

export const PAYMENT_STATUS_MAP = {
  paid: { label: "Paid", variant: "success", dotClass: "bg-emerald-400" },
  pending: { label: "Pending", variant: "warning", dotClass: "bg-amber-400" },
  unpaid: { label: "Unpaid", variant: "warning", dotClass: "bg-amber-400" },
  failed: { label: "Failed", variant: "danger", dotClass: "bg-red-400" },
  refunded: { label: "Refunded", variant: "outline", dotClass: "bg-muted-foreground" },
  canceled: { label: "Canceled", variant: "outline", dotClass: "bg-muted-foreground" },
};

// Kanban column accent per status; these classes also make Tailwind emit the palette vars below.
export const STATUS_BAR_CLASS = {
  Complete: "bg-emerald-400",
  "Needs review": "bg-amber-400",
  Pending: "bg-neutral-500",
  "In progress": "bg-sky-400",
  Approved: "bg-teal-400",
  Rejected: "bg-red-400",
  "Awaiting payment": "bg-violet-400",
  Spam: "bg-neutral-700",
};

// Chart colours per status as Tailwind palette vars (no app-chrome hex).
export const STATUS_CHART_COLORS = {
  Complete: "var(--color-emerald-400)",
  "Needs review": "var(--color-amber-400)",
  Pending: "var(--color-neutral-500)",
  "In progress": "var(--color-sky-400)",
  Approved: "var(--color-teal-400)",
  Rejected: "var(--color-red-400)",
  "Awaiting payment": "var(--color-violet-400)",
  Spam: "var(--color-neutral-700)",
};

export const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "score", label: "Highest score" },
  { value: "priority", label: "Highest priority" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...RESPONSE_STATUSES.map((s) => ({ value: s, label: s })),
];

export const PRIORITY_FILTER_OPTIONS = [
  { value: "all", label: "All priorities" },
  ...RESPONSE_PRIORITIES.map((p) => ({ value: p, label: p })),
];

export const DEFAULT_FILTERS = {
  search: "",
  formId: "all",
  status: "all",
  priority: "all",
  tag: "all",
  assignee: "all",
  outcome: "all",
  from: "",
  to: "",
};

export const AVATAR_COLORS = ["bg-blue-500/10", "bg-emerald-500/10", "bg-orange-500/10", "bg-violet-500/10", "bg-surface-card", "bg-teal-500/10"];

// Events outline-button idiom.
export const OUTLINE_BUTTON = "border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground";

export const MENU_ITEM = "cursor-pointer gap-2 text-xs text-muted-foreground focus:bg-surface-hover focus:text-foreground";

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return "—";
  const total = Math.round(Number(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${m}m`;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export function avatarColor(seed) {
  const str = String(seed || "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
