import { fail, ipHash, notFound, ok, rateLimit, rateLimited, readJson, unavailable } from "@/lib/server/http";
import { isAdminConfigured } from "@/lib/server/supabase-admin";
import { loadPublishedForm } from "@/lib/server/forms";
import { createUploadUrl, newUploadPath } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// `accept` follows the HTML attribute: ".pdf,image/*,application/zip".
function accepts(accept, fileName, contentType) {
  const rules = String(accept || "").split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (!rules.length) return true;
  const name = fileName.toLowerCase();
  const type = contentType.toLowerCase();
  return rules.some((r) => (r.startsWith(".") ? name.endsWith(r) : r.endsWith("/*") ? type.startsWith(r.slice(0, -1)) : type === r));
}

// Issues a signed upload URL for a file or signature field; the client PUTs the bytes directly to storage.
export async function POST(request, { params }) {
  const { slug } = await params;
  if (!isAdminConfigured()) return unavailable();
  const { body, error } = await readJson(request, 4 * 1024);
  if (error) return error;
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  const field = form.fieldDefs.find((f) => f.id === body.fieldId);
  if (!field || !["file", "signature"].includes(field.type)) return fail("This field doesn't accept uploads.", 400, { code: "validation" });

  const fileName = typeof body.fileName === "string" && body.fileName.trim() ? body.fileName.trim().slice(0, 200) : "file";
  const contentType = typeof body.contentType === "string" ? body.contentType.slice(0, 120) : "";
  const size = Number(body.size);
  if (!Number.isFinite(size) || size <= 0) return fail("The file is empty.", 400, { code: "validation" });

  const isSignature = field.type === "signature";
  const maxMb = isSignature ? 2 : Math.max(0.1, Number(field.config?.maxSizeMb) || 10);
  if (size > maxMb * 1024 * 1024) return fail(`Files must be ${maxMb} MB or smaller.`, 413, { code: "validation" });
  if (isSignature ? contentType !== "image/png" : !accepts(field.config?.accept, fileName, contentType)) {
    return fail("This file type isn't accepted here.", 415, { code: "validation" });
  }
  if (!(await rateLimit(`upload:${form.id}:${ipHash(request)}`, 60))) return rateLimited();

  const signed = await createUploadUrl(newUploadPath(form.id, fileName, isSignature ? "signatures" : ""));
  if (!signed) return fail("Uploads are unavailable right now.", 503);
  return ok({ path: signed.path, signedUrl: signed.signedUrl, token: signed.token });
}
