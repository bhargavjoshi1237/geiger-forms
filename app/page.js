import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileText,
  LayoutGrid,
  MousePointerClick,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import Footer from "@/components/ui/footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Topbar } from "@/components/internal/topbar/topbar";
import LandingFormShowcase from "@/components/LandingFormShowcase";

export const metadata = {
  title: "Forms - Geiger Studio",
  description:
    "Create forms, collect responses, and manage submissions with Geiger Forms.",
};

const utilityCards = [
  {
    title: "Works with your workflows",
    description:
      "Build intake, feedback, registration, and approval flows around the way your team already works.",
    icon: LayoutGrid,
  },
  {
    title: "Clean filler experience",
    description:
      "Share focused form links that are separate from the admin workspace and easy to complete on any device.",
    icon: Smartphone,
  },
  {
    title: "Response operations",
    description:
      "Review submissions, track status, and keep follow-up work visible after every response comes in.",
    icon: ClipboardList,
  },
  {
    title: "Form Playground",
    description:
      "Design questions, preview the filler view, and tune the collection flow in one focused interface.",
    icon: FileText,
  },
  {
    title: "Structured Analytics",
    description:
      "Watch response volume, completion rates, and recent activity without leaving the forms workspace.",
    icon: BarChart3,
  },
  {
    title: "Team Collaboration",
    description:
      "Share forms with your team, organize templates, and keep draft-to-published work controlled.",
    icon: Users,
  },
];

const faqs = [
  {
    value: "item-1",
    question: "How does Geiger Forms keep submissions organized?",
    answer:
      "Geiger Forms separates the form workspace from the filler route, so teams can manage forms while respondents get a clean submission experience.",
  },
  {
    value: "item-2",
    question: "Can I use Geiger Forms for business workflows?",
    answer:
      "Yes. It is designed for client intake, internal requests, event registrations, product feedback, and other repeatable collection flows.",
  },
  {
    value: "item-3",
    question: "Where do respondents fill out a form?",
    answer:
      "Published forms can open on the dedicated /form/[formid] route, keeping public filling separate from the /forms management workspace.",
  },
  {
    value: "item-4",
    question: "Can teams track responses after publishing?",
    answer:
      "Yes. The workspace includes areas for responses, analytics, templates, folders, shared forms, archived items, and settings.",
  },
];

export default function FormsLandingPage() {
  const ctaHref = "/forms";

  return (
    <div className="flex min-h-screen w-full flex-col bg-zinc-950 font-sans text-zinc-100 selection:bg-indigo-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808030_1px,transparent_1px),linear-gradient(to_bottom,#80808030_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <Topbar />

      <main className="relative z-10 flex flex-1 flex-col">
        <section className="mx-auto mb-10 mt-10 flex w-full max-w-6xl items-start justify-start px-4 sm:mt-16 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-2xl font-semibold text-white sm:text-3xl">
              Create, publish, and manage forms from one focused workspace.
            </h1>
            <p className="mb-6 max-w-xl text-sm text-zinc-400 sm:text-base">
              Geiger Forms combines practical form building with response management,
              analytics, templates, and a dedicated filler route for every published form.
            </p>
            <Link
              href={ctaHref}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-100 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-white sm:text-base"
            >
              Open Forms Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="mx-auto my-10 w-[94%] sm:my-20 md:w-[80%]">
          <LandingFormShowcase ctaHref={ctaHref} ctaLabel="Checkout Forms" />
        </div>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3">
          {utilityCards.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-sm border border-zinc-800 bg-[#191919] p-5"
            >
              <Icon className="mb-3 h-5 w-5 text-zinc-300" />
              <h2 className="font-medium text-zinc-100">{title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{description}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:mt-16 md:flex-row">
          <div className="md:w-[35%]">
            <h2 className="text-3xl font-semibold text-white">Questions & Answers</h2>
          </div>
          <div className="md:w-[65%]">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.value}
                  value={faq.value}
                  className="border-zinc-800"
                >
                  <AccordionTrigger className="text-zinc-200 hover:text-white hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-zinc-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="relative z-20 overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div className="container relative z-10 mx-auto flex flex-col items-center text-center">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500 sm:text-sm">
              Open source from day one
            </h3>
            <h2 className="mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-3xl font-black tracking-tighter text-transparent drop-shadow-lg sm:mb-10 sm:text-5xl lg:text-6xl">
              TRY GEIGER NOW
            </h2>
            <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/forms"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-white sm:w-auto"
              >
                Forms
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/form/demo"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-white sm:w-auto"
              >
                Preview Filler
                <MousePointerClick className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
