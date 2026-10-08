"use client";

import { callApi } from "@/lib/forms/api";

// PUTs a blob to a signed storage URL, reporting 0..1 progress. Resolves true on 2xx.
function putWithProgress(url, blob, contentType, onProgress) {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.onabort = () => resolve(false);
      xhr.send(blob);
    } catch {
      resolve(false);
    }
  });
}

// Two-step upload: ask the API for a signed URL, then PUT the bytes. Returns the stored answer entry or null.
export async function uploadToForm(slug, fieldId, file, { name, onProgress } = {}) {
  const fileName = name || file.name || "upload";
  const contentType = file.type || "application/octet-stream";
  const res = await callApi(`/api/public/forms/${encodeURIComponent(slug)}/upload`, {
    method: "POST",
    body: { fieldId, fileName, contentType, size: file.size },
  });
  if (!res.ok || !res.data?.signedUrl || !res.data?.path) return { error: res.data?.error || null };
  const ok = await putWithProgress(res.data.signedUrl, file, contentType, onProgress);
  if (!ok) return { error: null };
  return { file: { name: fileName, path: res.data.path, size: file.size, type: contentType } };
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// True when `file` matches an accept string like "image/*,.pdf".
export function matchesAccept(file, accept) {
  const list = String(accept || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  const name = String(file.name || "").toLowerCase();
  const type = String(file.type || "").toLowerCase();
  return list.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}
