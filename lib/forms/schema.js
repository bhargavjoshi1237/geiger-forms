// Form model: canonical field shape, settings defaults, row normalisation and slugs.
// Logic (visibility, validation, scoring, formulas) lives in ./logic and is re-exported here.
export {
  isFieldVisible,
  evaluateFormula,
  validateAnswers,
  scoreResponse,
  labelAnswers,
  detectRespondent,
} from "./logic";

export const FORM_STATUSES = ["Draft", "Published", "Archived"];

export const RESPONSE_STATUSES = ["Complete", "Needs review", "Pending", "In progress", "Approved", "Rejected", "Awaiting payment", "Spam"];

export const RESPONSE_PRIORITIES = ["High", "Medium", "Low"];

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function makeFieldId(prefix = "field") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// Canonical field. Type-specific options live in `config`, input rules in `validation`.
export function toCanonicalField(field) {
  const isFile = field.type === "file";
  return {
    id: field.id,
    type: field.type || "text",
    title: field.title || "Field",
    // firstValue/secondValue are the legacy builder aliases and win when present.
    label: field.firstValue ?? field.label ?? field.title ?? "",
    placeholder: isFile ? "" : field.secondValue ?? field.placeholder ?? "",
    hint: isFile ? field.secondValue ?? field.hint ?? "" : field.hint ?? "",
    info: typeof field.info === "string" ? field.info : field.info ? field.hint || "" : "",
    required: Boolean(field.required),
    options: Array.isArray(field.options) ? field.options.filter((o) => o !== "" && o != null) : [],
    optionPoints: field.optionPoints && typeof field.optionPoints === "object" ? field.optionPoints : undefined,
    correctAnswer: field.correctAnswer ?? undefined,
    formula: field.formula ?? "",
    conditions: Array.isArray(field.conditions) ? field.conditions : [],
    conditionLogic: field.conditionLogic === "all" ? "all" : "any",
    included: field.included !== false,
    width: ["half", "third"].includes(field.width) ? field.width : "full",
    defaultValue: field.defaultValue ?? undefined,
    prefillKey: field.prefillKey || undefined,
    readOnly: Boolean(field.readOnly),
    sensitive: Boolean(field.sensitive),
    validation: field.validation && typeof field.validation === "object" ? field.validation : undefined,
    config: field.config && typeof field.config === "object" ? field.config : undefined,
  };
}

export function blankFormDoc(slug, title) {
  return {
    slug,
    title: title || titleFromSlug(slug) || "Untitled form",
    description: "",
    status: "Draft",
    category: null,
    tags: [],
    schema: { fields: [] },
    fieldDefs: [],
    settings: defaultSettings(),
    responses: 0,
    response_count: 0,
  };
}

// Every per-form setting with its default. Nested objects are merged one level deep in normalizeSettings.
export function defaultSettings() {
  return {
    // Design
    coverStyle: "none",
    coverUrl: "",
    showIcon: false,
    logoUrl: "",
    branding: true,
    theme: { mode: "dark", accent: "", radius: "md", font: "sans", background: "plain" },
    layout: "classic",
    progressBar: true,
    locale: "en",
    welcome: { enabled: false, title: "", body: "", buttonLabel: "Start" },

    // Submission
    submitAnother: false,
    steps: [],
    openDate: "",
    closeDate: "",
    closedMessage: "",
    responseLimit: "",
    showResponseLimit: false,
    thankYouType: "message",
    thankYouTitle: "Response submitted",
    thankYouText: "Thanks for submitting. We'll review and follow up soon.",
    thankYouUrl: "",
    showScore: false,
    saveResume: false,
    offline: true,

    // Notifications
    confirmEmail: false,
    confirmSubject: "Thank you for your submission",
    confirmBody: "We've received your response and will be in touch shortly.",
    notifyEmails: [],
    notifyFlow: false,
    followUps: [],
    reportEmails: [],

    // Access & security
    access: { mode: "public", orgDomain: "", passwordHash: "", passwordSalt: "", onePerUser: false },
    accessRestricted: false,
    orgDomain: "",
    spam: { honeypot: true, captcha: false, rateLimit: 20 },
    anonymous: false,
    retentionDays: "",
    minReviewSeconds: "",
    duplicates: { enabled: false, fieldIds: [], windowDays: 30, action: "flag" },
    prefillEnabled: false,
    prefill: { url: true, user: false },
    editWindow: "disabled",
    allowDelegate: false,
    attestation: { enabled: false, statement: "I confirm the information I've provided is accurate and complete." },
    policy: { enabled: false, title: "", body: "", url: "", requireScroll: true, requireName: true },

    // Logic & scoring
    scoringEnabled: false,
    highThreshold: 80,
    mediumThreshold: 40,
    branchingEnabled: false,
    branches: [],
    quiz: { enabled: false, passMark: 70, showAnswers: false },
    showPollResults: false,
    abTest: { enabled: false, variants: [] },

    // Workflow
    approval: { enabled: false, steps: [] },
    automations: [],
    flow: { escalate: false, when: "high", outcome: "", labels: ["form"] },
    assets: { sync: false },
    documentTemplate: { enabled: false, title: "", body: "" },

    // Payments
    payments: { enabled: false, currency: "usd", mode: "payment", interval: "month", coupons: [] },

    // Integrations
    webhooks: [],
    slackWebhookUrl: "",

    // Workspace-only
    sharing: [],
    template: null,
  };
}

const NESTED_SETTINGS = [
  "theme", "welcome", "access", "spam", "duplicates", "prefill", "attestation", "policy",
  "quiz", "abTest", "approval", "flow", "assets", "documentTemplate", "payments",
];

// Defaults ⊕ stored settings, merging the nested groups one level deep and lifting legacy keys.
export function normalizeSettings(stored) {
  const base = defaultSettings();
  const raw = stored && typeof stored === "object" ? stored : {};
  const out = { ...base, ...raw };
  for (const key of NESTED_SETTINGS) {
    out[key] = { ...base[key], ...(raw[key] && typeof raw[key] === "object" ? raw[key] : {}) };
  }
  if (raw.accessRestricted && raw.orgDomain && !raw.access) {
    out.access = { ...out.access, mode: "domain", orgDomain: raw.orgDomain };
  }
  if (raw.prefillEnabled && !raw.prefill) out.prefill = { ...out.prefill, url: true };
  return out;
}

export function normalizeForm(row) {
  if (!row) return null;
  const fields = Array.isArray(row.schema?.fields) ? row.schema.fields : [];
  const included = fields.filter((f) => f.included !== false && !["page", "heading", "content"].includes(f.type));
  return {
    id: row.id,
    slug: row.slug,
    name: row.title,
    title: row.title,
    description: row.description || "",
    status: row.status || "Draft",
    category: row.category || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    isTemplate: Boolean(row.is_template),
    fields: included.length,
    fieldDefs: fields,
    settings: normalizeSettings(row.settings),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    responses: row.response_count ?? 0,
    rate: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    deletedAt: row.deleted_at ?? null,
    lastEdited: relativeTime(row.updated_at),
  };
}

// Settings safe to send to respondents: strips secrets, approver lists, coupon codes and workspace data.
export function publicSettings(settings) {
  const s = normalizeSettings(settings);
  return {
    ...s,
    access: { mode: s.access.mode, orgDomain: s.access.mode === "domain" ? s.access.orgDomain : "", onePerUser: s.access.onePerUser },
    payments: { ...s.payments, coupons: [], hasCoupons: (s.payments.coupons || []).some((c) => c.active !== false) },
    notifyEmails: [],
    followUps: [],
    reportEmails: [],
    webhooks: [],
    slackWebhookUrl: "",
    automations: [],
    approval: { enabled: s.approval.enabled, steps: [] },
    flow: { escalate: false },
    documentTemplate: { enabled: false },
    sharing: [],
    duplicates: { enabled: s.duplicates.enabled },
    passwordHash: undefined,
  };
}

export function relativeTime(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Edit-window setting → milliseconds (null = never expires, 0 = disabled).
export function editWindowMs(value) {
  const map = { disabled: 0, "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000, always: null };
  return value in map ? map[value] : 0;
}
