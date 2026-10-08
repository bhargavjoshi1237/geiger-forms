import "server-only";
import { isEmail } from "@/lib/server/http";

// Transactional email through Resend's HTTP API. Env-guarded: without RESEND_API_KEY it logs and returns { sent: false }.

const DEFAULT_FROM = "Geiger Forms <forms@notifications.geiger.studio>";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal, client-safe HTML shell: paragraphs from plain text, optional CTA button and answer table.
export function renderEmail({ heading, text = "", cta, rows = [], footer }) {
  const paragraphs = String(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const table = rows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:14px">${rows
        .map(
          (r) =>
            `<tr><td style="padding:8px 12px 8px 0;color:#6b6b6b;vertical-align:top;width:40%;border-top:1px solid #e5e5e5">${escapeHtml(r.label)}</td><td style="padding:8px 0;vertical-align:top;border-top:1px solid #e5e5e5">${escapeHtml(r.value).replace(/\n/g, "<br>")}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const button = cta?.url
    ? `<p style="margin:20px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${escapeHtml(cta.label || "Open")}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:28px">
${heading ? `<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>` : ""}${paragraphs}${table}${button}
<p style="margin:24px 0 0;font-size:12px;color:#8a8a8a">${escapeHtml(footer || "Sent by Geiger Forms")}</p>
</div></body></html>`;
}

// Sends one email. `to` may be a string or array. Never throws.
export async function sendEmail({ to, subject, text = "", html, replyTo }) {
  const recipients = (Array.isArray(to) ? to : [to]).map((t) => String(t || "").trim()).filter(isEmail).slice(0, 50);
  if (!recipients.length) return { sent: false, error: "no_recipients" };
  if (!isEmailConfigured()) {
    console.info("[email] RESEND_API_KEY missing; skipped:", subject, "→", recipients.length, "recipient(s)");
    return { sent: false, error: "unconfigured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FORMS_EMAIL_FROM || DEFAULT_FROM,
        to: recipients,
        subject: String(subject || "").slice(0, 250),
        text,
        html: html || renderEmail({ text }),
        ...(replyTo && isEmail(replyTo) ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email.send]", res.status, detail.slice(0, 300));
      return { sent: false, error: `resend_${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { sent: true, id: data?.id ?? null };
  } catch (e) {
    console.error("[email.send]", e?.message);
    return { sent: false, error: "network" };
  }
}
