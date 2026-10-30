import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { computeOrder, displayValue, evaluateFormula, formatMoney, interpolate, sensitiveIdentity, visibleFieldIds } from "@/lib/forms/logic";
import { answerFields, canonicalFields, fieldLabel, isEmptyAnswer, outcomeLabel } from "@/lib/forms/response-utils";
import { isEncrypted } from "@/lib/server/crypto";

// Server-rendered PDF of one response, matching the printable record. `response` is a forms.responses row; answers are read as stored, so sensitive values are never decrypted here.

const MASK = "[protected]";
const EMPTY = "—";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = MARGIN + 18;

const INK = rgb(0.09, 0.09, 0.09);
const MUTED = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.8, 0.8, 0.8);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIDE = 4000;
const LINE_BREAK = new RegExp("\\r\\n|[\\r\\n\\v\\f\\u2028\\u2029]");

// Non-WinAnsi characters with a readable stand-in; anything else without one becomes "?".
const SUBSTITUTES = {
  "₹": "INR ", "₩": "KRW ", "₽": "RUB ", "₪": "ILS ", "₫": "VND ", "₺": "TRY ", "₴": "UAH ", "฿": "THB ", "₦": "NGN ",
  "→": "->", "←": "<-", "⇒": "=>", "≥": ">=", "≤": "<=", "≠": "!=", "−": "-", "‐": "-", "‑": "-", "‒": "-", "―": "-",
  "✓": "Yes", "✔": "Yes", "✗": "No", "✘": "No", "″": "\"", "′": "'",
  "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "Ħ": "H", "ħ": "h", "ı": "i",
};

// Keeps text inside what the font can encode (the standard fonts throw on anything else) and counts what it couldn't keep.
function createSanitizer(font) {
  const supported = new Set(font.getCharacterSet());
  const isSupported = (text) => Array.from(text).every((c) => supported.has(c.codePointAt(0)));
  const state = { replaced: 0 };
  state.clean = (value) => {
    let out = "";
    for (const char of String(value ?? "").normalize("NFC")) {
      if (/[\p{Zs}\t]/u.test(char)) out += " ";
      else if (/[\p{Cc}\p{Cf}\p{Mn}\p{Me}]/u.test(char)) continue;
      else if (supported.has(char.codePointAt(0))) out += char;
      else if (SUBSTITUTES[char]) out += SUBSTITUTES[char];
      else {
        const base = char.normalize("NFKD").replace(/\p{M}/gu, "");
        if (base && isSupported(base)) out += base;
        else {
          out += "?";
          state.replaced += 1;
        }
      }
    }
    return out;
  };
  return state;
}

// Character widths at size 1, cached: fast on long text and exact, since pdf-lib draws the standard fonts without kerning.
function createMeasure() {
  const caches = new Map();
  return (font, text, size) => {
    if (!caches.has(font)) caches.set(font, new Map());
    const cache = caches.get(font);
    let width = 0;
    for (const char of text) {
      if (!cache.has(char)) cache.set(char, font.widthOfTextAtSize(char, 1));
      width += cache.get(char);
    }
    return width * size;
  };
}

function fmt(iso) {
  if (!iso) return EMPTY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return `${d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`;
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const formulaMentions = (formula, field) =>
  [field.id, field.title, field.label].some((name) => name && formula.includes(String(name).toLowerCase().trim()));

// Field ids to mask: marked sensitive (even if stored in plaintext because no key was configured), stored encrypted, or calculated from one of those.
function protectedFieldIds(form, row) {
  const all = (form?.fieldDefs || []).filter(Boolean);
  const answers = row.answers || {};
  const ids = new Set(Array.isArray(row.metadata?.encryptedFields) ? row.metadata.encryptedFields : []);
  for (const key of Object.keys(answers)) if (isEncrypted(answers[key])) ids.add(key);
  for (const field of all) if (field.sensitive) ids.add(field.id);
  let grew = true;
  while (grew) {
    grew = false;
    for (const field of all) {
      if (field.type !== "calculated" || ids.has(field.id)) continue;
      const formula = String(field.formula || "").toLowerCase();
      if (all.some((other) => ids.has(other.id) && formulaMentions(formula, other))) {
        ids.add(field.id);
        grew = true;
      }
    }
  }
  return ids;
}

function money(amount, currency) {
  return formatMoney(amount, currency || "usd");
}

function fileLines(value) {
  return (Array.isArray(value) ? value : [value])
    .map((f) => {
      const name = (typeof f === "string" ? f : f?.name) || "File";
      const size = formatBytes(f?.size);
      return `• ${name}${size ? ` (${size})` : ""}`;
    })
    .join("\n");
}

function repeaterBlock(field, value, masked) {
  const rows = Array.isArray(value) ? value : [];
  const subs = field.config?.subFields?.length
    ? field.config.subFields
    : Object.keys(rows[0] || {}).map((id) => ({ id, label: id }));
  const cell = (sub, row) => {
    if (sub.sensitive || masked.has(sub.id) || isEncrypted(row?.[sub.id])) return MASK;
    return displayValue(sub, row?.[sub.id]) || EMPTY;
  };
  if (subs.length <= 4) {
    return { type: "table", header: ["#", ...subs.map((s) => s.label || s.id)], weights: [0.35, ...subs.map(() => 1)], rows: rows.map((row, i) => [String(i + 1), ...subs.map((s) => cell(s, row))]) };
  }
  // Too many columns for a page width: one stacked two-column table, an entry at a time.
  return { type: "table", weights: [1, 2], rows: rows.flatMap((row, i) => [[`Entry ${i + 1}`, ""], ...subs.map((s) => [s.label || s.id, cell(s, row)])]) };
}

function signatureBlocks(value) {
  const blocks = [{ type: "image", alt: "Signature", ...(typeof value === "string" ? { dataUrl: value } : { path: value?.path }) }];
  if (value?.signedAt) blocks.push({ type: "text", text: `Signed ${fmt(value.signedAt)}`, muted: true, small: true });
  return blocks;
}

function consentBlocks(field, value, record) {
  if (value !== true) return [{ type: "text", text: displayValue(field, value) }];
  const lines = [record?.acceptedAt ? `Agreed ${fmt(record.acceptedAt)}` : displayValue(field, value)];
  if (record?.textHash) lines.push(`Wording SHA-256 ${record.textHash}`);
  return [{ type: "text", text: lines.join("\n") }];
}

function calculatedText(field, row, fields, safeAnswers, currency) {
  const stored = row.answers?.[field.id];
  const value = stored != null && stored !== "" && typeof stored !== "object" ? stored : evaluateFormula(field.formula, fields, safeAnswers);
  if (value == null || value === "") return EMPTY;
  const n = Number(value);
  if (field.config?.format === "currency" && Number.isFinite(n)) return money(n, currency);
  if (field.config?.format === "percent" && Number.isFinite(n)) return `${n}%`;
  return String(value);
}

// One answer as blocks; every field type lands here, and a malformed stored value degrades to plain text.
function answerBlocks(field, ctx) {
  const { row, fields, masked, safeAnswers, currency } = ctx;
  const value = row.answers?.[field.id];
  if (masked.has(field.id)) return [{ type: "text", text: isEmptyAnswer(value) ? EMPTY : MASK, muted: !isEmptyAnswer(value) }];
  if (field.type === "calculated") return [{ type: "text", text: calculatedText(field, row, fields, safeAnswers, currency) }];
  if (isEmptyAnswer(value)) return [{ type: "text", text: EMPTY, muted: true }];
  try {
    switch (field.type) {
      case "signature":
        return signatureBlocks(value);
      case "file":
        return [{ type: "text", text: fileLines(value) }];
      case "matrix": {
        const rows = field.config?.rows?.length ? field.config.rows : Object.keys(value || {});
        return [{ type: "table", weights: [1, 1], rows: rows.map((r) => [r, value?.[r] || EMPTY]) }];
      }
      case "repeater":
        return [repeaterBlock(field, value, masked)];
      case "consent":
        return consentBlocks(field, value, row.metadata?.consents?.[field.id]);
      case "ranking":
        return [{ type: "text", text: (Array.isArray(value) ? value : [value]).map((v, i) => `${i + 1}. ${v}`).join("\n") }];
      case "currency":
        return [{ type: "text", text: money(value, field.config?.currency || currency) }];
      case "booking":
        return [{ type: "text", text: Number.isNaN(Date.parse(value)) ? String(value) : fmt(value) }];
      case "name":
      case "address":
        return [{ type: "text", text: typeof value === "string" ? value : displayValue(field, value) || EMPTY }];
      default:
        return [{ type: "text", text: displayValue(field, value) || EMPTY }];
    }
  } catch {
    return [{ type: "text", text: typeof value === "object" ? JSON.stringify(value) : String(value) }];
  }
}

function countersignBlocks(row) {
  const c = row.metadata?.countersign;
  if (!c) return [];
  return [
    { type: "image", alt: "Countersignature", path: c.signature },
    { type: "text", text: c.name || "" },
    { type: "text", text: `Countersigned ${fmt(c.at)}`, muted: true, small: true },
  ];
}

function invoiceBlocks(row, graded, safeAnswers, workspace) {
  if (!row.payment_status) return [];
  const paid = row.payment_status === "paid";
  const order = graded ? computeOrder(graded, safeAnswers) : null;
  const currency = row.payment_currency || order?.currency || "usd";
  const rows = (order?.items || []).map((item) => [item.name, String(item.quantity), money(item.amount, currency)]);
  if (order?.discount) rows.push([`Discount${order.coupon?.code ? ` (${order.coupon.code})` : ""}`, "", `-${money(order.discount, currency)}`]);
  rows.push([paid ? "Total paid" : "Total due", "", money(row.payment_amount ?? 0, currency)]);
  const items = [["Status", row.payment_status], ["Date", fmt(row.submitted_at)]];
  if (workspace) items.splice(1, 0, ["Reference", row.payment_ref || ""]);
  return [
    { type: "section", text: paid ? "Receipt" : "Invoice" },
    { type: "table", header: ["Item", "Qty", "Amount"], weights: [3, 0.6, 1.2], rows },
    { type: "kv", items },
  ];
}

// Audit trail. The workspace copy matches the print view; an external copy leaves out network traces, internal triage and reviewer notes, and anonymous mode drops anything that identifies the respondent.
function auditBlocks({ row, form, fields, masked, anonymous, workspace }) {
  const m = row.metadata || {};
  const s = form?.settings || {};
  const showScore = workspace || s.showScore || s.quiz?.enabled;
  const scoreLine = row.score != null ? `${row.score} · ${row.priority}` : row.priority;
  const identified = workspace && !anonymous;
  const items = [
    ["Response ID", row.id],
    ["Submitted at", fmt(row.submitted_at)],
    ["Last edited", row.edited_at ? fmt(row.edited_at) : ""],
    ["Score / priority", workspace || s.showScore ? scoreLine : ""],
    ["Outcome", outcomeLabel(row.outcome)],
    ["Quiz", m.quiz && showScore ? `${m.quiz.percent}% (${m.quiz.passed ? "passed" : "failed"})` : ""],
    ["IP hash", identified ? m.ipHash || "" : ""],
    ["User agent", identified ? m.userAgent || row.user_agent || "" : ""],
    ["Referrer", identified ? m.referrer || "" : ""],
    ["Submitted on behalf", identified && m.delegate ? `${m.delegate.byName || m.delegate.byEmail} for ${m.delegate.forName || m.delegate.forEmail}` : ""],
    ["Attestation", m.attestation ? `"${m.attestation.statement}" accepted ${fmt(m.attestation.acceptedAt)}` : ""],
    ["Policy acknowledged", m.policy ? `${fmt(m.policy.acknowledgedAt)}${m.policy.typedName && !anonymous ? ` · signed "${m.policy.typedName}"` : ""}` : ""],
    ...Object.entries(m.consents || {})
      .filter(([id]) => !masked.has(id))
      .map(([id, c]) => [`Consent · ${fieldLabel(fields.find((f) => f.id === id) || { id })}`, `${fmt(c?.acceptedAt)} · wording SHA-256 ${c?.textHash || EMPTY}`]),
    ["Countersigned", m.countersign ? `${m.countersign.name} · ${fmt(m.countersign.at)}` : ""],
  ];
  const blocks = [{ type: "section", text: "Audit trail" }, { type: "kv", items }];
  const history = Array.isArray(row.approval?.history) ? row.approval.history : [];
  if (history.length) {
    blocks.push(
      workspace
        ? {
            type: "table",
            header: ["Approval step", "Decision", "By", "When"],
            weights: [1, 1.4, 1, 1],
            rows: history.map((h) => [h.stepName || `Step ${Number(h.stepIndex) + 1}`, `${h.decision || ""}${h.note ? ` — ${h.note}` : ""}`, h.by || h.byEmail || "", fmt(h.at)]),
          }
        : {
            type: "table",
            header: ["Approval step", "Decision", "When"],
            weights: [1, 1, 1],
            rows: history.map((h) => [h.stepName || `Step ${Number(h.stepIndex) + 1}`, h.decision || "", fmt(h.at)]),
          },
    );
  }
  return blocks;
}

function templateBlocks({ form, row, fields, masked, hiddenIds, safeAnswers, workspace, anonymous, respondent }) {
  const template = form?.settings?.documentTemplate;
  if (!template?.enabled || !template.body) return [];
  // Merge tags recall through plain-text stand-ins, so a masked value can't reach the document or be misread by a composite formatter.
  const merged = fields.map((f) => (masked.has(f.id) ? { ...f, type: "text", conditions: [] } : f));
  const answers = { ...safeAnswers };
  for (const id of masked) answers[id] = MASK;
  for (const id of hiddenIds) delete answers[id];
  const s = form?.settings || {};
  const extras = {
    score: workspace || s.showScore ? row.score ?? "" : "",
    outcome: outcomeLabel(row.outcome),
    total: row.payment_status ? money(row.payment_amount ?? 0, row.payment_currency) : "",
  };
  const graded = { ...form, fieldDefs: merged };
  const signatures = fields.filter((f) => f.type === "signature" && !masked.has(f.id) && !isEmptyAnswer(row.answers?.[f.id]));
  const blocks = [
    { type: "title", text: interpolate(template.title, graded, answers, extras) || form.title },
    { type: "body", text: interpolate(template.body, graded, answers, extras) },
  ];
  for (const f of signatures) {
    blocks.push({ type: "gap" }, ...signatureBlocks(row.answers[f.id]));
    blocks.push({ type: "text", text: `${anonymous ? "" : `${respondent} · `}${fieldLabel(f)}`, muted: true, small: true });
  }
  if (row.metadata?.countersign) blocks.push({ type: "gap" }, ...countersignBlocks(row));
  blocks.push({ type: "pageBreak" });
  return blocks;
}

// The document as plain blocks: everything that decides what may appear lives here, separate from layout.
export function buildResponseBlocks({ form, response: row, audience = "external" }) {
  const workspace = audience === "workspace";
  const fields = canonicalFields(form);
  const masked = protectedFieldIds(form, row);
  const s = form?.settings || {};
  const m = row.metadata || {};
  const anonymous = Boolean(s.anonymous || m.anonymous);
  const hiddenIds = workspace ? [] : fields.filter((f) => f.type === "hidden").map((f) => f.id);
  const currency = s.payments?.currency || row.payment_currency || "usd";

  const safeAnswers = { ...(row.answers || {}) };
  for (const id of masked) delete safeAnswers[id];
  const graded = form ? { ...form, fieldDefs: fields } : null;
  const visible = visibleFieldIds(fields, safeAnswers);

  const identity = sensitiveIdentity(form?.fieldDefs);
  const name = anonymous ? "Anonymous" : identity.name && row.respondent_name ? MASK : row.respondent_name || "Anonymous";
  const email = anonymous ? "" : identity.email && row.respondent_email ? MASK : row.respondent_email || "";

  const ctx = { row, fields, masked, safeAnswers, currency };
  const blocks = templateBlocks({ form, row, fields, masked, hiddenIds, safeAnswers, workspace, anonymous, respondent: name });

  blocks.push(
    { type: "title", text: form?.title || "Response" },
    { type: "text", text: email ? `${name} · ${email}` : name },
    { type: "text", text: `Response #${String(row.id).slice(0, 8)} · Submitted ${fmt(row.submitted_at)} · Status: ${row.status || "Complete"}`, muted: true, small: true },
    { type: "section", text: "Answers" },
  );

  if (fields.length) {
    for (const f of fields) {
      if (f.type === "heading" || f.type === "page") {
        const title = f.type === "page" ? f.title : f.label || f.title;
        if (title && visible.has(f.id)) blocks.push({ type: "heading", text: title });
        continue;
      }
      if (!answerFields([f], { computed: true }).length || hiddenIds.includes(f.id)) continue;
      // Masked answers can't feed conditions, so an answered field stays even when its condition reads as false.
      if (!visible.has(f.id) && isEmptyAnswer(row.answers?.[f.id])) continue;
      blocks.push({ type: "label", text: fieldLabel(f) }, ...answerBlocks(f, ctx));
    }
  } else {
    for (const [key, value] of Object.entries(row.answers || {})) {
      if (key.startsWith("__")) continue;
      blocks.push({ type: "label", text: key }, { type: "text", text: masked.has(key) ? MASK : typeof value === "object" ? JSON.stringify(value) : String(value) });
    }
  }

  if (m.countersign) blocks.push({ type: "section", text: "Countersignature" }, ...countersignBlocks(row));
  blocks.push(...invoiceBlocks(row, graded, safeAnswers, workspace));
  blocks.push(...auditBlocks({ row, form, fields, masked, anonymous, workspace }));
  return blocks;
}

function dataUrlBytes(url) {
  const match = /^data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(url || ""));
  return match ? new Uint8Array(Buffer.from(match[1], "base64")) : null;
}

// Embeds a PNG/JPEG, refusing oversized files and dimensions that would balloon when decoded; null means show the fallback line.
async function embedImage(doc, bytes) {
  if (!bytes?.length || bytes.length > MAX_IMAGE_BYTES) return null;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (isPng) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 24 || view.getUint32(16) > MAX_IMAGE_SIDE || view.getUint32(20) > MAX_IMAGE_SIDE) return null;
    return doc.embedPng(bytes);
  }
  return isJpeg ? doc.embedJpg(bytes) : null;
}

// Cursor-based painter: wraps text, breaks pages, and never draws a character the font can't encode.
function createPainter(doc, fonts) {
  const sanitizer = createSanitizer(fonts.regular);
  const measure = createMeasure();
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };
  const ensure = (height) => {
    if (y - height < BOTTOM) newPage();
  };

  // Greedy word wrap; a word wider than the line is split between characters.
  const wrap = (value, font, size, width) => {
    const lines = [];
    for (const hard of String(value ?? "").split(LINE_BREAK)) {
      let line = "";
      for (const word of sanitizer.clean(hard).split(" ")) {
        const candidate = line ? `${line} ${word}` : word;
        if (measure(font, candidate, size) <= width) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        line = "";
        let rest = "";
        for (const char of word) {
          if (rest && measure(font, rest + char, size) > width) {
            lines.push(rest);
            rest = "";
          }
          rest += char;
        }
        line = rest;
      }
      lines.push(line);
    }
    return lines;
  };

  const drawLine = (line, x, top, font, size, color) => {
    if (line) page.drawText(line, { x, y: top - size, size, font, color });
  };

  const paragraph = (text, { font = fonts.regular, size = 10.5, color = INK, leading = 1.35, after = 0 } = {}) => {
    const lineHeight = size * leading;
    for (const line of wrap(text, font, size, CONTENT_WIDTH)) {
      ensure(lineHeight);
      drawLine(line, MARGIN, y, font, size, color);
      y -= lineHeight;
    }
    y -= after;
  };

  const rule = (thickness = 0.5, color = RULE) => {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness, color });
  };

  // Rows break across pages line by line, so a very long cell can't overflow.
  const table = ({ header, weights, rows }) => {
    const size = 9;
    const lineHeight = size * 1.35;
    const pad = 4;
    const total = weights.reduce((sum, w) => sum + w, 0);
    const widths = weights.map((w) => (CONTENT_WIDTH * w) / total);
    const paintRow = (cells, font, color) => {
      const wrapped = cells.map((cell, i) => wrap(cell, font, size, widths[i] - pad * 2));
      const count = Math.max(1, ...wrapped.map((lines) => lines.length));
      const height = count * lineHeight + pad * 2;
      if (height <= PAGE_HEIGHT - MARGIN - BOTTOM) ensure(height);
      let offset = 0;
      while (offset < count) {
        const room = Math.floor((y - BOTTOM - pad * 2) / lineHeight);
        if (room < 1) {
          newPage();
          continue;
        }
        const take = Math.min(room, count - offset);
        let x = MARGIN;
        wrapped.forEach((lines, i) => {
          lines.slice(offset, offset + take).forEach((line, l) => drawLine(line, x + pad, y - pad - l * lineHeight, font, size, i === 0 && !header ? MUTED : color));
          x += widths[i];
        });
        y -= take * lineHeight + pad * 2;
        rule();
        offset += take;
      }
    };
    if (header) {
      ensure(lineHeight * 2 + pad * 4);
      paintRow(header, fonts.bold, MUTED);
    }
    for (const row of rows) paintRow(row, fonts.regular, INK);
    y -= 4;
  };

  const keyValues = (items) => {
    const size = 9;
    const lineHeight = size * 1.35;
    const keyWidth = 130;
    for (const [key, value] of items) {
      if (value == null || value === "") continue;
      const keys = wrap(key, fonts.regular, size, keyWidth - 8);
      const values = wrap(value, fonts.regular, size, CONTENT_WIDTH - keyWidth);
      for (let i = 0; i < Math.max(keys.length, values.length); i += 1) {
        ensure(lineHeight);
        drawLine(keys[i], MARGIN, y, fonts.regular, size, MUTED);
        drawLine(values[i], MARGIN + keyWidth, y, fonts.regular, size, INK);
        y -= lineHeight;
      }
      y -= 2;
    }
  };

  const image = async ({ alt, path, dataUrl }, loadFile) => {
    let embedded = null;
    try {
      const bytes = dataUrl ? dataUrlBytes(dataUrl) : path && loadFile ? await loadFile(path) : null;
      embedded = await embedImage(doc, bytes);
    } catch (e) {
      console.error("[pdf.image]", e?.message);
    }
    if (!embedded) return paragraph(`${alt} on file (image not available in this PDF)`, { size: 9, color: MUTED, after: 2 });
    const scale = Math.min(220 / embedded.width, 72 / embedded.height, 1);
    const height = embedded.height * scale;
    ensure(height + 4);
    page.drawImage(embedded, { x: MARGIN, y: y - height, width: embedded.width * scale, height });
    y -= height + 4;
  };

  const paint = async (block, loadFile) => {
    switch (block.type) {
      case "title":
        ensure(50);
        paragraph(block.text, { font: fonts.bold, size: 17, leading: 1.25, after: 6 });
        break;
      case "section":
        ensure(52);
        y -= 14;
        paragraph(String(block.text).toUpperCase(), { font: fonts.bold, size: 8.5, color: MUTED, after: 3 });
        rule();
        y -= 6;
        break;
      case "heading":
        ensure(40);
        y -= 6;
        paragraph(block.text, { font: fonts.bold, size: 11, after: 3 });
        break;
      case "label":
        // Keep a label with at least the first line of its answer.
        ensure(34);
        y -= 5;
        paragraph(block.text, { font: fonts.bold, size: 8.5, color: MUTED, after: 1 });
        break;
      case "text":
        paragraph(block.text, { size: block.small ? 8.5 : 10.5, color: block.muted ? MUTED : INK });
        break;
      case "body":
        y -= 8;
        paragraph(block.text, { size: 10.5, leading: 1.5 });
        break;
      case "image":
        await image(block, loadFile);
        break;
      case "table":
        y -= 2;
        table(block);
        break;
      case "kv":
        y -= 2;
        keyValues(block.items);
        break;
      case "gap":
        y -= 18;
        break;
      case "pageBreak":
        newPage();
        break;
      default:
        break;
    }
  };

  return { paint, paragraph, sanitizer, gap: (n) => { y -= n; } };
}

export function responsePdfFilename(response) {
  return `response-${String(response?.id || "").slice(0, 8) || "record"}.pdf`;
}

/**
 * Renders one response → Uint8Array.
 * `audience`: "workspace" is the full record (session download, team email); anything else is the external record (respondent email, signed link, API).
 * `loadFile(path)` returns a stored signature's bytes (or null); it's only called for fields that may be shown.
 */
export async function renderResponsePdf({ form, response, audience = "external", loadFile = null, now = new Date() }) {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const branded = form?.settings?.branding !== false;
  doc.setTitle(String(form?.title || "Response"));
  doc.setCreationDate(now);
  doc.setModificationDate(now);
  if (branded) {
    doc.setCreator("Geiger Forms");
    doc.setProducer("Geiger Forms");
  }

  const painter = createPainter(doc, fonts);
  for (const block of buildResponseBlocks({ form, response, audience })) await painter.paint(block, loadFile);

  painter.gap(10);
  if (painter.sanitizer.replaced) {
    painter.paragraph(`${painter.sanitizer.replaced} character${painter.sanitizer.replaced === 1 ? "" : "s"} in this record can't be shown in this PDF's font and appear as "?". The stored response keeps the original text.`, { size: 8.5, color: MUTED, after: 3 });
  }
  painter.paragraph(`Generated ${fmt(now.toISOString())}${branded ? " · Geiger Forms" : ""}`, { size: 7.5, color: MUTED });

  const pages = doc.getPages();
  const reference = `Response #${painter.sanitizer.clean(String(response?.id || "").slice(0, 8))}`;
  pages.forEach((page, i) => {
    page.drawText(reference, { x: MARGIN, y: MARGIN - 8, size: 7.5, font: fonts.regular, color: MUTED });
    const label = `Page ${i + 1} of ${pages.length}`;
    page.drawText(label, { x: PAGE_WIDTH - MARGIN - fonts.regular.widthOfTextAtSize(label, 7.5), y: MARGIN - 8, size: 7.5, font: fonts.regular, color: MUTED });
  });
  return doc.save();
}
