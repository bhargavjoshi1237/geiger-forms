import test from "node:test";
import assert from "node:assert/strict";
import { buildAppCatalog } from "./app_catalog.js";

const url = "https://geiger.studio/forms/api/mcp";
const app = (id) => buildAppCatalog(url).find((item) => item.id === id);

test("the Cursor link carries the server as base64 JSON", () => {
  const link = new URL(app("cursor").href);
  assert.equal(link.protocol, "cursor:");
  assert.equal(link.searchParams.get("name"), "geiger-forms");
  assert.deepEqual(JSON.parse(atob(link.searchParams.get("config"))), { url });
});

test("the VS Code link carries the server as encoded JSON", () => {
  const { href } = app("vscode");
  assert.ok(href.startsWith("vscode:mcp/install?"));
  assert.deepEqual(JSON.parse(decodeURIComponent(href.split("?")[1])), { name: "geiger-forms", type: "http", url });
});

test("terminal commands use the server address", () => {
  assert.equal(app("claude-code").command, `claude mcp add --transport http geiger-forms ${url}`);
  assert.equal(app("codex").command, `codex mcp add geiger-forms --url ${url}\ncodex mcp login geiger-forms`);
});

test("every app has exactly one way to connect", () => {
  for (const item of buildAppCatalog(url)) {
    assert.ok(item.actionLabel, item.id);
    if (item.kind === "command") assert.ok(item.command, item.id);
    else assert.ok(item.href, item.id);
  }
});
