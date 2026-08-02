import {
  Activity,
  ArrowRightLeft,
  Archive,
  Ban,
  BadgeCheck,
  BarChart3,
  Bell,
  BellRing,
  Blocks,
  BookTemplate,
  Bot,
  Boxes,
  Braces,
  Cable,
  Calculator,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  Code,
  Code2,
  Coins,
  Columns3,
  Contact,
  CreditCard,
  Database,
  Download,
  Droplets,
  Eye,
  FileCheck,
  FileLock2,
  FileOutput,
  FileStack,
  FileText,
  FileType2,
  FileWarning,
  Files,
  Filter,
  Fingerprint,
  Flag,
  Folder,
  Gauge,
  GitBranch,
  GitFork,
  Globe,
  GraduationCap,
  Hash,
  History,
  Inbox,
  KeyRound,
  Languages,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  LineChart,
  ListChecks,
  ListTodo,
  Lock,
  Mail,
  Mailbox,
  MailCheck,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  MousePointer2,
  MousePointerClick,
  Package,
  Paintbrush,
  Palette,
  PenLine,
  PieChart,
  PlugZap,
  Puzzle,
  QrCode,
  Radio,
  ReceiptText,
  RefreshCw,
  Route,
  Rows3,
  Save,
  Send,
  Settings,
  Share2,
  Sheet,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  ShoppingCart,
  Sigma,
  Signature,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  SquareStack,
  Stamp,
  Star,
  Table,
  Target,
  Terminal,
  TicketPercent,
  ToggleLeft,
  Type,
  Upload,
  UserCog,
  UserPlus,
  Users,
  Vote,
  Wallet,
  Wand2,
  Webhook,
  Workflow,
} from "lucide-react";

// Sidebar information architecture: a full mirror of the feature catalog.
// A node is a LEAF (has `id`, navigates) or a GROUP (has `children`, expands).
// Every node — group AND sub-item — carries its own icon (matches Geiger Events).
// `id`s in BUILT_VIEWS resolve to a real screen; the rest render ComingSoonScreen.
export const formNav = [
  { id: "Overview", title: "Overview", Icon: LayoutDashboard },

  {
    group: "Form Builder",
    Icon: SquarePen,
    children: [
      { id: "Forms", title: "All Forms", Icon: FileText },
      { id: "builder.canvas", title: "Drag & Drop Canvas", Icon: MousePointer2 },
      { id: "builder.layout", title: "Layout & Columns", Icon: Columns3 },
      { id: "builder.fieldConfig", title: "Field Configuration", Icon: SlidersHorizontal },
      { id: "builder.preview", title: "Preview & Test", Icon: Eye },
      { id: "builder.versions", title: "Version History", Icon: History },
    ],
  },
  {
    group: "Field Types",
    Icon: Type,
    children: [
      { id: "fields.text", title: "Text, Email & Phone", Icon: Type },
      { id: "fields.number", title: "Number & Currency", Icon: Hash },
      { id: "fields.choice", title: "Choice (Select/Radio/Check)", Icon: ListChecks },
      { id: "fields.datetime", title: "Date & Time", Icon: Calendar },
      { id: "fields.rating", title: "Rating, Scale & Matrix", Icon: Star },
      { id: "fields.file", title: "File Upload", Icon: Upload },
      { id: "fields.composite", title: "Name & Address", Icon: MapPin },
      { id: "fields.calculated", title: "Calculated & Hidden", Icon: Calculator },
      { id: "fields.repeating", title: "Repeating Groups", Icon: Rows3 },
      { id: "fields.product", title: "Product & Quantity", Icon: Package },
    ],
  },
  {
    group: "Logic & Scoring",
    Icon: GitBranch,
    children: [
      { id: "logic.visibility", title: "Conditional Visibility", Icon: ToggleLeft },
      { id: "logic.branching", title: "Skip / Branch Logic", Icon: GitFork },
      { id: "logic.calculations", title: "Calculations", Icon: Sigma },
      { id: "logic.scoring", title: "Scoring & Outcomes", Icon: Target },
      { id: "logic.personalization", title: "Personalization", Icon: UserCog },
      { id: "logic.validation", title: "Validation Rules", Icon: CheckCheck },
    ],
  },
  {
    group: "Multi-page & Flow",
    Icon: Layers,
    children: [
      { id: "flow.pages", title: "Multi-step Pages", Icon: Files },
      { id: "flow.progress", title: "Progress Indicator", Icon: Gauge },
      { id: "flow.saveResume", title: "Save & Resume", Icon: Save },
      { id: "flow.conversational", title: "Conversational Mode", Icon: MessageCircle },
      { id: "flow.submission", title: "Submission Rules", Icon: Send },
    ],
  },
  {
    group: "Design & Theming",
    Icon: Palette,
    children: [
      { id: "design.themes", title: "Themes & Colors", Icon: Paintbrush },
      { id: "design.layout", title: "Layout Modes", Icon: LayoutGrid },
      { id: "design.screens", title: "Welcome & Ending Screens", Icon: Flag },
      { id: "design.branding", title: "Branding & White-label", Icon: Stamp },
      { id: "design.localization", title: "Localization", Icon: Languages },
    ],
  },
  {
    group: "Payments",
    Icon: CreditCard,
    children: [
      { id: "pay.gateways", title: "Gateways (Stripe/PayPal)", Icon: Wallet },
      { id: "pay.types", title: "Payment Types", Icon: Coins },
      { id: "pay.order", title: "Order Builder", Icon: ShoppingCart },
      { id: "pay.coupons", title: "Coupons & Discounts", Icon: TicketPercent },
      { id: "pay.receipts", title: "Receipts & Invoices", Icon: ReceiptText },
    ],
  },
  {
    group: "Surveys & Quiz",
    Icon: ClipboardList,
    children: [
      { id: "survey.fields", title: "Survey Fields", Icon: ClipboardCheck },
      { id: "survey.quiz", title: "Quiz Engine", Icon: GraduationCap },
      { id: "survey.nps", title: "NPS & CSAT", Icon: Gauge },
      { id: "survey.reporting", title: "Survey Reporting", Icon: PieChart },
      { id: "survey.polls", title: "Polls", Icon: Vote },
    ],
  },
  {
    group: "E-Signature",
    Icon: Signature,
    children: [
      { id: "sign.capture", title: "Signature Capture", Icon: PenLine },
      { id: "sign.send", title: "Send for Signing", Icon: MailCheck },
      { id: "sign.audit", title: "Signed PDF & Audit Trail", Icon: FileCheck },
    ],
  },
  {
    group: "Workflow & Approvals",
    Icon: Workflow,
    children: [
      { id: "workflow.approvals", title: "Approval Routing", Icon: ClipboardCheck },
      { id: "workflow.tasks", title: "Task & Assignment", Icon: ListTodo },
      { id: "workflow.triggers", title: "Automation Triggers", Icon: Sparkles },
      { id: "workflow.flow", title: "Route to Geiger Flow", Icon: ArrowRightLeft },
    ],
  },
  {
    group: "PDF & Docs",
    Icon: FileOutput,
    children: [
      { id: "pdf.response", title: "Response → PDF", Icon: FileType2 },
      { id: "pdf.templates", title: "Document Templates", Icon: FileStack },
      { id: "pdf.bulk", title: "Bulk Export", Icon: Download },
    ],
  },
  {
    group: "Scheduling",
    Icon: CalendarClock,
    children: [
      { id: "schedule.booking", title: "Booking & Slots", Icon: CalendarDays },
      { id: "schedule.appointments", title: "Appointment Forms", Icon: CalendarCheck },
      { id: "schedule.reminders", title: "Reminders", Icon: BellRing },
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
    group: "Distribution",
    Icon: Share2,
    children: [
      { id: "dist.link", title: "Public Link & QR", Icon: QrCode },
      { id: "dist.embed", title: "Embed (iframe / popup)", Icon: Code },
      { id: "dist.domain", title: "Custom Domain", Icon: Globe },
      { id: "dist.channels", title: "Multi-channel", Icon: Radio },
    ],
  },
  {
    group: "Integrations",
    Icon: PlugZap,
    children: [
      { id: "integ.crm", title: "CRM & Marketing", Icon: Contact },
      { id: "integ.productivity", title: "Productivity (Sheets/Slack)", Icon: Sheet },
      { id: "integ.automation", title: "Zapier / Make", Icon: Cable },
      { id: "integ.webhooks", title: "Webhooks", Icon: Webhook },
      { id: "integ.api", title: "REST / API", Icon: Braces },
      { id: "integ.suite", title: "Suite Connectors", Icon: Boxes },
    ],
  },
  {
    group: "Notifications",
    Icon: Bell,
    children: [
      { id: "notify.email", title: "Email Notifications", Icon: Mail },
      { id: "notify.confirmations", title: "Confirmations", Icon: BadgeCheck },
      { id: "notify.channels", title: "SMS & Slack", Icon: MessageSquare },
      { id: "notify.drip", title: "Drip Follow-ups", Icon: Droplets },
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
      { id: "dev.customFields", title: "Custom Fields", Icon: Puzzle },
    ],
  },
];

// Views backed by a real screen today. Everything else renders ComingSoonScreen.
export const BUILT_VIEWS = new Set([
  "Overview",
  "Forms",
  "Responses",
  "Analytics",
  "Templates",
  "Folders",
  "Shared",
  "Archived",
  "Settings",
]);

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
