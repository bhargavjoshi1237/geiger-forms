import { fail, forbidden, ok } from "@/lib/server/http";
import { userCan } from "@/lib/server/auth";
import { replayDelivery } from "@/lib/server/webhooks";
import { requireForm } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Re-sends a logged delivery's original payload with a fresh signature and returns the updated delivery; the payload holds response data, so it needs responses access too.
export async function POST(request, { params }) {
  const { id, deliveryId } = await params;
  const { user, form, error } = await requireForm(id, "forms.form.edit");
  if (error) return error;
  if (!(await userCan(user, form, "forms.responses.view"))) return forbidden();
  const result = await replayDelivery(form, deliveryId);
  return result.error ? fail(result.error, result.status) : ok({ delivery: result.delivery });
}
