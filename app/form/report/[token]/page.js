import { notFound } from "next/navigation";
import { SharedReport } from "@/components/internal/screens/forms/responses/shared_report";
import { loadSharedReport } from "@/lib/server/report-share";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Survey report - Geiger Forms",
  robots: { index: false, follow: false },
  // The token in the URL must not leak to other sites through the Referer header.
  referrer: "no-referrer",
};

// Public, read-only report behind a revocable link; only the server sees responses, and the page receives aggregates.
export default async function SharedReportPage({ params }) {
  const { token } = await params;
  const report = await loadSharedReport(token).catch(() => null);
  if (!report) notFound();
  return <SharedReport report={report} />;
}
