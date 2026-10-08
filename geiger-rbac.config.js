import { defineRbacConfig, defineRole } from "@geiger/rbac";

export function navSlug(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function navPermissionKey(title) {
  return `forms.${navSlug(title)}.view`;
}

// Workspace views that carry their own view permission. Plain strings are legacy ids whose key is derived
// from the id; [id, label] pairs are dedicated catalog screens. Per-feature hub pages stay ungated (they only
// deep-link into the form editor, which is gated by forms.form.edit).
const NAV_SECTIONS = [
  "Overview",
  "Forms",
  "Responses",
  "Analytics",
  "Templates",
  "Folders",
  "Shared",
  "Archived",
  "Settings",
  ["analytics.dropoff", "Funnel & Drop-off"],
  ["analytics.attribution", "Source & Attribution"],
  ["analytics.abtest", "A/B Testing"],
  ["analytics.reports", "Reports"],
  ["responses.partial", "Partial / Abandoned"],
  ["responses.retention", "Retention & GDPR"],
  ["collab.roles", "Roles & Permissions"],
  ["collab.comments", "Response Comments"],
  ["collab.activity", "Activity & Audit"],
  ["security.spam", "Spam & Abuse"],
  ["security.gdpr", "Data Protection & GDPR"],
  ["security.access", "Access Control"],
  ["security.hipaa", "HIPAA & Certifications"],
  ["integ.api", "REST / API"],
  ["integ.webhooks", "Webhooks"],
  ["dev.hooks", "Hooks & Events"],
  ["dev.headless", "Headless / API-first"],
  ["dev.frontend", "Data Front-end"],
];

const navPermissions = NAV_SECTIONS.map((entry) => {
  const [id, label] = Array.isArray(entry) ? entry : [entry, entry];
  return { key: navPermissionKey(id), label, group: "Workspace views" };
});

const operationPermissions = [
  {
    key: "forms.form.edit",
    label: "Edit a form",
    group: "Forms",
    scopeBy: "form",
  },
  {
    key: "forms.form.publish",
    label: "Publish a form",
    group: "Forms",
    scopeBy: "form",
  },
  {
    key: "forms.form.delete",
    label: "Delete a form",
    group: "Forms",
    scopeBy: "form",
  },
  {
    key: "forms.response.export",
    label: "Export responses",
    group: "Responses",
    scopeBy: "form",
  },
  {
    key: "forms.response.delete",
    label: "Delete responses",
    group: "Responses",
    scopeBy: "form",
  },
  {
    key: "forms.team.invite",
    label: "Invite Members",
    group: "Team Control",
  },
  {
    key: "forms.team.assign",
    label: "Assign roles",
    group: "Team Control",
  },
  {
    key: "forms.role.manage",
    label: "Create and edit roles",
    group: "Team Control",
  },
  {
    key: "forms.billing.manage",
    label: "Manage billing",
    group: "Administration",
  },
  {
    key: "forms.settings.manage",
    label: "Manage settings",
    group: "Administration",
  },
];

const permissions = [...navPermissions, ...operationPermissions];

const uniquePermissions = Array.from(
  new Map(permissions.map((p) => [p.key, p])).values(),
);

const viewKeys = uniquePermissions
  .filter((p) => p.key.endsWith(".view"))
  .map((p) => p.key);

const systemRoles = [
  defineRole({
    key: "owner",
    name: "Owner",
    description: "Full access to everything, including billing.",
    color: "violet",
    permissions: ["*"],
    sort: 0,
  }),
  defineRole({
    key: "admin",
    name: "Admin",
    description: "Manage the workspace, team and roles — no billing control.",
    color: "blue",
    permissions: [
      ...viewKeys,
      "forms.form.edit",
      "forms.form.publish",
      "forms.form.delete",
      "forms.response.export",
      "forms.response.delete",
      "forms.team.invite",
      "forms.team.assign",
      "forms.role.manage",
      "forms.settings.manage",
    ],
    sort: 1,
  }),
  defineRole({
    key: "manager",
    name: "Manager",
    description: "Run forms and invite teammates; can't edit roles or billing.",
    color: "emerald",
    permissions: [
      ...viewKeys,
      "forms.form.edit",
      "forms.form.publish",
      "forms.response.export",
      "forms.team.invite",
      "forms.team.assign",
    ],
    sort: 2,
  }),
  defineRole({
    key: "member",
    name: "Member",
    description: "Day-to-day operational access to the workspace.",
    color: "amber",
    permissions: [
      "forms.overview.view",
      "forms.forms.view",
      "forms.responses.view",
      "forms.analytics.view",
      "forms.templates.view",
      "forms.folders.view",
      "forms.shared.view",
      "forms.archived.view",
      "forms.analytics_dropoff.view",
      "forms.analytics_attribution.view",
      "forms.analytics_abtest.view",
      "forms.analytics_reports.view",
      "forms.responses_partial.view",
      "forms.collab_comments.view",
      "forms.collab_activity.view",
      "forms.form.edit",
      "forms.response.export",
    ],
    sort: 3,
  }),
  defineRole({
    key: "viewer",
    name: "Viewer",
    description: "Read-only access to the overview and reports.",
    color: "slate",
    permissions: [
      "forms.overview.view",
      "forms.analytics.view",
      "forms.analytics_dropoff.view",
      "forms.analytics_attribution.view",
      "forms.analytics_abtest.view",
      "forms.analytics_reports.view",
    ],
    sort: 4,
  }),
];

export default defineRbacConfig({
  product: "forms",
  permissions: uniquePermissions,
  systemRoles,
});
