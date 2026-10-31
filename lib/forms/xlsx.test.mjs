import test from "node:test";
import assert from "node:assert/strict";

import { buildXlsx, crc32 } from "./xlsx.js";

const decoder = new TextDecoder();

// Reads a stored ZIP back through its central directory, checking each file's CRC.
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = {};
  for (let i = 0; i < count; i += 1) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const offset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.slice(at + 46, at + 46 + nameLength));
    assert.equal(view.getUint32(offset, true), 0x04034b50);
    const start = offset + 30 + view.getUint16(offset + 26, true);
    const data = bytes.slice(start, start + size);
    assert.equal(crc32(data), crc, name);
    files[name] = decoder.decode(data);
    at += 46 + nameLength;
  }
  return files;
}

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("the package holds every part a spreadsheet app needs", () => {
  const files = unzip(buildXlsx([["a"]]));
  assert.deepEqual(Object.keys(files).sort(), ["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]);
});

test("numbers stay numeric and text is inline", () => {
  const sheet = unzip(buildXlsx([["Name", "Score"], ["Ana", 9.5]]))["xl/worksheets/sheet1.xml"];
  assert.ok(sheet.includes('<c r="B2"><v>9.5</v></c>'));
  assert.ok(sheet.includes('<c r="A2" t="inlineStr"><is><t xml:space="preserve">Ana</t></is></c>'));
});

test("a formula is only ever text", () => {
  const sheet = unzip(buildXlsx([['=HYPERLINK("http://evil.test")']]))["xl/worksheets/sheet1.xml"];
  assert.ok(!sheet.includes("<f>"));
  assert.ok(sheet.includes("=HYPERLINK(&quot;http://evil.test&quot;)"));
});

test("markup is escaped, control characters dropped and blanks skipped", () => {
  const sheet = unzip(buildXlsx([["<b>&\u0007", null, ""]]))["xl/worksheets/sheet1.xml"];
  assert.ok(sheet.includes("&lt;b&gt;&amp;<"));
  assert.ok(!sheet.includes("\u0007"));
  assert.ok(!sheet.includes('r="B1"'));
});

test("columns past Z use two letters", () => {
  const sheet = unzip(buildXlsx([Array.from({ length: 28 }, (_, i) => i)]))["xl/worksheets/sheet1.xml"];
  assert.ok(sheet.includes('r="Z1"'));
  assert.ok(sheet.includes('r="AB1"'));
});

test("sheet names lose forbidden characters and fit the limit", () => {
  const workbook = unzip(buildXlsx([["a"]], { sheet: `A/B*${"x".repeat(50)}` }))["xl/workbook.xml"];
  const name = workbook.match(/sheet name="([^"]+)"/)[1];
  assert.ok(name.length <= 31);
  assert.ok(!/[/*]/.test(name));
});

test("non-Latin text survives", () => {
  assert.ok(unzip(buildXlsx([["नमस्ते العربية"]]))["xl/worksheets/sheet1.xml"].includes("नमस्ते العربية"));
});
