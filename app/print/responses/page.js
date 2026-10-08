import { PrintResponses } from "@/components/forms/response/print-document";

export const metadata = {
  title: "Print responses - Geiger Forms",
  robots: { index: false, follow: false },
};

const MAX_IDS = 100;

// Bulk print/PDF: /print/responses?ids=a,b,c renders one document per response.
export default async function PrintResponsesPage({ searchParams }) {
  const { ids = "", autoprint } = (await searchParams) || {};
  const list = String(ids)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);
  return <PrintResponses ids={list} autoPrint={autoprint !== "0"} />;
}
