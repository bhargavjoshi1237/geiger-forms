import test from "node:test";
import assert from "node:assert/strict";

import { THEME_TOKENS, accentTokens, backgroundStyle, buildTheme, contrastRatio, contrastText, luminance, mixHex } from "./theme.js";

const SURFACES = {
  light: ["#ffffff", "#f9fafb", "#f3f4f6"],
  dark: ["#161616", "#1a1a1a", "#202020", "#2a2a2a"],
};
const CANVAS = { light: ["#ffffff"], dark: ["#161616"], auto: ["#ffffff", "#161616"] };

// Every 3-digit hex colour: enough to hit each band of hue and lightness.
function accentGrid() {
  const hex = "0123456789abcdef";
  const out = [];
  for (const r of hex) for (const g of hex) for (const b of hex) out.push(`#${r}${r}${g}${g}${b}${b}`);
  return out;
}

const PRESETS = ["#6366f1", "#0ea5e9", "#10b981", "#b45309", "#3b82f6", "#ec4899", "#ef4444", "#84cc16"];

test("contrast ratio matches the WCAG reference values", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(contrastRatio("#777777", "#ffffff").toFixed(2), "4.48");
  assert.equal(contrastRatio("#000", "#fff"), 21);
  assert.equal(contrastRatio("#ffffff", "#000000"), contrastRatio("#000000", "#ffffff"));
  assert.ok(luminance("#ffffff") > 0.999);
});

test("contrastText clears 4.5:1 on every accent", () => {
  for (const accent of accentGrid()) {
    const ratio = contrastRatio(contrastText(accent), accent);
    assert.ok(ratio >= 4.5, `${contrastText(accent)} on ${accent} is ${ratio.toFixed(2)}`);
  }
});

test("contrastText fixes the mid-tone accents the old threshold failed", () => {
  // #3b82f6 and pure red took white text before, at 3.68:1 and 4.00:1.
  assert.ok(contrastRatio(contrastText("#3b82f6"), "#3b82f6") >= 4.5);
  assert.ok(contrastRatio(contrastText("#ff0000"), "#ff0000") >= 4.5);
  assert.equal(contrastText("#000000"), "#ffffff");
  assert.equal(contrastText("#ffffff"), "#111111");
});

test("mixHex hits both ends and rounds the middle", () => {
  assert.equal(mixHex("#123456", "#ffffff", 0), "#123456");
  assert.equal(mixHex("#123456", "#000000", 1), "#000000");
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
});

for (const mode of ["light", "dark", null]) {
  const label = mode || "auto";
  test(`every accent is safe in ${label} mode: 3:1 on surfaces, 4.5:1 text at rest and on hover`, () => {
    const surfaces = mode ? SURFACES[mode] : [...SURFACES.light, ...SURFACES.dark];
    const canvases = CANVAS[label];
    for (const accent of accentGrid()) {
      const { primary, foreground } = accentTokens(accent, mode);
      for (const surface of surfaces) {
        const ui = contrastRatio(primary, surface);
        assert.ok(ui >= 3, `${accent} became ${primary}, ${ui.toFixed(2)}:1 on ${surface}`);
      }
      assert.ok(contrastRatio(foreground, primary) >= 4.5, `${foreground} on ${primary}`);
      for (const canvas of canvases) {
        const hover = mixHex(primary, canvas, 0.1);
        const ratio = contrastRatio(foreground, hover);
        assert.ok(ratio >= 4.5, `${foreground} on hovered ${primary} over ${canvas} is ${ratio.toFixed(2)}`);
      }
    }
  });
}

test("accents that already pass stay exactly as the owner picked them", () => {
  assert.equal(accentTokens("#000000", "light").primary, "#000000");
  assert.equal(accentTokens("#ffffff", "dark").primary, "#ffffff");
  assert.equal(accentTokens("#3b82f6", "light").primary, "#3b82f6");
});

test("failing accents shift only as far as needed", () => {
  const { primary } = accentTokens("#ffff00", "light");
  assert.notEqual(primary, "#ffff00");
  assert.notEqual(primary, "#000000");
  assert.ok(accentTokens("#111111", "dark").primary !== "#111111");
  // The theme's built-in presets should move little, if at all.
  for (const accent of PRESETS) {
    for (const mode of ["light", "dark"]) {
      const { primary: tuned } = accentTokens(accent, mode);
      assert.ok(contrastRatio(tuned, accent) < 2, `${accent} moved to ${tuned} in ${mode}`);
    }
  }
});

test("text tokens clear 4.5:1 and control tokens 3:1 on every surface, in both modes", () => {
  for (const [mode, tokens] of Object.entries(THEME_TOKENS)) {
    for (const surface of SURFACES[mode]) {
      for (const name of ["--text-secondary", "--text-tertiary", "--muted-foreground"]) {
        const ratio = contrastRatio(tokens[name], surface);
        assert.ok(ratio >= 4.5, `${mode} ${name} on ${surface} is ${ratio.toFixed(2)}`);
      }
      for (const name of ["--input", "--border-strong", "--ring"]) {
        const ratio = contrastRatio(tokens[name], surface);
        assert.ok(ratio >= 3, `${mode} ${name} on ${surface} is ${ratio.toFixed(2)}`);
      }
    }
  }
});

test("dark mode's popover surface also clears 4.5:1 for secondary text", () => {
  const { dark } = THEME_TOKENS;
  for (const name of ["--text-secondary", "--text-tertiary", "--muted-foreground"]) {
    assert.ok(contrastRatio(dark[name], dark["--surface-dialog"]) >= 4.5, name);
  }
});

test("buildTheme applies the tuned accent and keeps the raw one for decoration", () => {
  const theme = buildTheme({ theme: { mode: "light", accent: "#ffff00" } });
  assert.notEqual(theme.style["--primary"], "#ffff00");
  assert.equal(theme.style["--gf-accent"], "#ffff00");
  assert.equal(theme.style["--ring"], theme.style["--primary"]);
  assert.equal(theme.style.colorScheme, "light");
  assert.ok(contrastRatio(theme.style["--primary-foreground"], theme.style["--primary"]) >= 4.5);
});

test("auto mode leaves the tokens to the app theme but still tunes the accent", () => {
  const theme = buildTheme({ theme: { mode: "auto", accent: "#ffff00" } });
  assert.equal(theme.mode, null);
  assert.equal(theme.style["--background"], undefined);
  assert.equal(theme.style.colorScheme, undefined);
  for (const surface of [...SURFACES.light, ...SURFACES.dark]) assert.ok(contrastRatio(theme.style["--primary"], surface) >= 3);
});

test("image backgrounds scrim harder when text sits directly on the canvas", () => {
  const classic = buildTheme({ coverUrl: "https://x.test/a.jpg", theme: { background: "image" } });
  const conversational = buildTheme({ layout: "conversational", coverUrl: "https://x.test/a.jpg", theme: { background: "image" } });
  assert.match(backgroundStyle(classic).backgroundImage, /72%/);
  assert.match(backgroundStyle(conversational).backgroundImage, /92%/);
});
