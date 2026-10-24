"use client";

import { useMemo, useState } from "react";
import { Webhook } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { DataTable, EmptyState, SearchInput, SectionCard } from "@geiger/ui/screen-kit";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { CodeBlock, useAppBase } from "./code_block";

const METHOD_VARIANT = { GET: "info", POST: "success" };

const REST_ENDPOINTS = [
  { method: "GET", path: "/api/v1/forms", auth: "API key (read)", desc: "List this project's forms." },
  { method: "GET", path: "/api/v1/forms/:id", auth: "API key (read)", desc: "One form with its field definitions." },
  { method: "GET", path: "/api/v1/forms/:id/responses?since=&limit=&cursor=", auth: "API key (read)", desc: "Paginated responses, oldest first; pass nextCursor back as cursor to continue. Encrypted answers come back null and are listed in encryptedFields." },
  { method: "POST", path: "/api/v1/forms/:id/responses", auth: "API key (write)", desc: "Headless submit (201) through the same validation, scoring, automation, and webhook pipeline. Skips respondent gates and spam checks; the response limit still applies." },
  { method: "GET", path: "/api/public/forms/:slug", auth: "Public", desc: "Published form schema and public settings for custom renderers." },
  { method: "POST", path: "/api/public/forms/:slug/submit", auth: "Public", desc: "Submit answers from your own front-end (honeypot, captcha, and rate limits apply)." },
  { method: "GET", path: "/api/public/forms/:slug/results", auth: "Public", desc: "Aggregated poll results when the form shows results publicly." },
];

export const WEBHOOK_EVENTS = [
  { event: "response.created", when: "A new response is submitted (after validation, scoring, and automations)." },
  { event: "response.updated", when: "A respondent edits their response or the team changes its status, tags, or assignee." },
  { event: "response.approved", when: "The final approval step approves a response." },
];

const WEBHOOK_HEADERS = [
  { header: "X-Geiger-Event", meaning: "The event name, e.g. response.created." },
  { header: "X-Geiger-Delivery", meaning: "Stable delivery id, identical on every retry and replay. Store it and skip ids you have already processed." },
  { header: "X-Geiger-Signature", meaning: "sha256=<hex HMAC-SHA256 of the raw body> with the endpoint's secret. Each attempt is re-signed with a fresh createdAt, so you can reject stale timestamps." },
];

function EndpointTable() {
  const columns = [
    { key: "method", header: "Method", render: (e) => <Badge variant={METHOD_VARIANT[e.method]}>{e.method}</Badge> },
    { key: "path", header: "Endpoint", render: (e) => <code className="font-mono text-xs text-foreground">{e.path}</code> },
    { key: "auth", header: "Auth", render: (e) => <span className="whitespace-nowrap text-xs text-text-secondary">{e.auth}</span> },
    { key: "desc", header: "Description", render: (e) => <span className="text-xs text-text-secondary">{e.desc}</span> },
  ];
  return <DataTable columns={columns} data={REST_ENDPOINTS} getRowKey={(e) => `${e.method} ${e.path}`} />;
}

// REST v1 + public endpoints with curl examples; `frontend` adds data front-end guidance.
export function RestTab({ frontend = false }) {
  const url = useAppBase();
  return (
    <div className="space-y-4">
      {frontend ? (
        <SectionCard title="Build your own data front-end">
          <p className="text-sm text-text-secondary">
            Render responses in your own dashboard, portal, or site: read them server-side with a read-scoped key (never ship keys to the browser), or render forms yourself from the public schema endpoint and post answers to the public submit endpoint.
          </p>
        </SectionCard>
      ) : null}
      <EndpointTable />
      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock
          label="List responses"
          code={`curl "${url("/api/v1/forms/FORM_ID/responses?limit=50&since=2026-10-01")}" \\\n  -H "Authorization: Bearer gf_your_key"`}
        />
        <CodeBlock
          label="Headless submit"
          code={`curl -X POST "${url("/api/v1/forms/FORM_ID/responses")}" \\\n  -H "Authorization: Bearer gf_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"answers": {"FIELD_ID": "value"}}'`}
        />
        <CodeBlock label="Public schema" code={`curl "${url("/api/public/forms/your-form-slug")}"`} />
        <CodeBlock
          label="Response (example)"
          code={`{\n  "ok": true,\n  "responses": [\n    { "id": "…", "status": "Complete", "answers": { "FIELD_ID": "value" },\n      "encryptedFields": ["SSN_FIELD"], "score": 82 }\n  ],\n  "nextCursor": "…"\n}`}
        />
      </div>
      <p className="text-xs text-text-tertiary">Every response is JSON <code>{"{ ok, error? }"}</code>; failures return a non-2xx status with an error message (401 means a missing or revoked key).</p>
    </div>
  );
}

const VERIFY_SNIPPET = `import crypto from "node:crypto";

// Express-style handler: verify before trusting the payload.
export function verify(rawBody, header, secret) {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header || "");
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post("/hooks/forms", express.raw({ type: "application/json" }), (req, res) => {
  if (!verify(req.body, req.get("X-Geiger-Signature"), process.env.FORMS_WEBHOOK_SECRET)) {
    return res.status(401).end();
  }
  // Retries and replays reuse the delivery id: acknowledge duplicates without reprocessing.
  if (alreadyProcessed(req.get("X-Geiger-Delivery"))) return res.status(200).end();
  const { event, data } = JSON.parse(req.body);
  res.status(200).end();
});`;

const PAYLOAD_SNIPPET = `{
  "event": "response.created",
  "createdAt": "2026-10-08T12:00:01Z",
  "data": {
    "form": { "id": "…", "slug": "customer-onboarding", "title": "Customer Onboarding" },
    "response": {
      "id": "…",
      "status": "Complete",
      "answers": { "FIELD_ID": "value" },
      "respondent": { "name": "Ada Lovelace", "email": "ada@example.com" },
      "score": 82,
      "submittedAt": "2026-10-08T12:00:00Z"
    }
  }
}`;

// Webhook event catalog, payload, and HMAC signature verification.
export function WebhooksTab({ forms, onConfigure }) {
  const withHooks = useMemo(() => forms.filter((f) => (f.settings?.webhooks || []).length), [forms]);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return withHooks;
    return withHooks.filter((f) => [f.name, ...f.settings.webhooks.map((w) => w.url)].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [withHooks, search]);
  const pager = usePagination(filtered, { resetKey: search });
  const eventColumns = [
    { key: "event", header: "Event", render: (e) => <code className="font-mono text-xs text-foreground">{e.event}</code> },
    { key: "when", header: "Fires when", render: (e) => <span className="text-xs text-text-secondary">{e.when}</span> },
  ];
  const headerColumns = [
    { key: "header", header: "Header", render: (h) => <code className="whitespace-nowrap font-mono text-xs text-foreground">{h.header}</code> },
    { key: "meaning", header: "Meaning", render: (h) => <span className="text-xs text-text-secondary">{h.meaning}</span> },
  ];
  return (
    <div className="space-y-4">
      <DataTable columns={eventColumns} data={WEBHOOK_EVENTS} getRowKey={(e) => e.event} />
      <DataTable columns={headerColumns} data={WEBHOOK_HEADERS} getRowKey={(h) => h.header} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock label="Payload (example)" code={PAYLOAD_SNIPPET} />
        <CodeBlock label="Verify the signature (Node)" code={VERIFY_SNIPPET} />
      </div>
      <SectionCard
        title="Delivery & retries"
        description="Answer with any 2xx within 8 seconds. Timeouts, network errors, 408, 425, 429 and 5xx responses are retried twice within seconds, then with exponential backoff from 5 minutes to a day (honoring Retry-After) for up to 8 attempts; other responses fail at once. Backoff retries run at the first background sweep after they fall due: within minutes while webhooks are flowing, otherwise daily. Every attempt is logged under Deliveries, where deliveries can be replayed for 30 days, and the form owner is alerted when one fails for good."
        action={withHooks.length ? <SearchInput value={search} onChange={setSearch} placeholder="Search forms or endpoints…" /> : null}
        bodyPadding={false}
      >
        {withHooks.length && !filtered.length ? (
          <EmptyState
            icon={Webhook}
            title="No webhooks match your search"
            description="Try a different form name or endpoint URL."
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            }
          />
        ) : withHooks.length ? (
          <div className="divide-y divide-border">
            {pager.pageItems.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                  <p className="truncate text-xs text-text-secondary">{f.settings.webhooks.map((w) => w.url).join(", ")}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onConfigure(f.id, "integrations")}>
                  Configure
                </Button>
              </div>
            ))}
            <ListPagination {...pager} itemLabel="forms" className="px-5 py-3" />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary">No form has a webhook yet. Add endpoints in a form&apos;s Integrations section.</p>
            {forms[0] ? (
              <Button variant="outline" size="sm" onClick={() => onConfigure(forms[0].id, "integrations")}>
                Add a webhook
              </Button>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

const EMBED_OPTIONS = [
  { attr: "data-mode", modes: "All", desc: "inline (default), popup, slider, side-tab, popover or fullscreen." },
  { attr: "data-trigger", modes: "Dialogs", desc: "click (default), delay, scroll or exit; combine with commas, e.g. click,exit. Exit intent is desktop-only." },
  { attr: "data-delay · data-scroll", modes: "Dialogs", desc: "Seconds before a delay trigger (5) and the scroll depth % for a scroll trigger (50)." },
  { attr: "data-frequency", modes: "Dialogs", desc: "Caps automatic opens: always (default), session, or days with data-frequency-days (7)." },
  { attr: "data-hide-after-submit", modes: "Dialogs", desc: "After a response, stops automatic opens and hides the side tab or bubble." },
  { attr: "data-auto-close", modes: "Dialogs", desc: "Seconds after a submission before the dialog closes." },
  { attr: "data-open-selector", modes: "Dialogs", desc: "CSS selector for your own elements that open the form instead of a generated button." },
  { attr: "data-button-text · data-button-color", modes: "Dialogs", desc: "Label and hex colour of the button, side tab or bubble (the bubble label is its screen-reader name)." },
  { attr: "data-position", modes: "Slider, side tab, popover", desc: "right (default) or left." },
  { attr: "data-width", modes: "Popup, slider, popover", desc: "Panel width in px (720, 420, 380); full width on phones." },
  { attr: "data-param-<key>", modes: "All", desc: "Prefills the field with that prefill key, e.g. data-param-plan=\"pro\" for a hidden field." },
  { attr: "data-inherit-params", modes: "All", desc: "Forwards your page's URL parameters: all, or a comma list of keys. UTM tags are always forwarded." },
  { attr: "data-title", modes: "All", desc: "Accessible name of the iframe and dialog." },
];

function EmbedOptionsTable() {
  const columns = [
    { key: "attr", header: "Attribute", render: (o) => <code className="whitespace-nowrap font-mono text-xs text-foreground">{o.attr}</code> },
    { key: "modes", header: "Applies to", render: (o) => <span className="whitespace-nowrap text-xs text-text-secondary">{o.modes}</span> },
    { key: "desc", header: "Description", render: (o) => <span className="text-xs text-text-secondary">{o.desc}</span> },
  ];
  return <DataTable columns={columns} data={EMBED_OPTIONS} getRowKey={(o) => o.attr} />;
}

// Embed snippets for the hosted form page.
export function EmbedTab({ forms, onConfigure }) {
  const url = useAppBase();
  const slug = forms.find((f) => f.status === "Published")?.slug || forms[0]?.slug || "your-form-slug";
  const formUrl = url(`/form/${slug}`);
  const script = `<script src="${url("/embed.js")}" async></script>`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock label="Inline (script)" code={`<div data-geiger-form="${slug}" data-param-plan="pro"></div>\n${script}`} />
        <CodeBlock
          label="Slider on exit intent"
          code={`<div\n  data-geiger-form="${slug}"\n  data-mode="slider"\n  data-trigger="exit"\n  data-frequency="days"\n  data-frequency-days="14"\n  data-hide-after-submit\n></div>\n${script}`}
        />
        <CodeBlock label="Popover bubble" code={`<div\n  data-geiger-form="${slug}"\n  data-mode="popover"\n  data-button-color="#6366f1"\n  data-auto-close="3"\n></div>\n${script}`} />
        <CodeBlock
          label="JavaScript API"
          code={`// mode: popup | slider | popover | fullscreen; returns { close }\nconst dialog = GeigerForms.open("${slug}", {\n  mode: "fullscreen",\n  params: { email: "ada@example.com" },\n  autoClose: 3,\n});\n\ndocument.addEventListener("geiger-form:submitted", (event) => {\n  const { slug, responseId, outcome } = event.detail;\n});\n\n// Mount embeds added after page load\nGeigerForms.mount();`}
        />
      </div>
      <EmbedOptionsTable />
      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock label="Inline iframe" code={`<iframe\n  src="${formUrl}"\n  title="Form"\n  style="width:100%;min-height:720px;border:0"\n  loading="lazy"\n></iframe>`} />
        <CodeBlock label="Link or button" code={`<a href="${formUrl}" target="_blank" rel="noopener">\n  Open the form\n</a>`} />
        <CodeBlock label="Prefill & attribution" code={`${formUrl}?email=ada@example.com&utm_source=newsletter&utm_campaign=spring`} />
        <CodeBlock label="Popup (no script needed)" code={`<dialog id="gf"><iframe src="${formUrl}" style="width:min(640px,90vw);height:80vh;border:0"></iframe></dialog>\n<button onclick="document.getElementById('gf').showModal()">Give feedback</button>`} />
      </div>
      <p className="text-xs text-text-tertiary">
        Prefill keys come from each field&apos;s prefill key (hidden fields included). Dialog embeds load the form on first open and only exchange messages with your page&apos;s origin. Per-form embed options and QR codes live in the form&apos;s Embed section.
        {forms[0] ? (
          <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={() => onConfigure(forms[0].id, "embed")}>
            Open Embed settings
          </Button>
        ) : null}
      </p>
    </div>
  );
}
