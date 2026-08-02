// Lookups & formatters for the Forms area. Config only — never row data.

// status → StatusPill meta. Colors live here (this project's Badge has no
// variant), mirroring the palette the old form cards used.
export const FORM_STATUS_MAP = {
  Published: {
    label: "Published",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    dotClass: "bg-emerald-400",
  },
  Draft: {
    label: "Draft",
    className: "border-border bg-surface-active text-text-secondary",
    dotClass: "bg-text-tertiary",
  },
  Archived: {
    label: "Archived",
    className: "border-border-strong bg-surface-active text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export const STATUS_FILTER_OPTIONS = [
  { value: "All", label: "All statuses" },
  { value: "Published", label: "Published" },
  { value: "Draft", label: "Draft" },
  { value: "Archived", label: "Archived" },
];

export const DEFAULT_CATEGORIES = [
  "Sales",
  "Product",
  "Operations",
  "HR",
  "Events",
  "Support",
  "Marketing",
];

// Percent completion → display string.
export const formatRate = (rate) =>
  `${Math.round((Number(rate) || 0) * (rate <= 1 ? 100 : 1))}%`;

export const formatCount = (n) => (Number(n) || 0).toLocaleString();
