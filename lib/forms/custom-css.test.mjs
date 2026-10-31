import test from "node:test";
import assert from "node:assert/strict";

import { MAX_CUSTOM_CSS, buildCustomStylesheet, checkCustomCss } from "./custom-css.js";

const rejected = (css) => {
  const result = checkCustomCss(css);
  assert.equal(result.css, "", css);
  assert.ok(result.error, css);
};

test("ordinary rules pass unchanged, without their comments", () => {
  assert.deepEqual(checkCustomCss('/* brand */ [data-gf-part="title"] { color: red; }'), { css: '[data-gf-part="title"] { color: red; }', error: "" });
  assert.equal(checkCustomCss('@media (min-width: 640px) { h1 { margin: 0 } }').error, "");
  assert.equal(checkCustomCss("").error, "");
  assert.equal(checkCustomCss(undefined).css, "");
});

test("nothing that can fetch gets through", () => {
  for (const css of [
    "input[value^=a]{background:url(https://evil.test/a)}",
    "a{background:URL ('x')}",
    "a{background:u/**/rl(x)}x{}a{background:url(x)}",
    "a{background:image-set('x' 1x)}",
    "a{background:-webkit-image-set('x' 1x)}",
    "a{background:cross-fade('x')}",
    "a{mask:src('x')}",
    "@import 'https://evil.test/x.css';",
    "@font-face{font-family:x;src:local(x)}",
    "@namespace x 'y';",
    "a{behavior:y}",
  ]) {
    rejected(css);
  }
});

test("escapes and tokeniser tricks are rejected", () => {
  for (const css of [
    "a{background:\\75rl(x)}",
    "a{content:'\\75'}",
    "a{content:'unterminated\n}b{color:red}",
    "a{content:'never closed}",
    "</style><script>alert(1)</script>",
    "/* never closed",
  ]) {
    rejected(css);
  }
});

test("rules can't escape the scope", () => {
  rejected("}body{display:none}[data-gf-root]{");
  rejected("a{color:red");
  rejected("a{color:red}}");
});

test("over-long CSS is rejected", () => {
  rejected(`a{color:red}${" ".repeat(MAX_CUSTOM_CSS)}`);
});

test("the stylesheet nests under the filler root and skips invalid CSS", () => {
  assert.equal(buildCustomStylesheet({}, ""), "");
  assert.equal(buildCustomStylesheet({}, "a{color:red}"), "[data-gf-root]{a{color:red}}");
  assert.equal(buildCustomStylesheet({}, "a{background:url(x)}"), "");
});

test("only listed element choices produce rules, before the owner's CSS", () => {
  assert.equal(buildCustomStylesheet({ cardStyle: "nope", buttonStyle: "}body{display:none}" }, ""), "");
  const sheet = buildCustomStylesheet({ buttonWidth: "full" }, "a{color:red}");
  assert.ok(sheet.indexOf("width:100%") < sheet.indexOf("a{color:red}"));
});

test("inherited object keys aren't element choices", () => {
  assert.equal(buildCustomStylesheet({ cardStyle: "constructor", buttonStyle: "__proto__" }, ""), "");
});

test("the design's element choices produce their rules", () => {
  assert.match(buildCustomStylesheet({ cardStyle: "glass" }, ""), /backdrop-filter:blur\(18px\)/);
  assert.match(buildCustomStylesheet({ buttonStyle: "gradient" }, ""), /var\(--gf-accent2\)/);
  assert.match(buildCustomStylesheet({ numbering: "on" }, ""), /counter\(gf-question,decimal-leading-zero\)/);
  assert.match(buildCustomStylesheet({ titleCase: "upper" }, ""), /--gf-heading-case:uppercase/);
  assert.equal(buildCustomStylesheet({ numbering: "off", cardStyle: "card", titleCase: "normal" }, ""), "");
});

test("question numbering carries across pages and skips fields without a label", async () => {
  const { questionsBefore } = await import("./logic.js");
  const pages = [
    { fields: [{ type: "text" }, { type: "heading" }, { type: "consent", title: "Terms", label: "Terms" }, { type: "consent", title: "Terms", label: "I agree" }, { type: "product" }] },
    { fields: [{ type: "select" }, { type: "hidden" }] },
    { fields: [{ type: "text" }] },
  ];
  assert.equal(questionsBefore(pages, 0), 0);
  assert.equal(questionsBefore(pages, 1), 2);
  assert.equal(questionsBefore(pages, 2), 3);
});
