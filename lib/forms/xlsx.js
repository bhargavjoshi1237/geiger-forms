// Minimal .xlsx writer: one sheet in an uncompressed ZIP, no dependency. Text is always stored as inline strings, so a cell can never run as a formula.

const encoder = new TextEncoder();

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts) {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function header(size, write) {
  const bytes = new Uint8Array(size);
  write(new DataView(bytes.buffer));
  return bytes;
}

// A ZIP of stored (uncompressed) files, which every spreadsheet app reads.
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);
    const shared = (v, at) => {
      v.setUint16(at, 20, true);
      v.setUint16(at + 2, 0x0800, true); // UTF-8 names
      v.setUint16(at + 4, 0, true);
      v.setUint16(at + 6, 0, true);
      v.setUint16(at + 8, 0x21, true); // 1980-01-01
      v.setUint32(at + 10, crc, true);
      v.setUint32(at + 14, data.length, true);
      v.setUint32(at + 18, data.length, true);
      v.setUint16(at + 22, nameBytes.length, true);
    };
    const local = header(30, (v) => {
      v.setUint32(0, 0x04034b50, true);
      shared(v, 4);
    });
    const central = header(46, (v) => {
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true);
      shared(v, 6);
      v.setUint32(42, offset, true);
    });
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directory = concat(centrals);
  const end = header(22, (v) => {
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, files.length, true);
    v.setUint16(10, files.length, true);
    v.setUint32(12, directory.length, true);
    v.setUint32(16, offset, true);
  });
  return concat([...locals, directory, end]);
}

// XML 1.0 can't carry most control characters at all, so they're dropped rather than escaped.
function escapeXml(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index) {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function cell(value, column, rowNumber) {
  if (value == null || value === "") return "";
  const ref = `${columnName(column)}${rowNumber}`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
  // Excel's cell limit; longer text makes it report the file as corrupt.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value).slice(0, 32767))}</t></is></c>`;
}

// Excel forbids these in sheet names and caps them at 31 characters.
function sheetName(name) {
  return String(name || "Sheet1").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Sheet1";
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// rows: arrays of cell values, the first usually a header. Returns the file's bytes.
export function buildXlsx(rows, { sheet = "Responses" } = {}) {
  const sheetRows = rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cell(v, c, r + 1)).join("")}</row>`).join("");
  const files = {
    "[Content_Types].xml": `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName(sheet))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  };
  return zip(Object.entries(files).map(([name, text]) => ({ name, data: encoder.encode(text) })));
}
