"use client";

import { BarChart3 } from "lucide-react";
import { EmptyState, SectionCard } from "@geiger/ui/screen-kit";
import { fieldTypeLabel } from "@/lib/forms/logic";
import { MIN_SHARED_RESPONSES } from "@/lib/forms/survey-analytics";
import { fieldLabel } from "@/lib/forms/response-utils";
import { FieldReport } from "./survey_report";

// Read-only report for a public link: aggregates only, computed on the server.
export function SharedReport({ report }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <header className="mb-6 border-b border-border pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{report.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">Survey report · {report.tooFew ? "Collecting responses" : `${report.total} responses`}</p>
      </header>
      {report.tooFew ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState icon={BarChart3} title="Not enough responses yet" description={`This report appears after ${MIN_SHARED_RESPONSES} responses, so nobody can be identified from it.`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {report.aggregates.map((agg) => (
            <SectionCard key={agg.field.id} title={fieldLabel(agg.field)} description={`${fieldTypeLabel(agg.field.type)} · ${agg.answered} of ${agg.total} answered`} className={agg.kind === "matrix" ? "lg:col-span-2" : undefined}>
              <FieldReport agg={agg} currency={report.currency} />
            </SectionCard>
          ))}
        </div>
      )}
      <p className="mt-8 text-center text-xs text-text-tertiary">Written answers and sensitive questions aren&apos;t included. Made with Geiger Forms.</p>
    </main>
  );
}
