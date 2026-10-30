import { ClipboardCheck, Mail, TriangleAlert } from "lucide-react";
import Footer from "@geiger/ui/footer";
import { Header } from "@/components/header";

export const metadata = {
  title: "Accessibility statement - Geiger Forms",
  description: "How accessible Geiger Forms' public forms are, what isn't yet, and how to report a problem.",
};

// TODO(owner): set a monitored inbox here. No accessibility or support address exists in the repo, and the page says so until one is set.
const ACCESSIBILITY_CONTACT_EMAIL = "";

const AUDIT_DATE = "2026-10-30";
const AUDIT_DATE_LABEL = "30 October 2026";

// Taken from docs/accessibility-audit.md; update both together.
const LIMITATIONS = [
  {
    title: "Not yet tested with people or assistive technology",
    body: "The audit was a review of the code. Nobody has yet run these forms with NVDA, VoiceOver, keyboard only, 320px width or 200% zoom, so the fixes below are unconfirmed in real use.",
  },
  {
    title: "Videos uploaded as files can't carry captions",
    body: "A form can link to an .mp4 or .webm file, but the player has no way to add captions or audio description. YouTube and Vimeo videos can have them, if the form's owner provides them.",
  },
  {
    title: "Pop-up forms can close on a timer",
    body: "A site embedding a form can choose to close its pop-up a few seconds after you submit, with no way to extend the time. This is off by default.",
  },
  {
    title: "Built-in error messages are in English",
    body: "On forms in other languages, the buttons and instructions are translated, but standard messages such as \"This field is required\" stay in English. They are marked as English in the page so screen readers can switch voice.",
  },
  {
    title: "The automated security check has no alternative route",
    body: "Some forms use Cloudflare Turnstile to block spam. It usually runs without any action from you and we haven't tested it with assistive technology. If it fails you can retry, but there is no other way to submit, so please contact the form's owner.",
  },
  {
    title: "The booking calendar is only partly translated",
    body: "Calendar day and month labels may appear in English on translated forms, and its keyboard behaviour comes from a third-party component we haven't tested.",
  },
  {
    title: "Repeating groups don't say which entry has the error",
    body: "The message names the question that needs fixing but not whether it's in the first or a later entry.",
  },
  {
    title: "The drawn signature pad needs a pointer",
    body: "Every signature field also has a Type instead button, which works by keyboard. The pad keeps the size it had when the page loaded, so zooming afterwards can cut part of it off.",
  },
  {
    title: "Letter shortcuts stay labelled when switched off",
    body: "In one-question-at-a-time forms you can switch off the A to Z shortcuts, but the letters still appear beside each option.",
  },
];

const OWNER_CONTENT = [
  "Questions, instructions and image descriptions are written by each form's owner. We provide fields for alt text and video titles but can't check what's entered.",
  "We adjust a form's accent colour when it would be too faint to read or see, but we can't check text over a cover image or a form embedded with a transparent background on someone else's page.",
  "The site around an embedded form is the responsibility of whoever runs that site.",
];

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 grid gap-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

// Public statement, outside proxy.js's matcher so it stays readable without signing in.
export default function AccessibilityStatementPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-24 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Accessibility statement</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This covers the public forms people fill in on Geiger Forms, including forms embedded on other sites. It doesn&apos;t cover the workspace teams use to build forms.
        </p>

        <div className="mt-8 rounded-sm border border-border bg-surface-subtle p-5">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Partially conformant with WCAG 2.1 level AA</p>
              <p className="mt-1">
                Some parts of these forms don&apos;t yet meet the standard, and others haven&apos;t been tested. We&apos;re working towards WCAG 2.2 level AA. We don&apos;t claim full conformance with either version.
              </p>
              <p className="mt-2">
                Last reviewed <time dateTime={AUDIT_DATE}>{AUDIT_DATE_LABEL}</time>, by reviewing the code against each success criterion.
              </p>
            </div>
          </div>
        </div>

        <Section title="What we've done">
          <p>That review led to fixes in how forms label their controls, report errors, move keyboard focus, announce changes to screen readers, respect reduced-motion settings and choose readable colours for any accent. Every question type has a way to answer it without dragging.</p>
        </Section>

        <Section title="Known limitations">
          <ul className="grid gap-3">
            {LIMITATIONS.map((item) => (
              <li key={item.title} className="flex gap-3 rounded-sm border border-border bg-surface-subtle p-4">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="mt-1">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Content from form owners">
          <ul className="grid list-disc gap-2 pl-5">
            {OWNER_CONTENT.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Section>

        <Section title="Report a problem">
          <p>If you can&apos;t complete a form or something here doesn&apos;t work with your setup, please tell us the form&apos;s link, what you were trying to do, and the browser and any assistive technology you use.</p>
          {ACCESSIBILITY_CONTACT_EMAIL ? (
            <p>
              <a href={`mailto:${ACCESSIBILITY_CONTACT_EMAIL}`} className="inline-flex min-h-6 items-center gap-2 font-medium text-foreground underline underline-offset-4">
                <Mail className="size-4" aria-hidden="true" />
                {ACCESSIBILITY_CONTACT_EMAIL}
              </a>
            </p>
          ) : (
            <p>We don&apos;t have a dedicated accessibility address yet. For now, please contact whoever sent you the form: they can give you another way to respond and pass the problem on to us.</p>
          )}
        </Section>
      </main>
      <Footer />
    </div>
  );
}
