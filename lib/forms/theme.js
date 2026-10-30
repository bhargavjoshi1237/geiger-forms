// Maps a form's design settings (theme, cover, logo) to CSS variables + classes for the public filler root.
// Token values mirror app/globals.css so a forced light/dark form looks native, except the text, input and ring tokens tuned for WCAG AA (mirrored for auto mode in globals.css).

import { fontStack, fontStylesheetUrl } from "./fonts";

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
  "--muted-foreground": "#6b6b75",
  "--accent": "oklch(0.967 0.001 286.375)",
  "--accent-foreground": "oklch(0.21 0.006 285.885)",
  "--destructive": "oklch(0.577 0.245 27.325)",
  "--border": "oklch(0.92 0.004 286.32)",
  "--input": "#8a8a8a",
  "--ring": "#71717a",
  "--surface-subtle": "#f9fafb",
  "--surface-card": "#ffffff",
  "--surface-active": "#e5e7eb",
  "--surface-hover": "#f3f4f6",
  "--surface-dialog": "#ffffff",
  "--surface-strong": "#e5e7eb",
  "--border-strong": "#8a8a8a",
  "--text-secondary": "#525252",
  "--text-tertiary": "#6b6b6b",
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
  "--destructive": "#ef4444",
  "--border": "#333333",
  "--input": "#7a7a7a",
  "--ring": "#a3a3a3",
  "--surface-subtle": "#1a1a1a",
  "--surface-card": "#202020",
  "--surface-active": "#242424",
  "--surface-hover": "#2a2a2a",
  "--surface-dialog": "#2e2e2e",
  "--surface-strong": "#333333",
  "--border-strong": "#7a7a7a",
  "--text-secondary": "#a3a3a3",
  "--text-tertiary": "#999999",
};

const RADII = {
  none: { radius: "0rem", input: "0px" },
  sm: { radius: "0.375rem", input: "4px" },
  md: { radius: "0.625rem", input: "6px" },
  lg: { radius: "0.95rem", input: "10px" },
  full: { radius: "1.5rem", input: "18px" },
};

// Weights the filler renders; titles also ask for 400 so single-weight display families load (browsers fetch only faces in use).
const BODY_WEIGHTS = [400, 500, 600, 700];
export const HEADING_WEIGHTS = [400, 600, 700];

// Settings keys that make up a form's look; saved workspace themes store exactly these.
const DESIGN_KEYS = ["theme", "coverStyle", "coverGradient", "coverUrl", "showIcon", "logoUrl", "logoAlt"];

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidAccent(value) {
  return HEX_RE.test(String(value || "").trim());
}

function expandHex(hex) {
  const h = hex.replace("#", "");
  return h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
}

// Surfaces an accent sits on per mode; "auto" (app theme decides at runtime) must clear both.
const SURFACES = {
  light: ["#ffffff", "#f9fafb", "#f3f4f6"],
  dark: ["#161616", "#1a1a1a", "#202020", "#2a2a2a"],
};
const CANVAS = { light: ["#ffffff"], dark: ["#161616"], auto: ["#ffffff", "#161616"] };
// Where a failing accent is nudged towards, nearest first; each end point passes every check.
const NUDGE_TARGETS = { light: ["#000000"], dark: ["#000000", "#ffffff"], auto: ["#8a8a8a"] };
const MIN_TEXT = 4.5;
const MIN_UI = 3;

// Light and dark token sets, exported so tests can check every text/surface pair.
export const THEME_TOKENS = { light: LIGHT, dark: DARK };

// Relative luminance (WCAG) of a hex colour.
export function luminance(hex) {
  const h = expandHex(hex);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two hex colours (1 to 21).
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// sRGB mix of `hex` towards `target` by `amount` (0 to 1).
export function mixHex(hex, target, amount) {
  const [a, b] = [expandHex(hex), expandHex(target)];
  const channel = (i) => {
    const [x, y] = [a, b].map((h) => parseInt(h.slice(i, i + 2), 16));
    return Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

// Foreground for text on the accent: white when it clears 4.5:1, else near-black, else black (black always clears it when white doesn't).
export function contrastText(hex) {
  return ["#ffffff", "#111111"].find((fg) => contrastRatio(fg, hex) >= MIN_TEXT) || "#000000";
}

function accentPasses(hex, mode) {
  const surfaces = mode === "auto" ? [...SURFACES.light, ...SURFACES.dark] : SURFACES[mode];
  if (surfaces.some((s) => contrastRatio(hex, s) < MIN_UI)) return false;
  const fg = contrastText(hex);
  // Buttons hover at bg-primary/90, so the text must also clear 4.5:1 once blended with the canvas.
  return CANVAS[mode].every((canvas) => contrastRatio(fg, mixHex(hex, canvas, 0.1)) >= MIN_TEXT);
}

// Safe --primary and --primary-foreground for an owner's accent: 3:1 against every surface, 4.5:1 text at rest and on hover; only failing accents shift, by the smallest step that passes.
export function accentTokens(accent, mode) {
  const key = mode === "light" || mode === "dark" ? mode : "auto";
  let primary = accent;
  for (let step = 1; step <= 20 && !accentPasses(primary, key); step += 1) {
    const passing = NUDGE_TARGETS[key].map((target) => mixHex(accent, target, step / 20)).find((c) => accentPasses(c, key));
    if (passing) primary = passing;
  }
  return { primary, foreground: contrastText(primary) };
}

// "dark" | "light" | "auto" → the concrete mode, or null when the app's own theme should apply.
export function resolveMode(mode, prefersDark) {
  if (mode === "light" || mode === "dark") return mode;
  if (prefersDark === true) return "dark";
  if (prefersDark === false) return "light";
  return null;
}

// Copy of the design keys present in `source` (form settings, a preset or a saved theme), safe to store or apply.
export function pickDesign(source) {
  return Object.fromEntries(DESIGN_KEYS.filter((key) => source?.[key] !== undefined).map((key) => [key, key === "theme" ? { ...source.theme } : source[key]]));
}

// Theme for the filler root: { mode, className, style, background, fontFamily, fontUrl, logoUrl }.
export function buildTheme(settings, { prefersDark, embed = false } = {}) {
  const theme = settings?.theme || {};
  const mode = resolveMode(theme.mode || "dark", prefersDark);
  const style = mode === "light" ? { ...LIGHT, colorScheme: "light" } : mode === "dark" ? { ...DARK, colorScheme: "dark" } : {};

  const accent = isValidAccent(theme.accent) ? theme.accent.trim() : "";
  if (accent) {
    const { primary, foreground } = accentTokens(accent, mode);
    style["--primary"] = primary;
    style["--primary-foreground"] = foreground;
    style["--ring"] = primary;
    style["--gf-accent"] = accent;
  } else {
    style["--gf-accent"] = "var(--primary)";
  }

  const radius = RADII[theme.radius] || RADII.md;
  style["--radius"] = radius.radius;
  style["--input-box-radius"] = radius.input;

  const fontFamily = fontStack(theme.font);
  const headingFont = theme.headingFont || theme.font;
  style.fontFamily = fontFamily;
  style["--gf-font-heading"] = fontStack(headingFont);

  const coverUrl = settings?.coverUrl || "";
  let background = { type: "plain" };
  // Conversational text sits directly on the canvas, so its image scrim is heavier than the classic layout's card-backed one.
  if (theme.background === "image" && coverUrl) background = { type: "image", url: coverUrl, scrim: settings?.layout === "conversational" ? 92 : 72 };
  else if (theme.background === "gradient") background = { type: "gradient" };

  return {
    mode,
    accent,
    className: mode ? `gf-theme ${mode}` : "gf-theme",
    style,
    background: embed ? { type: "transparent" } : background,
    fontFamily,
    fontUrl: fontStylesheetUrl([[theme.font, BODY_WEIGHTS], [headingFont, HEADING_WEIGHTS]]),
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
      backgroundImage: `linear-gradient(color-mix(in oklab, var(--background) ${bg.scrim ?? 72}%, transparent), var(--background) 70%), url("${encodeURI(bg.url)}")`,
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
