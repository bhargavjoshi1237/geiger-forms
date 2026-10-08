import { cache } from "react";
import { FormFillerContent } from "@/components/forms/form-filler-content";

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

// Server-side public payload (same shape as GET /api/public/forms/:slug). `missing` only when the loader really ran; null falls back to a client fetch.
const getPayload = cache(async (slug, signedToken, variantId) => {
  try {
    const [mod, admin] = await Promise.all([import("@/lib/server/public-form"), import("@/lib/server/supabase-admin")]);
    if (typeof mod.loadPublicForm !== "function" || !admin.isAdminConfigured?.()) return null;
    const payload = await mod.loadPublicForm(slug, { signedToken: signedToken || undefined, variantId: variantId || undefined });
    if (!payload) return { missing: true };
    return payload.ok !== false && payload.form ? JSON.parse(JSON.stringify(payload)) : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params, searchParams }) {
  const { formId } = await params;
  const sp = (await searchParams) || {};
  const payload = await getPayload(formId, first(sp.t), first(sp.variant));
  const form = payload?.form;
  const title = payload?.variant?.title || form?.title || (payload?.missing ? "Form not available" : "Form");
  const description = (payload?.variant?.description ?? form?.description) || "Fill out this form on Geiger Forms.";
  const image = form?.settings?.coverUrl || undefined;
  return {
    title: `${title} - Geiger Forms`,
    description,
    robots: payload?.gate === "signed" || payload?.gate === "password" ? { index: false, follow: false } : undefined,
    openGraph: { title, description, type: "website", siteName: "Geiger Forms", images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

// The [formId] segment carries the form slug.
export default async function FormFillerPage({ params, searchParams }) {
  const { formId } = await params;
  const sp = (await searchParams) || {};
  const plainParams = JSON.parse(JSON.stringify(sp));
  const payload = await getPayload(formId, first(sp.t), first(sp.variant));
  return (
    <FormFillerContent
      slug={formId}
      initialPayload={payload?.form ? payload : null}
      initialStatus={payload?.missing ? "missing" : undefined}
      searchParams={plainParams}
    />
  );
}
