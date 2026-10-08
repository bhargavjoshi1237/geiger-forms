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
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { callApi } from "@/lib/forms/api";
import { withPrefix } from "@/lib/workspace/base-path";
import { FORM_STATUS_MAP } from "../constants";
import { ChipsInput, CopyField, Detail, Note, NumberInput, OUTLINE_BTN, Stack, TextArea, TextInput, isEmail, publicFormUrl, useOrigin } from "./kit";
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

// Embed snippets: inline + popup via /embed.js, and a plain iframe.
export function EmbedSection({ form }) {
  const origin = useOrigin();
  const [mode, setMode] = useState("inline");
  const [buttonText, setButtonText] = useState("Open form");
  const [height, setHeight] = useState(640);
  const url = publicFormUrl(origin, form.slug);
  const script = `<script src="${origin}${withPrefix("/embed.js")}" async></script>`;
  const snippets = {
    inline: `<div data-geiger-form="${form.slug}" data-mode="inline"></div>\n${script}`,
    popup: `<div data-geiger-form="${form.slug}" data-mode="popup" data-button-text="${buttonText.replace(/"/g, "&quot;")}"></div>\n${script}`,
    iframe: `<iframe src="${url}?embed=1" title="${form.title.replace(/"/g, "&quot;")}" width="100%" height="${Number(height) || 640}" style="border:0;max-width:100%" loading="lazy" allow="payment; clipboard-write"></iframe>`,
  };
  return (
    <Stack>
      <SectionCard title="Embed code" description="Paste into any page. The inline and popup embeds resize automatically.">
        <div className="grid gap-4">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList>
              <TabsTrigger value="inline">Inline</TabsTrigger>
              <TabsTrigger value="popup">Popup button</TabsTrigger>
              <TabsTrigger value="iframe">Plain iframe</TabsTrigger>
            </TabsList>
          </Tabs>
          {mode === "popup" ? (
            <Field label="Button text" className="max-w-xs">
              <TextInput value={buttonText} onChange={setButtonText} />
            </Field>
          ) : null}
          {mode === "iframe" ? (
            <Field label="Height (px)" className="max-w-[160px]">
              <NumberInput value={height} min={200} onChange={setHeight} />
            </Field>
          ) : null}
          <CopyField multiline value={snippets[mode]} label="Embed code copied" />
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
