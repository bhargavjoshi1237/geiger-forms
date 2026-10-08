"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Field } from "@geiger/ui/screen-kit";
import { callApi } from "@/lib/forms/api";
import { SignaturePad } from "./signature-pad";

const PRIMARY = "bg-primary text-primary-foreground hover:bg-primary/90";

const EDIT_WINDOWS = [
  { value: "24", label: "24 hours" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" },
];

// Countersign: drawn signature + typed name → POST /countersign.
export function CountersignDialog({ open, onOpenChange, response, onSigned }) {
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Type your full name to countersign.");
    if (!signature) return toast.error("Draw your signature first.");
    setSaving(true);
    const { ok, data } = await callApi(`/api/responses/${response.id}/countersign`, {
      method: "POST",
      body: { name: name.trim(), signature },
    });
    setSaving(false);
    if (!ok) return toast.error(data?.error || "Couldn't countersign this response.");
    toast.success("Response countersigned");
    onSigned?.(data.countersign || { name: name.trim(), at: new Date().toISOString() });
    setName("");
    setSignature("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Countersign response</DialogTitle>
          <DialogDescription>Your signature, name and the time are stamped onto this response and its PDF.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {/* Remount the pad per open so a cancelled draft doesn't linger. */}
          {open ? <SignaturePad onChange={setSignature} /> : null}
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button type="button" className={PRIMARY} onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Countersign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Request edit: generates (and emails when possible) a time-boxed edit link for the respondent.
export function RequestEditDialog({ open, onOpenChange, response }) {
  const [message, setMessage] = useState("");
  const [windowHours, setWindowHours] = useState("168");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const close = (next) => {
    if (!next) {
      setResult(null);
      setMessage("");
      setCopied(false);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    setSaving(true);
    const { ok, data } = await callApi(`/api/responses/${response.id}/request-edit`, {
      method: "POST",
      body: { message: message.trim() || undefined, windowHours: Number(windowHours) },
    });
    setSaving(false);
    if (!ok) return toast.error(data?.error || "Couldn't create an edit link.");
    setResult({ url: data.url, emailed: data.emailed });
    toast.success(data.emailed ? `Edit link emailed to ${response.email}` : "Edit link ready to share");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request edit from respondent</DialogTitle>
          <DialogDescription>
            {response.email ? `Sends ${response.email} a private link to update their answers.` : "Creates a private link the respondent can use to update their answers."}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="grid gap-3">
            <Field label="Edit link" hint={result.emailed ? "Also emailed to the respondent." : "No email was sent — share this link yourself."}>
              <div className="flex gap-2">
                <Input readOnly value={result.url} onFocus={(e) => e.target.select()} className="text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy link">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </Field>
          </div>
        ) : (
          <div className="grid gap-4">
            <Field label="Message" hint="Optional note included in the email.">
              <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Could you update your mailing address?" />
            </Field>
            <Field label="Link expires after">
              <Select value={windowHours} onValueChange={setWindowHours}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EDIT_WINDOWS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
        <DialogFooter>
          {result ? (
            <Button type="button" className={PRIMARY} onClick={() => close(false)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" type="button" onClick={() => close(false)} disabled={saving}>Cancel</Button>
              <Button type="button" className={PRIMARY} onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {response.email ? "Send edit link" : "Create edit link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Destructive confirm used for single and bulk deletes.
export function ConfirmDeleteDialog({ open, onOpenChange, count = 1, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {count === 1 ? "response" : `${count} responses`}?</DialogTitle>
          <DialogDescription>
            {count === 1 ? "This response is" : "These responses are"} moved out of the inbox and purged by the retention policy. Exports already taken are unaffected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button type="button" className="bg-red-500/90 text-white hover:bg-red-500" onClick={confirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
