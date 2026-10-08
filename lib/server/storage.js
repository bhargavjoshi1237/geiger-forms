import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "@/lib/server/supabase-admin";

// Private `forms-uploads` bucket: signed uploads/downloads, server-side PNG writes and deletes.

export const UPLOAD_BUCKET = "forms-uploads";

function bucket() {
  return adminClient()?.storage.from(UPLOAD_BUCKET) ?? null;
}

export function safeFileName(name) {
  const clean = String(name || "file")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return (clean || "file").slice(-100);
}

// True for paths this form issued (forms/<formId>/…), with no traversal.
export function isFormPath(formId, path) {
  return typeof path === "string" && path.length < 400 && path.startsWith(`forms/${formId}/`) && !path.includes("..") && !path.includes("//");
}

export function newUploadPath(formId, fileName, folder = "") {
  return `forms/${formId}/${folder ? `${folder}/` : ""}${randomUUID()}-${safeFileName(fileName)}`;
}

export async function createUploadUrl(path) {
  const b = bucket();
  if (!b) return null;
  const { data, error } = await b.createSignedUploadUrl(path);
  if (error) {
    console.error("[storage.uploadUrl]", error.message);
    return null;
  }
  return { signedUrl: data.signedUrl, token: data.token, path: data.path || path };
}

export async function signedDownloadUrl(path, seconds = 60) {
  const b = bucket();
  if (!b) return null;
  const { data, error } = await b.createSignedUrl(path, seconds);
  if (error) {
    console.error("[storage.downloadUrl]", error.message);
    return null;
  }
  return data.signedUrl;
}

// Decodes a PNG data URL (≤ maxBytes) and stores it at `path`. Returns the path or null.
export async function uploadPngDataUrl(path, dataUrl, maxBytes = 1024 * 1024) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!match) return null;
  const buffer = Buffer.from(match[1], "base64");
  if (!buffer.length || buffer.length > maxBytes || buffer.subarray(1, 4).toString("ascii") !== "PNG") return null;
  const b = bucket();
  if (!b) return null;
  const { error } = await b.upload(path, buffer, { contentType: "image/png", upsert: false });
  if (error) {
    console.error("[storage.uploadPng]", error.message);
    return null;
  }
  return path;
}

export async function removePaths(paths) {
  const list = [...new Set(paths || [])].filter(Boolean);
  const b = bucket();
  if (!b || !list.length) return 0;
  let removed = 0;
  for (let i = 0; i < list.length; i += 100) {
    const { data, error } = await b.remove(list.slice(i, i + 100));
    if (error) console.error("[storage.remove]", error.message);
    removed += data?.length || 0;
  }
  return removed;
}
