import { NextResponse } from "next/server";
import { fail, notFound } from "@/lib/server/http";
import { logAccess, responseFilePaths } from "@/lib/server/forms";
import { signedDownloadUrl } from "@/lib/server/storage";
import { requireResponse } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Redirects to a short-lived signed URL for a file the response references, logging the access.
export async function GET(request, { params }) {
  const { id } = await params;
  const { user, form, row, error } = await requireResponse(id, "forms.responses.view");
  if (error) return error;
  const path = new URL(request.url).searchParams.get("path");
  if (!path || !responseFilePaths(row).includes(path)) return notFound("File not found.");
  const url = await signedDownloadUrl(path, 60);
  if (!url) return fail("Couldn't open the file.", 502);
  await logAccess({ formId: form.id, responseId: row.id, user, action: "view", metadata: { file: path } });
  return NextResponse.redirect(url, 302);
}
