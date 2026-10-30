// Geiger JSON export/import round trip and CSV import (one field per column, types inferred from sample rows).
import { ImportError, IMPORT_LIMITS, IMPORT_SOURCES, createWarnings, finalizeImport, sanitizeSettings } from "./core";

export const EXPORT_FORMAT = "geiger-form";
export const EXPORT_VERSION = 1;

export const CSV_LIMITS = { maxColumns: 200, sampleRows: 200, maxChoices: 10, maxChoiceLength: 60, longTextLength: 120 };

function assertSize(text) {
  if (text.length > IMPORT_LIMITS.maxInputBytes) throw new ImportError("That file is too large to import (2 MB limit).", "too_large");
}

// Portable JSON for a form: definition and safe settings only, so no secrets, recipients or responses leave with it.
export function exportFormJson(form) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    form: {
      title: form.title,
      description: form.description || "",
      category: form.category || null,
      tags: form.tags || [],
      fields: form.fieldDefs || form.schema?.fields || [],
      settings: sanitizeSettings(form.settings, createWarnings()),
    },
  };
}

function parseJsonText(text) {
  try {
    return JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    throw new ImportError("That file isn't valid JSON.");
  }
}

// Accepts the export envelope, a stored form row ({ schema: { fields } }) or a view model ({ fieldDefs }).
export function importGeigerJson(input, { warnings } = {}) {
  let data = input;
  if (typeof input === "string") {
    assertSize(input);
    data = parseJsonText(input);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new ImportError("That JSON isn't a Geiger form export.");
  if (data.format !== undefined && data.format !== EXPORT_FORMAT) throw new ImportError("That JSON isn't a Geiger form export.");
  if (data.format === EXPORT_FORMAT && Number(data.version) > EXPORT_VERSION) throw new ImportError("That export comes from a newer version of Geiger Forms.");
  const doc = data.format === EXPORT_FORMAT ? data.form : data;
  const fields = doc?.fields ?? doc?.schema?.fields ?? doc?.fieldDefs;
  if (!doc || typeof doc !== "object" || !Array.isArray(fields)) throw new ImportError("That JSON isn't a Geiger form export.");
  const provenance = doc.metadata?.import;
  return finalizeImport({
    source: IMPORT_SOURCES.includes(provenance?.source) ? provenance.source : "json",
    sourceId: provenance?.sourceId,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    tags: doc.tags,
    fields,
    settings: doc.settings,
    warnings: warnings || createWarnings(),
  });
}

function sniffDelimiter(text) {
  const firstLine = text.slice(0, 4096).split(/\r?\n/, 1)[0];
  let best = ",";
  let bestCount = 0;
  for (const candidate of [",", ";", "\t"]) {
    let count = 0;
    let quoted = false;
    for (const ch of firstLine) {
      if (ch === '"') quoted = !quoted;
      else if (ch === candidate && !quoted) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

// RFC 4180 parser (quotes, doubled quotes, CRLF), stopping after `maxRows` records. Returns { rows, unterminated }.
export function parseCsv(text, { maxRows = Infinity, delimiter = sniffDelimiter(text) } = {}) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const endRow = () => {
    row.push(cell);
    cell = "";
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length && rows.length < maxRows; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = false;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      endRow();
    } else cell += ch;
  }
  const unterminated = quoted;
  if ((cell !== "" || row.length) && rows.length < maxRows) endRow();
  return { rows, unterminated };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_LIKE = /^https?:\/\/[^\s]+$/i;
const PHONE = /^\+?[\d\s().-]{7,20}$/;
const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const DATE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const TIME = /^\d{1,2}:\d{2}(:\d{2})?(\s?[ap]m)?$/i;

const HEADER_HINTS = [
  [/e-?mail/i, "email"],
  [/phone|mobile|\btel\b/i, "phone"],
  [/website|\burl\b|\blink\b/i, "url"],
  [/\bdate\b|\bdob\b|birthday/i, "date"],
];

const headerType = (header) => HEADER_HINTS.find(([re]) => re.test(header))?.[1] ?? null;

// Picks the type every non-empty sample satisfies, using the header when samples can't decide. Returns { type, options? }.
export function inferColumn(header, samples) {
  const values = samples.map((v) => String(v ?? "").trim()).filter(Boolean);
  const hint = headerType(header);
  if (!values.length) return { type: hint || "text", empty: true };
  const all = (re) => values.every((v) => re.test(v));
  if (all(EMAIL)) return { type: "email" };
  if (all(URL_LIKE)) return { type: "url" };
  if (all(DATETIME)) return { type: "datetime" };
  if (all(DATE)) return { type: "date" };
  if (all(TIME)) return { type: "time" };
  if (hint === "phone" && all(PHONE)) return { type: "phone" };
  if (all(NUMBER)) return { type: "number" };
  if (all(PHONE) && values.every((v) => v.replace(/\D/g, "").length >= 7) && values.some((v) => /[+()\s-]/.test(v))) return { type: "phone" };
  if (values.some((v) => v.length > CSV_LIMITS.longTextLength || v.includes("\n"))) return { type: "textarea" };
  const distinct = [...new Set(values)];
  const repeats = values.length >= distinct.length * 2;
  if (distinct.length <= CSV_LIMITS.maxChoices && repeats && distinct.every((v) => v.length <= CSV_LIMITS.maxChoiceLength)) {
    return { type: distinct.length <= 5 ? "select" : "dropdown", options: distinct };
  }
  return { type: "text" };
}

// One field per column header; rows are only sampled for types and are never imported as responses.
export function importCsv(text, { title } = {}) {
  if (typeof text !== "string" || !text.trim()) throw new ImportError("That CSV file is empty.");
  assertSize(text);
  if (text.includes("\u0000")) throw new ImportError("That file doesn't look like a CSV.");
  const warn = createWarnings();
  const { rows, unterminated } = parseCsv(text.replace(/^﻿/, ""), { maxRows: CSV_LIMITS.sampleRows + 1 });
  if (!rows.length) throw new ImportError("That CSV file is empty.");
  if (unterminated) warn.add(null, "The file ends inside a quoted value, so the last row was read as-is.");
  const [rawHeaders, ...samples] = rows;
  if (rawHeaders.length > CSV_LIMITS.maxColumns) warn.add(null, `Only the first ${CSV_LIMITS.maxColumns} of ${rawHeaders.length} columns were imported.`);
  if (!samples.length) warn.add(null, "No data rows to sample, so types were guessed from the headers.");

  const used = new Map();
  const fields = rawHeaders.slice(0, CSV_LIMITS.maxColumns).map((raw, i) => {
    let header = raw.trim();
    if (!header) {
      header = `Column ${i + 1}`;
      warn.add(header, "This column had no header, so it was given a placeholder name.");
    }
    const count = (used.get(header.toLowerCase()) || 0) + 1;
    used.set(header.toLowerCase(), count);
    if (count > 1) {
      warn.add(header, `Duplicate column header, renamed to "${header} (${count})".`);
      header = `${header} (${count})`;
    }
    const inferred = inferColumn(header, samples.map((row) => row[i]));
    if (inferred.options) warn.add(header, `Choices were inferred from the sample rows and may be incomplete: ${inferred.options.length} found.`);
    if (inferred.empty && samples.length) warn.add(header, "Every sampled value was blank, so the type comes from the header.");
    return { id: `col-${i}`, type: inferred.type, title: header, label: header, options: inferred.options };
  });
  return finalizeImport({ source: "csv", title: title || "Imported from CSV", fields, warnings: warn });
}
