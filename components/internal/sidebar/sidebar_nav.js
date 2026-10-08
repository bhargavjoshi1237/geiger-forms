import {
  Activity,
  Archive,
  Ban,
  BarChart3,
  Blocks,
  BookTemplate,
  Bot,
  Braces,
  Code2,
  Database,
  FileLock2,
  FileText,
  FileWarning,
  Filter,
  Fingerprint,
  Folder,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  LineChart,
  Lock,
  Mailbox,
  MessagesSquare,
  MousePointerClick,
  PieChart,
  PlugZap,
  RefreshCw,
  Route,
  Settings,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Sigma,
  Sparkles,
  SquarePen,
  SquareStack,
  Table,
  Terminal,
  UserPlus,
  Users,
  Wand2,
  Webhook,
} from "lucide-react";

// Workspace sidebar: leaf nodes (`id`) navigate, groups (`children`) expand; per-form settings live in the form editor, not here.
export const formNav = [
  { id: "Overview", title: "Overview", Icon: LayoutDashboard },

  {
    group: "Form Builder",
    Icon: SquarePen,
    children: [
      { id: "Forms", title: "All Forms", Icon: FileText },
      { id: "builder.versions", title: "Version History", Icon: History },
    ],
  },
  {
    group: "Responses",
    Icon: Inbox,
    children: [
      { id: "Responses", title: "Response Inbox", Icon: Mailbox },
      { id: "responses.tables", title: "Data Tables & Views", Icon: Table },
      { id: "responses.bulk", title: "Bulk Actions", Icon: SquareStack },
      { id: "responses.partial", title: "Partial / Abandoned", Icon: FileWarning },
      { id: "responses.export", title: "Export & Sync", Icon: RefreshCw },
      { id: "responses.retention", title: "Retention & GDPR", Icon: ShieldAlert },
    ],
  },
  {
    group: "Analytics",
    Icon: BarChart3,
    children: [
      { id: "Analytics", title: "Dashboard", Icon: LayoutDashboard },
      { id: "analytics.dropoff", title: "Funnel & Drop-off", Icon: Filter },
      { id: "analytics.attribution", title: "Source & Attribution", Icon: Route },
      { id: "analytics.abtest", title: "A/B Testing", Icon: Sigma },
      { id: "analytics.reports", title: "Reports", Icon: LineChart },
      { id: "survey.reporting", title: "Survey Reporting", Icon: PieChart },
    ],
  },
  {
    group: "AI",
    Icon: Sparkles,
    children: [
      { id: "ai.generate", title: "AI Form Generation", Icon: Wand2 },
      { id: "ai.analysis", title: "AI Response Analysis", Icon: Bot },
      { id: "ai.assist", title: "AI Fill Assist", Icon: Sparkles },
      { id: "ai.moderation", title: "AI Moderation", Icon: Ban },
    ],
  },
  {
    group: "Integrations",
    Icon: PlugZap,
    children: [
      { id: "integ.webhooks", title: "Webhooks", Icon: Webhook },
      { id: "integ.api", title: "REST / API", Icon: Braces },
    ],
  },
  {
    group: "Collaboration",
    Icon: Users,
    children: [
      { id: "Shared", title: "Team & Sharing", Icon: UserPlus },
      { id: "collab.roles", title: "Roles & Permissions", Icon: KeyRound },
      { id: "collab.realtime", title: "Real-time Co-editing", Icon: MousePointerClick },
      { id: "collab.comments", title: "Response Comments", Icon: MessagesSquare },
      { id: "collab.activity", title: "Activity & Audit", Icon: Activity },
    ],
  },
  {
    group: "Security & Compliance",
    Icon: ShieldCheck,
    children: [
      { id: "security.spam", title: "Spam & Abuse", Icon: ShieldBan },
      { id: "security.gdpr", title: "Data Protection & GDPR", Icon: Lock },
      { id: "security.access", title: "Access Control (SSO/RBAC)", Icon: Fingerprint },
      { id: "security.hipaa", title: "HIPAA & Certifications", Icon: FileLock2 },
    ],
  },
  {
    group: "Templates & Admin",
    Icon: BookTemplate,
    children: [
      { id: "Templates", title: "Template Gallery", Icon: LayoutTemplate },
      { id: "Folders", title: "Folders", Icon: Folder },
      { id: "Archived", title: "Archived", Icon: Archive },
      { id: "Settings", title: "Workspace Settings", Icon: Settings },
    ],
  },
  {
    group: "Developer",
    Icon: Code2,
    children: [
      { id: "dev.hooks", title: "Hooks & Events", Icon: Blocks },
      { id: "dev.headless", title: "Headless / API-first", Icon: Terminal },
      { id: "dev.frontend", title: "Data Front-end", Icon: Database },
    ],
  },
];

// AI views ship with the suite's shared @geiger/ai package; until then they render ComingSoonScreen.
export const AI_VIEWS = new Set(["ai.generate", "ai.analysis", "ai.assist", "ai.moderation"]);

// Every other nav id resolves to a real screen.
export const BUILT_VIEWS = new Set(
  formNav.flatMap((node) => (node.children ? node.children.map((child) => child.id) : [node.id])).filter((id) => !AI_VIEWS.has(id)),
);

// Flat lookup: view id -> { title, group } for routing/placeholder headers.
const NAV_INDEX = (() => {
  const index = {};
  for (const node of formNav) {
    if (node.children) {
      for (const child of node.children) {
        index[child.id] = { title: child.title, group: node.group };
      }
    } else {
      index[node.id] = { title: node.title, group: null };
    }
  }
  return index;
})();

export function navItemById(id) {
  return NAV_INDEX[id] || null;
}

export function isBuiltView(id) {
  return BUILT_VIEWS.has(id);
}

// Group title that contains a given view id (so the sidebar auto-expands it).
export function groupForView(id) {
  const entry = NAV_INDEX[id];
  return entry ? entry.group : null;
}
