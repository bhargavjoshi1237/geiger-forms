"use client";

import { useEffect, useRef } from "react";
import Logo from "@geiger/ui/logo";
import { Globe } from "lucide-react";
import { Avatar, AvatarFallback } from "@geiger/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Topbar as SuiteTopbar } from "@geiger/ui/topbar";
import { LOCALES } from "@/lib/forms/i18n";
import { cn } from "@/lib/utils";
import { backgroundStyle, cssVariables } from "@/lib/forms/theme";
import { withPrefix } from "@/lib/workspace/base-path";

// Mirrors the form theme (tokens, mode, body font) onto <body> so portalled popovers/dialogs match, sets the page's language and direction, and makes embeds transparent.
function useBodyTheme(theme, transparent, lang, dir) {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const vars = cssVariables(theme?.style);
    const previous = vars.map(([key]) => [key, body.style.getPropertyValue(key)]);
    for (const [key, value] of vars) body.style.setProperty(key, value);
    const prevBg = body.style.background;
    const prevHtmlBg = html.style.background;
    const prevFont = body.style.fontFamily;
    const prevLang = html.lang;
    const prevDir = html.dir;
    const prevScheme = body.style.colorScheme;
    if (lang) html.lang = lang;
    html.dir = dir;
    // A body-level mode class makes `dark:` utilities in portals follow the form, not the visitor's app theme.
    if (theme?.mode) {
      body.classList.add(theme.mode);
      body.style.colorScheme = theme.mode;
    }
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
      html.lang = prevLang;
      html.dir = prevDir;
      if (theme?.mode) body.classList.remove(theme.mode);
      body.style.colorScheme = prevScheme;
    };
  }, [theme, transparent, lang, dir]);
}

// Owner styles from buildTheme; React leaves <style> text unescaped except "</style", and checkCustomCss rejects "<" anyway.
export function CustomStyles({ css }) {
  return css ? <style>{css}</style> : null;
}

const SIDE_GRIDS = {
  split: { left: "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]", right: "lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" },
  "side-image": { left: "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]", right: "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" },
};

// Grid classes for a split or side-image page; the panel keeps its share of the width on either side.
export function sideGridClass(side) {
  return SIDE_GRIDS[side.layout][side.position];
}

// Decorative image (or accent glow when none is set) beside the form, with optional story text; a short band above it on small screens.
export function SidePanel({ side, stacked = false, className }) {
  const tags = side.tags || [];
  const hasText = Boolean(side.eyebrow || side.headline || tags.length);
  const onImage = Boolean(side.imageUrl);
  return (
    <div
      data-gf-part="side-panel"
      className={cn("relative overflow-hidden", hasText ? "h-72" : "h-40 sm:h-56", !stacked && "lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)]", !stacked && side.position === "right" && "lg:order-last", className)}
      style={side.imageUrl ? undefined : { background: "linear-gradient(135deg, color-mix(in oklab, var(--gf-accent) 55%, var(--background)), var(--background))" }}
    >
      {side.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied external image URL
        <img src={side.imageUrl} alt={side.imageAlt} className="size-full object-cover" />
      ) : null}
      {onImage && (hasText || side.credit) ? <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(4 8 16 / 0.35) 0%, rgb(4 8 16 / 0) 35%, rgb(4 8 16 / 0.85) 100%)" }} /> : null}
      {side.credit ? <span className={cn("absolute end-4 top-3.5 text-[10px]", onImage ? "text-white/85" : "text-text-secondary")}>{side.credit}</span> : null}
      {hasText ? (
        <div className={cn("absolute inset-x-6 bottom-6", !stacked && "lg:inset-x-10 lg:bottom-10", onImage ? "text-white" : "text-foreground")}>
          {side.eyebrow ? <p className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", onImage ? "text-white/85" : "text-text-secondary")}>{side.eyebrow}</p> : null}
          {side.headline ? <p className={cn("mt-3 font-(family-name:--gf-font-heading) text-3xl leading-[1.02] [text-transform:var(--gf-heading-case,none)] [text-wrap:balance]", !stacked && "lg:text-5xl")}>{side.headline}</p> : null}
          {tags.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className={cn("rounded-full border px-3 py-1 text-xs backdrop-blur-sm", onImage ? "border-white/25 bg-white/10" : "border-border bg-surface-card")}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Themed root: CSS variables, mode class, font, page background, text direction, owner styles and the optional side panel.
export function FillerShell({ theme, embed = false, transparent = false, dir = "ltr", lang, header, footer, children }) {
  useBodyTheme(theme, transparent, lang, dir);
  const side = theme?.side;
  const content = (
    <>
      <main className={cn("mx-auto w-full", embed ? (transparent ? "px-1 pt-2" : "px-4 pt-6 sm:px-6") : "px-4 pt-6 sm:px-6 sm:pt-10")}>{children}</main>
      {footer && <footer className={cn("px-4 sm:px-6", embed ? (transparent ? "pb-2 pt-4" : "pb-6 pt-6") : "pb-16 pt-8")}>{footer}</footer>}
    </>
  );
  return (
    <div
      dir={dir}
      lang={lang}
      data-gf-root=""
      className={cn(theme?.className, "text-foreground antialiased", transparent ? "bg-transparent" : "bg-background", !embed && "min-h-[100dvh]")}
      style={{ ...(theme?.style || {}), ...backgroundStyle(theme) }}
    >
      {theme?.fontUrl ? <link rel="stylesheet" href={theme.fontUrl} /> : null}
      <CustomStyles css={theme?.customCss} />
      {!embed && header}
      {side ? (
        <div className={sideGridClass(side)}>
          <SidePanel side={side} />
          <div className="min-w-0">{content}</div>
        </div>
      ) : (
        content
      )}
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

// Language picker for forms with translations; hidden when there's only the form's own language.
export function LanguageSwitcher({ locales, value, onChange, tr, className }) {
  if (!locales || locales.length < 2) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-gf-chrome="" aria-label={tr("language")} className={cn("h-8 w-auto gap-1.5 bg-surface-card text-xs", className)}>
        <Globe className="size-3.5 text-text-secondary" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((code) => (
          <SelectItem key={code} value={code} lang={code}>
            {LOCALES.find((l) => l.value === code)?.label || code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Topbar has no props for these: sticky + form-tinted glass, no search, one title between sm and md, icon-only language on phones.
const TOPBAR_OVERRIDES = "sticky top-0 z-20 backdrop-blur-md [@media(max-height:480px)]:static [--topbar-bg:color-mix(in_oklab,var(--background)_80%,transparent)] [&_button[aria-label='Search']]:hidden max-md:[&_.group]:hidden max-sm:[&_[data-slot='select-value']]:hidden";

// Sidebar and notifications are workspace-only; a non-null slot stops Topbar rendering its fallbacks.
const EMPTY_SLOT = <></>;

// Topbar's logo link navigates in place, and the filler keeps no draft, so it opens a new tab to keep the respondent's answers.
function openHomeInNewTab(event) {
  const home = event.target.closest("a[aria-label='Home']");
  if (!home) return;
  event.preventDefault();
  window.open(home.href, "_blank", "noopener");
}

// Shared suite Topbar: brand mark | form title on the left, language and signed-in account on the right.
export function FillerHeader({ title, theme, user, languageSwitcher }) {
  const logo = theme?.showIcon && theme?.logoUrl ? theme.logoUrl : "";
  return (
    <div className={cn(TOPBAR_OVERRIDES, logo && "[&_.geiger-logo]:rounded-md [&_.geiger-logo]:object-cover [&_.geiger-logo]:[filter:none]!")} onClick={openHomeInNewTab}>
      <SuiteTopbar
        label={<span className="block max-w-[30vw] truncate sm:max-w-[40vw]" title={title}>{title}</span>}
        logoSrc={logo || withPrefix("/logo1.svg")}
        homeHref={withPrefix("/")}
        showHelp={false}
        sidebarTrigger={EMPTY_SLOT}
        notifications={EMPTY_SLOT}
        profile={
          <div className="flex shrink-0 items-center gap-2.5">
            {languageSwitcher}
            {user && (
              <div title={user.email || user.name}>
                <Avatar className="size-8 border border-border">
                  <AvatarFallback className="border-0 bg-surface-card text-[11px] font-semibold text-foreground">{initials(user.name || user.email)}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}

const FOOTER_LINK = "flex min-h-6 w-fit items-center gap-1.5 rounded-full border border-border bg-surface-subtle/80 px-3 py-1 text-[11px] text-text-secondary transition-colors hover:text-foreground";

// Footer links; the statement link shows on every form, including ones with Geiger branding off. Both open in a new tab so answers aren't lost.
export function FillerFooter({ tr, branding }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {branding && (
        <a href={withPrefix("/")} target="_blank" rel="noopener" className={FOOTER_LINK}>
          <Logo size={11} />
          {tr("poweredBy")}
          <span className="sr-only"> {tr("opensNewTab")}</span>
        </a>
      )}
      <a href={withPrefix("/accessibility")} target="_blank" rel="noopener" className={FOOTER_LINK}>
        {tr("accessibility")}
        <span className="sr-only"> {tr("opensNewTab")}</span>
      </a>
    </div>
  );
}

const TONES = {
  default: "border-border bg-surface-card text-text-secondary",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
};

// Centered card for gates, errors and terminal states; `focusOnMount` is for when it replaces a form the respondent was using.
export function StatusScreen({ icon: Icon, tone = "default", title, description, children, className, focusOnMount = false }) {
  const titleRef = useRef(null);
  useEffect(() => {
    if (focusOnMount) titleRef.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  return (
    <section data-gf-part="card" role={tone === "warning" || tone === "danger" ? "alert" : undefined} className={cn("mx-auto w-full max-w-lg rounded-2xl border border-border bg-surface-subtle p-8 text-center shadow-sm animate-in fade-in-0 zoom-in-95 duration-300", className)}>
      {Icon && (
        <div className={cn("mx-auto flex size-14 items-center justify-center rounded-2xl border", TONES[tone] || TONES.default)}>
          <Icon className="size-6" />
        </div>
      )}
      <h1 ref={titleRef} tabIndex={-1} className="mt-5 text-xl font-semibold text-foreground outline-none">
        {title}
      </h1>
      {description && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{description}</p>}
      {children && <div className="mt-7 flex flex-col items-center gap-3">{children}</div>}
    </section>
  );
}
