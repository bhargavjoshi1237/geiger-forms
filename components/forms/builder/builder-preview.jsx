"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Monitor, RotateCcw, Smartphone, X } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { Progress } from "@geiger/ui/progress";
import { cn } from "@/lib/utils";
import { FormFieldRenderer } from "@/components/forms/form-field-renderer";
import { computeOrder, formatMoney, interpolate, scoreResponse, validateAnswers, visiblePages } from "@/lib/forms/logic";
import { coverBackground } from "./cover-presets";

const SPAN = { full: "col-span-6", half: "col-span-6 sm:col-span-3", third: "col-span-6 sm:col-span-2" };

function initialAnswers(fields) {
  const out = {};
  for (const f of fields) if (f.defaultValue !== undefined && f.defaultValue !== "") out[f.id] = f.defaultValue;
  return out;
}

// In-builder preview: renders the live form with real logic, page navigation, validation and the outcome screen.
export function BuilderPreview({ doc, form, onExit }) {
  const fields = doc.fields;
  const settings = doc.settings;
  const [answers, setAnswers] = useState(() => initialAnswers(fields));
  const [pageIndex, setPageIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [device, setDevice] = useState("desktop");

  const previewForm = useMemo(() => ({ ...form, title: doc.title, description: doc.description, fieldDefs: fields, settings }), [form, doc.title, doc.description, fields, settings]);
  const pages = useMemo(() => visiblePages(fields, answers, ""), [fields, answers]);
  const index = Math.min(pageIndex, pages.length - 1);
  const page = pages[index];
  const last = index === pages.length - 1;
  const showProgress = settings.progressBar !== false && pages.length > 1;

  const setAnswer = (id, value) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    if (errors[id]) setErrors((e) => ({ ...e, [id]: undefined }));
  };

  const reset = () => {
    setAnswers(initialAnswers(fields));
    setPageIndex(0);
    setErrors({});
    setResult(null);
  };

  const next = () => {
    const pageErrors = validateAnswers(fields, answers, new Set(page.fields.map((f) => f.id)));
    if (Object.keys(pageErrors).length) {
      setErrors(pageErrors);
      return;
    }
    setErrors({});
    if (!last) {
      setPageIndex(index + 1);
      return;
    }
    const all = validateAnswers(fields, answers);
    if (Object.keys(all).length) {
      setErrors(all);
      return;
    }
    const scored = scoreResponse(previewForm, answers);
    const order = computeOrder(previewForm, answers);
    const extras = { score: scored.score ?? "", outcome: scored.outcome?.outcome ?? "", total: order.total ? formatMoney(order.total, order.currency) : "" };
    setResult({
      ...scored,
      order,
      title: interpolate(settings.thankYouTitle || "Response submitted", previewForm, answers, extras),
      text: interpolate(settings.thankYouText || "", previewForm, answers, extras),
      redirect: settings.thankYouType === "redirect" ? interpolate(settings.thankYouUrl || "", previewForm, answers, extras) : "",
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur">
        <Badge variant="info"><Eye />Preview</Badge>
        <span className="hidden text-xs text-text-secondary sm:inline">Answers aren&apos;t saved. Logic, pages and validation work as on the live form.</span>
        <div className="ml-auto flex items-center gap-1">
          <ToggleGroup type="single" value={device} onValueChange={(v) => v && setDevice(v)} spacing={0.5} className="rounded-md border border-border bg-surface-subtle p-0.5">
            {[
              { value: "desktop", icon: Monitor, label: "Desktop width" },
              { value: "mobile", icon: Smartphone, label: "Mobile width" },
            ].map(({ value, icon: Icon, label }) => (
              <ToggleGroupItem key={value} value={value} aria-label={label} className="h-7 w-7 min-w-7 rounded px-0 text-text-secondary hover:bg-transparent hover:text-foreground data-[state=on]:bg-surface-hover data-[state=on]:text-foreground">
                <Icon className="size-3.5" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button type="button" variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />Restart</Button>
          <Button type="button" variant="outline" size="sm" onClick={onExit}><X className="h-3.5 w-3.5" />Exit preview</Button>
        </div>
      </div>

      <div className={cn("mx-auto w-full px-4 py-8", device === "mobile" ? "max-w-[400px]" : "max-w-2xl")}>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
          {settings.coverStyle === "cover" ? <div className="h-28" style={{ background: coverBackground(settings) }} /> : null}
          <div className="px-6 py-6">
            {settings.showIcon && settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied external logo URL
              <img src={settings.logoUrl} alt="" className="mb-3 h-10 w-10 rounded-lg object-cover" />
            ) : null}
            <h1 className="text-2xl font-bold text-foreground">{doc.title || "Untitled form"}</h1>
            {doc.description ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{doc.description}</p> : null}
          </div>
        </div>

        {result ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface-subtle p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h2 className="mt-3 text-xl font-semibold text-foreground">{result.title}</h2>
            {result.text ? <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{result.text}</p> : null}
            {result.redirect ? <p className="mt-3 break-all text-xs text-text-secondary">Would redirect to {result.redirect}</p> : null}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {result.score != null ? <Badge>Score {result.score}</Badge> : null}
              <Badge variant={result.priority === "High" ? "danger" : result.priority === "Medium" ? "warning" : "neutral"}>{result.priority} priority</Badge>
              {result.outcome ? <Badge variant="purple">Outcome: {result.outcome.outcome}</Badge> : null}
              {result.quiz ? <Badge variant={result.quiz.passed ? "success" : "danger"}>Quiz {result.quiz.percent}% · {result.quiz.passed ? "passed" : "failed"}</Badge> : null}
              {result.order?.total ? <Badge variant="info">Total {formatMoney(result.order.total, result.order.currency)}</Badge> : null}
            </div>
            <p className="mt-4 text-[11px] text-text-tertiary">Badges show what the inbox would record — respondents only see what your submission settings allow.</p>
            <Button type="button" variant="outline" size="sm" className="mt-5" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />Fill again</Button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-surface-subtle p-6 sm:p-8">
            {showProgress ? (
              <div className="mb-6 space-y-1.5">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>{page.title || `Page ${index + 1}`}</span>
                  <span>{index + 1} / {pages.length}</span>
                </div>
                <Progress value={((index + 1) / pages.length) * 100} className="h-1.5" />
              </div>
            ) : null}
            {page.fields.filter((f) => f.type !== "hidden").length === 0 ? (
              <p className="py-8 text-center text-sm text-text-secondary">Nothing to answer on this page.</p>
            ) : (
              <div className="grid grid-cols-6 gap-5">
                {page.fields.filter((f) => f.type !== "hidden").map((field) => (
                  <div key={field.id} className={SPAN[field.width] || SPAN.full}>
                    <FormFieldRenderer
                      field={field}
                      value={answers[field.id]}
                      onChange={(value) => setAnswer(field.id, value)}
                      error={errors[field.id]}
                      allFields={fields}
                      answers={answers}
                      form={previewForm}
                      slug={form.slug}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => setPageIndex(index - 1)} disabled={index === 0}>
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <Button type="button" onClick={next}>
                {last ? "Submit" : "Next"}
                {!last ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
