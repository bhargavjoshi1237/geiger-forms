// Maps a form's design settings (theme, cover, logo) to CSS variables + classes for the public filler root.
// Token values mirror app/globals.css so a forced light/dark form looks native regardless of the app theme.

const LIGHT = {
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.141 0.005 285.823)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.141 0.005 285.823)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.141 0.005 285.823)",
  "--primary": "oklch(0.21 0.006 285.885)",
  "--primary-foreground": "oklch(0.985 0 0)",
  "--secondary": "oklch(0.967 0.001 286.375)",
  "--secondary-foreground": "oklch(0.21 0.006 285.885)",
  "--muted": "oklch(0.967 0.001 286.375)",
  "--muted-foreground": "oklch(0.552 0.016 285.938)",
  "--accent": "oklch(0.967 0.001 286.375)",
  "--accent-foreground": "oklch(0.21 0.006 285.885)",
  "--destructive": "oklch(0.577 0.245 27.325)",
  "--border": "oklch(0.92 0.004 286.32)",
  "--input": "oklch(0.92 0.004 286.32)",
  "--ring": "oklch(0.705 0.015 286.067)",
  "--surface-subtle": "#f9fafb",
  "--surface-card": "#ffffff",
  "--surface-active": "#f3f4f6",
  "--surface-hover": "#f3f4f6",
  "--surface-dialog": "#ffffff",
  "--surface-strong": "#e5e7eb",
  "--border-strong": "#d4d4d4",
  "--text-secondary": "#525252",
  "--text-tertiary": "#737373",
};

const DARK = {
  "--background": "#161616",
  "--foreground": "#e7e7e7",
  "--card": "#202020",
  "--card-foreground": "#e7e7e7",
  "--popover": "#2e2e2e",
  "--popover-foreground": "#e7e7e7",
  "--primary": "#ffffff",
  "--primary-foreground": "#161616",
  "--secondary": "#1a1a1a",
  "--secondary-foreground": "#e7e7e7",
  "--muted": "#1a1a1a",
  "--muted-foreground": "#a3a3a3",
  "--accent": "#242424",
  "--accent-foreground": "#e7e7e7",
  "--destructive": "#7f1d1d",
  "--border": "#333333",
  "--input": "#242424",
  "--ring": "#474747",
  "--surface-subtle": "#1a1a1a",
  "--surface-card": "#202020",
  "--surface-active": "#242424",
  "--surface-hover": "#2a2a2a",
  "--surface-dialog": "#2e2e2e",
  "--surface-strong": "#333333",
  "--border-strong": "#474747",
  "--text-secondary": "#737373",
  "--text-tertiary": "#525252",
};

const RADII = {
  sm: { radius: "0.375rem", input: "4px" },
  md: { radius: "0.625rem", input: "6px" },
  lg: { radius: "0.95rem", input: "10px" },
};

const FONTS = {
  sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  serif: "var(--font-merriweather), ui-serif, Georgia, serif",
  mono: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidAccent(value) {
  return HEX_RE.test(String(value || "").trim());
}

function expandHex(hex) {
  const h = hex.replace("#", "");
  return h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
}

// Relative luminance (WCAG) of a hex colour.
export function luminance(hex) {
  const h = expandHex(hex);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Readable foreground (near-black or white) for text on the accent.
export function contrastText(hex) {
  return luminance(hex) > 0.42 ? "#111111" : "#ffffff";
}

// "dark" | "light" | "auto" → the concrete mode, or null when the app's own theme should apply.
export function resolveMode(mode, prefersDark) {
  if (mode === "light" || mode === "dark") return mode;
  if (prefersDark === true) return "dark";
  if (prefersDark === false) return "light";
  return null;
}

// Theme for the filler root: { mode, className, style, background, fontFamily, logoUrl }.
export function buildTheme(settings, { prefersDark, embed = false } = {}) {
  const theme = settings?.theme || {};
  const mode = resolveMode(theme.mode || "dark", prefersDark);
  const style = mode === "light" ? { ...LIGHT } : mode === "dark" ? { ...DARK } : {};

  const accent = isValidAccent(theme.accent) ? theme.accent.trim() : "";
  if (accent) {
    style["--primary"] = accent;
    style["--primary-foreground"] = contrastText(accent);
    style["--ring"] = accent;
    style["--gf-accent"] = accent;
  } else {
    style["--gf-accent"] = "var(--primary)";
  }

  const radius = RADII[theme.radius] || RADII.md;
  style["--radius"] = radius.radius;
  style["--input-box-radius"] = radius.input;

  const fontFamily = FONTS[theme.font] || FONTS.sans;
  style.fontFamily = fontFamily;

  const coverUrl = settings?.coverUrl || "";
  let background = { type: "plain" };
  if (theme.background === "image" && coverUrl) background = { type: "image", url: coverUrl };
  else if (theme.background === "gradient") background = { type: "gradient" };

  return {
    mode,
    accent,
    className: mode === "dark" ? "dark" : mode === "light" ? "light" : "",
    style,
    background: embed ? { type: "transparent" } : background,
    fontFamily,
    coverUrl: settings?.coverStyle === "cover" || coverUrl ? coverUrl : "",
    showCover: settings?.coverStyle === "cover",
    logoUrl: settings?.showIcon || settings?.logoUrl ? settings?.logoUrl || "" : "",
    showIcon: Boolean(settings?.showIcon),
    branding: settings?.branding !== false,
  };
}

// Inline background for the page canvas (gradient tinted by the accent, or a cover image).
export function backgroundStyle(themeResult) {
  const bg = themeResult?.background || { type: "plain" };
  if (bg.type === "transparent") return { background: "transparent" };
  if (bg.type === "image") {
    return {
      backgroundImage: `linear-gradient(color-mix(in oklab, var(--background) 72%, transparent), var(--background) 70%), url("${encodeURI(bg.url)}")`,
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundAttachment: "fixed",
    };
  }
  if (bg.type === "gradient") {
    return {
      backgroundImage:
        "radial-gradient(1200px 600px at 10% -10%, color-mix(in oklab, var(--gf-accent) 22%, transparent), transparent 60%), radial-gradient(900px 500px at 110% 10%, color-mix(in oklab, var(--gf-accent) 14%, transparent), transparent 55%)",
    };
  }
  return {};
}

// CSS variable entries only (for mirroring onto <body> so portalled popovers match).
export function cssVariables(style) {
  return Object.entries(style || {}).filter(([key]) => key.startsWith("--"));
}
