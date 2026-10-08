"use client";

import { ArrowLeft, ArrowRight, BookmarkPlus, Loader2, Send, Timer } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";
import { FormHero } from "./form-hero";
import { PageProgress } from "./progress";
import { Banner } from "./banners";

function widthClass(field) {
  if (field.type === "heading" || field.type === "content") return "col-span-6";
  if (field.width === "half") return "col-span-6 sm:col-span-3";
  if (field.width === "third") return "col-span-6 sm:col-span-2";
  return "col-span-6";
}

// Submit button with the min-review countdown and spinner states.
export function SubmitButton({ submitState, reviewLeft, tr, label, size = "lg", className, type = "submit", onClick }) {
  const busy = submitState.status === "submitting" || submitState.status === "retrying";
  const waiting = reviewLeft > 0;
  return (
    <Button type={type} size={size} disabled={busy || waiting || submitState.status === "queued"} className={cn("min-w-32", className)} onClick={onClick}>
      {busy ? <Loader2 className="animate-spin" /> : waiting ? <Timer /> : <Send />}
      {busy ? tr("submitting") : waiting ? tr("reviewWait", { seconds: reviewLeft }) : label || tr("submit")}
    </Button>
  );
}

// Classic layout: hero, optional page progress, a card of fields (responsive width grid), and pager controls.
export function ClassicView({
  form,
  title,
  description,
  tr,
  banners,
  extras,
  submitState,
  reviewLeft,
  saveResume,
  onSaveLater,
  renderField,
  direction,
  pages,
  page,
  pageIndex,
  onNext,
  onBack,
  onSubmit,
}) {
  const settings = form.settings || {};
  const multiPage = pages.length > 1;
  const isLast = pageIndex >= pages.length - 1;
  const visible = page.fields.filter((f) => f.type !== "hidden");

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (isLast) onSubmit();
        else onNext();
      }}
      className="mx-auto grid w-full max-w-2xl gap-5"
    >
      <FormHero form={form} title={title} description={pageIndex === 0 ? description : ""} tr={tr} compact={pageIndex > 0} />
      {banners}

      <section className="rounded-2xl border border-border bg-surface-subtle p-5 shadow-sm sm:p-8">
        {multiPage && settings.progressBar !== false && <PageProgress pages={pages} index={pageIndex} tr={tr} />}
        {multiPage && settings.progressBar === false && page.title && <h2 className="mb-5 text-lg font-semibold text-foreground">{page.title}</h2>}

        <div
          key={page.id}
          className={cn("grid grid-cols-6 gap-x-4 gap-y-7 animate-in fade-in-0 duration-300", direction > 0 ? "slide-in-from-right-3" : "slide-in-from-left-3")}
        >
          {visible.length === 0 ? (
            <p className="col-span-6 py-10 text-center text-sm text-text-secondary">{tr("noItems")}</p>
          ) : (
            visible.map((field) => (
              <div key={field.id} className={widthClass(field)}>
                {renderField(field)}
              </div>
            ))
          )}
        </div>

        {isLast && extras && <div className="mt-8 border-t border-border pt-6">{extras}</div>}
      </section>

      {submitState.status === "error" && submitState.message && (
        <Banner tone="danger" role="alert">
          {submitState.message}
        </Banner>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {multiPage && pageIndex > 0 && (
            <Button type="button" variant="outline" size="lg" onClick={onBack}>
              <ArrowLeft className="rtl:rotate-180" />
              {tr("back")}
            </Button>
          )}
          {saveResume && (
            <Button type="button" variant="ghost" size="lg" onClick={onSaveLater} className="text-text-secondary">
              <BookmarkPlus />
              {tr("saveLater")}
            </Button>
          )}
          {!multiPage && !saveResume && visible.some((f) => f.required) && (
            <span className="hidden items-center gap-1 text-xs text-text-tertiary sm:flex">
              <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>
              {tr("required")}
            </span>
          )}
        </div>
        {isLast ? (
          <SubmitButton submitState={submitState} reviewLeft={reviewLeft} tr={tr} />
        ) : (
          <Button type="submit" size="lg" className="min-w-32">
            {tr("next")}
            <ArrowRight className="rtl:rotate-180" />
          </Button>
        )}
      </div>
    </form>
  );
}
