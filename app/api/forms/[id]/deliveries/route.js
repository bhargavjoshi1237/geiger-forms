import { fail, ok } from "@/lib/server/http";
import { listDeliveries } from "@/lib/server/webhooks";
import { requireForm } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Recent outbound webhook deliveries for a form (newest first), with their attempt logs.
export async function GET(request, { params }) {
  const { id } = await params;
  const { form, error } = await requireForm(id, "forms.form.edit");
  if (error) return error;
  const deliveries = await listDeliveries(form.id);
  return deliveries ? ok({ deliveries }) : fail("Couldn't load deliveries.", 500);
}
