"use client";

import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { RadioGroup, RadioGroupItem } from "@geiger/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { cn } from "@/lib/utils";
import { ACCESS_MODES, SHARE_ROLES } from "../constants";
import { FIELD_CLS, NumberInput, OUTLINE_BTN, Stack, TextInput, isEmail, randomHex, sha256Hex } from "./kit";

const CAPTCHA_READY = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

function PasswordControl({ access, setGroup }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const hasPassword = Boolean(access.passwordHash);
  // Stores salt + SHA-256(salt + password); the plaintext never leaves the browser.
  const apply = async () => {
    if (password.length < 4) return toast.error("Use at least 4 characters.");
    setBusy(true);
    const salt = randomHex(16);
    const hash = await sha256Hex(salt + password);
    setGroup("access", { passwordSalt: salt, passwordHash: hash });
    setPassword("");
    setBusy(false);
    toast.success("Password updated — save to apply it.");
  };
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-sm">
        <KeyRound className="h-4 w-4 text-text-secondary" />
        {hasPassword ? <Badge variant="success">Password set</Badge> : <Badge variant="warning">No password yet</Badge>}
        {hasPassword ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setGroup("access", { passwordHash: "", passwordSalt: "" })} className="h-7 text-text-secondary hover:text-red-400">
            <X className="h-3.5 w-3.5" /> Remove
          </Button>
        ) : null}
      </div>
      <div className="flex max-w-md gap-2">
        <TextInput type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder={hasPassword ? "New password" : "Choose a password"} className="flex-1" />
        <Button type="button" variant="outline" onClick={apply} disabled={busy || !password} className={cn("h-9 shrink-0", OUTLINE_BTN)}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {hasPassword ? "Change" : "Set password"}
        </Button>
      </div>
    </div>
  );
}

function SharingList({ sharing, onChange }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const add = () => {
    const e = email.trim().toLowerCase();
    if (!isEmail(e)) return toast.error("Enter a valid email address.");
    if (sharing.some((s) => s.email === e)) return toast.error("Already on the list.");
    onChange([...sharing, { email: e, role }]);
    setEmail("");
  };
  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <TextInput value={email} onChange={setEmail} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="teammate@company.com" className="flex-1" />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className={cn("h-9 w-[120px]", FIELD_CLS)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHARE_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={add} className={cn("h-9 shrink-0", OUTLINE_BTN)}>
          Add
        </Button>
      </div>
      {sharing.length ? (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface-card">
          {sharing.map((s) => (
            <div key={s.email} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate text-sm text-muted-foreground">{s.email}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                <Select value={s.role || "viewer"} onValueChange={(v) => onChange(sharing.map((x) => (x.email === s.email ? { ...x, role: v } : x)))}>
                  <SelectTrigger className="h-7 w-[110px] border-border bg-surface-subtle text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHARE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${s.email}`} onClick={() => onChange(sharing.filter((x) => x.email !== s.email))} className="h-7 w-7 text-text-secondary hover:bg-red-500/10 hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Who can respond, anti-spam, privacy/retention and team sharing.
export function AccessSection({ settings, set, setGroup }) {
  const access = settings.access || {};
  const spam = settings.spam || {};
  const mode = access.mode || "public";
  return (
    <Stack>
      <SectionCard title="Who can respond">
        <RadioGroup value={mode} onValueChange={(v) => setGroup("access", { mode: v })} className="grid gap-2">
          {ACCESS_MODES.map((m) => (
            <label key={m.value} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors", mode === m.value ? "border-border-strong bg-surface-active" : "border-border bg-surface-card hover:bg-surface-hover")}>
              <RadioGroupItem value={m.value} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-text-secondary">{m.hint}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
        {mode === "password" ? (
          <div className="mt-4">
            <PasswordControl access={access} setGroup={setGroup} />
          </div>
        ) : null}
        {mode === "domain" ? (
          <Field label="Allowed email domain" className="mt-4 max-w-sm">
            <TextInput value={access.orgDomain} onChange={(v) => setGroup("access", { orgDomain: v.replace(/^@/, "").trim().toLowerCase() })} placeholder="company.com" />
          </Field>
        ) : null}
        <SettingsList className="mt-4 border-t border-border pt-4">
          <SettingRow
            title="One response per person"
            description="Requires sign-in: anonymous visitors are asked to log in first, then each account can respond once."
            checked={Boolean(access.onePerUser)}
            onCheckedChange={(v) => setGroup("access", { onePerUser: v })}
          />
        </SettingsList>
      </SectionCard>

      <SectionCard title="Spam protection">
        <SettingsList>
          <SettingRow title="Honeypot field" description="An invisible field that bots fill in. Invisible to people." checked={spam.honeypot !== false} onCheckedChange={(v) => setGroup("spam", { honeypot: v })} />
          <SettingRow
            title="CAPTCHA challenge"
            description={CAPTCHA_READY ? "Cloudflare Turnstile check before submit." : "Needs NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in the environment."}
            checked={Boolean(spam.captcha)}
            onCheckedChange={(v) => setGroup("spam", { captcha: v })}
          />
          <SettingRow title="Rate limit" description="Maximum submissions per hour from one device / IP." control={<NumberInput value={spam.rateLimit} min={1} onChange={(v) => setGroup("spam", { rateLimit: v })} className="w-24" />} />
        </SettingsList>
      </SectionCard>

      <SectionCard title="Privacy">
        <SettingsList>
          <SettingRow icon={ShieldCheck} title="Anonymous responses" description="Don't store IP hash, user agent or the signed-in user with responses." checked={Boolean(settings.anonymous)} onCheckedChange={(v) => set("anonymous", v)} />
          <SettingRow title="Delete responses after" description="Responses older than this are erased automatically. Empty keeps them forever." control={<NumberInput value={settings.retentionDays} min={1} placeholder="Forever" onChange={(v) => set("retentionDays", v)} className="w-28" />} />
        </SettingsList>
      </SectionCard>

      <SectionCard title="Team access" description="People you've shared this form with. Advisory — what they can actually do comes from their workspace role.">
        <SharingList sharing={settings.sharing || []} onChange={(v) => set("sharing", v)} />
      </SectionCard>
    </Stack>
  );
}
