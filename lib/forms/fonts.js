// Curated font families for form themes. Only ids from this list ever reach a font URL.
// Self-hosted entries come from next/font in app/layout.js; the rest load from Bunny Fonts (a GDPR-friendly Google Fonts mirror).

export const FONT_CATEGORIES = [
  { value: "sans", label: "Sans serif" },
  { value: "serif", label: "Serif" },
  { value: "display", label: "Display" },
  { value: "mono", label: "Monospace" },
];

const FALLBACKS = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, serif",
  display: "ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, monospace",
};

// "sans" | "serif" | "mono" are the original theme font ids, kept so stored forms resolve unchanged.
const SELF_HOSTED = [
  { id: "sans", name: "Geist", category: "sans", variable: "--font-geist-sans" },
  { id: "space-grotesk", name: "Space Grotesk", category: "sans", variable: "--font-space-grotesk" },
  { id: "poppins", name: "Poppins", category: "sans", variable: "--font-poppins" },
  { id: "serif", name: "Merriweather", category: "serif", variable: "--font-merriweather" },
  { id: "playfair-display", name: "Playfair Display", category: "serif", variable: "--font-playfair" },
  { id: "mono", name: "Geist Mono", category: "mono", variable: "--font-geist-mono" },
];

const BUNNY = {
  sans: [
    "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Source Sans 3", "Nunito", "Nunito Sans", "Raleway", "Work Sans",
    "DM Sans", "Manrope", "Plus Jakarta Sans", "Rubik", "Karla", "Mulish", "Outfit", "Figtree", "Lexend", "Urbanist",
    "Sora", "IBM Plex Sans", "Noto Sans", "PT Sans", "Fira Sans", "Barlow", "Archivo", "Public Sans", "Red Hat Display",
    "Albert Sans", "Onest", "Hanken Grotesk", "Be Vietnam Pro", "Quicksand", "Josefin Sans", "Cabin", "Heebo",
  ],
  serif: [
    "Lora", "EB Garamond", "Cormorant Garamond", "Libre Baskerville", "Crimson Pro", "Source Serif 4", "PT Serif", "Noto Serif",
    "Roboto Slab", "Bitter", "Zilla Slab", "Spectral", "Fraunces", "DM Serif Display", "Newsreader", "Literata",
    "Libre Caslon Text", "IBM Plex Serif", "Instrument Serif", "Young Serif", "Alegreya", "Cardo", "Arvo",
  ],
  display: [
    "Bebas Neue", "Oswald", "Anton", "Abril Fatface", "Archivo Black", "Bricolage Grotesque", "Syne", "Unbounded", "Righteous",
    "Comfortaa", "Fredoka", "Alfa Slab One", "Chakra Petch", "Orbitron", "Big Shoulders Display", "Bungee", "Lobster",
    "Pacifico", "Caveat", "Dancing Script", "Satisfy", "Permanent Marker", "Amatic SC",
  ],
  mono: [
    "JetBrains Mono", "Fira Code", "IBM Plex Mono", "Roboto Mono", "Source Code Pro", "Space Mono", "DM Mono", "Inconsolata",
    "Ubuntu Mono", "Courier Prime", "Red Hat Mono",
  ],
};

export const FONT_FAMILIES = [
  ...SELF_HOSTED,
  ...Object.entries(BUNNY).flatMap(([category, names]) => names.map((name) => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name, category }))),
];

const BY_ID = new Map(FONT_FAMILIES.map((f) => [f.id, f]));

export function findFont(id) {
  return BY_ID.get(id) || null;
}

// CSS font-family for a font id with its system fallback; unknown ids fall back to Geist.
export function fontStack(id) {
  const font = BY_ID.get(id) || BY_ID.get("sans");
  return `${font.variable ? `var(${font.variable})` : `"${font.name}"`}, ${FALLBACKS[font.category]}`;
}

// Bunny Fonts stylesheet for [id, weights] pairs (display=swap), or "" when every font is self-hosted.
export function fontStylesheetUrl(requests) {
  const wanted = new Map();
  for (const [id, weights] of requests) {
    const font = BY_ID.get(id);
    if (font && !font.variable) wanted.set(font.id, new Set([...(wanted.get(font.id) || []), ...weights]));
  }
  if (!wanted.size) return "";
  const families = [...wanted].map(([id, weights]) => `${id}:${[...weights].sort((a, b) => a - b).join(",")}`);
  return `https://fonts.bunny.net/css?family=${families.join("|")}&display=swap`;
}
