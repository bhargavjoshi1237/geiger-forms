import { ok, unauthorized } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/auth";
import { isEncryptionConfigured, isLinkSigningConfigured } from "@/lib/server/crypto";
import { isEmailConfigured } from "@/lib/server/email";
import { isStripeConfigured } from "@/lib/server/stripe";
import { isAdminConfigured } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Which env-gated services this deployment has keys for — booleans only, never values — for any signed-in member.
export async function GET() {
  if (!(await getSessionUser())) return unauthorized();
  return ok({
    services: {
      serviceRole: isAdminConfigured(),
      email: isEmailConfigured(),
      payments: isStripeConfigured(),
      paymentWebhooks: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      captcha: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
      encryption: isEncryptionConfigured(),
      signedLinks: isLinkSigningConfigured(),
      cron: Boolean(process.env.CRON_SECRET),
    },
  });
}
