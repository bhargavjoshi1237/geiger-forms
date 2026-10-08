"use client";

import { useState } from "react";
import { Building2, CalendarClock, KeyRound, Loader2, Lock, LogIn, Link2Off, Users } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { StatusScreen } from "./filler-shell";

function PasswordGate({ tr, onSubmit, title }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    const ok = await onSubmit(password);
    setBusy(false);
    if (!ok) setError(tr("passwordWrong"));
  };
  return (
    <StatusScreen icon={KeyRound} title={tr("passwordTitle")} description={title ? `${title}\n${tr("passwordBody")}` : tr("passwordBody")}>
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
        <Input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={tr("passwordPlaceholder")}
          aria-label={tr("passwordPlaceholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "gf-password-error" : undefined}
          className="bg-surface-card"
        />
        <Button type="submit" disabled={!password || busy} className="shrink-0">
          {busy ? <Loader2 className="animate-spin" /> : <Lock />}
          {tr("unlock")}
        </Button>
      </form>
      {error && (
        <p id="gf-password-error" role="alert" className="text-xs font-medium text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </StatusScreen>
  );
}

// Access/availability gate screens returned by the public payload (`gate` + `gateMessage`).
export function GateScreen({ gate, gateMessage, form, tr, onPassword }) {
  const settings = form?.settings || {};
  const custom = gateMessage || settings.closedMessage || "";
  switch (gate) {
    case "password":
      return <PasswordGate tr={tr} onSubmit={onPassword} title={form?.title} />;
    case "login":
      return (
        <StatusScreen icon={LogIn} title={tr("loginTitle")} description={gateMessage || tr("loginBody")}>
          <Button asChild>
            {/* Suite sign-in lives at the hub root, outside this app. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">
              <LogIn />
              {tr("signIn")}
            </a>
          </Button>
        </StatusScreen>
      );
    case "domain": {
      const domain = settings.access?.orgDomain || "";
      return (
        <StatusScreen
          icon={Building2}
          tone="warning"
          title={tr("domainTitle")}
          description={gateMessage || (domain ? tr("domainBody", { domain: domain.replace(/^@/, "") }) : tr("loginBody"))}
        >
          <Button asChild variant="outline">
            {/* Suite sign-in lives at the hub root, outside this app. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">
              <LogIn />
              {tr("signIn")}
            </a>
          </Button>
        </StatusScreen>
      );
    }
    case "signed":
      return <StatusScreen icon={Link2Off} tone="danger" title={tr("signedTitle")} description={gateMessage || tr("signedBody")} />;
    case "scheduled":
      return <StatusScreen icon={CalendarClock} title={tr("scheduledTitle")} description={custom || tr("scheduledDefault")} />;
    case "limit":
      return <StatusScreen icon={Users} title={tr("limitTitle")} description={custom || tr("limitDefault")} />;
    case "closed":
    default:
      return <StatusScreen icon={Lock} title={tr("closedTitle")} description={custom || tr("closedDefault")} />;
  }
}
