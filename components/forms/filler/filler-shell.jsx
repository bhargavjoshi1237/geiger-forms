"use client";

import { useEffect } from "react";
import Logo from "@geiger/ui/logo";
import { Avatar, AvatarFallback } from "@geiger/ui/avatar";
import { cn } from "@/lib/utils";
import { backgroundStyle, cssVariables } from "@/lib/forms/theme";
import { withPrefix } from "@/lib/workspace/base-path";

// Mirrors the form theme (tokens and body font) onto <body> so portalled popovers/dialogs match, and makes embeds transparent.
function useBodyTheme(theme, transparent) {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const vars = cssVariables(theme?.style);
    const previous = vars.map(([key]) => [key, body.style.getPropertyValue(key)]);
    for (const [key, value] of vars) body.style.setProperty(key, value);
    const prevBg = body.style.background;
    const prevHtmlBg = html.style.background;
    const prevFont = body.style.fontFamily;
    if (theme?.fontFamily) body.style.fontFamily = theme.fontFamily;
    if (transparent) {
      body.style.background = "transparent";
      html.style.background = "transparent";
    }
    return () => {
      for (const [key, value] of previous) {
        if (value) body.style.setProperty(key, value);
        else body.style.removeProperty(key);
      }
      body.style.background = prevBg;
      html.style.background = prevHtmlBg;
      body.style.fontFamily = prevFont;
    };
  }, [theme, transparent]);
}

// Themed root: CSS variables, mode class, font, page background and text direction.
export function FillerShell({ theme, embed = false, transparent = false, dir = "ltr", lang, header, children }) {
  useBodyTheme(theme, transparent);
  return (
    <div
      dir={dir}
      lang={lang}
      data-gf-root=""
      className={cn(theme?.className, "text-foreground antialiased", transparent ? "bg-transparent" : "bg-background", !embed && "min-h-[100dvh]")}
      style={{ ...(theme?.style || {}), ...backgroundStyle(theme) }}
    >
      {theme?.fontUrl ? <link rel="stylesheet" href={theme.fontUrl} /> : null}
      {!embed && header}
      <main className={cn("mx-auto w-full", embed ? (transparent ? "px-1 py-2" : "px-4 py-6 sm:px-6") : "px-4 pb-16 pt-6 sm:px-6 sm:pt-10")}>{children}</main>
    </div>
  );
}

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Full-width app bar in the suite Topbar style: brand mark | form title on the left, signed-in account on the right.
export function FillerHeader({ title, theme, user, tr }) {
  const logo = theme?.showIcon && theme?.logoUrl ? theme.logoUrl : "";
  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="flex size-8 shrink-0 items-center justify-center" aria-hidden="true">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied external logo URL
            <img src={logo} alt="" className="size-6 rounded-md object-cover" />
          ) : (
            <Logo size={20} />
          )}
        </span>
        <span className="min-w-0 truncate border-l border-border pl-3 text-sm font-semibold text-foreground">{title}</span>
      </div>
      {user && (
        <div className="flex shrink-0 items-center gap-2.5" title={user.email || user.name}>
          <span className="hidden text-xs text-text-secondary sm:inline">{tr("signedInAs", { name: user.name || user.email })}</span>
          <Avatar className="size-8 border border-border">
            <AvatarFallback className="border-0 bg-surface-card text-[11px] font-semibold text-foreground">{initials(user.name || user.email)}</AvatarFallback>
          </Avatar>
        </div>
      )}
    </header>
  );
}

export function PoweredBy({ tr }) {
  return (
    <a
      href={withPrefix("/")}
      target="_blank"
      rel="noopener"
      className="mx-auto mt-8 flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface-subtle/80 px-3 py-1 text-[11px] text-text-secondary transition-colors hover:text-foreground"
    >
      <Logo size={11} />
      {tr("poweredBy")}
    </a>
  );
}

const TONES = {
  default: "border-border bg-surface-card text-text-secondary",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
};

// Centered card for gates, errors and terminal states.
export function StatusScreen({ icon: Icon, tone = "default", title, description, children, className }) {
  return (
    <section className={cn("mx-auto w-full max-w-lg rounded-2xl border border-border bg-surface-subtle p-8 text-center shadow-sm animate-in fade-in-0 zoom-in-95 duration-300", className)}>
      {Icon && (
        <div className={cn("mx-auto flex size-14 items-center justify-center rounded-2xl border", TONES[tone] || TONES.default)}>
          <Icon className="size-6" />
        </div>
      )}
      <h1 className="mt-5 text-xl font-semibold text-foreground">{title}</h1>
      {description && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{description}</p>}
      {children && <div className="mt-7 flex flex-col items-center gap-3">{children}</div>}
    </section>
  );
}
