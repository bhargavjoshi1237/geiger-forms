import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { after, before, beforeEach, describe, it } from "node:test";
import { PDFDocument, PDFRawStream, StandardFonts } from "pdf-lib";
import { buildResponseBlocks, renderResponsePdf, responsePdfFilename } from "./pdf.js";
import { signLinkToken, signPdfToken, verifyLinkToken, verifyPdfToken } from "./crypto.js";
import { sendAdminNotification, sendConfirmation } from "./side-effects.js";
import { withPdfLink } from "./webhooks.js";

const FORM_ID = "11111111-1111-4111-8111-111111111111";
const RESPONSE_ID = "22222222-2222-4222-8222-222222222222";
const SECRET_SSN = "SSN-987-65-4321";
const SECRET_EMAIL = "hidden.person@secret.example";
const CIPHERTEXT = "v1:abc:def:CIPHERTEXTSHOULDNOTSHOW";
// A one-pixel PNG.
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const field = (id, type, extra = {}) => ({ id, type, title: extra.label || id, label: extra.label || id, ...extra });

const FIELDS = [
  field("intro", "heading", { label: "About you" }),
  field("fullname", "name", { label: "Full name" }),
  field("email", "email", { label: "Email" }),
  field("home", "address", { label: "Home address" }),
  field("notes", "textarea", { label: "Notes" }),
  field("langs", "multiselect", { label: "Languages", options: ["English", "French"] }),
  field("order", "ranking", { label: "Ranking", options: ["A", "B"] }),
  field("grid", "matrix", { label: "Grid", options: ["Good", "Bad"], config: { rows: ["Food", "Venue"] } }),
  field("people", "repeater", { label: "People", config: { subFields: [{ id: "who", type: "text", label: "Who" }, { id: "age", type: "number", label: "Age" }] } }),
  field("upload", "file", { label: "Upload" }),
  field("sig", "signature", { label: "Signature" }),
  field("agree", "consent", { label: "I agree to the terms" }),
  field("budget", "currency", { label: "Budget" }),
  field("score", "rating", { label: "Rating" }),
  field("yes", "checkbox", { label: "Subscribe" }),
  field("when", "booking", { label: "Slot" }),
  field("tracking", "hidden", { label: "Tracking code" }),
  field("ssn", "text", { label: "SSN", sensitive: true }),
  field("enc", "text", { label: "Medical", sensitive: true }),
  field("income", "number", { label: "Income", sensitive: true }),
  field("doubled", "calculated", { label: "Doubled", formula: "{Income} * 2" }),
  field("legacy", "text", { label: "Legacy" }),
];

const baseRow = (overrides = {}) => ({
  id: RESPONSE_ID,
  form_id: FORM_ID,
  status: "Complete",
  priority: "High",
  score: 42,
  outcome: "Qualified",
  submitted_at: "2026-10-01T10:00:00Z",
  respondent_name: "Ada Lovelace",
  respondent_email: "ada@example.com",
  user_agent: "AgentString/1.0",
  answers: {
    fullname: { first: "Ada", last: "Lovelace" },
    email: "ada@example.com",
    home: { line1: "1 Main St", city: "London", country: "UK" },
    notes: "First line\nSecond line",
    langs: ["English", "French"],
    order: ["B", "A"],
    grid: { Food: "Good", Venue: "Bad" },
    people: [{ who: "Grace", age: 37 }, { who: "Alan", age: 41 }],
    upload: [{ name: "resume.pdf", path: `forms/${FORM_ID}/resume.pdf`, size: 2048 }],
    sig: { path: `forms/${FORM_ID}/signatures/sig.png`, signedAt: "2026-10-01T10:00:00Z" },
    agree: true,
    budget: 1200,
    score: 4,
    yes: false,
    when: "2026-11-01T09:00:00Z",
    tracking: "TRACK-INTERNAL-77",
    ssn: SECRET_SSN,
    enc: { __enc: CIPHERTEXT },
    income: 250000,
    doubled: 500000,
    legacy: { __enc: "v1:x:y:LEGACYCIPHER" },
  },
  metadata: {
    ipHash: "IPHASHVALUE",
    userAgent: "AgentString/1.0",
    referrer: "https://referrer.example",
    encryptedFields: ["enc", "legacy"],
    consents: { agree: { acceptedAt: "2026-10-01T10:00:00Z", textHash: "abc123hash" } },
    countersign: { name: "Reviewer Rae", at: "2026-10-02T10:00:00Z", signature: `forms/${FORM_ID}/countersign/c.png` },
  },
  approval: { history: [{ stepName: "Legal", decision: "approve", note: "PRIVATE-REVIEW-NOTE", by: "Rae", at: "2026-10-02T10:00:00Z" }] },
  payment_status: "paid",
  payment_amount: 25,
  payment_currency: "inr",
  payment_ref: "pi_SECRETREF",
  ...overrides,
});

const baseForm = (settings = {}, fieldDefs = FIELDS) => ({ id: FORM_ID, title: "Intake form", fieldDefs, settings });

// Every string drawn on every page, decoded from the content streams.
async function drawnText(bytes) {
  const doc = await PDFDocument.load(bytes);
  const chunks = [];
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    let content;
    try {
      content = inflateSync(Buffer.from(object.getContents())).toString("latin1");
    } catch {
      continue;
    }
    for (const match of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) chunks.push(new TextDecoder("windows-1252").decode(Buffer.from(match[1], "hex")));
  }
  return chunks.join("\n");
}

async function render(options) {
  const bytes = await renderResponsePdf({ form: baseForm(), response: baseRow(), audience: "workspace", ...options });
  return { bytes, text: await drawnText(bytes), doc: await PDFDocument.load(bytes) };
}

describe("renderResponsePdf", () => {
  let result;
  before(async () => {
    result = await render({ loadFile: async () => new Uint8Array(Buffer.from(PNG_BASE64, "base64")) });
  });

  it("produces a parseable PDF", () => {
    assert.ok(result.doc.getPageCount() >= 1);
    assert.equal(Buffer.from(result.bytes.subarray(0, 5)).toString(), "%PDF-");
    assert.equal(result.doc.getTitle(), "Intake form");
  });

  it("renders every answer type", () => {
    for (const expected of ["Ada Lovelace", "1 Main St, London, UK", "First line", "Second line", "English, French", "1. B", "Food", "Grace", "resume.pdf (2 KB)", "Signed Oct 1, 2026", "Agreed Oct 1, 2026", "abc123hash", "4 / 5", "No", "Nov 1, 2026", "Reviewer Rae", "RECEIPT", "AUDIT TRAIL"]) {
      assert.ok(result.text.includes(expected), `missing ${expected}`);
    }
  });

  it("embeds signature images and falls back when one can't be read", async () => {
    const images = (doc) => [...doc.context.enumerateIndirectObjects()].filter(([, o]) => o instanceof PDFRawStream && String(o.dict.get(doc.context.obj("Subtype")) ?? "").includes("Image")).length;
    assert.ok(images(result.doc) >= 2);
    const broken = await render({ loadFile: async () => new Uint8Array([1, 2, 3]) });
    assert.ok(broken.text.includes("Signature on file"));
    const thrown = await render({ loadFile: async () => { throw new Error("storage down"); } });
    assert.ok(thrown.text.includes("Countersignature on file"));
  });

  it("never draws a sensitive value, however it is stored", () => {
    for (const secret of [SECRET_SSN, CIPHERTEXT, "CIPHERTEXTSHOULDNOTSHOW", "LEGACYCIPHER", "250000", "500000", "500,000"]) {
      assert.ok(!result.text.includes(secret), `leaked ${secret}`);
      assert.ok(!Buffer.from(result.bytes).toString("latin1").includes(secret), `leaked ${secret} in raw bytes`);
    }
    assert.ok(result.text.includes("[protected]"));
  });

  it("masks a sensitive value in the document template and never loads a sensitive signature", async () => {
    const fields = FIELDS.map((f) => (f.id === "sig" ? { ...f, sensitive: true } : f));
    const form = baseForm({ documentTemplate: { enabled: true, title: "Contract for {SSN}", body: "SSN {SSN}, doubled {Doubled}, name {Full name}." } }, fields);
    const asked = [];
    const { text } = await render({ form, loadFile: async (path) => { asked.push(path); return null; } });
    assert.ok(!text.includes(SECRET_SSN));
    assert.ok(!text.includes("500000"));
    assert.ok(text.includes("Contract for [protected]"));
    assert.ok(text.includes("name Ada Lovelace"));
    assert.ok(!asked.some((p) => p.includes("signatures/")), "loaded a sensitive signature");
  });

  it("masks respondent identity copied from a sensitive field", async () => {
    const fields = FIELDS.map((f) => (f.id === "email" ? { ...f, sensitive: true } : f));
    const row = baseRow({ respondent_email: SECRET_EMAIL, answers: { ...baseRow().answers, email: SECRET_EMAIL } });
    const { text } = await render({ form: baseForm({}, fields), response: row });
    assert.ok(!text.includes(SECRET_EMAIL));
  });

  it("masks encrypted answers when the form has no field definitions", async () => {
    const { text } = await render({ form: baseForm({}, []) });
    assert.ok(!text.includes("CIPHERTEXTSHOULDNOTSHOW"));
    assert.ok(text.includes("[protected]"));
  });

  it("drops respondent identity in anonymous mode", async () => {
    const row = baseRow({ metadata: { ...baseRow().metadata, policy: { acknowledgedAt: "2026-10-01T10:00:00Z", typedName: "Typed Person" } } });
    for (const form of [baseForm({ anonymous: true }), { ...baseForm(), settings: {} }]) {
      const response = form.settings.anonymous ? row : { ...row, metadata: { ...row.metadata, anonymous: true } };
      const { text } = await render({ form, response });
      for (const secret of ["ada@example.com · ", "Ada Lovelace · ", "IPHASHVALUE", "AgentString", "referrer.example", "Typed Person"]) assert.ok(!text.includes(secret), `leaked ${secret}`);
      assert.ok(text.includes("Anonymous"));
    }
  });

  it("keeps internal details out of the external record", async () => {
    const { text } = await render({ audience: "external" });
    for (const secret of ["IPHASHVALUE", "AgentString", "PRIVATE-REVIEW-NOTE", "pi_SECRETREF", "TRACK-INTERNAL-77", "High", SECRET_SSN]) assert.ok(!text.includes(secret), `leaked ${secret}`);
    for (const kept of ["Ada Lovelace", "abc123hash", "Reviewer Rae", "RECEIPT"]) assert.ok(text.includes(kept), `missing ${kept}`);
    const workspace = await render({});
    for (const kept of ["IPHASHVALUE", "PRIVATE-REVIEW-NOTE", "pi_SECRETREF", "TRACK-INTERNAL-77"]) assert.ok(workspace.text.includes(kept), `missing ${kept}`);
  });

  it("defaults to the external record", async () => {
    const bytes = await renderResponsePdf({ form: baseForm(), response: baseRow() });
    assert.ok(!(await drawnText(bytes)).includes("IPHASHVALUE"));
  });

  it("doesn't throw on text the standard fonts can't encode, and says so", async () => {
    const row = baseRow({
      respondent_name: "山田太郎 👩‍💻",
      answers: { fullname: { first: "Лев", last: "مريم" }, notes: "हिन्दी 한국어 ελληνικά ₹100 → done time x​\t\r\nŁódź Zoë Śląsk", grid: { Food: "好" }, langs: ["日本語"] },
    });
    const form = { ...baseForm(), title: "表格 Form 📋" };
    const { text, doc } = await render({ form, response: row });
    assert.ok(doc.getPageCount() >= 1);
    assert.equal(doc.getTitle(), "表格 Form 📋");
    assert.ok(text.includes("INR 100 -> done time x"));
    assert.ok(text.includes("Lódz Zoë Slask"));
    assert.ok(text.includes("can't be shown in this PDF's font"));
  });

  it("never throws on any single Basic Multilingual Plane character", async () => {
    let all = "";
    for (let cp = 1; cp < 0xffff; cp += 1) if (cp < 0xd800 || cp > 0xdfff) all += String.fromCodePoint(cp);
    const { doc } = await render({ response: baseRow({ answers: { notes: all } }) });
    assert.ok(doc.getPageCount() >= 1);
  });

  it("paginates and wraps long text without clipping", async () => {
    const words = Array.from({ length: 8000 }, (_, i) => `word${i}`).join(" ");
    const unbroken = "x".repeat(5000);
    const rows = Array.from({ length: 120 }, (_, i) => ({ who: `Person ${i}`, age: i }));
    const { doc, text } = await render({ response: baseRow({ answers: { notes: `${words}\n${unbroken}`, people: rows, grid: { Food: "long ".repeat(4000) } } }) });
    assert.ok(doc.getPageCount() > 5);
    assert.ok(text.includes("word7999"));
    assert.ok(text.includes("Person 119"));
    assert.ok(text.includes(`Page ${doc.getPageCount()} of ${doc.getPageCount()}`));
    // Nothing is drawn past the right margin at the body size.
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    for (const line of text.split("\n")) assert.ok(font.widthOfTextAtSize(line, 10.5) <= 505, `too wide: ${line.slice(0, 40)}`);
  });

  it("tolerates malformed stored answers", async () => {
    const answers = { fullname: "Plain Name", home: 7, grid: "not a grid", people: "nope", upload: "file.txt", sig: "not-a-data-url", agree: "yes", order: "A", langs: "English", when: "soon", budget: "abc" };
    const { doc, text } = await render({ response: baseRow({ answers, metadata: {}, approval: null }) });
    assert.ok(doc.getPageCount() >= 1);
    assert.ok(text.includes("Plain Name"));
  });

  it("renders the inline signature data URL only, with no remote fetch", async () => {
    const dataUrl = `data:image/png;base64,${PNG_BASE64}`;
    const asked = [];
    await render({ response: baseRow({ answers: { sig: dataUrl }, metadata: {} }), loadFile: async (path) => { asked.push(path); return null; } });
    assert.deepEqual(asked, []);
    const { text } = await render({ response: baseRow({ answers: { sig: "https://evil.example/x.png" }, metadata: {} }), loadFile: async (path) => { asked.push(path); return null; } });
    assert.deepEqual(asked, []);
    assert.ok(text.includes("Signature on file"));
  });

  it("names the file after the response id only", () => {
    assert.equal(responsePdfFilename(baseRow()), "response-22222222.pdf");
  });

  it("drops the Geiger name when the form's branding is off", async () => {
    const off = await render({ form: baseForm({ branding: false }) });
    assert.ok(!off.text.includes("Geiger Forms"));
    assert.ok(result.text.includes("Geiger Forms"));
  });

  it("keeps sensitive repeater columns masked", () => {
    const fields = [field("people", "repeater", { label: "People", config: { subFields: [{ id: "who", type: "text", label: "Who", sensitive: true }] } })];
    const blocks = buildResponseBlocks({ form: baseForm({}, fields), response: baseRow({ answers: { people: [{ who: SECRET_SSN }] } }) });
    assert.ok(!JSON.stringify(blocks).includes(SECRET_SSN));
  });
});

describe("page layout", () => {
  it("keeps every line inside the margins with no overlap in a column", async () => {
    const answers = { ...baseRow().answers, notes: `${"lorem ipsum ".repeat(2500)}\n${"z".repeat(3000)}`, people: Array.from({ length: 80 }, (_, i) => ({ who: `Person ${i} `.repeat(12), age: i })) };
    const bytes = await renderResponsePdf({ form: baseForm(), response: baseRow({ answers }), audience: "workspace" });
    const doc = await PDFDocument.load(bytes);
    const scratch = await PDFDocument.create();
    const fonts = { regular: await scratch.embedFont(StandardFonts.Helvetica), bold: await scratch.embedFont(StandardFonts.HelveticaBold) };
    let lines = 0;
    for (const [, object] of doc.context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFRawStream)) continue;
      let content;
      try {
        content = inflateSync(Buffer.from(object.getContents())).toString("latin1");
      } catch {
        continue;
      }
      const columns = new Map();
      for (const m of content.matchAll(/\/(Helvetica(-Bold)?)-\d+ ([\d.]+) Tf[\s\S]*?1 0 0 1 ([\d.]+) ([\d.]+) Tm\s*<([0-9A-Fa-f]*)> Tj/g)) {
        const [size, x, y] = [Number(m[3]), Number(m[4]), Number(m[5])];
        const text = new TextDecoder("windows-1252").decode(Buffer.from(m[6], "hex"));
        const width = (m[2] ? fonts.bold : fonts.regular).widthOfTextAtSize(text, size);
        lines += 1;
        assert.ok(x >= 48 - 0.01, `left of the margin: ${text.slice(0, 30)}`);
        assert.ok(x + width <= 595.28 - 48 + 0.5, `past the right margin: ${text.slice(0, 30)}`);
        assert.ok(y >= 40 && y <= 841.89 - 48, `outside the page body at y=${y}: ${text.slice(0, 30)}`);
        if (y > 48) {
          const last = columns.get(x);
          if (last != null) assert.ok(y < last, `overlaps the line above at x=${x}: ${text.slice(0, 30)}`);
          columns.set(x, y);
        }
      }
    }
    assert.ok(lines > 500);
    assert.ok(doc.getPageCount() > 5);
  });
});

describe("PDF delivery", () => {
  const realFetch = globalThis.fetch;
  const saved = {};
  let sent;
  let replies;
  const email = { confirmEmail: true, confirmSubject: "Thanks", confirmBody: "Got it", notifyEmails: ["ops@example.com"] };

  before(() => {
    for (const key of ["RESEND_API_KEY", "NEXT_PUBLIC_APP_URL", "FORMS_LINK_SECRET"]) saved[key] = process.env[key];
    process.env.RESEND_API_KEY = "re_test";
    process.env.FORMS_LINK_SECRET = "test-secret";
  });
  after(() => {
    globalThis.fetch = realFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  beforeEach(() => {
    sent = [];
    replies = [];
    globalThis.fetch = async (url, init) => {
      sent.push(JSON.parse(init.body));
      return replies.shift() || new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    };
  });

  it("attaches nothing by default", async () => {
    await sendConfirmation({ form: baseForm(email), row: baseRow(), answers: {}, extras: {} });
    await sendAdminNotification({ form: baseForm(email), row: baseRow(), answers: {}, origin: "https://app.example" });
    assert.equal(sent.length, 2);
    assert.ok(sent.every((m) => !m.attachments));
  });

  it("attaches a masked, parseable PDF when the form opts in", async () => {
    const form = baseForm({ ...email, confirmAttachPdf: true, notifyAttachPdf: true });
    await sendConfirmation({ form, row: baseRow(), answers: {}, extras: {} });
    await sendAdminNotification({ form, row: baseRow(), answers: {}, origin: "https://app.example" });
    const [respondent, team] = await Promise.all(sent.map((m) => drawnText(new Uint8Array(Buffer.from(m.attachments[0].content, "base64")))));
    assert.equal(sent[0].attachments[0].filename, "response-22222222.pdf");
    assert.ok(!respondent.includes(SECRET_SSN) && !team.includes(SECRET_SSN));
    assert.ok(!respondent.includes("IPHASHVALUE"), "the respondent's copy is the external record");
    assert.ok(team.includes("IPHASHVALUE"), "the team's copy is the full record");
  });

  it("still sends the email when the PDF can't be rendered", async () => {
    const row = baseRow();
    Object.defineProperty(row, "metadata", { get() { throw new Error("broken row"); } });
    const result = await sendConfirmation({ form: baseForm({ ...email, confirmAttachPdf: true }), row, answers: {}, extras: {} });
    assert.equal(result.sent, true);
    assert.equal(sent.length, 1);
    assert.ok(!sent[0].attachments);
  });

  it("resends without the attachment when Resend rejects it, and not on a rate limit", async () => {
    const form = baseForm({ ...email, confirmAttachPdf: true });
    replies = [new Response("too big", { status: 422 })];
    const result = await sendConfirmation({ form, row: baseRow(), answers: {}, extras: {} });
    assert.equal(result.sent, true);
    assert.equal(sent.length, 2);
    assert.ok(sent[0].attachments && !sent[1].attachments);
    sent = [];
    replies = [new Response("slow down", { status: 429 })];
    await sendConfirmation({ form, row: baseRow(), answers: {}, extras: {} });
    assert.equal(sent.length, 1);
  });

  it("doesn't attach to automation emails, which can go to any address", async () => {
    const form = baseForm({ ...email, notifyAttachPdf: true });
    await sendAdminNotification({ form, row: baseRow(), answers: {}, origin: "https://app.example", to: "someone@elsewhere.example" });
    assert.ok(!sent[0].attachments);
  });

  it("adds a fresh signed link to webhook bodies without touching the stored payload", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example";
    const payload = { form: { id: FORM_ID }, response: { id: RESPONSE_ID, status: "Complete", answers: {} } };
    const stored = JSON.stringify(payload);
    const data = withPdfLink("response.created", payload);
    assert.equal(JSON.stringify(payload), stored);
    const url = new URL(data.response.pdfUrl);
    assert.equal(url.pathname, `/api/responses/${RESPONSE_ID}/pdf`);
    assert.equal(verifyPdfToken(url.searchParams.get("token"), RESPONSE_ID), true);
    assert.deepEqual({ ...data.response, pdfUrl: undefined }, { ...payload.response, pdfUrl: undefined });
  });

  it("omits the link for test events, and without an absolute app URL or a signing secret", () => {
    const payload = { response: { id: RESPONSE_ID } };
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example";
    assert.equal(withPdfLink("test", payload), payload);
    delete process.env.NEXT_PUBLIC_APP_URL;
    assert.equal(withPdfLink("response.created", payload), payload);
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example";
    const secrets = { link: process.env.FORMS_LINK_SECRET, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
    delete process.env.FORMS_LINK_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      assert.equal(withPdfLink("response.created", payload), payload);
    } finally {
      process.env.FORMS_LINK_SECRET = secrets.link;
      if (secrets.key) process.env.SUPABASE_SERVICE_ROLE_KEY = secrets.key;
    }
  });
});

describe("signed PDF links", () => {
  before(() => {
    process.env.FORMS_LINK_SECRET = "test-secret";
  });

  it("verifies only for its response and only until it expires", () => {
    const token = signPdfToken(RESPONSE_ID, Date.now() + 60_000);
    assert.equal(verifyPdfToken(token, RESPONSE_ID), true);
    assert.equal(verifyPdfToken(token, FORM_ID), false);
    assert.equal(verifyPdfToken(signPdfToken(RESPONSE_ID, Date.now() - 1), RESPONSE_ID), false);
    assert.equal(verifyPdfToken(`${token}x`, RESPONSE_ID), false);
    assert.equal(verifyPdfToken(undefined, RESPONSE_ID), false);
  });

  it("rejects a tampered payload and any other signed token", () => {
    const [, sig] = signPdfToken(RESPONSE_ID, Date.now() + 60_000).split(".");
    const forged = Buffer.from(JSON.stringify({ r: FORM_ID, x: Date.now() + 60_000 })).toString("base64url");
    assert.equal(verifyPdfToken(`${forged}.${sig}`, FORM_ID), false);
    const respondentLink = signLinkToken({ formId: RESPONSE_ID, expiresAt: Date.now() + 60_000 });
    assert.equal(verifyPdfToken(respondentLink, RESPONSE_ID), false);
    assert.equal(verifyLinkToken(signPdfToken(RESPONSE_ID, Date.now() + 60_000), RESPONSE_ID), null);
  });

  it("issues nothing without a signing secret", () => {
    const saved = { link: process.env.FORMS_LINK_SECRET, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
    delete process.env.FORMS_LINK_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      assert.equal(signPdfToken(RESPONSE_ID, Date.now() + 60_000), null);
    } finally {
      process.env.FORMS_LINK_SECRET = saved.link;
      if (saved.key) process.env.SUPABASE_SERVICE_ROLE_KEY = saved.key;
    }
  });
});
