"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";
import { withPrefix } from "@/lib/workspace/base-path";

const noopSubscribe = () => () => {};

// Absolute app base URL (env first, else the current origin) including the deployment prefix.
export function useAppBase() {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
    () => process.env.NEXT_PUBLIC_APP_URL || "",
  );
  return (path) => `${origin.replace(/\/$/, "")}${withPrefix(path)}`;
}

export async function copyText(text, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
    return true;
  } catch {
    toast.error("Couldn't copy to the clipboard.");
    return false;
  }
}

// Monospace snippet with a copy button.
export function CodeBlock({ code, className, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  const copyButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6 shrink-0 text-text-tertiary", !label && "absolute right-1.5 top-1.5")}
      aria-label="Copy snippet"
      onClick={copy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
  return (
    <div className={cn("relative flex min-w-0 flex-col rounded-lg border border-border bg-surface-card", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2 border-b border-border py-1 pl-3 pr-1.5">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-text-tertiary">{label}</p>
          {copyButton}
        </div>
      ) : (
        copyButton
      )}
      {/* Wrap long lines (URLs, one-line snippets) instead of a per-card scrollbar. */}
      <pre className={cn("flex-1 whitespace-pre-wrap p-3 font-mono text-xs leading-5 text-foreground [overflow-wrap:anywhere]", !label && "pr-10")}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
