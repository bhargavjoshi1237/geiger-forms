"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Edit3, Equal,
  Lock, Send, ShieldCheck, Sparkles, Users, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const POSITION_TIERS = {
  Engineer: { track: "Technical Track", level: "Senior Level", score: 92 },
  Designer: { track: "Design Track", level: "Creative Level", score: 85 },
  "Product Manager": { track: "Product Track", level: "Strategic Level", score: 88 },
};

// Gate screen shown before the form
function AccessGate({ onSignIn, onGuest }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#202020]">
            <Lock className="h-5 w-5 text-[#a3a3a3]" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white">Restricted form</h1>
          <p className="text-sm text-[#737373]">
            This form is available to <span className="text-[#d4d4d4]">@acme.com</span> accounts and members of the{" "}
            <span className="text-[#d4d4d4]">HR &amp; Onboarding</span> project.
          </p>
        </div>

        <div className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] divide-y divide-[#242424]">
          <div className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#60a5fa]" />
            <div>
              <p className="text-xs font-medium text-[#d4d4d4]">Organisation email required</p>
              <p className="mt-0.5 text-xs text-[#525252]">Sign in with a verified @acme.com address</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#c4b5fd]" />
            <div>
              <p className="text-xs font-medium text-[#d4d4d4]">Project membership</p>
              <p className="mt-0.5 text-xs text-[#525252]">Must be a member of HR &amp; Onboarding in Geiger Flow</p>
            </div>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={onSignIn}>
          <ShieldCheck className="h-4 w-4" />
          Sign in with Geiger
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={onGuest}
            className="text-xs text-[#525252] underline underline-offset-2 transition-colors hover:text-[#a3a3a3]"
          >
            Continue as guest (demo only)
          </button>
        </div>
      </div>
    </section>
  );
}

function PrefillBanner() {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-[#1e3a5f] bg-[#0e1e2e] px-3 py-2.5 text-xs">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#60a5fa]" />
      <span className="text-[#93c5fd]">
        Fields pre-filled from your Geiger account.{" "}
        <span className="text-[#60a5fa]">You can edit any value before submitting.</span>
      </span>
    </div>
  );
}

function EditModeBanner() {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-[#7c2d12] bg-[#2a1a08] px-3 py-2.5 text-xs">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#fb923c]" />
      <span className="text-[#fdba74]">
        You are editing your previous submission (submitted 3 days ago).{" "}
        <span className="text-[#fb923c]">Changes will be logged as a revision.</span>
      </span>
    </div>
  );
}

function StepContact({ prefilled, name, setName, email, setEmail, phone, setPhone }) {
  return (
    <div className="space-y-4">
      {prefilled && <PrefillBanner />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium text-[#d4d4d4]">
            Full name <span className="text-[#ef4444]">*</span>
            {prefilled && name && (
              <span className="rounded-full bg-[#0e1e2e] px-1.5 py-0 text-[10px] font-medium text-[#60a5fa] border border-[#1e3a5f]">Pre-filled</span>
            )}
          </span>
          <Input
            className="mt-2"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium text-[#d4d4d4]">
            Email <span className="text-[#ef4444]">*</span>
            {prefilled && email && (
              <span className="rounded-full bg-[#0e1e2e] px-1.5 py-0 text-[10px] font-medium text-[#60a5fa] border border-[#1e3a5f]">Pre-filled</span>
            )}
          </span>
          <Input
            className="mt-2"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-[#d4d4d4]">Phone</span>
        <Input
          className="mt-2"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
    </div>
  );
}

function StepApplication({ position, setPosition, coverLetter, setCoverLetter }) {
  const tier = POSITION_TIERS[position];

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[#d4d4d4]">
          Position <span className="text-[#ef4444]">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.keys(POSITION_TIERS).map((opt) => (
            <label
              key={opt}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                position === opt
                  ? "border-[#474747] bg-[#202020] text-white"
                  : "border-[#2a2a2a] bg-[#161616] text-[#d4d4d4] hover:border-[#474747]",
              )}
            >
              <input
                name="position"
                type="radio"
                className="h-4 w-4 accent-white"
                checked={position === opt}
                onChange={() => setPosition(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Calculated field: Application Tier */}
      <div className="rounded-md border border-[#1e3a5f] bg-[#0e1e2e] p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Equal className="h-3.5 w-3.5 text-[#60a5fa]" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#60a5fa]">Calculated — Application Tier</span>
        </div>
        {tier ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{tier.track}</p>
              <p className="text-xs text-[#60a5fa]">{tier.level}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-white">{tier.score}</p>
              <p className="text-[10px] text-[#525252]">Score</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#525252]">Select a position above to see your application tier.</p>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-[#d4d4d4]">Cover letter</span>
        <Textarea
          className="mt-2 min-h-28"
          placeholder="Why do you want to join?"
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
        />
      </label>
    </div>
  );
}

function StepAttachments() {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-[#d4d4d4]">
          CV / Résumé <span className="text-[#ef4444]">*</span>
        </span>
        <div className="mt-2 flex cursor-pointer items-center justify-center rounded-md border border-dashed border-[#2a2a2a] bg-[#161616] px-4 py-8 text-center transition-colors hover:border-[#474747]">
          <div>
            <p className="text-sm text-[#a3a3a3]">
              Drop your CV here or <span className="text-white underline underline-offset-2">browse</span>
            </p>
            <p className="mt-1 text-xs text-[#525252]">PDF, DOCX up to 10 MB</p>
          </div>
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#d4d4d4]">Additional files</span>
        <div className="mt-2 flex cursor-pointer items-center justify-center rounded-md border border-dashed border-[#2a2a2a] bg-[#161616] px-4 py-6 text-center transition-colors hover:border-[#474747]">
          <p className="text-sm text-[#525252]">Portfolio, work samples, references</p>
        </div>
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[#2a2a2a] bg-[#161616] p-3 text-sm text-[#a3a3a3] transition-colors hover:border-[#474747]">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-white" />
        <span>I confirm this application is accurate and ready to submit.</span>
      </label>
    </div>
  );
}

function SuccessScreen({ formId, onEdit }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#166534] bg-[#0d2218]">
        <CheckCircle2 className="h-7 w-7 text-[#4ade80]" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">Application submitted</h2>
      <p className="mt-2 max-w-sm text-sm text-[#a3a3a3]">
        Thanks for applying. We&apos;ve received your response and will review it shortly. Expect to hear back within 5 business days.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onEdit} className="gap-1.5">
          <Edit3 className="h-4 w-4" />
          Edit my response
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/form/${formId}`}>Submit another</Link>
        </Button>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
      <p className="mt-4 text-xs text-[#525252]">Edit link valid for 48 hours · Revisions are logged</p>
    </div>
  );
}

const STEP_DEFS = [
  { id: "contact", title: "Contact details", description: "Tell us who you are." },
  { id: "application", title: "Your application", description: "Share a bit about what you are applying for." },
  { id: "attachments", title: "Attachments", description: "Upload your CV and any supporting documents." },
];

export function FormFillerContent({ formId }) {
  const [stage, setStage] = useState("gate"); // 'gate' | 'form' | 'success'
  const [editMode, setEditMode] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Controlled field state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  const step = STEP_DEFS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEP_DEFS.length - 1;

  const handleSignIn = () => {
    // Simulate sign-in with prefill
    setName("Maya Patel");
    setEmail("maya@acme.com");
    setPhone("+1 (415) 555-0192");
    setPrefilled(true);
    setStage("form");
  };

  const handleGuest = () => {
    setStage("form");
  };

  const handleNext = () => {
    if (isLast) {
      setStage("success");
      setEditMode(false);
    } else {
      setCurrentStep((v) => v + 1);
    }
  };

  const handleEdit = () => {
    setCurrentStep(0);
    setEditMode(true);
    setStage("form");
  };

  const renderStepFields = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepContact
            prefilled={prefilled}
            name={name} setName={setName}
            email={email} setEmail={setEmail}
            phone={phone} setPhone={setPhone}
          />
        );
      case 1:
        return (
          <StepApplication
            position={position} setPosition={setPosition}
            coverLetter={coverLetter} setCoverLetter={setCoverLetter}
          />
        );
      case 2:
        return <StepAttachments />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#161616] text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-[#2a2a2a] pb-5">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            <ClipboardList className="h-5 w-5 text-[#a3a3a3]" />
            Geiger Forms
          </Link>
          <div className="flex items-center gap-2">
            {prefilled && (
              <span className="flex items-center gap-1 rounded-full border border-[#1e3a5f] bg-[#0e1e2e] px-2.5 py-0.5 text-[10px] font-medium text-[#60a5fa]">
                <ShieldCheck className="h-3 w-3" />
                maya@acme.com
              </span>
            )}
            <span className="rounded-full border border-[#2a2a2a] bg-[#202020] px-2.5 py-0.5 text-xs text-[#a3a3a3]">
              {formId}
            </span>
          </div>
        </header>

        {stage === "gate" && (
          <AccessGate onSignIn={handleSignIn} onGuest={handleGuest} />
        )}

        {stage === "success" && (
          <SuccessScreen formId={formId} onEdit={handleEdit} />
        )}

        {stage === "form" && (
          <section className="flex flex-1 flex-col py-8">
            {editMode && (
              <div className="mb-5">
                <EditModeBanner />
              </div>
            )}

            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between text-xs text-[#737373]">
                <span>
                  Step {currentStep + 1} of {STEP_DEFS.length} —{" "}
                  <span className="text-[#a3a3a3]">{step.title}</span>
                </span>
                <span>{Math.round(((currentStep + 1) / STEP_DEFS.length) * 100)}% complete</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#2a2a2a]">
                <div
                  className="h-1.5 rounded-full bg-white transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / STEP_DEFS.length) * 100}%` }}
                />
              </div>
              <div className="mt-3 flex gap-1.5">
                {STEP_DEFS.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      "flex-1 rounded-full py-0.5 text-center text-[10px] font-medium transition-colors",
                      i < currentStep
                        ? "bg-[#2a2a2a] text-[#4ade80]"
                        : i === currentStep
                        ? "bg-[#2a2a2a] text-white"
                        : "bg-[#1e1e1e] text-[#525252]",
                    )}
                  >
                    {i < currentStep ? "✓" : i + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-xl font-semibold text-white">{step.title}</h1>
              <p className="mt-1 text-sm text-[#a3a3a3]">{step.description}</p>
            </div>

            <div className="flex-1 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-4 sm:p-5">
              {renderStepFields()}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((v) => v - 1)}
                disabled={isFirst}
                className="gap-1.5 disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center gap-2 text-xs text-[#525252]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Secure submission
              </div>

              <Button type="button" onClick={handleNext} className="gap-1.5">
                {isLast ? (
                  <>
                    {editMode ? "Save changes" : "Submit"}
                    <Send className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </section>
        )}

        <footer className="mt-auto flex items-center justify-between border-t border-[#2a2a2a] py-5 text-xs text-[#737373]">
          <span>Geiger Studio</span>
          <Link
            href="/forms"
            className="inline-flex items-center gap-1 text-[#a3a3a3] transition-colors hover:text-white"
          >
            Admin workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
