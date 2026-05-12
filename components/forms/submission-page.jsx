"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { FormRenderer } from "@/components/forms/form-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormStore } from "@/lib/form-store";

export function SubmissionPage() {
  const params = useParams();
  const { forms, submitResponse } = useFormStore();
  const form = useMemo(() => forms.find((item) => item.id === params.id), [forms, params.id]);
  const [identity, setIdentity] = useState({ respondent: "", email: "" });
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!form) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#161616] p-6 text-[#ededed]">
        <div className="max-w-md rounded-2xl border border-[#2a2a2a] bg-[#202020] p-6 text-center">
          <p className="text-lg font-semibold">Form not found</p>
          <p className="mt-2 text-sm text-[#737373]">This form may have been removed or only exists in another browser profile.</p>
          <Button asChild className="mt-5">
            <Link href="/">Return to workspace</Link>
          </Button>
        </div>
      </main>
    );
  }

  const validateAndSubmit = () => {
    const missing = form.questions.find((question) => {
      if (!question.required) return false;
      const value = answers[question.id];
      return Array.isArray(value) ? value.length === 0 : !value;
    });

    if (!identity.respondent || (form.settings.collectEmail && !identity.email)) {
      setError("Please complete the verified identity fields.");
      return;
    }

    if (missing) {
      setError(`Please answer: ${missing.title}`);
      return;
    }

    submitResponse(form.id, {
      respondent: identity.respondent,
      email: identity.email,
      answers,
    });
    setSubmitted(true);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#161616] text-[#ededed]">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Workspace
          </Link>
        </Button>

        {submitted ? (
          <section className="rounded-2xl border border-[#2a2a2a] bg-[#202020] p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Submitted</h1>
            <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">{form.settings.confirmation}</p>
            <Button asChild className="mt-6">
              <Link href="/">Back to Forms</Link>
            </Button>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#202020]">
            <div className="border-b border-[#2a2a2a] bg-[#1a1a1a] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#ededed]">{form.title}</h1>
                  <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">{form.description}</p>
                </div>
                <Badge className="shrink-0 border-teal-500/25 bg-teal-500/10 text-teal-200">
                  <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />
                  Confidential
                </Badge>
              </div>
              <div className="mt-5 rounded-xl border border-teal-500/20 bg-teal-500/10 p-3 text-xs leading-5 text-teal-100">
                <ShieldCheck className="mr-2 inline h-3.5 w-3.5" />
                This submission is project-bound. Only authorized reviewers can inspect responses.
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 md:grid-cols-2">
                <Input
                  value={identity.respondent}
                  onChange={(event) => setIdentity({ ...identity, respondent: event.target.value })}
                  placeholder="Verified name"
                />
                <Input
                  value={identity.email}
                  onChange={(event) => setIdentity({ ...identity, email: event.target.value })}
                  placeholder="Email"
                  inputMode="email"
                />
              </div>
              <FormRenderer form={form} answers={answers} onAnswer={(id, value) => setAnswers({ ...answers, [id]: value })} />
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <Button className="w-full" onClick={validateAndSubmit}>
                <Send className="h-4 w-4" />
                Submit confidential response
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
