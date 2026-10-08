"use client";

import { useEffect } from "react";
import { ArrowRight, Clock, ListChecks } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { FormHero } from "./form-hero";

// Intro screen (settings.welcome) with a start button; Enter also starts.
export function WelcomeScreen({ form, title, body, buttonLabel, questionCount, banners, tr, onStart }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Enter" || e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("button, a, input, textarea, [role='dialog']")) return;
      e.preventDefault();
      onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  const minutes = Math.max(1, Math.round(questionCount * 0.4));
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <FormHero
        form={form}
        title={title}
        description={body}
        tr={tr}
        meta={
          questionCount > 0 ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-card px-2.5 py-0.5">
                <ListChecks className="size-3" aria-hidden="true" />
                {questionCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-card px-2.5 py-0.5">
                <Clock className="size-3" aria-hidden="true" />~{minutes} min
              </span>
            </>
          ) : null
        }
      />
      {banners}
      <div className="flex items-center gap-3">
        <Button type="button" size="lg" onClick={onStart} autoFocus className="min-w-32">
          {buttonLabel}
          <ArrowRight className="rtl:rotate-180" />
        </Button>
        <span className="hidden text-xs text-text-tertiary sm:inline">{tr("pressEnter")}</span>
      </div>
    </div>
  );
}
