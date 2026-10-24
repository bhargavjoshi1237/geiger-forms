"use client";

import { useState } from "react";
import { Archive, ExternalLink, Globe, Link2, Loader2, Mail, PenLine, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@geiger/ui/button";
import {
  Field,
  SectionCard,
  SettingRow,
  SettingsList,
  StatusPill,
} from "@geiger/ui/screen-kit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { HEX_RE } from "@/components/forms/theme-preview";
import { callApi } from "@/lib/forms/api";
import { cn } from "@/lib/utils";
import { withPrefix } from "@/lib/workspace/base-path";
import { ServiceNotice } from "../../settings/service_status";
import { FORM_STATUS_MAP } from "../constants";
import { ChipsInput, CopyField, Detail, FIELD_CLS, Note, NumberInput, OUTLINE_BTN, Stack, TextArea, TextInput, isEmail, publicFormUrl, useOrigin } from "./kit";
import { QrCode } from "./qr_code";

const STATUS_COPY = {
  Draft: "Only your team can open the form. Publish to start collecting responses.",
  Published: "Anyone allowed by Access & Sharing can open and submit the form.",
  Archived: "The form is closed and hidden from the main list. Responses are kept.",
};

// Status control: Draft / Published / Archived (applies immediately).
export function PublishSection({ form, changeStatus, canPublish, statusBusy, preview }) {
  const origin = useOrigin();
  return (
    <Stack>
      <SectionCard title="Status" description="Status changes apply immediately — no need to save.">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={form.status}
              onValueChange={(v) => {
                if (!canPublish) toast.error("You don't have permission to publish forms.");
                else if (v !== form.status) changeStatus(v);
              }}
            >
              <TabsList>
                <TabsTrigger value="Draft">Draft</TabsTrigger>
                <TabsTrigger value="Published"><Globe />Published</TabsTrigger>
                <TabsTrigger value="Archived"><Archive />Archived</TabsTrigger>
              </TabsList>
            </Tabs>
            {statusBusy ? <Loader2 className="h-4 w-4 animate-spin text-text-secondary" /> : null}
          </div>
          <p className="text-sm text-text-secondary">{STATUS_COPY[form.status]}</p>
          {!canPublish ? <Note tone="warning">Your role can&apos;t publish forms. Ask a workspace admin.</Note> : null}
        </div>
      </SectionCard>
      <SectionCard title="Details">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Current status" value={<StatusPill status={form.status} map={FORM_STATUS_MAP} />} />
          <Detail label="First published" value={form.publishedAt ? new Date(form.publishedAt).toLocaleString() : "Never"} />
          <Detail label="Slug" value={<code className="text-xs">{form.slug}</code>} />
          <Detail label="Last edited" value={form.lastEdited} />
        </dl>
        <div className="mt-4 grid gap-2">
          <CopyField value={publicFormUrl(origin, form.slug)} label="Link copied" />
          <div>
            <Button type="button" variant="outline" size="sm" onClick={preview} className={OUTLINE_BTN}>
              <ExternalLink className="h-3.5 w-3.5" /> Open public form
            </Button>
          </div>
        </div>
      </SectionCard>
    </Stack>
  );
}

const EMBED_MODES = [
  { value: "inline", label: "Inline", hint: "Sits in the page and grows with the form." },
  { value: "popup", label: "Popup", hint: "A centred dialog over the page." },
  { value: "slider", label: "Slider", hint: "A panel that slides in from the edge of the screen." },
  { value: "side-tab", label: "Side tab", hint: "A tab pinned to the screen edge that opens a slider." },
  { value: "popover", label: "Popover", hint: "A corner bubble that opens a compact panel." },
  { value: "fullscreen", label: "Full screen", hint: "Covers the whole screen, for longer focused forms." },
  { value: "iframe", label: "Plain iframe", hint: "A fixed-height iframe that works without the script." },
];
const DIALOG_MODES = new Set(["popup", "slider", "side-tab", "popover", "fullscreen"]);
const FLOATING_MODES = new Set(["side-tab", "popover"]);
const SIDED_MODES = new Set(["slider", "side-tab", "popover"]);
const DEFAULT_WIDTH = { popup: 720, slider: 420, "side-tab": 420, popover: 380 };
const LAUNCHER_NOUN = { "side-tab": "Tab", popover: "Bubble" };
const FREQUENCIES = [
  { value: "always", label: "Every page view" },
  { value: "session", label: "Once per session" },
  { value: "days", label: "Once every few days" },
];
const EMBED_DEFAULTS = { buttonText: "", buttonColor: "", position: "right", width: "", trigger: "click", delay: 5, scroll: 50, frequency: "always", frequencyDays: 7, hideAfterSubmit: false, autoClose: "", openSelector: "", inherit: "utm" };

const num = (value, fallback) => (value === "" || !Number.isFinite(Number(value)) ? fallback : Number(value));
const attr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

// /embed.js snippet for a script mode, emitting only options that differ from the script's defaults.
function scriptSnippet(mode, o, slug, hiddenKeys, script) {
  const attrs = [["data-geiger-form", slug], ["data-mode", mode]];
  const add = (name, value, when) => {
    if (when) attrs.push([name, value]);
  };
  if (DIALOG_MODES.has(mode)) {
    const floating = FLOATING_MODES.has(mode);
    const auto = o.trigger !== "click";
    const selector = o.openSelector.trim();
    const launcher = floating || (!auto && !selector);
    add("data-trigger", o.trigger, auto);
    add("data-delay", Math.max(0, num(o.delay, 5)), o.trigger === "delay");
    add("data-scroll", Math.min(100, Math.max(1, num(o.scroll, 50))), o.trigger === "scroll");
    add("data-open-selector", selector, !floating && !auto && selector);
    add("data-button-text", o.buttonText.trim(), launcher && o.buttonText.trim());
    add("data-button-color", o.buttonColor, launcher && HEX_RE.test(o.buttonColor));
    add("data-position", "left", SIDED_MODES.has(mode) && o.position === "left");
    add("data-width", Math.max(280, num(o.width, 0)), mode !== "fullscreen" && num(o.width, 0) > 0);
    add("data-frequency", o.frequency, auto && o.frequency !== "always");
    add("data-frequency-days", Math.max(1, num(o.frequencyDays, 7)), auto && o.frequency === "days");
    add("data-hide-after-submit", "true", (auto || floating) && o.hideAfterSubmit);
    add("data-auto-close", num(o.autoClose, 0), num(o.autoClose, 0) > 0);
  }
  add("data-inherit-params", "all", o.inherit === "all");
  for (const key of hiddenKeys) attrs.push([`data-param-${key}`, ""]);
  const parts = attrs.map(([name, value]) => `${name}="${attr(value)}"`);
  const tag = parts.length > 2 ? `<div\n  ${parts.join("\n  ")}\n>` : `<div ${parts.join(" ")}>`;
  return `${tag}</div>\n${script}`;
}

function OptionSelect({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", FIELD_CLS)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Embed builder: inline, dialog and launcher modes via /embed.js with display rules, or a plain iframe.
export function EmbedSection({ form }) {
  const origin = useOrigin();
  const [mode, setMode] = useState("inline");
  const [opts, setOpts] = useState(EMBED_DEFAULTS);
  const [height, setHeight] = useState(640);
  const set = (key) => (value) => setOpts((o) => ({ ...o, [key]: value }));
  const dialog = DIALOG_MODES.has(mode);
  const floating = FLOATING_MODES.has(mode);
  const auto = dialog && opts.trigger !== "click";
  const launcher = floating || (dialog && !auto && !opts.openSelector.trim());
  const noun = LAUNCHER_NOUN[mode] || "Button";
  const hiddenKeys = (form.fieldDefs || [])
    .filter((f) => f.type === "hidden" && f.included !== false && f.prefillKey && !/^utm_/i.test(f.prefillKey))
    .map((f) => f.prefillKey.toLowerCase());
  const url = publicFormUrl(origin, form.slug);
  const script = `<script src="${origin}${withPrefix("/embed.js")}" async></script>`;
  const snippet =
    mode === "iframe"
      ? `<iframe src="${url}?embed=1" title="${attr(form.title)}" width="100%" height="${Number(height) || 640}" style="border:0;max-width:100%" loading="lazy" allow="payment; clipboard-write"></iframe>`
      : scriptSnippet(mode, opts, form.slug, hiddenKeys, script);
  const triggers = [
    { value: "click", label: floating ? `Only when the ${noun.toLowerCase()} is clicked` : "On click" },
    { value: "delay", label: "After a delay" },
    { value: "scroll", label: "At a scroll depth" },
    { value: "exit", label: "On exit intent" },
  ];
  const triggerHint = opts.trigger === "exit" ? "Desktop only: when the pointer leaves through the top of the window." : floating ? `The ${noun.toLowerCase()} is always shown.` : undefined;
  const codeHint = mode === "iframe" || mode === "inline" ? "Paste where the form should appear." : "Paste into any page; the form loads the first time it opens.";

  return (
    <Stack>
      <SectionCard title="Embed type" description="Choose how the form appears on your site.">
        <div className="grid gap-4">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
              {EMBED_MODES.map((m) => (
                <TabsTrigger key={m.value} value={m.value}>
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-sm text-text-secondary">{EMBED_MODES.find((m) => m.value === mode).hint}</p>
          {mode === "iframe" ? (
            <Field label="Height (px)" className="max-w-[160px]">
              <NumberInput value={height} min={200} onChange={setHeight} />
            </Field>
          ) : null}
          {dialog ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {launcher ? (
                <Field label={mode === "popover" ? "Bubble label" : `${noun} text`} hint={mode === "popover" ? "Read out by screen readers." : undefined}>
                  <TextInput value={opts.buttonText} onChange={set("buttonText")} placeholder={mode === "side-tab" ? "Feedback" : "Open form"} />
                </Field>
              ) : null}
              {launcher ? (
                <Field label={`${noun} colour`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`${noun} colour`}
                      value={HEX_RE.test(opts.buttonColor) ? opts.buttonColor : "#111111"}
                      onChange={(e) => set("buttonColor")(e.target.value)}
                      className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-surface-card p-1"
                    />
                    <TextInput value={opts.buttonColor} onChange={(v) => set("buttonColor")(v.trim())} placeholder="#111111" className="font-mono" />
                  </div>
                  {opts.buttonColor && !HEX_RE.test(opts.buttonColor) ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">Use a 6-digit hex colour.</p> : null}
                </Field>
              ) : null}
              {SIDED_MODES.has(mode) ? (
                <Field label="Position">
                  <OptionSelect
                    value={opts.position}
                    onChange={set("position")}
                    options={[
                      { value: "right", label: mode === "popover" ? "Bottom right" : "Right" },
                      { value: "left", label: mode === "popover" ? "Bottom left" : "Left" },
                    ]}
                  />
                </Field>
              ) : null}
              {mode !== "fullscreen" ? (
                <Field label="Width (px)" hint={mode === "popup" ? undefined : "Full width on phones."}>
                  <NumberInput value={opts.width} min={280} placeholder={String(DEFAULT_WIDTH[mode])} onChange={set("width")} />
                </Field>
              ) : null}
            </div>
          ) : null}
        </div>
      </SectionCard>

      {dialog ? (
        <SectionCard title="Display rules" description="When the form opens and how often visitors see it.">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Opens" hint={triggerHint}>
                <OptionSelect value={opts.trigger} onChange={set("trigger")} options={triggers} />
              </Field>
              {opts.trigger === "delay" ? (
                <Field label="Delay (seconds)">
                  <NumberInput value={opts.delay} min={0} onChange={set("delay")} />
                </Field>
              ) : null}
              {opts.trigger === "scroll" ? (
                <Field label="Scroll depth (%)">
                  <NumberInput value={opts.scroll} min={1} max={100} onChange={set("scroll")} />
                </Field>
              ) : null}
              {!floating && !auto ? (
                <Field label="Your own button (optional)" hint="CSS selector for elements on your page that open the form instead of the generated button.">
                  <TextInput value={opts.openSelector} onChange={set("openSelector")} placeholder="#open-form" className="font-mono" />
                </Field>
              ) : null}
              {auto ? (
                <Field label="Show" hint="Remembered in the visitor's browser.">
                  <OptionSelect value={opts.frequency} onChange={set("frequency")} options={FREQUENCIES} />
                </Field>
              ) : null}
              {auto && opts.frequency === "days" ? (
                <Field label="Days between showings">
                  <NumberInput value={opts.frequencyDays} min={1} onChange={set("frequencyDays")} />
                </Field>
              ) : null}
              <Field label="Close after submit (seconds)" hint="Empty keeps the thank-you screen open.">
                <NumberInput value={opts.autoClose} min={0} placeholder="Never" onChange={set("autoClose")} />
              </Field>
            </div>
            {auto || floating ? (
              <SettingsList>
                <SettingRow
                  title="Stop after a response"
                  description={floating ? `Visitors who responded no longer see the ${noun.toLowerCase()} or automatic openings.` : "Visitors who responded aren't shown the form automatically again."}
                  checked={opts.hideAfterSubmit}
                  onCheckedChange={set("hideAfterSubmit")}
                />
              </SettingsList>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Embed code" description={codeHint}>
        <div className="grid gap-4">
          {mode !== "iframe" ? (
            <Field label="Page URL parameters" hint="Forwarded from your page's address for prefill and hidden fields." className="max-w-xs">
              <OptionSelect
                value={opts.inherit}
                onChange={set("inherit")}
                options={[
                  { value: "utm", label: "UTM tags only" },
                  { value: "all", label: "All parameters" },
                ]}
              />
            </Field>
          ) : null}
          <CopyField multiline value={snippet} label="Embed code copied" />
          {mode !== "iframe" && hiddenKeys.length ? (
            <p className="text-xs text-text-tertiary">
              Fill in the <code className="rounded bg-surface-card px-1 text-text-secondary">data-param-*</code> values to pass hidden fields from your page.
            </p>
          ) : null}
        </div>
      </SectionCard>
      {form.status !== "Published" ? <Note tone="warning">Embedded forms show a closed notice until the form is published.</Note> : null}
    </Stack>
  );
}

const SOCIAL = [
  { key: "x", label: "X", href: (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { key: "linkedin", label: "LinkedIn", href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { key: "facebook", label: "Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { key: "email", label: "Email", href: (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(`${t}\n\n${u}`)}` },
];

function SignedLinkCard({ form }) {
  const [email, setEmail] = useState("");
  const [hours, setHours] = useState(72);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);
  const generate = async () => {
    if (email && !isEmail(email)) return toast.error("Enter a valid email or leave it empty.");
    setBusy(true);
    const res = await callApi(`/api/forms/${form.id}/signed-link`, { method: "POST", body: { email: email.trim() || undefined, expiresInHours: Number(hours) || 72 } });
    setBusy(false);
    if (res.ok && res.data?.url) {
      setLink({ url: res.data.url, expiresAt: res.data.expiresAt });
      toast.success("Signed link created");
    } else toast.error(res.data?.error || "Couldn't create a signed link.");
  };
  return (
    <SectionCard title="Signed link" description="A personal, expiring link — required when access is set to “Signed links only”, and it can lock the response to one email.">
      <div className="grid gap-4">
        <ServiceNotice service="signedLinks" />
        <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Field label="Recipient email (optional)">
            <TextInput value={email} onChange={setEmail} placeholder="person@company.com" />
          </Field>
          <Field label="Expires in (hours)">
            <NumberInput value={hours} min={1} onChange={setHours} />
          </Field>
          <Button type="button" onClick={generate} disabled={busy} className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Generate
          </Button>
        </div>
        {link ? (
          <div className="grid gap-1.5">
            <CopyField value={link.url} label="Signed link copied" />
            {link.expiresAt ? <p className="text-xs text-text-tertiary">Expires {new Date(link.expiresAt).toLocaleString()}</p> : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function InviteCard({ form }) {
  const [emails, setEmails] = useState([]);
  const [message, setMessage] = useState("");
  const [signed, setSigned] = useState(true);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!emails.length) return toast.error("Add at least one email.");
    setBusy(true);
    const res = await callApi(`/api/forms/${form.id}/invite`, { method: "POST", body: { emails, message, signed } });
    setBusy(false);
    if (res.status === 409) return toast.error("Publish the form before sending it to people.");
    if (!res.ok) return toast.error(res.data?.error || "Couldn't send the invitations.");
    if (res.data?.configured === false) return toast.error("Email isn't configured — set RESEND_API_KEY on the server.");
    const sent = res.data?.sent ?? 0;
    const failed = Array.isArray(res.data?.failed) ? res.data.failed.length : Number(res.data?.failed) || 0;
    if (failed) toast.warning(`Sent ${sent}, ${failed} couldn't be delivered.`);
    else toast.success(`Sent to ${sent} ${sent === 1 ? "person" : "people"}`);
    setEmails([]);
    setMessage("");
  };
  return (
    <SectionCard title="Send to people" description="Email the form to recipients — use it to collect signatures or targeted responses.">
      <div className="grid gap-4">
        <Field label="Recipients">
          <ChipsInput value={emails} onChange={setEmails} placeholder="name@company.com, …" />
        </Field>
        <Field label="Message (optional)">
          <TextArea value={message} onChange={setMessage} rows={3} placeholder={`Please complete “${form.title}”.`} />
        </Field>
        <SettingsList>
          <SettingRow icon={PenLine} title="Personal signed links" description="Each recipient gets their own link tied to their email — best for signing." checked={signed} onCheckedChange={setSigned} />
        </SettingsList>
        <ServiceNotice service={signed ? ["email", "signedLinks"] : "email"} />
        {form.status !== "Published" ? <Note tone="warning">Publish the form first — invitations can only be sent for live forms.</Note> : null}
        <div>
          <Button type="button" onClick={send} disabled={busy || !emails.length || form.status !== "Published"} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

// Public link, QR, social sharing, signed links and email distribution.
export function ShareSection({ form }) {
  const origin = useOrigin();
  const url = publicFormUrl(origin, form.slug);
  return (
    <Stack>
      <SectionCard title="Public link">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-4">
            <CopyField value={url} label="Link copied" />
            <div className="flex flex-wrap gap-2">
              {SOCIAL.map((s) => (
                <Button key={s.key} asChild variant="outline" size="sm" className={OUTLINE_BTN}>
                  <a href={s.href(url, form.title)} target={s.key === "email" ? undefined : "_blank"} rel="noopener noreferrer">
                    {s.key === "email" ? <Mail className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />} {s.label}
                  </a>
                </Button>
              ))}
            </div>
            {form.status !== "Published" ? <Note tone="warning">Publish the form before sharing — unpublished links show a closed notice.</Note> : null}
          </div>
          <QrCode text={url} size={128} fileName={`${form.slug}-qr.png`} />
        </div>
      </SectionCard>
      <SignedLinkCard form={form} />
      <InviteCard form={form} />
    </Stack>
  );
}
