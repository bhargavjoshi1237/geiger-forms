"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { LogoLoading } from "@geiger/ui/logo-loading";
import { getResponse } from "@/lib/supabase/responses";
import { getFormById } from "@/lib/supabase/forms";
import { logAccess } from "@/lib/supabase/audit";
import { computeOrder, displayValue, formatMoney, interpolate, visibleFieldIds } from "@/lib/forms/logic";
import {
  answerFields,
  answerText,
  canonicalFields,
  fieldLabel,
  isEmptyAnswer,
  isEncrypted,
  outcomeLabel,
  responseFileUrl,
} from "@/lib/forms/response-utils";

// Light, paper-like palette for print regardless of the app theme.
const MUTED = "text-neutral-500";

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function Img({ src, alt, className }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}

function PrintAnswer({ field, response, fields }) {
  const value = response.answers?.[field.id];
  if (field.type === "calculated") return <span>{answerText(field, response, fields) || "—"}</span>;
  if (isEmptyAnswer(value)) return <span className={MUTED}>—</span>;
  if (isEncrypted(field, response)) return <span className={MUTED}>[Protected — reveal in the workspace]</span>;
  switch (field.type) {
    case "signature": {
      const src = typeof value === "string" ? value : responseFileUrl(response.id, value?.path);
      return (
        <div>
          <Img src={src} alt="Signature" className="h-20 max-w-xs object-contain" />
          {value?.signedAt ? <p className={`text-xs ${MUTED}`}>Signed {fmt(value.signedAt)}</p> : null}
        </div>
      );
    }
    case "file":
      return (
        <ul className="list-disc pl-4">
          {(Array.isArray(value) ? value : [value]).map((f, i) => (
            <li key={`${f.path || f.name}-${i}`}>
              <a href={responseFileUrl(response.id, f.path)} className="underline">{f.name || "File"}</a>
            </li>
          ))}
        </ul>
      );
    case "matrix":
    case "repeater": {
      const isMatrix = field.type === "matrix";
      const subs = field.config?.subFields || [];
      return (
        <table className="mt-1 w-full border-collapse text-xs">
          <tbody>
            {isMatrix
              ? (field.config?.rows?.length ? field.config.rows : Object.keys(value)).map((row) => (
                  <tr key={row}>
                    <td className="border border-neutral-300 px-2 py-1 text-neutral-600">{row}</td>
                    <td className="border border-neutral-300 px-2 py-1">{value?.[row] || "—"}</td>
                  </tr>
                ))
              : (Array.isArray(value) ? value : []).map((row, i) => (
                  <tr key={i}>
                    <td className="border border-neutral-300 px-2 py-1 text-neutral-600">{i + 1}</td>
                    {subs.map((s) => (
                      <td key={s.id} className="border border-neutral-300 px-2 py-1">
                        <span className="text-neutral-500">{s.label}: </span>{displayValue(s, row?.[s.id]) || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      );
    }
    default:
      return <span className="whitespace-pre-wrap break-words">{answerText(field, response, fields)}</span>;
  }
}

function Block({ title, children }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h3 className="mb-2 border-b border-neutral-300 pb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</h3>
      {children}
    </section>
  );
}

function KV({ items }) {
  const shown = items.filter(([, v]) => v != null && v !== "");
  return (
    <dl className="grid grid-cols-[11rem_1fr] gap-x-4 gap-y-1 text-xs">
      {shown.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-neutral-500">{k}</dt>
          <dd className="break-words text-neutral-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Countersign({ response }) {
  const c = response.metadata?.countersign;
  if (!c) return null;
  return (
    <div className="flex items-end gap-4">
      <Img src={c.signature ? responseFileUrl(response.id, c.signature) : ""} alt="Countersignature" className="h-16 max-w-[220px] object-contain" />
      <div className="text-xs">
        <p className="font-medium text-neutral-900">{c.name}</p>
        <p className={MUTED}>Countersigned {fmt(c.at)}</p>
      </div>
    </div>
  );
}

function Invoice({ response, form }) {
  const payment = response.payment;
  const order = form ? computeOrder(form, response.answers || {}) : null;
  if (!payment) return null;
  const currency = payment.currency || order?.currency || "usd";
  const paid = payment.status === "paid";
  return (
    <Block title={paid ? "Receipt" : "Invoice"}>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="border-b border-neutral-300 py-1 font-medium">Item</th>
            <th className="border-b border-neutral-300 py-1 text-right font-medium">Qty</th>
            <th className="border-b border-neutral-300 py-1 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(order?.items || []).map((item) => (
            <tr key={item.fieldId}>
              <td className="py-1">{item.name}</td>
              <td className="py-1 text-right">{item.quantity}</td>
              <td className="py-1 text-right">{formatMoney(item.amount, currency)}</td>
            </tr>
          ))}
          {order?.discount ? (
            <tr>
              <td className="py-1">Discount {order.coupon?.code ? `(${order.coupon.code})` : ""}</td>
              <td />
              <td className="py-1 text-right">−{formatMoney(order.discount, currency)}</td>
            </tr>
          ) : null}
          <tr className="font-semibold">
            <td className="border-t border-neutral-300 py-1">{paid ? "Total paid" : "Total due"}</td>
            <td className="border-t border-neutral-300" />
            <td className="border-t border-neutral-300 py-1 text-right">{formatMoney(payment.amount, currency)}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-2">
        <KV items={[["Status", payment.status], ["Reference", payment.ref || ""], ["Date", fmt(response.submittedAt)]]} />
      </div>
    </Block>
  );
}

function ResponseDocument({ response, form }) {
  const fields = useMemo(() => canonicalFields(form), [form]);
  const graded = useMemo(() => (form ? { ...form, fieldDefs: fields } : null), [form, fields]);
  const visible = useMemo(() => visibleFieldIds(fields, response.answers || {}), [fields, response.answers]);
  const m = response.metadata || {};
  const template = form?.settings?.documentTemplate;
  const extras = {
    score: response.score ?? "",
    outcome: outcomeLabel(response.outcome),
    total: response.payment ? formatMoney(response.payment.amount, response.payment.currency) : "",
  };
  const history = Array.isArray(response.approval?.history) ? response.approval.history : [];
  const signatures = fields.filter((f) => f.type === "signature" && !isEmptyAnswer(response.answers?.[f.id]));

  return (
    <>
      {template?.enabled && template.body ? (
        <article className="print-page mx-auto mb-8 max-w-[800px] bg-white p-12 shadow-sm print:mb-0 print:max-w-none print:p-0 print:shadow-none">
          <h1 className="text-2xl font-semibold text-neutral-900">{interpolate(template.title, graded, response.answers, extras) || form.title}</h1>
          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{interpolate(template.body, graded, response.answers, extras)}</div>
          {signatures.length || m.countersign ? (
            <div className="mt-12 grid grid-cols-2 gap-8">
              {signatures.map((f) => (
                <div key={f.id} className="border-t border-neutral-400 pt-2">
                  <PrintAnswer field={f} response={response} fields={fields} />
                  <p className="text-xs text-neutral-500">{response.name} · {fieldLabel(f)}</p>
                </div>
              ))}
              {m.countersign ? (
                <div className="border-t border-neutral-400 pt-2"><Countersign response={response} /></div>
              ) : null}
            </div>
          ) : null}
        </article>
      ) : null}

      <article className="print-page mx-auto mb-8 max-w-[800px] bg-white p-12 shadow-sm print:mb-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">{form?.title || response.form}</h1>
            <p className="mt-1 text-sm text-neutral-700">{response.name}{response.email ? ` · ${response.email}` : ""}</p>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <p>Response #{String(response.id).slice(0, 8)}</p>
            <p>Submitted {fmt(response.submittedAt)}</p>
            <p>Status: {response.status}</p>
          </div>
        </header>

        <Block title="Answers">
          <div className="space-y-3">
            {fields.length ? (
              fields.map((f) => {
                if (!visible.has(f.id)) return null;
                if (f.type === "heading" || f.type === "page") {
                  const title = f.type === "page" ? f.title : f.label || f.title;
                  return title ? <h4 key={f.id} className="pt-2 text-sm font-semibold text-neutral-900">{title}</h4> : null;
                }
                if (!answerFields([f], { computed: true }).length) return null;
                return (
                  <div key={f.id} className="break-inside-avoid">
                    <p className="text-xs font-medium text-neutral-500">{fieldLabel(f)}</p>
                    <div className="text-sm text-neutral-900"><PrintAnswer field={f} response={response} fields={fields} /></div>
                  </div>
                );
              })
            ) : (
              Object.entries(response.answers || {}).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs font-medium text-neutral-500">{k}</p>
                  <p className="text-sm text-neutral-900">{typeof v === "object" ? JSON.stringify(v) : String(v)}</p>
                </div>
              ))
            )}
          </div>
        </Block>

        {m.countersign ? <Block title="Countersignature"><Countersign response={response} /></Block> : null}

        <Invoice response={response} form={graded} />

        <Block title="Audit trail">
          <KV
            items={[
              ["Response ID", response.id],
              ["Submitted at", fmt(response.submittedAt)],
              ["Last edited", response.editedAt ? fmt(response.editedAt) : ""],
              ["Score / priority", response.score != null ? `${response.score} · ${response.priority}` : response.priority],
              ["Outcome", outcomeLabel(response.outcome)],
              ["Quiz", m.quiz ? `${m.quiz.percent}% (${m.quiz.passed ? "passed" : "failed"})` : ""],
              ["IP hash", m.ipHash || ""],
              ["User agent", m.userAgent || response.userAgent || ""],
              ["Referrer", m.referrer || ""],
              ["Submitted on behalf", m.delegate ? `${m.delegate.byName || m.delegate.byEmail} for ${m.delegate.forName || m.delegate.forEmail}` : ""],
              ["Attestation", m.attestation ? `“${m.attestation.statement}” accepted ${fmt(m.attestation.acceptedAt)}` : ""],
              ["Policy acknowledged", m.policy ? `${fmt(m.policy.acknowledgedAt)}${m.policy.typedName ? ` · signed “${m.policy.typedName}”` : ""}` : ""],
              ["Countersigned", m.countersign ? `${m.countersign.name} · ${fmt(m.countersign.at)}` : ""],
            ]}
          />
          {history.length ? (
            <table className="mt-3 w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="border-b border-neutral-300 py-1 font-medium">Approval step</th>
                  <th className="border-b border-neutral-300 py-1 font-medium">Decision</th>
                  <th className="border-b border-neutral-300 py-1 font-medium">By</th>
                  <th className="border-b border-neutral-300 py-1 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="py-1">{h.stepName || `Step ${Number(h.stepIndex) + 1}`}</td>
                    <td className="py-1">{h.decision}{h.note ? ` — ${h.note}` : ""}</td>
                    <td className="py-1">{h.by || h.byEmail}</td>
                    <td className="py-1">{fmt(h.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Block>

        <p className="mt-8 text-[10px] text-neutral-400">Generated {fmt(new Date().toISOString())} · Geiger Forms</p>
      </article>
    </>
  );
}

// Printable documents for one or many responses; opens the print dialog once loaded.
export function PrintResponses({ ids = [], autoPrint = true }) {
  const [state, setState] = useState({ loading: true, docs: [], error: null });
  const printed = useRef(false);
  const key = ids.join(",");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const list = key ? key.split(",") : [];
        const responses = (await Promise.all(list.map((id) => getResponse(id).catch(() => null)))).filter(Boolean);
        const formIds = [...new Set(responses.map((r) => r.formId))];
        const forms = Object.fromEntries(await Promise.all(formIds.map(async (id) => [id, await getFormById(id).catch(() => null)])));
        if (!live) return;
        setState({ loading: false, docs: responses.map((r) => ({ response: r, form: forms[r.formId] })), error: responses.length ? null : "No responses found — they may have been deleted or you may not have access." });
        responses.forEach((r) => logAccess({ formId: r.formId, responseId: r.id, action: "print" }));
      } catch (e) {
        if (live) setState({ loading: false, docs: [], error: e?.message || "Couldn't load responses." });
      }
    })();
    return () => {
      live = false;
    };
  }, [key]);

  useEffect(() => {
    if (!autoPrint || state.loading || !state.docs.length || printed.current) return;
    printed.current = true;
    // Give signature images a moment to load before the dialog snapshots the page.
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, [autoPrint, state]);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 print:bg-white">
      <style>{`@media print { @page { margin: 16mm; } .print-page { break-after: page; } .print-page:last-child { break-after: auto; } }`}</style>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
        <p className="text-sm text-neutral-600">
          {state.loading ? "Preparing documents…" : `${state.docs.length} document${state.docs.length === 1 ? "" : "s"} ready`}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => window.print()}
          disabled={state.loading || !state.docs.length}
          className="gap-2 bg-neutral-900 text-white hover:bg-neutral-700"
        >
          {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print / Save as PDF
        </Button>
      </div>
      <main className="px-4 py-8 print:p-0">
        {state.loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <LogoLoading size={80} aria-label="Preparing documents" />
          </div>
        ) : state.error ? (
          <p className="mx-auto max-w-md rounded-md border border-neutral-300 bg-white p-6 text-center text-sm text-neutral-600">{state.error}</p>
        ) : (
          state.docs.map(({ response, form }) => <ResponseDocument key={response.id} response={response} form={form} />)
        )}
      </main>
    </div>
  );
}
