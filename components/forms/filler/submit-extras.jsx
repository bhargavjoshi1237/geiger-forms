"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, FileCheck2, ShieldCheck, UserRoundCog } from "lucide-react";
import { Checkbox } from "@geiger/ui/checkbox";
import { Input } from "@geiger/ui/input";
import { Label } from "@geiger/ui/label";
import { Switch } from "@geiger/ui/switch";
import { cn } from "@/lib/utils";

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function ExtraError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-xs font-medium text-red-500 dark:text-red-400">
      {children}
    </p>
  );
}

// "Submitting on behalf of someone else" toggle for signed-in respondents.
export function DelegateBlock({ value, onChange, tr, error }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card p-4">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="gf-delegate" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <UserRoundCog className="size-4 text-text-tertiary" aria-hidden="true" />
          {tr("delegateToggle")}
        </Label>
        <Switch id="gf-delegate" checked={value.enabled} onCheckedChange={(enabled) => onChange({ ...value, enabled })} />
      </div>
      {value.enabled && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <div className="grid gap-1.5">
            <Label htmlFor="gf-delegate-name" className="text-xs font-normal text-text-secondary">
              {tr("delegateName")}
            </Label>
            <Input id="gf-delegate-name" value={value.forName} autoComplete="off" onChange={(e) => onChange({ ...value, forName: e.target.value })} className="bg-background" aria-invalid={error ? true : undefined} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gf-delegate-email" className="text-xs font-normal text-text-secondary">
              {tr("delegateEmail")}
            </Label>
            <Input id="gf-delegate-email" type="email" value={value.forEmail} autoComplete="off" onChange={(e) => onChange({ ...value, forEmail: e.target.value })} className="bg-background" />
          </div>
        </div>
      )}
      <ExtraError id="gf-delegate-error">{error}</ExtraError>
    </div>
  );
}

// Attestation statement the respondent must confirm before submitting.
export function AttestationBlock({ statement, checked, onChange, tr, error }) {
  return (
    <div className={cn("rounded-lg border p-4", error ? "border-red-500/40 bg-red-500/5" : "border-border bg-surface-card")}>
      <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        {tr("attestationTitle")}
      </p>
      <label htmlFor="gf-attestation" className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-foreground">
        <Checkbox id="gf-attestation" checked={checked} onCheckedChange={(c) => onChange(c === true)} className="mt-0.5" aria-invalid={error ? true : undefined} aria-describedby={error ? "gf-attestation-error" : undefined} />
        <span>{statement}</span>
      </label>
      <ExtraError id="gf-attestation-error">{error}</ExtraError>
    </div>
  );
}

// Policy acknowledgement: scroll-tracked document, optional typed name, explicit agreement.
export function PolicyBlock({ policy, value, onChange, tr, error }) {
  const scrollRef = useRef(null);
  const requireScroll = policy.requireScroll !== false && Boolean(policy.body);
  const canAgree = !requireScroll || value.scrolled;

  // Short documents that don't overflow count as fully read.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || value.scrolled) return undefined;
    const frame = requestAnimationFrame(() => {
      if (el.scrollHeight <= el.clientHeight + 8) onChange({ ...value, scrolled: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [value, onChange]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    if (!value.scrolled && el.scrollTop + el.clientHeight >= el.scrollHeight - 12) onChange({ ...value, scrolled: true });
  };

  return (
    <section className={cn("overflow-hidden rounded-lg border", error ? "border-red-500/40" : "border-border")} aria-labelledby="gf-policy-title">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface-card px-4 py-3">
        <h3 id="gf-policy-title" className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <FileCheck2 className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
          <span className="truncate">{policy.title || tr("attestationTitle")}</span>
        </h3>
        {policy.url && (
          <a href={policy.url} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-xs text-text-secondary underline-offset-4 hover:text-foreground hover:underline">
            {tr("policyOpen")}
            <ExternalLink className="size-3" />
          </a>
        )}
      </header>
      {policy.body && (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          tabIndex={0}
          aria-label={policy.title || tr("attestationTitle")}
          className="max-h-64 overflow-y-auto bg-background px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 scrollbar-subtle"
        >
          {policy.body}
        </div>
      )}
      <div className="grid gap-3 border-t border-border bg-surface-card px-4 py-3">
        {requireScroll && !value.scrolled && <p className="text-xs text-text-tertiary">{tr("policyScroll")}</p>}
        {policy.requireName !== false && (
          <div className="grid gap-1.5">
            <Label htmlFor="gf-policy-name" className="text-xs font-normal text-text-secondary">
              {tr("policyTypedName")}
            </Label>
            <Input
              id="gf-policy-name"
              value={value.typedName}
              autoComplete="name"
              onChange={(e) => onChange({ ...value, typedName: e.target.value })}
              className="bg-background font-medium"
              style={value.typedName ? { fontFamily: "var(--font-playfair), serif", fontStyle: "italic" } : undefined}
            />
          </div>
        )}
        <label htmlFor="gf-policy-agree" className={cn("flex items-start gap-3 text-sm text-foreground", canAgree ? "cursor-pointer" : "cursor-not-allowed opacity-60")}>
          <Checkbox id="gf-policy-agree" checked={value.agreed} disabled={!canAgree} onCheckedChange={(c) => onChange({ ...value, agreed: c === true })} className="mt-0.5" />
          <span>{tr("policyAgree")}</span>
        </label>
        <ExtraError id="gf-policy-error">{error}</ExtraError>
      </div>
    </section>
  );
}

let turnstilePromise = null;

function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstilePromise) {
    turnstilePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        turnstilePromise = null;
        reject(new Error("turnstile"));
      };
      document.head.appendChild(script);
    });
  }
  return turnstilePromise;
}

// Cloudflare Turnstile widget; reports the token (or "" when it expires).
export function TurnstileWidget({ siteKey, onToken, theme = "auto", error }) {
  const ref = useRef(null);
  const tokenRef = useRef(onToken);

  useEffect(() => {
    tokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let widgetId = null;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !ref.current || !turnstile) return;
        widgetId = turnstile.render(ref.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => tokenRef.current?.(token),
          "expired-callback": () => tokenRef.current?.(""),
          "error-callback": () => tokenRef.current?.(""),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      try {
        if (widgetId != null) window.turnstile?.remove(widgetId);
      } catch {
        // Widget already gone.
      }
    };
  }, [siteKey, theme]);

  return (
    <div>
      <div ref={ref} className="min-h-[65px]" />
      <ExtraError id="gf-captcha-error">{error}</ExtraError>
    </div>
  );
}

// Off-screen honeypot input; bots fill it, people never see it.
export function Honeypot({ value, onChange }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="gf-website">Website</label>
      <input id="gf-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
