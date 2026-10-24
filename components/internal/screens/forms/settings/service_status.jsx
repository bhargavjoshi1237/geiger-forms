"use client";

import { Fragment } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, Database, Link2, Lock, Mail, ShieldCheck, Webhook } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { LoadingArea, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { useServiceStatus } from "@/lib/hooks/use-service-status";
import { Note } from "../forms/sections/kit";

// Env-gated server services (keys match /api/workspace/config): what each needs and what stops working without it.
const SERVICES = [
  { key: "serviceRole", label: "Server database access", icon: Database, env: ["SUPABASE_SERVICE_ROLE_KEY"], effect: "Public forms, submissions, uploads, webhooks and workspace server actions are unavailable." },
  { key: "email", label: "Email (Resend)", icon: Mail, env: ["RESEND_API_KEY"], effect: "Confirmation, notification, approval, resume-link, invitation, follow-up and report emails aren't sent." },
  { key: "payments", label: "Stripe Checkout", icon: CreditCard, env: ["STRIPE_SECRET_KEY"], effect: "Respondents aren't sent to checkout, so payments aren't collected." },
  { key: "paymentWebhooks", label: "Stripe webhooks", icon: Webhook, env: ["STRIPE_WEBHOOK_SECRET"], effect: "Payments are never confirmed, so paid responses stay “Awaiting payment”." },
  { key: "captcha", label: "Captcha (Cloudflare Turnstile)", icon: ShieldCheck, env: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"], effect: "Captcha challenges aren't shown or verified, so the per-form toggle has no effect." },
  { key: "encryption", label: "Field encryption", icon: Lock, env: ["FORMS_ENCRYPTION_KEY"], effect: "Sensitive answers are stored unencrypted, and answers encrypted earlier can't be revealed." },
  { key: "signedLinks", label: "Link signing", icon: Link2, env: ["FORMS_LINK_SECRET"], effect: "Signed, expiring respondent links can't be created or verified." },
  { key: "cron", label: "Scheduled jobs", icon: CalendarClock, env: ["CRON_SECRET"], effect: "Retention clean-up, reminders, follow-up emails and weekly reports don't run." },
];

const BY_KEY = new Map(SERVICES.map((s) => [s.key, s]));

function EnvKeys({ env }) {
  return env.map((name, i) => (
    <Fragment key={name}>
      {i ? " and " : ""}
      <code className="rounded bg-surface-card px-1 text-foreground">{name}</code>
    </Fragment>
  ));
}

// Warning for a setting whose service(s) this deployment hasn't configured; renders nothing while the status is unknown.
export function ServiceNotice({ service, className }) {
  const { services } = useServiceStatus();
  const missing = services ? [service].flat().filter((key) => services[key] === false).map((key) => BY_KEY.get(key)) : [];
  if (!missing.length) return null;
  return (
    <Note tone="warning" className={className}>
      <span className="font-medium">Not configured on this deployment.</span> {missing.map((s) => s.effect).join(" ")} Set{" "}
      <EnvKeys env={missing.flatMap((s) => s.env)} /> on the server.
    </Note>
  );
}

// Workspace Settings health panel; hidden when the status can't be checked (e.g. the playground).
export function ConfigurationCard() {
  const { services, loading } = useServiceStatus();
  if (!loading && !services) return null;
  const missing = services ? SERVICES.filter((s) => !services[s.key]).length : 0;
  return (
    <SectionCard
      title="Configuration"
      description="Server keys on this deployment. Only whether each one is set is shown, never its value."
      action={services ? <Badge variant={missing ? "warning" : "success"}>{missing ? `${missing} not configured` : "All configured"}</Badge> : null}
    >
      {loading ? (
        <LoadingArea size={36} label="Checking configuration" className="py-8" />
      ) : (
        <SettingsList>
          {SERVICES.map((s) => {
            const on = Boolean(services[s.key]);
            return (
              <SettingRow
                key={s.key}
                icon={s.icon}
                title={s.label}
                description={
                  <>
                    <EnvKeys env={s.env} />
                    <span className="mt-1 block">If missing: {s.effect}</span>
                  </>
                }
                control={
                  <Badge variant={on ? "success" : "warning"}>
                    {on ? <CheckCircle2 /> : <AlertTriangle />}
                    {on ? "Configured" : "Not configured"}
                  </Badge>
                }
              />
            );
          })}
        </SettingsList>
      )}
    </SectionCard>
  );
}
