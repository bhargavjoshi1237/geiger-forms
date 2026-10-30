"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookmarkPlus, Check, ChevronDown, ChevronUp, CornerDownLeft } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Label } from "@geiger/ui/label";
import { Switch } from "@geiger/ui/switch";
import { cn } from "@/lib/utils";
import { isMultiChoice } from "@/lib/forms/field-types";
import { optionForLetter } from "@/lib/forms/a11y";
import { fieldIds } from "@/components/forms/fields/field-shell";
import { LinearProgress } from "./progress";
import { SubmitButton } from "./classic-view";
import { Banner } from "./banners";
import { SpotsBadge } from "./form-hero";

const TEXT_ENTRY = new Set(["text", "email", "phone", "url", "number", "currency", "date", "time", "datetime", "textarea", "name", "address"]);
const LETTER_TYPES = new Set(["select", "multiselect", "picture", "multipicture"]);
const AUTO_ADVANCE_TYPES = new Set(["select", "picture"]);
const SHORTCUTS_KEY = "geiger-forms:letter-shortcuts";

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
  const statement = step?.statement;
  const [lettersOn, setLettersOn] = useState(true);

  // The respondent's choice to turn letter shortcuts off (WCAG 2.1.4) sticks across forms on this device.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(SHORTCUTS_KEY) === "off") setLettersOn(false);
    } catch {
      // Storage blocked: shortcuts stay on for this visit and can still be switched off.
    }
  }, []);

  const toggleLetters = (on) => {
    setLettersOn(on);
    try {
      window.localStorage.setItem(SHORTCUTS_KEY, on ? "on" : "off");
    } catch {
      // Storage blocked: the choice lasts until the page reloads.
    }
  };

  // Keyboard: Enter advances (Shift+Enter keeps a newline in long text); A–Z picks options, only while focus is inside the question.
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
      if (typing || e.metaKey || e.ctrlKey || e.altKey || !field || !lettersOn) return;
      if (!LETTER_TYPES.has(field.type) || !containerRef.current?.contains(target)) return;
      const option = optionForLetter(e.key, field.options);
      if (!option) return;
      e.preventDefault();
      if (!isMultiChoice(field.type)) {
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
  const positionLabel = fieldSteps.length > 0 ? tr("questionOf", { current: Math.max(1, number), total: fieldSteps.length }) : title;
  const error = submitState.status === "error" && submitState.message;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-6 grid gap-3">
        <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
          <h1 className="min-w-0 break-words text-xs font-medium text-foreground [font-family:inherit]">{title}</h1>
          <SpotsBadge form={form} tr={tr} />
        </div>
        {settings.progressBar !== false && <LinearProgress index={stepIndex} total={steps.length} label={tr("questionOf", { current: number, total: fieldSteps.length })} />}
        {banners}
      </div>

      <div className={cn("flex flex-col justify-center py-6", !embed && "min-h-[55dvh]")}>
        <div
          key={step?.id}
          ref={containerRef}
          tabIndex={-1}
          role="group"
          aria-labelledby={field ? fieldIds(field).label : undefined}
          aria-label={field ? undefined : positionLabel}
          className={cn("outline-none animate-in fade-in-0 duration-300 ease-out", direction > 0 ? "slide-in-from-bottom-6" : "slide-in-from-top-6")}
        >
          {field && (
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium tabular-nums text-text-tertiary">
              {number}
              <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
              {step.pageTitle && <span className="ml-1 min-w-0 break-words font-normal">{step.pageTitle}</span>}
            </p>
          )}
          {step?.preface?.length > 0 && <div className="mb-6 grid gap-4">{step.preface.map((f) => renderField(f, { large: true }))}</div>}
          {field && renderField(field, { large: true, autoFocus: TEXT_ENTRY.has(field.type) })}
          {field?.required && (
            <p className="mt-3 text-xs text-text-tertiary">
              <span className="text-red-600 dark:text-red-400" aria-hidden="true">
                *
              </span>{" "}
              {tr("required")}
            </p>
          )}
          {field && AUTO_ADVANCE_TYPES.has(field.type) && <p className="mt-3 text-xs text-text-tertiary">{tr("autoAdvanceHint")}</p>}
          {statement && renderField(statement, { large: true })}
          {step?.submit && !field && step.preface.length === 0 && (
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{tr("submit")}</h2>
          )}
          {isLastStep && extras && <div className={cn(field || statement || step?.preface?.length ? "mt-8" : "mt-6")}>{extras}</div>}

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
                {statement ? statement.config?.buttonLabel || tr("continue") : tr("ok")}
                {statement ? <ArrowRight className="rtl:rotate-180" /> : <Check />}
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
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {steps.some((s) => s.field && LETTER_TYPES.has(s.field.type)) && (
            <span className="mr-1.5 flex items-center gap-1.5">
              <Label htmlFor="gf-letter-shortcuts" className="text-xs font-normal text-text-tertiary">
                {tr("shortcutsToggle")}
              </Label>
              <Switch id="gf-letter-shortcuts" checked={lettersOn} onCheckedChange={toggleLetters} />
            </span>
          )}
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
