"use client";

import { useEffect, useState } from "react";
import { Award, Check, CheckCircle2, Copy, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { cn } from "@/lib/utils";
import { callApi } from "@/lib/forms/api";
import { interpolate } from "@/lib/forms/logic";
import { withPrefix } from "@/lib/workspace/base-path";
import { absoluteUrl, publicApi } from "./session";

export function CopyField({ value, tr, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex w-full gap-2">
      <Input readOnly value={value} aria-label={label} onFocus={(e) => e.target.select()} className="bg-surface-card font-mono text-xs" />
      <Button type="button" variant="outline" onClick={copy} className="shrink-0" aria-live="polite">
        {copied ? <Check /> : <Copy />}
        {copied ? tr("copied") : tr("copy")}
      </Button>
    </div>
  );
}

function QuizSummary({ quiz, fields, showAnswers, tr }) {
  const percent = Math.max(0, Math.min(100, Number(quiz.percent) || 0));
  const results = quiz.results && typeof quiz.results === "object" ? quiz.results : null;
  const correctMap = quiz.correct && typeof quiz.correct === "object" ? quiz.correct : {};
  return (
    <div className="w-full rounded-xl border border-border bg-surface-card p-5 text-left">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-tertiary">{tr("yourScore")}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{percent}%</p>
          <p className="text-xs tabular-nums text-text-secondary">
            {quiz.earned} / {quiz.possible}
          </p>
        </div>
        {typeof quiz.passed === "boolean" && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              quiz.passed ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
            )}
          >
            {quiz.passed ? <Award className="size-3.5" /> : <XCircle className="size-3.5" />}
            {quiz.passed ? tr("passed") : tr("failed")}
          </span>
        )}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-active">
        <div className={cn("h-full rounded-full transition-[width] duration-700", quiz.passed === false ? "bg-red-500" : "bg-primary")} style={{ width: `${percent}%` }} />
      </div>
      {showAnswers && results && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">{tr("correctAnswers")}</p>
          <ul className="grid gap-1.5">
            {Object.entries(results).map(([fieldId, ok]) => {
              const field = fields.find((f) => f.id === fieldId);
              const answer = correctMap[fieldId] ?? field?.correctAnswer;
              return (
                <li key={fieldId} className="flex items-start gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-label={tr("correct")} /> : <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" aria-label={tr("incorrect")} />}
                  <span className="min-w-0">
                    <span className="block text-foreground">{field?.label || field?.title || fieldId}</span>
                    {!ok && answer != null && answer !== "" && (
                      <span className="block text-xs text-text-secondary">{tr("correctAnswerIs", { answer: Array.isArray(answer) ? answer.join(", ") : answer })}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function PollResults({ slug, tr }) {
  const [state, setState] = useState({ status: "loading", fields: [] });
  useEffect(() => {
    let active = true;
    callApi(publicApi(slug, "/results")).then((res) => {
      if (!active) return;
      setState({ status: res.ok ? "ready" : "error", fields: Array.isArray(res.data?.fields) ? res.data.fields : [] });
    });
    return () => {
      active = false;
    };
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div className="flex w-full justify-center py-4">
        <Loader2 className="size-4 animate-spin text-text-tertiary" />
      </div>
    );
  }
  if (state.fields.length === 0) return null;
  return (
    <div className="w-full rounded-xl border border-border bg-surface-card p-5 text-left">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-tertiary">{tr("pollResults")}</p>
      <div className="grid gap-6">
        {state.fields.map((f) => {
          const entries = Object.entries(f.counts || {}).sort((a, b) => b[1] - a[1]);
          const total = Number(f.total) || entries.reduce((s, [, n]) => s + n, 0) || 1;
          return (
            <div key={f.fieldId}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{f.label}</p>
                <p className="shrink-0 text-xs tabular-nums text-text-tertiary">
                  {f.average != null ? `⌀ ${Number(f.average).toFixed(1)} · ` : ""}
                  {tr("votes", { count: f.total ?? total })}
                </p>
              </div>
              <ul className="grid gap-1.5">
                {entries.map(([option, count]) => {
                  const pct = Math.round((count / total) * 100);
                  return (
                    <li key={option} className="relative overflow-hidden rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                      <div className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-700" style={{ width: `${pct}%` }} aria-hidden="true" />
                      <div className="relative flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-foreground">{option}</span>
                        <span className="shrink-0 tabular-nums text-text-secondary">{pct}%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Post-submit screen: merge-tagged message, score/quiz, poll results, edit link, submit-another.
export function ThankYou({ result, form, answers, slug, tr, onSubmitAnother, redirecting }) {
  const settings = form.settings || {};
  const extras = {
    score: result?.score ?? "",
    outcome: typeof result?.outcome === "string" ? result.outcome : result?.outcome?.outcome || result?.outcome?.name || "",
  };
  const merge = (s) => interpolate(s, form, answers, extras);
  const title = result?.thankYou?.title || merge(settings.thankYouTitle) || tr("thankYouTitle");
  const text = result?.thankYou?.text || merge(settings.thankYouText) || tr("thankYouText");
  const quiz = result?.quiz && settings.quiz?.enabled ? result.quiz : null;
  const showScore = settings.showScore && !quiz && result?.score != null;
  const editUrl = result?.editUrl ? absoluteUrl(result.editUrl, withPrefix) : "";

  return (
    <section className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-surface-subtle p-6 text-center shadow-sm animate-in fade-in-0 zoom-in-95 duration-300 sm:p-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        {redirecting ? <Loader2 className="size-6 animate-spin" /> : <CheckCircle2 className="size-6" />}
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{redirecting ? tr("redirecting") : text}</p>

      <div className="mt-7 flex flex-col items-center gap-4">
        {extras.outcome && (
          <div className="w-full rounded-xl border border-border bg-surface-card px-5 py-4 text-left">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">{tr("outcome")}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{extras.outcome}</p>
          </div>
        )}
        {showScore && (
          <div className="w-full rounded-xl border border-border bg-surface-card px-5 py-4 text-left">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">{tr("yourScore")}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{result.score}</p>
          </div>
        )}
        {quiz && <QuizSummary quiz={quiz} fields={form.fieldDefs || []} showAnswers={settings.quiz?.showAnswers} tr={tr} />}
        {settings.showPollResults && <PollResults slug={slug} tr={tr} />}
        {editUrl && (
          <div className="w-full text-left">
            <p className="mb-1.5 text-xs text-text-secondary">{tr("editLink")}</p>
            <CopyField value={editUrl} tr={tr} label={tr("editLink")} />
          </div>
        )}
        {settings.submitAnother && onSubmitAnother && !redirecting && (
          <Button type="button" variant="outline" onClick={onSubmitAnother}>
            <RotateCcw />
            {tr("submitAnother")}
          </Button>
        )}
      </div>
    </section>
  );
}
