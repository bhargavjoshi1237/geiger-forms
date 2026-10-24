// Team side of the workspace: version history, response comments, the audit trail, access log, saved views,
// workspace settings, API keys, webhook deliveries and RBAC (public.roles + forms.role_grants) for Halcyon Studio.
import rbacConfig from "@/geiger-rbac.config";
import { PEOPLE, STUDIO, person } from "../cast.js";
import { FOLDERS, FORM_DEF, FORM_ID } from "./forms.js";
import { PROJECT_ID, between, daysAgo, minutesAgo, noise, pick, sid } from "./helpers.js";

const byForm = (rows, key) => rows.filter((r) => r.form_id === FORM_ID[key]);

// [form, version label, author n, notes, minutes ago, fields kept]; later versions keep more of the form.
const VERSIONS = [
  ["nps", "Initial version", 2, "NPS question and reason.", 132480, 2],
  ["nps", "Published", 1, "Added the follow-up for detractors and an optional email.", 131040, 4],
  ["nps", "Copy polish", 10, "Warmer wording for the Q4 send.", 4320, 4],
  ["requests", "Initial version", 6, "", 158400, 3],
  ["requests", "Published", 4, "Urgency scale for morning triage.", 156960, 4],
  ["requests", "Copy polish", 6, "Placeholder examples from real briefs.", 80640, 4],
  ["issues", "Initial version", 9, "", 172800, 5],
  ["issues", "Published", 9, "Severity scoring routes critical issues to the dev on call.", 171360, 7],
  ["issues", "Added Orbit microsite", 5, "New site in the dropdown.", 86400, 7],
  ["freelancers", "Initial version", 3, "", 100800, 4],
  ["freelancers", "Published", 3, "Portfolio review approval step.", 99360, 8],
  ["freelancers", "Discipline list", 7, "Added 3D & CGI.", 51840, 8],
  ["tickets", "Initial version", 11, "", 86400, 4],
  ["tickets", "Published", 11, "VIP tier and early-bird coupon.", 84960, 6],
  ["tickets", "Capacity cap", 4, "Limited to 60 registrations for the Pier 17 room.", 43200, 6],
  ["csat", "Initial version", 2, "", 144000, 2],
  ["csat", "Published", 2, "Anonymous responses.", 142560, 4],
  ["designer", "Initial version", 3, "", 57600, 6],
  ["designer", "Published", 3, "Salary and start date.", 56160, 10],
  ["designer", "Retention", 2, "Applications kept for 12 months.", 28800, 10],
  ["offsite", "Initial version", 2, "", 4320, 1],
  ["enquiry", "Initial version", 8, "", 11520, 6],
  ["webinar", "Initial version", 10, "", 216000, 4],
  ["webinar", "Published", 10, "Hotel picker for the regional teams.", 214560, 6],
  ["retro", "Initial version", 4, "", 43200, 4],
  ["summit", "Initial draft", 11, "About-you page and logistics.", 74880, 14],
  ["summit", "Tickets & payments", 4, "Ticket products, coupons and the order summary.", 70560, 22],
  ["summit", "Bookings, quiz & approvals", 11, "Portfolio reviews, agenda planning, warm-up quiz and a two-step approval chain.", 67680, 55],
  ["summit", "Published", 1, "Launched with the early-bird A/B test.", 66240, 55],
  ["summit", "Design refresh", 3, "Round corners, Halcyon coral accent, gradient background and the sunset cover.", 2880, 55],
];

function versions() {
  const counts = {};
  return VERSIONS.map(([key, label, author, notes, ago, kept], i) => {
    counts[key] = (counts[key] || 0) + 1;
    const def = FORM_DEF[key];
    return {
      id: sid("version", i + 1),
      form_id: FORM_ID[key],
      version: counts[key],
      label,
      author: person(author).name,
      notes,
      schema: { fields: def.fields.slice(0, kept) },
      settings: def.settings,
      created_at: minutesAgo(ago),
    };
  });
}

// [form, pick predicate, author n, body, mentioned n[]]
const COMMENT_THREADS = [
  ["nps", (r) => r.score <= 4, 2, "Called them — the timeline slip on the spring shoot is the real issue. Sending a recovery plan."],
  ["nps", (r) => r.score <= 4, 1, "Let's bring this one to Monday's client review. @Maya Chen can you prep the recovery plan?", [2]],
  ["nps", (r) => r.score >= 9, 10, "Asked if we can quote this on the website. They said yes!"],
  ["nps", (r) => r.score >= 9, 2, "Great signal for the retainer renewal next month."],
  ["requests", (r) => r.status === "In progress", 6, "Picked up — first concepts on Thursday."],
  ["requests", (r) => r.status === "Rejected", 4, "Out of scope for the retainer; sent them a separate quote."],
  ["requests", (r) => r.priority === "High", 5, "@Ava Johnson can you get the brand fonts from their team before we start?", [6]],
  ["requests", (r) => r.status === "Complete", 7, "Delivered all cut-downs. Shared in their Drive folder."],
  ["issues", (r) => r.answers["f-severity"] === "Critical", 9, "Reproduced on staging — hotfix going out tonight."],
  ["issues", (r) => r.status === "Rejected", 9, "Duplicate of an earlier report, merging."],
  ["issues", (r) => r.status === "Complete", 5, "Fixed in the last deploy; confirmed with the client."],
  ["issues", (r) => r.status === "In progress", 9, "Looks like a caching issue on the CDN. Investigating."],
  ["freelancers", (r) => r.status === "Approved", 3, "Gorgeous portfolio. Adding to the motion bench for Kestrel."],
  ["freelancers", (r) => r.status === "Pending", 7, "@Jonas Weber I've worked with them before — fast and reliable.", [3]],
  ["freelancers", (r) => r.status === "Rejected", 3, "Let's revisit in six months."],
  ["tickets", (r) => r.status === "Awaiting payment", 11, "Sent a payment reminder. @Hana Kim flagging it for the invoice run.", [12]],
  ["tickets", (r) => r.tags.includes("vip"), 11, "Seated in the front row with the Kestrel team."],
  ["csat", (r) => r.status === "Needs review", 2, "Shared with the producer for the project post-mortem."],
  ["designer", (r) => r.status === "In progress", 3, "Booked a portfolio walkthrough for next week."],
  ["designer", (r) => r.status === "Approved", 1, "Offer approved — Maya is sending the contract."],
  ["designer", (r) => r.status === "Needs review", 5, "Strong typography, light on motion. Worth a chat, @Alex Rivera?", [1]],
  ["summit", (r) => r.outcome === "Enterprise lead", 8, "Enterprise lead: 200+ seats across their marketing org. Booked a credentials meeting after the summit. @Alex Rivera worth a founder intro?", [1]],
  ["summit", (r) => r.tags.includes("vip"), 11, "VIP dinner confirmed, seated at the creative directors' table."],
  ["summit", (r) => r.payment_status === "paid", 12, "Invoice sent; PO number added to the order."],
  ["summit", (r) => Boolean(r.answers.accessibility), 11, "Asked for live captions — added to the accessibility checklist."],
  ["summit", (r) => r.status === "Rejected", 2, "Looks like a duplicate of their earlier registration; keeping the newer one."],
  ["summit", (r) => Boolean(r.answers.booking), 3, "Portfolio review booked — I'll take this one."],
];

function comments(responses) {
  const rows = [];
  COMMENT_THREADS.forEach(([key, match, author, body, mentioned = []], t) => {
    const candidates = byForm(responses, key).filter(match);
    // Two responses per thread, so the comment feed reads like an active team.
    for (const [k, r] of [pick(candidates, t * 3 + 1), pick(candidates, t * 3 + 2)].filter(Boolean).entries()) {
      if (rows.some((c) => c.response_id === r.id && c.body === body)) continue;
      const submittedAgo = (Date.now() - Date.parse(r.submitted_at)) / 60000;
      rows.push({
        id: sid("comment", rows.length + 1),
        response_id: r.id,
        author: person(author).name,
        author_id: person(author).id,
        mentions: mentioned.map((n) => person(n).id),
        body,
        created_at: minutesAgo(Math.max(3, submittedAgo - between(t * 5 + k, 20, 1200))),
      });
    }
  });
  return rows;
}

function activity(responses) {
  const rows = [];
  const add = (key, actor, action, detail, ago, responseId = null) =>
    rows.push({
      id: sid("activity", rows.length + 1),
      project_id: PROJECT_ID,
      form_id: key ? FORM_ID[key] : null,
      response_id: responseId,
      actor_id: actor ? person(actor).id : null,
      actor_name: actor ? person(actor).name : "System",
      action,
      detail: key ? { title: FORM_DEF[key].title, ...detail } : detail,
      created_at: minutesAgo(ago),
    });

  for (const key of Object.keys(FORM_ID)) {
    const def = FORM_DEF[key];
    add(key, def.owner, def.isTemplate ? "template.created" : "form.created", {}, def.created);
    if (def.published) add(key, def.owner === 11 ? 4 : def.owner, "form.published", {}, def.published);
  }
  add("webinar", 10, "form.archived", {}, 158400);
  add("summit", 4, "form.updated", { note: "Added tickets and coupons" }, 70560);
  add("summit", 11, "form.updated", { note: "Added booking, quiz and approvals" }, 67680);
  add("summit", 3, "form.updated", { note: "Design refresh: round corners, coral accent and gradient background" }, 2880);
  add("summit", 2, "form.shared", { email: person(12).email, role: "viewer" }, 64000);
  add("nps", 2, "form.invited", { count: 38, signed: false }, 130000);
  add("nps", 10, "form.updated", { note: "Copy polish for the Q4 send" }, 4320);
  add("tickets", 4, "form.updated", { note: "Capped at 60 registrations" }, 43200);
  add("designer", 2, "form.updated", { note: "Applications kept for 12 months" }, 28800);
  add("nps", 2, "responses.bulk_updated", { count: 12, tags: ["detractor"] }, 5760);
  add("issues", 9, "responses.bulk_updated", { count: 6, status: "Complete" }, 2880);
  add("requests", 6, "responses.exported", { count: 72, format: "csv" }, 10080);
  add("summit", 12, "responses.exported", { count: 61, format: "xlsx" }, 1500);
  add(null, 2, "apikey.created", { name: "Zapier — client NPS to Slack" }, 120000);
  add(null, 9, "apikey.created", { name: "Website contact form" }, 40000);
  add(null, 1, "settings.updated", { fields: ["folders", "brandAccent"] }, 90000);
  add(null, 1, "role.changed", { member: person(6).name, role: "Producer" }, 20160);
  add("csat", 2, "respondent.erased", { count: 1 }, 7200);

  // Recent inbox work: status changes, approvals, payments and automations on real responses.
  const recent = responses.filter((r) => (Date.now() - Date.parse(r.submitted_at)) / 60000 < 30 * 1440);
  recent.forEach((r, i) => {
    const key = Object.keys(FORM_ID).find((k) => FORM_ID[k] === r.form_id);
    const ago = (Date.now() - Date.parse(r.submitted_at)) / 60000;
    if (r.assignee_id) {
      const by = r.assignee_id === person(2).id ? 1 : 2;
      add(key, by, "response.assigned", { assignee: r.assignee, assigneeId: r.assignee_id }, Math.max(3, ago - between(i + 2, 5, 25)), r.id);
    }
    if (r.status === "In progress" || (r.assignee && noise(i + 0.3) < 0.25)) {
      const actor = PEOPLE.find((p) => p.name === r.assignee)?.n || 2;
      add(key, actor, "response.updated", { status: r.status }, Math.max(2, ago - between(i, 30, 600)), r.id);
    }
    for (const step of r.approval?.history || []) {
      const actor = PEOPLE.find((p) => p.name === step.by)?.n || 3;
      add(key, actor, step.decision === "approve" ? "response.approved" : "response.rejected", { step: step.stepName, final: step.decision === "reject" || step.stepIndex === (r.approval.history.length > 1 ? 1 : 0) && r.approval.state !== "pending" }, (Date.now() - Date.parse(step.at)) / 60000, r.id);
    }
    if (r.payment_status === "paid") add(key, null, "payment.paid", { amount: r.payment_amount, currency: r.payment_currency }, Math.max(1, ago - 1), r.id);
    if (key === "summit" && r.tags.length && !r.tags.includes("spam")) {
      const names = [r.tags.includes("vip") && "VIP routing", r.tags.includes("enterprise") && "Enterprise hand-off", r.tags.includes("online") && "Tag online attendees", r.tags.includes("speaker") && "Speaker materials"].filter(Boolean);
      add(key, null, "automation.ran", { automations: names }, Math.max(1, ago - 0.5), r.id);
    }
    if (r.metadata?.flowIssue) add(key, 8, "response.escalated", { issue: r.metadata.flowIssue }, Math.max(1, ago - 90), r.id);
  });
  return rows;
}

// Who opened, revealed, exported and printed which response.
function accessLog(responses) {
  const rows = [];
  const summit = byForm(responses, "summit");
  const sensitive = summit.filter((r) => r.answers.accessibility);
  const pool = [...summit.slice(0, 30), ...byForm(responses, "designer"), ...byForm(responses, "freelancers").slice(0, 12)];
  pool.forEach((r, i) => {
    const ago = (Date.now() - Date.parse(r.submitted_at)) / 60000;
    const actor = person(pick([2, 3, 4, 11, 12], i + 1));
    rows.push({ action: "view", r, actor, ago: Math.max(2, ago - between(i, 10, 900)) });
    if (noise(i + 0.4) < 0.15) rows.push({ action: "print", r, actor, ago: Math.max(1, ago - between(i + 1, 900, 2000)) });
  });
  sensitive.forEach((r, i) => {
    const ago = (Date.now() - Date.parse(r.submitted_at)) / 60000;
    rows.push({ action: "reveal", r, actor: person(11), ago: Math.max(1, ago - between(i + 3, 60, 600)), fieldId: "accessibility" });
  });
  rows.push({ action: "export", r: summit[0], actor: person(12), ago: 1500 });
  return rows.map(({ action, r, actor, ago, fieldId = null }, i) => ({
    id: sid("access", i + 1),
    form_id: r.form_id,
    response_id: r.id,
    actor_id: actor.id,
    actor_name: actor.name,
    action,
    field_id: fieldId,
    metadata: fieldId ? { fields: [fieldId] } : {},
    created_at: minutesAgo(ago),
  }));
}

function savedViews() {
  const view = (n, formKey, name, layout, filters, ago, owner) => ({
    id: sid("view", n),
    project_id: PROJECT_ID,
    form_id: formKey ? FORM_ID[formKey] : null,
    name,
    layout,
    filters,
    metadata: {},
    created_by: person(owner).id,
    created_at: minutesAgo(ago),
    updated_at: minutesAgo(ago),
    deleted_at: null,
  });
  return [
    view(1, "summit", "VIP guests", "table", { tag: "vip", sort: "newest" }, 57600, 11),
    view(2, "summit", "Approval queue", "kanban", { status: "Pending", sort: "oldest" }, 50400, 11),
    view(3, "summit", "Enterprise leads", "table", { outcome: "Enterprise lead", priority: "High", sort: "newest" }, 43200, 8),
    view(4, "requests", "Triage board", "kanban", { sort: "newest" }, 120000, 6),
    view(5, "issues", "Critical bugs", "table", { priority: "High", sort: "newest" }, 90000, 9),
    view(6, null, "Needs review", "table", { status: "Needs review", sort: "oldest" }, 100000, 2),
    view(7, null, "High priority", "kanban", { priority: "High", sort: "newest" }, 80000, 1),
  ];
}

function workspaceSettings() {
  return [
    {
      id: sid("settings", 1),
      project_id: PROJECT_ID,
      settings: {
        workspaceName: STUDIO.name,
        defaultStatus: "Draft",
        timezone: "Europe/Lisbon",
        locale: "en",
        folders: FOLDERS,
        notifyOnSubmit: true,
        digestEmails: [person(1).email, person(2).email],
        brandAccent: STUDIO.brandColor,
        brandLogoUrl: "",
        hideBranding: false,
        defaultRetentionDays: "730",
        requireCaptcha: false,
        anonymiseByDefault: false,
        allowedEmbedDomains: [STUDIO.domain, "kestrelbikes.example", "atlascoffee.example"],
        savedThemes: [
          {
            id: sid("settings", 101),
            name: "Halcyon — Dusk",
            createdAt: daysAgo(96),
            theme: { mode: "dark", accent: STUDIO.brandColor, radius: "full", font: "dm-sans", headingFont: "fraunces", background: "gradient" },
            coverStyle: "cover",
            coverGradient: "dusk",
          },
          {
            id: sid("settings", 102),
            name: "Halcyon — Paper",
            createdAt: daysAgo(41),
            theme: { mode: "light", accent: STUDIO.brandColor, radius: "lg", font: "dm-sans", headingFont: "fraunces", background: "plain" },
          },
        ],
      },
      metadata: {},
      created_by: person(1).id,
      created_at: daysAgo(130),
      updated_at: daysAgo(62),
      deleted_at: null,
    },
  ];
}

function apiKeys() {
  const key = (n, name, prefix, scopes, created, used, owner, deleted = null) => ({
    id: sid("apiKey", n),
    project_id: PROJECT_ID,
    name,
    key_prefix: prefix,
    key_hash: `playground-${n}`,
    scopes,
    last_used_at: used == null ? null : minutesAgo(used),
    metadata: {},
    created_by: person(owner).id,
    created_at: minutesAgo(created),
    updated_at: minutesAgo(used ?? created),
    deleted_at: deleted,
  });
  return [
    key(1, "Zapier — client NPS to Slack", "gf_3a9c1e", ["read"], 120000, 14, 2),
    key(2, "Website contact form", "gf_77d02b", ["read", "write"], 40000, 180, 9),
    key(3, "Data warehouse sync", "gf_c41f8a", ["read"], 200000, 1440, 9),
    key(4, "Old agency CMS", "gf_09be34", ["read"], 300000, 210000, 9, daysAgo(140)),
  ];
}

function webhookDeliveries(responses) {
  const rows = [];
  const send = (key, hook, list, events) =>
    list.forEach((r, i) => {
      const n = rows.length;
      const ago = Math.max(1, (Date.now() - Date.parse(r.submitted_at)) / 60000 - 0.2);
      const code = pick([500, 502, 408], n);
      const attempt = (k, status, minutesLater) => ({ n: k, at: minutesAgo(ago - minutesLater), status, error: status === 200 ? null : `HTTP ${status}`, ms: between(n + k, 90, 900) });
      // Flaky deliveries recover on the second attempt, except recent ones still waiting for their next retry.
      const flaky = noise(n + 0.6) < 0.08;
      const retrying = flaky && ago < 120;
      const attempts = !flaky ? [attempt(1, 200, 0)] : retrying ? [attempt(1, code, 0), attempt(2, code, 0.04), attempt(3, code, 0.2)] : [attempt(1, code, 0), attempt(2, 200, 0.04)];
      const last = attempts.at(-1);
      rows.push({
        id: sid("delivery", n + 1),
        form_id: FORM_ID[key],
        response_id: r.id,
        webhook_id: hook.id,
        url: hook.url,
        event: events[i % events.length],
        payload: null,
        status_code: last.status,
        ok: last.status === 200,
        error: last.error,
        state: retrying ? "retrying" : "delivered",
        attempt_count: attempts.length,
        attempts,
        next_retry_at: retrying ? minutesAgo(ago - 5.2) : null,
        alerted_at: null,
        created_at: minutesAgo(ago),
      });
    });
  send("summit", FORM_DEF.summit.settings.webhooks[0], byForm(responses, "summit").slice(0, 40), ["response.created", "response.approved"]);
  send("nps", FORM_DEF.nps.settings.webhooks[0], byForm(responses, "nps").slice(0, 30), ["response.created"]);
  return rows;
}

// System roles straight from geiger-rbac.config.js, plus one custom studio role.
function roles() {
  const system = rbacConfig.systemRoles.map((role, i) => ({
    id: sid("role", i + 1),
    project_id: PROJECT_ID,
    key: role.key,
    name: role.name,
    description: role.description,
    color: role.color,
    permissions: [...role.permissions],
    is_system: true,
    sort: role.sort,
    metadata: { key: role.key },
    created_by: person(1).id,
    created_at: daysAgo(130),
    updated_at: daysAgo(130),
    deleted_at: null,
  }));
  const member = rbacConfig.systemRoles.find((r) => r.key === "member");
  system.push({
    id: sid("role", system.length + 1),
    project_id: PROJECT_ID,
    key: "producer",
    name: "Producer",
    description: "Members who also publish forms and export responses for clients.",
    color: "emerald",
    permissions: [...member.permissions, "forms.form.publish", "forms.response.delete"],
    is_system: false,
    sort: system.length,
    metadata: {},
    created_by: person(2).id,
    created_at: daysAgo(40),
    updated_at: daysAgo(14),
    deleted_at: null,
  });
  return system;
}

function roleGrants(roleRows) {
  const roleId = (key) => roleRows.find((r) => r.key === key).id;
  return PEOPLE.map((p, i) => ({
    id: sid("grant", i + 1),
    project_id: PROJECT_ID,
    user_id: p.id,
    role_id: roleId(p.n === 6 ? "producer" : p.role),
    scope: {},
    status: "active",
    metadata: {},
    granted_by: p.n === 1 ? null : person(1).id,
    created_at: daysAgo(130 - i * 6),
    updated_at: daysAgo(Math.max(1, 120 - i * 6)),
    deleted_at: null,
  }));
}

export function collaborationSeed({ responses }) {
  const roleRows = roles();
  return {
    versions: versions(),
    comments: comments(responses),
    activity: activity(responses),
    access_log: accessLog(responses),
    saved_views: savedViews(),
    workspace_settings: workspaceSettings(),
    api_keys: apiKeys(),
    webhook_deliveries: webhookDeliveries(responses),
    roles: roleRows,
    role_grants: roleGrants(roleRows),
  };
}
