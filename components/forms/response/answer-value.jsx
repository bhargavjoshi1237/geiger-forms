"use client";

import { Download, Eye, Loader2, Lock, Paperclip } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@geiger/ui/table";
import { displayValue, formatMoney } from "@/lib/forms/logic";
import { answerText, isEmptyAnswer, isEncrypted, responseFileUrl } from "@/lib/forms/response-utils";

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Empty() {
  return <span className="text-text-tertiary">—</span>;
}

function FileList({ files, responseId }) {
  return (
    <ul className="mt-1 space-y-1">
      {files.map((file, i) => (
        <li key={`${file.path || file.name}-${i}`}>
          <a
            href={responseFileUrl(responseId, file.path)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border border-border bg-surface-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
            <span className="min-w-0 flex-1 truncate">{file.name || "File"}</span>
            <span className="shrink-0 text-[10px] text-text-tertiary">{formatBytes(file.size)}</span>
            <Download className="h-3.5 w-3.5 shrink-0" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function MatrixGrid({ field, value }) {
  const rows = field.config?.rows?.length ? field.config.rows : Object.keys(value || {});
  return (
    <div className="mt-1 overflow-hidden rounded-md border border-border">
      <Table className="text-xs">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row} className="hover:bg-transparent">
              <TableCell className="bg-surface-card px-2.5 py-1.5 text-text-secondary">{row}</TableCell>
              <TableCell className="px-2.5 py-1.5 text-foreground">{value?.[row] || <Empty />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RepeaterTable({ field, value }) {
  const subs = field.config?.subFields?.length
    ? field.config.subFields
    : Object.keys(value[0] || {}).map((id) => ({ id, label: id }));
  return (
    <div className="mt-1 overflow-x-auto rounded-md border border-border">
      <Table className="text-xs">
        <TableHeader className="bg-transparent">
          <TableRow className="bg-surface-card hover:bg-surface-card">
            <TableHead className="h-auto px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-text-tertiary">#</TableHead>
            {subs.map((s) => (
              <TableHead key={s.id} className="h-auto px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-text-tertiary">{s.label || s.id}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.map((row, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell className="px-2.5 py-1.5 text-text-tertiary">{i + 1}</TableCell>
              {subs.map((s) => (
                <TableCell key={s.id} className="px-2.5 py-1.5 text-foreground">{displayValue(s, row?.[s.id]) || "—"}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// One answer rendered per field type; sensitive answers stay masked until revealed.
export function AnswerValue({ field, response, fields, revealed, onReveal, revealing, currency = "usd" }) {
  const encrypted = isEncrypted(field, response);
  const raw = response.answers?.[field.id];
  const value = encrypted && revealed && field.id in revealed ? revealed[field.id] : raw;

  if (encrypted && !(revealed && field.id in revealed) && !isEmptyAnswer(raw)) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm tracking-widest text-text-secondary">
          <Lock className="h-3.5 w-3.5" />••••••
        </span>
        {onReveal ? (
          <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px] text-text-secondary hover:text-foreground" onClick={() => onReveal(field.id)} disabled={revealing}>
            {revealing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
            Reveal
          </Button>
        ) : null}
      </div>
    );
  }

  if (field.type === "calculated") {
    const text = answerText(field, response, fields);
    if (!text) return <Empty />;
    const n = Number(text);
    if (field.config?.format === "currency" && Number.isFinite(n)) return <span>{formatMoney(n, currency)}</span>;
    if (field.config?.format === "percent" && Number.isFinite(n)) return <span>{n}%</span>;
    return <span className="tabular-nums">{text}</span>;
  }

  if (isEmptyAnswer(value)) return <Empty />;

  switch (field.type) {
    case "file":
      return <FileList files={Array.isArray(value) ? value : [value]} responseId={response.id} />;
    case "signature": {
      const src = typeof value === "string" ? value : responseFileUrl(response.id, value?.path);
      return (
        <div className="mt-1 inline-flex flex-col gap-1">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`Signature for ${field.label || field.title}`} className="h-20 max-w-full rounded-md border border-border bg-white object-contain p-1" />
          ) : null}
          {value?.signedAt ? <span className="text-[10px] text-text-tertiary">Signed {new Date(value.signedAt).toLocaleString()}</span> : null}
        </div>
      );
    }
    case "matrix":
      return <MatrixGrid field={field} value={value} />;
    case "repeater":
      return Array.isArray(value) && value.length ? <RepeaterTable field={field} value={value} /> : <Empty />;
    case "multiselect":
      return (
        <div className="mt-1 flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : [value]).map((v) => (
            <span key={v} className="rounded-md border border-border bg-surface-card px-1.5 py-0.5 text-xs text-foreground">{v}</span>
          ))}
        </div>
      );
    case "ranking":
      return (
        <ol className="mt-1 space-y-0.5 text-sm">
          {(Array.isArray(value) ? value : [value]).map((v, i) => (
            <li key={v} className="flex gap-2"><span className="w-4 tabular-nums text-text-tertiary">{i + 1}.</span>{v}</li>
          ))}
        </ol>
      );
    case "currency":
      return <span className="tabular-nums">{formatMoney(value, field.config?.currency || currency)}</span>;
    case "url":
      return /^https?:\/\//i.test(String(value)) ? (
        <a href={String(value)} target="_blank" rel="noreferrer" className="break-all text-sky-400 hover:underline">{String(value)}</a>
      ) : <span>{String(value)}</span>;
    case "email":
      return <a href={`mailto:${value}`} className="break-all text-sky-400 hover:underline">{String(value)}</a>;
    case "textarea":
      return <p className="whitespace-pre-wrap break-words">{String(value)}</p>;
    default:
      return <span className="break-words">{displayValue(field, value)}</span>;
  }
}
