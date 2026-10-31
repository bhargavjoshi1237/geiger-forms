// Owner CSS and per-element styling for the public filler, always scoped to the filler root and unable to load anything.

export const MAX_CUSTOM_CSS = 20000;
const ROOT = "[data-gf-root]";

// Stable hooks owners can target from custom CSS; the builder lists them next to the editor.
export const CSS_HOOKS = ['[data-gf-part="hero"]', '[data-gf-part="title"]', '[data-gf-part="description"]', '[data-gf-part="card"]', '[data-gf-part="label"]', '[data-gf-part="primary-action"]', '[data-gf-part="side-panel"]', '[data-gf-part="cover"]', '[data-gf-part="progress"]', '[data-gf-field="<field id>"]'];

const ALLOWED_AT_RULES = new Set(["media", "supports", "container"]);
// Anything that can fetch: React writes typed answers into value attributes, so one url() with an attribute selector would leak them.
const BLOCKED = /(?:^|[^a-z-])(?:url|src|image|image-set|-webkit-image-set|cross-fade|element|paint|expression)\s*\(|javascript:|behavior\s*:|-moz-binding/i;

// Reads the source once, dropping comments; rejects what would make the browser tokenise it differently from this check.
function tokenise(source) {
  let css = "";
  let bare = "";
  let depth = 0;
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (c === "\\") return { error: "Backslash escapes aren't allowed." };
    if (c === "<") return { error: "The “<” character isn't allowed." };
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) return { error: "A comment is never closed." };
      i = end + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < source.length && source[j] !== c && source[j] !== "\n" && source[j] !== "\r" && source[j] !== "\f") {
        if (source[j] === "\\") return { error: "Backslash escapes aren't allowed." };
        j += 1;
      }
      if (source[j] !== c) return { error: "A quoted string is never closed." };
      css += source.slice(i, j + 1);
      i = j;
      continue;
    }
    if (c === "{") depth += 1;
    if (c === "}") {
      depth -= 1;
      if (depth < 0) return { error: "There's a closing “}” without an opening “{”." };
    }
    css += c;
    bare += c;
  }
  if (depth !== 0) return { error: "A “{” is never closed." };
  return { css: css.trim(), bare };
}

// { css, error }: `css` is safe to scope and render; on any problem it is empty and `error` says why.
export function checkCustomCss(source) {
  const text = typeof source === "string" ? source : "";
  if (!text.trim()) return { css: "", error: "" };
  if (text.length > MAX_CUSTOM_CSS) return { css: "", error: `Custom CSS is limited to ${MAX_CUSTOM_CSS.toLocaleString("en-US")} characters.` };
  const { css, bare, error } = tokenise(text);
  if (error) return { css: "", error };
  if (BLOCKED.test(css)) return { css: "", error: "CSS can't load anything: url(), image functions and scripts aren't allowed. Upload images in the Design panel instead." };
  const atRule = [...bare.matchAll(/@([a-z-]*)/gi)].map((m) => m[1].toLowerCase()).find((name) => !ALLOWED_AT_RULES.has(name));
  if (atRule !== undefined) return { css: "", error: `@${atRule} isn't allowed. Only @media, @supports and @container are.` };
  return { css, error: "" };
}

// Form controls only: the language switcher is page chrome, so it opts out with data-gf-chrome.
const INPUTS = '[data-slot="input"],[data-slot="textarea"],[data-slot="select-trigger"]:not([data-gf-chrome])';
const ACTION = '[data-gf-part="primary-action"]';
const SURFACES = '[data-gf-part="hero"],[data-gf-part="card"]';
const GROUP_LABEL = '[data-gf-part="label"][data-gf-group]:not([data-gf-large])';

// Choice → declarations; anything not listed here is ignored, so stored values never reach the stylesheet.
const ELEMENT_RULES = {
  titleSize: { sm: ['[data-gf-part="title"]', "font-size:1.25rem"], lg: ['[data-gf-part="title"]', "font-size:2.5rem;line-height:1.15"] },
  titleAlign: { center: ['[data-gf-part="hero"]', "text-align:center"] },
  titleCase: { upper: ["&", "--gf-heading-case:uppercase"] },
  labelSize: { lg: ['[data-gf-part="label"]:not([data-gf-large])', "font-size:1rem"], sm: ['[data-gf-part="label"]:not([data-gf-large])', "font-size:0.8125rem"] },
  labelWeight: { normal: ['[data-gf-part="label"]', "font-weight:400"], bold: ['[data-gf-part="label"]', "font-weight:700"] },
  // Choice questions read as section headings; single inputs keep their small labels.
  labelStyle: { display: [GROUP_LABEL, "font-family:var(--gf-font-heading);font-size:1.625rem;line-height:1.15;font-weight:400;font-synthesis-weight:none;text-transform:var(--gf-heading-case,none)"] },
  // The counter is reset per page by the views, so numbering carries across pages and skips whatever logic hides.
  numbering: { on: ['[data-gf-part="label"]:not([data-gf-large])::before', "counter-increment:gf-question;content:counter(gf-question,decimal-leading-zero);display:block;margin-bottom:0.25rem;font-family:var(--gf-font-body);font-size:0.75rem;line-height:1rem;font-weight:600;letter-spacing:0.06em;text-transform:none;color:color-mix(in oklab,var(--primary) 70%,var(--foreground))"] },
  // Inputs keep a visible edge in every style so the field boundary still clears 3:1.
  inputStyle: {
    underline: [INPUTS, "border-width:0 0 1px;border-radius:0;background:transparent"],
    filled: [INPUTS, "border-color:transparent;border-bottom-color:var(--input);background:var(--surface-active)"],
  },
  buttonStyle: {
    outline: [ACTION, "background:transparent;color:var(--foreground);border:1px solid var(--primary)"],
    gradient: [ACTION, "background:linear-gradient(135deg,var(--primary),var(--gf-accent2));box-shadow:0 10px 30px -10px color-mix(in oklab,var(--primary) 70%,transparent);&:hover{box-shadow:0 14px 34px -8px color-mix(in oklab,var(--primary) 90%,transparent)}"],
  },
  buttonShape: { pill: ['[data-slot="button"]:not([data-gf-chrome])', "border-radius:999px"] },
  buttonWidth: { full: [ACTION, "width:100%"] },
  cardStyle: {
    flat: [SURFACES, "background:transparent;border-color:transparent;box-shadow:none"],
    glass: [SURFACES, "background:color-mix(in oklab,var(--card) 62%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 30px 80px -40px var(--gf-card-shadow);& > [data-gf-part=\"cover\"]{mask-image:linear-gradient(#000 40%,transparent);-webkit-mask-image:linear-gradient(#000 40%,transparent)}"],
  },
};

function elementRules(elements) {
  return Object.entries(ELEMENT_RULES)
    .filter(([key, choices]) => Object.hasOwn(choices, String(elements?.[key])))
    .map(([key, choices]) => choices[elements[key]])
    .map(([selector, declarations]) => `${selector}{${declarations}}`)
    .join("");
}

// Stylesheet for the filler: element choices first so owner CSS can override them, all nested under the root.
export function buildCustomStylesheet(elements, customCss) {
  const body = [elementRules(elements), checkCustomCss(customCss).css].filter(Boolean).join("\n");
  return body ? `${ROOT}{${body}}` : "";
}
