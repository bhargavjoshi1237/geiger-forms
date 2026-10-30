import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = process.cwd();
const EXTENSIONS = [".js", ".mjs", ".json"];

function probe(file) {
  if (existsSync(file) && statSync(file).isFile()) return file;
  for (const ext of EXTENSIONS) {
    if (existsSync(file + ext)) return file + ext;
  }
  for (const ext of EXTENSIONS) {
    const index = path.join(file, `index${ext}`);
    if (existsSync(index)) return index;
  }
  return null;
}

// Next-only guards and the Supabase driver are swapped for local stubs so server modules load without a runtime or a network.
const STUB_DIR = new URL("../../__tests__/support/stubs/", import.meta.url);
const STUBS = {
  "server-only": "empty.mjs",
  "next/server": "next_server.mjs",
  "next/headers": "next_headers.mjs",
  "@supabase/supabase-js": "supabase_js.mjs",
};

export async function resolve(specifier, context, nextResolve) {
  if (Object.hasOwn(STUBS, specifier)) return { url: new URL(STUBS[specifier], STUB_DIR).href, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const found = probe(path.join(ROOT, specifier.slice(2)));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true, format: found.endsWith(".json") ? "json" : undefined };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const base = path.dirname(fileURLToPath(context.parentURL));
    const found = probe(path.resolve(base, specifier));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true, format: found.endsWith(".json") ? "json" : undefined };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    return nextLoad(url, { ...context, importAttributes: { type: "json" } });
  }
  return nextLoad(url, context);
}
