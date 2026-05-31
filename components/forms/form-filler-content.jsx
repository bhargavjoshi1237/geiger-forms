"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormFieldRenderer } from "@/components/forms/form-field-renderer";
import { getPublishedFormBySlug } from "@/lib/supabase/forms";
import { createResponse } from "@/lib/supabase/responses";
import { isFieldVisible, validateAnswers, scoreResponse } from "@/lib/forms/schema";

function availability(form) {
  const s = form.settings || {};
  const now = Date.now();
  if (s.openDate && now < new Date(s.openDate).getTime()) {
    return { open: false, reason: "This form is not open for responses yet." };
  }
  if (s.closeDate && now > new Date(s.closeDate).getTime() + 86_400_000) {
    return { open: false, reason: "This form is closed and no longer accepting responses." };
  }
  const limit = Number(s.responseLimit);
  if (limit && form.responses >= limit) {
    return { open: false, reason: "This form has reached its response limit." };
  }
  return { open: true };
}

function detectRespondent(fields, answers) {
  let email = null;
  let name = null;
  for (const f of fields) {
    const v = answers[f.id];
    if (!v) continue;
    const label = `${f.title} ${f.label || ""}`.toLowerCase();
    if (!email && (f.type === "email" || label.includes("email"))) email = String(v);
    if (!name && f.type !== "email" && label.includes("name")) name = String(v);
  }
  return { name, email };
}

function TopBar({ live = false }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#2a2a2a] bg-[#121212]/80 backdrop-blur">
      <TopBar/>
    </header>
  );
}

function Shell({ live = false, children }) {
  return (
    <main className="min-h-[100dvh] bg-[#121212] text-white">
      <TopBar live={live} />
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </div>
    </main>
  );
}

function StatusCard({ icon: Icon, title, description, children, tone = "default" }) {
  const ring =
    tone === "success"
      ? "border-[#166534] bg-[#0d2218] text-[#4ade80]"
      : "border-[#2a2a2a] bg-[#202020] text-[#a3a3a3]";
  return (
    <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${ring}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-[#e7e7e7]">{title}</h1>
      {description && <p className="mt-2 text-sm leading-relaxed text-[#a3a3a3]">{description}</p>}
      {children && <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>}
    </section>
  );
}

export function FormFillerContent({ formId }) {
  const [form, setForm] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);
  const startedAtRef = useRef(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadState("loading");
    getPublishedFormBySlug(formId)
      .then((f) => {
        if (!active) return;
        setForm(f);
        if (f) startedAtRef.current = Date.now();
        setLoadState(f ? "ready" : "missing");
      })
      .catch(() => active && setLoadState("error"));
    return () => {
      active = false;
    };
  }, [formId]);

  useEffect(() => {
    if (!done || !form) return;
    const s = form.settings || {};
    if (s.thankYouType === "redirect" && s.thankYouUrl && typeof window !== "undefined") {
      window.location.href = s.thankYouUrl;
    }
  }, [done, form]);

  const visibleFields = useMemo(() => {
    if (!form) return [];
    return (form.fieldDefs || []).filter((f) => f.included !== false && isFieldVisible(f, answers));
  }, [form, answers]);

  const setAnswer = (id, value) => {
    setAnswers((cur) => ({ ...cur, [id]: value }));
    setErrors((cur) => (cur[id] ? { ...cur, [id]: undefined } : cur));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateAnswers(form.fieldDefs, answers);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { name, email } = detectRespondent(form.fieldDefs, answers);
      const { score, priority } = scoreResponse(form, answers);
      const completionMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
      await createResponse({
        formId: form.id,
        answers,
        respondentName: name,
        respondentEmail: email,
        priority,
        score,
        completionMs,
        status: form.settings?.scoringEnabled && priority === "High" ? "Needs review" : "Complete",
      });
      setDone(true);
    } catch (err) {
      setSubmitError(err.message || "Could not submit your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadState === "loading") {
    return (
      <Shell>
        <section className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[#737373]" />
        </section>
      </Shell>
    );
  }

  if (loadState === "missing") {
    return (
      <Shell>
        <StatusCard
          icon={Lock}
          title="Form not available"
          description="This form doesn't exist or isn't published yet. Check the link or contact whoever shared it."
        >
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </StatusCard>
      </Shell>
    );
  }

  if (loadState === "error") {
    return (
      <Shell>
        <StatusCard
          icon={Lock}
          title="Couldn't load this form"
          description="Something went wrong reaching the server. Please try again later."
        />
      </Shell>
    );
  }

  const status = availability(form);
  if (!status.open) {
    return (
      <Shell>
        <StatusCard icon={Lock} title="Closed" description={status.reason}>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </StatusCard>
      </Shell>
    );
  }

  if (done) {
    const s = form.settings || {};
    return (
      <Shell>
        <StatusCard
          tone="success"
          icon={CheckCircle2}
          title="Response submitted"
          description={s.thankYouText || "Thanks for submitting. We'll review and follow up soon."}
        >
          {s.submitAnother && (
            <Button
              variant="outline"
              onClick={() => {
                setAnswers({});
                setErrors({});
                setDone(false);
              }}
            >
              Submit another
            </Button>
          )}
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </StatusCard>
      </Shell>
    );
  }

  const isCover = form.settings?.coverStyle === "cover";
  const questionCount = visibleFields.length;

  return (
    <Shell live>
      {/* Hero header */}
      <div className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a]">
        <div
          className={
            isCover
              ? "h-28 bg-[linear-gradient(106deg,#17353a_0%,#3e3a24_48%,#5a2d29_100%)] sm:h-36"
              : "h-20 bg-gradient-to-br from-[#1f1f1f] to-[#161616] sm:h-24"
          }
        />
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <h1 className="text-2xl font-bold text-[#e7e7e7] sm:text-3xl">{form.title}</h1>
          {form.description && (
            <p className="mt-2.5 text-sm leading-relaxed text-[#a3a3a3]">{form.description}</p>
          )}
          {questionCount > 0 && (
            <p className="mt-3 text-xs text-[#737373]">
              {questionCount} question{questionCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        {/* Fields card */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 sm:p-8">
          {visibleFields.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#737373]">
              This form has no questions yet.
            </p>
          ) : (
            <div className="space-y-7">
              {visibleFields.map((field) => (
                <FormFieldRenderer
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  onChange={(v) => setAnswer(field.id, v)}
                  error={errors[field.id]}
                  allFields={form.fieldDefs}
                  answers={answers}
                />
              ))}
            </div>
          )}
        </div>

        {/* Submit error alert */}
        {submitError && (
          <p className="mt-5 rounded-xl border border-[#7c5410] bg-[#231a08] px-4 py-3 text-xs text-[#fcd34d]">
            {submitError}
          </p>
        )}

        {/* Submit area */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#737373]">
            <CheckCircle2 className="h-4 w-4 text-[#525252]" />
            Secure submission
          </div>
          <Button type="submit" disabled={submitting || visibleFields.length === 0} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </div>

        {form.settings?.branding !== false && (
          <p className="mt-8 text-center text-xs text-[#525252]">Powered by Geiger Forms</p>
        )}
      </form>
    </Shell>
  );
}
