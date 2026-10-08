"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Label } from "@geiger/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { LogoLoading } from "@geiger/ui/logo-loading";
import { callApi } from "@/lib/forms/api";
import { withPrefix } from "@/lib/workspace/base-path";
import { CopyField } from "./thank-you";
import { absoluteUrl, publicApi } from "./session";

// "Save & continue later": flushes a partial, shows the resume link, and can email it.
export function SaveResumeDialog({ open, onOpenChange, slug, flushPartial, defaultEmail, tr }) {
  const [state, setState] = useState({ status: "idle", token: null });
  const [email, setEmail] = useState(defaultEmail || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "saving", token: null });
    setSent(false);
    setSendError("");
    flushPartial().then((token) => {
      if (active) setState(token ? { status: "ready", token } : { status: "error", token: null });
    });
    return () => {
      active = false;
    };
  }, [open, flushPartial]);

  const link = state.token ? absoluteUrl(`/form/${slug}?resume=${encodeURIComponent(state.token)}`, withPrefix) : "";

  const send = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email.trim() || !state.token) return;
    setSending(true);
    setSendError("");
    const res = await callApi(publicApi(slug, "/resume-email"), { method: "POST", body: { token: state.token, email: email.trim() } });
    setSending(false);
    if (res.ok) setSent(true);
    else setSendError(res.data?.error || tr("errorGeneric"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="normal-case">{tr("resumeTitle")}</DialogTitle>
          <DialogDescription>{tr("resumeBody")}</DialogDescription>
        </DialogHeader>
        {state.status === "saving" || state.status === "idle" ? (
          <div className="flex justify-center py-6">
            <LogoLoading size={36} />
          </div>
        ) : state.status === "error" ? (
          <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{tr("resumeFailed")}</p>
        ) : (
          <div className="grid gap-4">
            <CopyField value={link} tr={tr} label={tr("copyLink")} />
            <form onSubmit={send} className="grid gap-1.5">
              <Label htmlFor="gf-resume-email" className="text-xs font-normal text-text-secondary">
                {tr("resumeEmail")}
              </Label>
              <div className="flex gap-2">
                <Input id="gf-resume-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface-card" placeholder="you@example.com" />
                <Button type="submit" variant="outline" disabled={sending || !email.trim()} className="shrink-0">
                  {sending ? <Loader2 className="animate-spin" /> : <Mail />}
                  {tr("sendLink")}
                </Button>
              </div>
              {sent && <p className="text-xs text-emerald-600 dark:text-emerald-400">{tr("linkSent")}</p>}
              {sendError && <p className="text-xs text-red-500 dark:text-red-400">{sendError}</p>}
            </form>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {tr("ok")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
