"use client";

// Response exports: question-labelled CSV (Excel-safe) and JSON with raw + labelled answers.
import { displayValue, labelAnswers } from "./logic";
import { answerFields, answerText, canonicalFields, fieldLabel, isEncrypted, outcomeLabel } from "./response-utils";
import { logAccess } from "@/lib/supabase/audit";

const ADDRESS_PARTS = [
  ["line1", "Line 1"],
  ["line2", "Line 2"],
  ["city", "City"],
  ["state", "State"],
  ["zip", "ZIP"],
  ["country", "Country"],
];

const BASE_COLUMNS = [
  ["id", "Response ID"],
  ["form", "Form"],
  ["name", "Respondent"],
  ["email", "Email"],
  ["status", "Status"],
  ["priority", "Priority"],
  ["score", "Score"],
  ["outcome", "Outcome"],
  ["tags", "Tags"],
  ["assignee", "Assignee"],
  ["submitted_at", "Submitted at"],
  ["payment_status", "Payment status"],
  ["payment_amount", "Payment amount"],
  ["payment_currency", "Payment currency"],
  ["payment_ref", "Payment reference"],
];

function triggerDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Quotes CSV cells and neutralises spreadsheet formula injection.
export function escapeCsv(value) {
  if (value == null) return "";
  let str = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// One field → [{ key, label, get(response) }] columns; composite answers are flattened.
function fieldColumns(field, fields) {
  const label = fieldLabel(field);
  const key = `q:${label}`;
  const guard = (fn) => (r) => (isEncrypted(field, r) && r.answers?.[field.id] != null ? "[encrypted]" : fn(r));
  const raw = (r) => r.answers?.[field.id];
  switch (field.type) {
    case "name":
      return [
        { key: `${key}:first`, label: `${label} (First)`, get: guard((r) => raw(r)?.first ?? "") },
        { key: `${key}:last`, label: `${label} (Last)`, get: guard((r) => raw(r)?.last ?? "") },
      ];
    case "address":
      return ADDRESS_PARTS.map(([part, partLabel]) => ({
        key: `${key}:${part}`,
        label: `${label} (${partLabel})`,
        get: guard((r) => raw(r)?.[part] ?? ""),
      }));
    case "matrix":
      return (field.config?.rows || []).map((row) => ({
        key: `${key}:${row}`,
        label: `${label} [${row}]`,
        get: guard((r) => raw(r)?.[row] ?? ""),
      }));
    case "number":
    case "currency":
    case "nps":
    case "scale":
      return [{ key, label, get: guard((r) => (raw(r) == null || raw(r) === "" ? "" : Number(raw(r)))) }];
    case "multiselect":
    case "ranking":
      return [{ key, label, get: guard((r) => (Array.isArray(raw(r)) ? raw(r).join("; ") : displayValue(field, raw(r)))) }];
    default:
      return [{ key, label, get: guard((r) => answerText(field, r, fields)) }];
  }
}

function baseValues(r) {
  return {
    id: r.id,
    form: r.form,
    name: r.name,
    email: r.email,
    status: r.status,
    priority: r.priority,
    score: r.score ?? "",
    outcome: outcomeLabel(r.outcome),
    tags: (r.tags || []).join("; "),
    assignee: r.assignee || "",
    submitted_at: r.submittedAt || "",
    payment_status: r.payment?.status || "",
    payment_amount: r.payment ? r.payment.amount : "",
    payment_currency: r.payment?.currency ? r.payment.currency.toUpperCase() : "",
    payment_ref: r.payment?.ref || "",
  };
}

// Builds { columns: [{key,label}], rows: [{key: value}] } ordered by form question order.
export function buildExportTable(responses, { formsById = {}, form = null } = {}) {
  const columns = BASE_COLUMNS.map(([key, label]) => ({ key, label }));
  const seen = new Set(columns.map((c) => c.key));
  const getters = new Map();
  const formIds = form ? [form.id] : [...new Set(responses.map((r) => r.formId))];
  for (const id of formIds) {
    const f = form && form.id === id ? form : formsById[id];
    if (!f) continue;
    const fields = canonicalFields(f);
    for (const field of answerFields(fields, { computed: true })) {
      for (const col of fieldColumns(field, fields)) {
        if (!seen.has(col.key)) {
          seen.add(col.key);
          columns.push({ key: col.key, label: col.label });
        }
        getters.set(`${id}|${col.key}`, col.get);
      }
    }
  }
  const rows = responses.map((r) => {
    const row = baseValues(r);
    for (const col of columns) {
      const get = getters.get(`${r.formId}|${col.key}`);
      if (get) row[col.key] = get(r);
    }
    return row;
  });
  return { columns, rows };
}

export function tableToCsv({ columns, rows }) {
  const lines = [
    columns.map((c) => escapeCsv(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escapeCsv(row[c.key])).join(",")),
  ];
  return lines.join("\r\n");
}

// JSON keeps raw answers alongside question-labelled display values.
export function buildExportJson(responses, { formsById = {}, form = null } = {}) {
  return responses.map((r) => {
    const f = form && form.id === r.formId ? form : formsById[r.formId];
    return {
      ...baseValues(r),
      tags: r.tags || [],
      payment: r.payment || null,
      formId: r.formId,
      approval: r.approval || {},
      answers: r.answers || {},
      labelled: f ? labelAnswers(r.answers, canonicalFields(f)) : {},
    };
  });
}

// Header + one row, for "Copy as CSV row".
export function responseCsv(response, form) {
  return tableToCsv(buildExportTable([response], { form }));
}

// Downloads CSV (UTF-8 BOM for Excel) or JSON and records one export access line.
export function downloadResponses(responses, format = "csv", basename = "responses", { formsById, form } = {}) {
  if (!responses?.length) return false;
  const stamp = new Date().toISOString().slice(0, 10);
  const safeBase = String(basename || "responses").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "responses";
  if (format === "json") {
    const body = JSON.stringify(buildExportJson(responses, { formsById, form }), null, 2);
    triggerDownload(body, `${safeBase}-${stamp}.json`, "application/json");
  } else {
    const csv = tableToCsv(buildExportTable(responses, { formsById, form }));
    triggerDownload(`﻿${csv}`, `${safeBase}-${stamp}.csv`, "text/csv;charset=utf-8");
  }
  const formIds = [...new Set(responses.map((r) => r.formId))];
  logAccess({
    formId: formIds.length === 1 ? formIds[0] : null,
    action: "export",
    metadata: { count: responses.length, format, responseIds: responses.slice(0, 500).map((r) => r.id) },
  });
  return true;
}
