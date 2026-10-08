// Lookups & formatters for the Forms area. Config only — never row data.

// status → StatusPill meta. Colors are Badge variants from @geiger/ui;
// StatusPill also honors dot/dotClass for custom dots.
export const FORM_STATUS_MAP = {
  Published: {
    label: "Published",
    variant: "success",
    dotClass: "bg-emerald-400",
  },
  Draft: {
    label: "Draft",
    variant: "neutral",
    dotClass: "bg-text-tertiary",
  },
  Archived: {
    label: "Archived",
    variant: "outline",
    dotClass: "bg-muted-foreground",
  },
};

export const STATUS_FILTER_OPTIONS = [
  { value: "Active", label: "Active forms" },
  { value: "All", label: "All statuses" },
  { value: "Published", label: "Published" },
  { value: "Draft", label: "Draft" },
  { value: "Archived", label: "Archived" },
];

// Percent completion → display string.
export const formatRate = (rate) =>
  `${Math.round((Number(rate) || 0) * (rate <= 1 ? 100 : 1))}%`;

export const formatCount = (n) => (Number(n) || 0).toLocaleString();

export const LOCALES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "ar", label: "العربية (Arabic)", rtl: true },
];

export const CURRENCIES = ["usd", "eur", "gbp", "inr", "cad", "aud", "jpy", "chf", "sgd", "brl"];

export const EDIT_WINDOWS = [
  { value: "disabled", label: "Off" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "always", label: "Always" },
];

export const ACCESS_MODES = [
  { value: "public", label: "Anyone with the link", hint: "No sign-in required." },
  { value: "password", label: "Password", hint: "Respondents enter a shared password." },
  { value: "login", label: "Signed-in users", hint: "Respondents sign in with their suite account." },
  { value: "domain", label: "Organisation domain", hint: "Only signed-in users with an email on your domain." },
  { value: "signed", label: "Signed links only", hint: "Only personal links generated from Share work." },
];

export const SHARE_ROLES = [
  { value: "viewer", label: "Can view" },
  { value: "editor", label: "Can edit" },
  { value: "admin", label: "Admin" },
];

export const WEBHOOK_EVENTS = [
  { value: "response.created", label: "Response created" },
  { value: "response.updated", label: "Response updated" },
  { value: "response.approved", label: "Response approved" },
];

export const AUTOMATION_ACTIONS = [
  { value: "set_status", label: "Set status", input: "status" },
  { value: "set_priority", label: "Set priority", input: "priority" },
  { value: "add_tag", label: "Add tag", input: "text", placeholder: "vip" },
  { value: "assign", label: "Assign to", input: "text", placeholder: "teammate@company.com" },
  { value: "email", label: "Send email to", input: "text", placeholder: "ops@company.com" },
  { value: "flow_issue", label: "Create Geiger Flow issue", input: "none" },
  { value: "webhook", label: "Call webhook URL", input: "text", placeholder: "https://…" },
];
