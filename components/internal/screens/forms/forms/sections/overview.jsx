"use client";

import { useEffect, useMemo, useState } from "react";
import { Code, ExternalLink, Eye, Globe, MessageSquare, Pencil, Share2 } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { SectionCard, StatsBar, StatusPill } from "@geiger/ui/screen-kit";
import { listFormEvents } from "@/lib/supabase/responses";
import { FORM_STATUS_MAP, formatCount } from "../constants";
import { CopyField, Detail, Note, OUTLINE_BTN, Stack, publicFormUrl, useOrigin } from "./kit";
import { QrCode } from "./qr_code";

const DAY = 86_400_000;

// Snapshot of one form: funnel stats (last 30 days), public link + QR, quick actions.
export function OverviewSection({ form, openBuilder, preview, navigate, onOpenResponses }) {
  const origin = useOrigin();
  const url = publicFormUrl(origin, form.slug);
  const [events, setEvents] = useState(null);

  useEffect(() => {
    let alive = true;
    const since = new Date(Date.now() - 30 * DAY).toISOString();
    listFormEvents({ formIds: [form.id], since })
      .then((rows) => alive && setEvents(rows))
      .catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, [form.id]);

  const stats = useMemo(() => {
    const count = (type) => new Set((events || []).filter((e) => e.type === type).map((e) => e.sessionId || e.createdAt)).size;
    const views = count("view");
    const starts = count("start");
    const submits = count("submit");
    const rate = starts ? `${Math.round((submits / starts) * 100)}%` : "—";
    return [
      { label: "Responses", value: formatCount(form.responses), footer: "All time" },
      { label: "Views", value: events ? formatCount(views) : null, footer: "Last 30 days" },
      { label: "Starts", value: events ? formatCount(starts) : null, footer: "Last 30 days" },
      { label: "Completion", value: events ? rate : null, footer: "Start → submit, 30 days" },
    ];
  }, [events, form.responses]);

  const actions = [
    { label: "Open builder", icon: Pencil, onClick: openBuilder },
    { label: "Preview", icon: ExternalLink, onClick: preview },
    { label: "Responses", icon: MessageSquare, onClick: onOpenResponses },
    { label: "Share", icon: Share2, onClick: () => navigate("share") },
    { label: "Embed", icon: Code, onClick: () => navigate("embed") },
    { label: "Publish", icon: Globe, onClick: () => navigate("publish") },
  ].filter((a) => a.onClick);

  return (
    <Stack>
      <StatsBar stats={stats} />

      <SectionCard title="Public link" description="Share this link, or scan the QR code, to open the form.">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-3">
            <CopyField value={url} label="Link copied" />
            {form.status !== "Published" ? (
              <Note tone="warning" icon={Eye}>
                This form is {form.status === "Archived" ? "archived" : "still a draft"} — respondents see a closed notice until you publish it.
              </Note>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button key={a.label} type="button" variant="outline" size="sm" onClick={a.onClick} className={OUTLINE_BTN}>
                  <a.icon className="h-3.5 w-3.5" /> {a.label}
                </Button>
              ))}
            </div>
          </div>
          <QrCode text={url} size={120} fileName={`${form.slug}-qr.png`} />
        </div>
      </SectionCard>

      <SectionCard title="At a glance">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Status" value={<StatusPill status={form.status} map={FORM_STATUS_MAP} />} />
          <Detail label="Category" value={form.category || "—"} />
          <Detail label="Fields" value={`${form.fields} collecting input`} />
          <Detail label="Last edited" value={form.lastEdited || "—"} />
          <Detail label="Published" value={form.publishedAt ? new Date(form.publishedAt).toLocaleDateString() : "Not yet"} />
          <Detail label="Tags" value={form.tags?.length ? form.tags.map((t) => `#${t}`).join("  ") : "—"} />
          <Detail className="sm:col-span-2" label="Description" value={form.description || "—"} />
        </dl>
      </SectionCard>
    </Stack>
  );
}
