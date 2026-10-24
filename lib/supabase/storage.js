"use client";

import { createClient, isSupabaseConfigured } from "./client";

// Builder images (picture choices, image blocks) in the public `forms-media` bucket under <form-uuid>/.
// Storage RLS lets only the form's editors write; reads are public, so the public URL is stored in the field config.

const MEDIA_BUCKET = "forms-media";
export const MEDIA_MAX_MB = 5;
export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

const MAX_EDGE = 1600;
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

// Downscales large still images to MAX_EDGE px WebP; anything already small (or animated) is uploaded as-is.
async function downscale(file) {
  if (!RESIZABLE.has(file.type) || file.size < 400 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

// Uploads one image for `formId`; returns its public URL, or null (unconfigured, rejected type/size, RLS or network).
export async function uploadFormImage(formId, file) {
  if (!formId || !file || !isSupabaseConfigured()) return null;
  if (!MEDIA_TYPES.includes(file.type) || file.size > MEDIA_MAX_MB * 1024 * 1024) return null;
  try {
    const body = await downscale(file);
    const ext = (body.type || file.type).split("/")[1];
    const path = `${formId}/${crypto.randomUUID()}.${ext}`;
    const bucket = createClient().storage.from(MEDIA_BUCKET);
    const { error } = await bucket.upload(path, body, { cacheControl: "31536000", upsert: false, contentType: body.type || file.type });
    if (error) {
      console.error("[storage.uploadFormImage]", error.message);
      return null;
    }
    return bucket.getPublicUrl(path).data?.publicUrl ?? null;
  } catch (e) {
    console.error("[storage.uploadFormImage]", e);
    return null;
  }
}
