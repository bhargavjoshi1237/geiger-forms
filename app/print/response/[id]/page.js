import { PrintResponses } from "@/components/forms/response/print-document";

export const metadata = {
  title: "Print response - Geiger Forms",
  robots: { index: false, follow: false },
};

// Printable response (contract/certificate page, answers, receipt, audit trail); data loads client-side.
export default async function PrintResponsePage({ params, searchParams }) {
  const { id } = await params;
  const { autoprint } = (await searchParams) || {};
  return <PrintResponses ids={[id]} autoPrint={autoprint !== "0"} />;
}
