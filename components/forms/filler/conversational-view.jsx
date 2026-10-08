"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, BookmarkPlus, Check, ChevronDown, ChevronUp, CornerDownLeft } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";
import { LinearProgress } from "./progress";
import { SubmitButton } from "./classic-view";
import { Banner } from "./banners";
import { SpotsBadge } from "./form-hero";

const TEXT_ENTRY = new Set(["text", "email", "phone", "url", "number", "currency", "date", "time", "datetime", "textarea", "name", "address"]);

// One question per screen with large type, Enter to advance, letter shortcuts for choices and slide transitions.
export function ConversationalView({
  form,
  title,
  tr,
  banners,
  extras,
  submitState,
  reviewLeft,
  saveResume,
  onSaveLater,
  renderField,
  direction,
  step,
  steps,
  stepIndex,
  isLastStep,
  progress,
  answers,
  setAnswer,
  scheduleAdvance,
  onNext,
  onBack,
  embed = false,
}) {
  const settings = form.settings || {};
  const containerRef = useRef(null);
  const handlerRef = useRef(null);
  const fieldSteps = steps.filter((s) => s.field);
  const number = steps.slice(0, stepIndex + 1).filter((s) => s.field).length;
  const field = step?.field;

  // Keyboard: Enter advances (Shift+Enter keeps a newline in long text); A–Z picks choice options.
  useEffect(() => {
    handlerRef.current = (e) => {
      if (e.defaultPrevented || e.isComposing) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[role="dialog"], [role="listbox"], [data-slot="select-content"]')) return;
      const tag = target?.tagName || "";
      const role = target?.getAttribute("role") || "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
      if (e.key === "Enter") {
        if (tag === "TEXTAREA" && e.shiftKey) return;
        if ((tag === "BUTTON" || tag === "A") && role !== "radio" && role !== "checkbox") return;
        if (role === "combobox") return;
        e.preventDefault();
        onNext();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || !field) return;
      if (field.type !== "select" && field.type !== "multiselect") return;
      if (!/^[a-z]$/i.test(e.key)) return;
      const option = field.options?.[e.key.toUpperCase().charCodeAt(0) - 65];
      if (!option) return;
      e.preventDefault();
      if (field.type === "select") {
        setAnswer(field.id, option);
        scheduleAdvance();
      } else {
        const current = Array.isArray(answers[field.id]) ? answers[field.id] : [];
        const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
        setAnswer(field.id, field.options.filter((o) => next.includes(o)));
      }
    };
  });

  useEffect(() => {
    const listener = (e) => handlerRef.current?.(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Non-text steps move focus to the question so screen readers announce it.
  useEffect(() => {
    if (field && TEXT_ENTRY.has(field.type)) return;
    containerRef.current?.focus({ preventScroll: true });
  }, [step?.id, field]);

  const hint = field?.type === "textarea" ? tr("shiftEnter") : tr("pressEnter");
  const error = submitState.status === "error" && submitState.message;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-6 grid gap-3">
        <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
          <span className="min-w-0 truncate font-medium text-foreground">{title}</span>
          <SpotsBadge form={form} tr={tr} />
        </div>
        {settings.progressBar !== false && <LinearProgress value={progress} label={tr("questionOf", { current: number, total: fieldSteps.length })} />}
        {banners}
      </div>

      <div className={cn("flex flex-col justify-center py-6", !embed && "min-h-[55dvh]")}>
        <div
          key={step?.id}
          ref={containerRef}
          tabIndex={-1}
          aria-live="polite"
          className={cn("outline-none animate-in fade-in-0 duration-300 ease-out", direction > 0 ? "slide-in-from-bottom-6" : "slide-in-from-top-6")}
        >
          {field && (
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium tabular-nums text-text-tertiary">
              {number}
              <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
              {step.pageTitle && <span className="ml-1 truncate font-normal">{step.pageTitle}</span>}
            </p>
          )}
          {step?.preface?.length > 0 && <div className="mb-6 grid gap-4">{step.preface.map((f) => renderField(f, { large: true }))}</div>}
          {field && renderField(field, { large: true, autoFocus: TEXT_ENTRY.has(field.type) })}
          {step?.submit && !field && step.preface.length === 0 && (
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{tr("submit")}</h2>
          )}
          {isLastStep && extras && <div className={cn(field || step?.preface?.length ? "mt-8" : "mt-6")}>{extras}</div>}

          {error && (
            <Banner tone="danger" role="alert" className="mt-6">
              {error}
            </Banner>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isLastStep ? (
              <SubmitButton type="button" submitState={submitState} reviewLeft={reviewLeft} tr={tr} onClick={onNext} />
            ) : (
              <Button type="button" size="lg" onClick={onNext} className="min-w-24">
                {tr("ok")}
                <Check />
              </Button>
            )}
            <span className="hidden items-center gap-1 text-xs text-text-tertiary sm:flex">
              <CornerDownLeft className="size-3" aria-hidden="true" />
              {hint}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-xs tabular-nums text-text-tertiary">{fieldSteps.length > 0 && tr("questionOf", { current: Math.max(1, number), total: fieldSteps.length })}</span>
        <div className="flex items-center gap-1.5">
          {saveResume && (
            <Button type="button" variant="ghost" size="sm" onClick={onSaveLater} className="text-text-secondary">
              <BookmarkPlus />
              <span className="hidden sm:inline">{tr("saveLater")}</span>
            </Button>
          )}
          <Button type="button" variant="outline" size="icon-sm" onClick={onBack} disabled={stepIndex === 0} aria-label={tr("back")}>
            <ChevronUp />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" onClick={onNext} disabled={isLastStep} aria-label={tr("next")}>
            <ChevronDown />
          </Button>
        </div>
      </div>
    </div>
  );
}
