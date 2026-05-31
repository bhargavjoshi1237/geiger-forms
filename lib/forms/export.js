"use client";

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

function escapeCsv(value) {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toRow(r) {
  return {
    form: r.form,
    name: r.name,
    email: r.email,
    status: r.status,
    priority: r.priority,
    score: r.score ?? "",
    submitted_at: r.submittedAt,
    ...(r.answers || {}),
  };
}

export function downloadResponses(responses, format = "csv", basename = "responses") {
  if (!responses?.length) return;
  const rows = responses.map(toRow);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    triggerDownload(JSON.stringify(rows, null, 2), `${basename}-${stamp}.json`, "application/json");
    return;
  }

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((col) => escapeCsv(row[col])).join(",")),
  ];
  triggerDownload(lines.join("\n"), `${basename}-${stamp}.csv`, "text/csv");
}
