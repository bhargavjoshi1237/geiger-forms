"use client";

// Form editor navigation (NAV_GROUPS) + key → section map (SECTIONS). Keys are deep-link targets (?section=<key>).
import {
  Bell,
  Bot,
  ClipboardCheck,
  Code,
  Columns3,
  Eye,
  FileText,
  Files,
  Flag,
  GitFork,
  Globe,
  Languages,
  LayoutDashboard,
  ListChecks,
  MousePointer2,
  Paintbrush,
  Plug,
  Save,
  Send,
  Share2,
  ShieldCheck,
  ShoppingCart,
  SquarePen,
  Stamp,
  TicketPercent,
  Users,
  Wallet,
} from "lucide-react";

import { AccessSection } from "./sections/access";
import { BrandingSection } from "./sections/branding";
import { DetailsSection } from "./sections/details";
import { IntegrationsSection } from "./sections/integrations";
import { LocalizationSection } from "./sections/localization";
import { NotificationsSection } from "./sections/notifications";
import { OverviewSection } from "./sections/overview";
import { CouponsSection, GatewaysSection, OrderSection } from "./sections/payments";
import { SaveResumeSection } from "./sections/save_resume";
import { ScreensSection } from "./sections/screens";
import { SecuritySection } from "./sections/security";
import { EmbedSection, PublishSection, ShareSection } from "./sections/sharing";
import { CanvasSection, FieldsSection, LayoutSection, LogicSection, PagesSection, PreviewSection } from "./sections/structure";
import { SubmissionSection } from "./sections/submission";
import { ThemesSection } from "./sections/themes";
import { ApprovalsSection, AutomationsSection, DocumentsSection } from "./sections/workflow";

export const NAV_GROUPS = [
  {
    group: null,
    items: [
      { key: "overview", label: "Overview", icon: LayoutDashboard, desc: "A snapshot of this form — responses, link and quick actions.", ownHeader: true },
      { key: "details", label: "Details", icon: SquarePen, desc: "Name, description, folder and tags." },
    ],
  },
  {
    group: "Build",
    items: [
      { key: "canvas", label: "Drag & Drop Canvas", icon: MousePointer2, desc: "Everything on the form canvas, in order." },
      { key: "layout", label: "Layout & Columns", icon: Columns3, desc: "How fields sit side by side." },
      { key: "fields", label: "Fields", icon: ListChecks, desc: "The questions this form collects." },
      { key: "logic", label: "Logic & Scoring", icon: GitFork, desc: "Visibility rules, formulas, scoring and quizzes." },
      { key: "preview", label: "Preview & Test", icon: Eye, desc: "Try the form the way respondents will." },
    ],
  },
  {
    group: "Design",
    items: [
      { key: "themes", label: "Themes & Colors", icon: Paintbrush, desc: "Match the form to your brand." },
      { key: "screens", label: "Welcome & Ending", icon: Flag, desc: "Intro and thank-you screens." },
      { key: "branding", label: "Branding", icon: Stamp, desc: "Logo and white-label options." },
      { key: "localization", label: "Localization", icon: Languages, desc: "The language of the form's built-in text." },
    ],
  },
  {
    group: "Flow",
    items: [
      { key: "pages", label: "Multi-step Pages", icon: Files, desc: "Pages, progress and conversational mode." },
      { key: "saveresume", label: "Save & Resume", icon: Save, desc: "Let respondents finish later." },
      { key: "submission", label: "Submission Rules", icon: Send, desc: "Schedule, limits, attestation and duplicates." },
    ],
  },
  {
    group: "Payments",
    items: [
      { key: "gateways", label: "Gateways", icon: Wallet, desc: "Collect one-off or recurring payments with Stripe." },
      { key: "order", label: "Order Builder", icon: ShoppingCart, desc: "Products, quantities and totals." },
      { key: "coupons", label: "Coupons", icon: TicketPercent, desc: "Discount and promotion codes." },
    ],
  },
  {
    group: "Sharing",
    items: [
      { key: "publish", label: "Publish", icon: Globe, desc: "Take the form live and manage its status." },
      { key: "embed", label: "Embed", icon: Code, desc: "Drop the form into your own site." },
      { key: "share", label: "Share & Send", icon: Share2, desc: "Links, QR code, signed links and email invites." },
    ],
  },
  {
    group: "Workflow",
    items: [
      { key: "approvals", label: "Approvals", icon: ClipboardCheck, desc: "Route responses through approval steps." },
      { key: "automations", label: "Automations", icon: Bot, desc: "If-this-then-that rules for new responses." },
      { key: "documents", label: "Document Template", icon: FileText, desc: "Print and PDF layout for responses." },
    ],
  },
  {
    group: "Settings",
    items: [
      { key: "notifications", label: "Notifications", icon: Bell, desc: "Confirmation emails, alerts and follow-ups." },
      { key: "access", label: "Access & Sharing", icon: Users, desc: "Who can respond, spam protection and privacy." },
      { key: "security", label: "Security & Compliance", icon: ShieldCheck, desc: "Sensitive data, access log and HIPAA readiness." },
      { key: "integrations", label: "Integrations", icon: Plug, desc: "Webhooks, Slack, Geiger Flow and more." },
    ],
  },
];

export const SECTION_KEYS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const SECTIONS = {
  overview: OverviewSection,
  details: DetailsSection,
  canvas: CanvasSection,
  layout: LayoutSection,
  fields: FieldsSection,
  logic: LogicSection,
  preview: PreviewSection,
  themes: ThemesSection,
  screens: ScreensSection,
  branding: BrandingSection,
  localization: LocalizationSection,
  pages: PagesSection,
  saveresume: SaveResumeSection,
  submission: SubmissionSection,
  gateways: GatewaysSection,
  order: OrderSection,
  coupons: CouponsSection,
  publish: PublishSection,
  embed: EmbedSection,
  share: ShareSection,
  approvals: ApprovalsSection,
  automations: AutomationsSection,
  documents: DocumentsSection,
  notifications: NotificationsSection,
  access: AccessSection,
  security: SecuritySection,
  integrations: IntegrationsSection,
};
