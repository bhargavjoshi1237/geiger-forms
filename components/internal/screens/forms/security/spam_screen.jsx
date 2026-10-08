"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { useForms } from "@/lib/hooks/use-forms";
import { useResponses } from "@/lib/hooks/use-responses";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { ChecklistItem, OnOff, ACCESS_SECTION } from "./security_shared";

// Turnstile's public key is inlined at build time, so the client can tell whether captcha is wired up.
const CAPTCHA_READY = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

// Spam & abuse overview: per-form protections plus flagged-response counts.
export function SpamScreen() {
  const { forms, loading: formsLoading, error, refresh } = useForms();
  const { responses, loading: responsesLoading } = useResponses();
  const { openForm, setView } = useWorkspaceUrl();
  const [search, setSearch] = useState("");

  const spamByForm = useMemo(() => {
    const map = new Map();
    for (const r of responses) if (r.status === "Spam") map.set(r.formId, (map.get(r.formId) || 0) + 1);
    return map;
  }, [responses]);

  const stats = useMemo(() => {
    const spamTotal = [...spamByForm.values()].reduce((a, b) => a + b, 0);
    return [
      { label: "Honeypot on", value: `${forms.filter((f) => f.settings?.spam?.honeypot).length}/${forms.length}` },
      { label: "Captcha on", value: `${forms.filter((f) => f.settings?.spam?.captcha).length}/${forms.length}`, footer: CAPTCHA_READY ? "Turnstile configured" : "Turnstile keys missing" },
      { label: "Duplicate checks", value: String(forms.filter((f) => f.settings?.duplicates?.enabled).length), footer: "Forms flagging or blocking repeats" },
      { label: "Flagged as spam", value: String(spamTotal), footer: responses.length ? `${Math.round((spamTotal / responses.length) * 100)}% of responses` : "No responses yet" },
    ];
  }, [forms, responses.length, spamByForm]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? forms.filter((f) => (f.name || "").toLowerCase().includes(q)) : forms;
  }, [forms, search]);
  const pager = usePagination(filtered, { resetKey: search });

  const columns = [
    { key: "name", header: "Form", render: (f) => <span className="block max-w-60 truncate font-medium text-foreground">{f.name}</span> },
    { key: "honeypot", header: "Honeypot", render: (f) => <OnOff on={!!f.settings?.spam?.honeypot} /> },
    { key: "captcha", header: "Captcha", render: (f) => <OnOff on={!!f.settings?.spam?.captcha} /> },
    {
      key: "rate",
      header: "Rate limit",
      render: (f) => {
        const n = Number(f.settings?.spam?.rateLimit) || 0;
        return <span className="tabular-nums text-xs text-text-secondary">{n ? `${n} per IP window` : "Unlimited"}</span>;
      },
    },
    {
      key: "dupes",
      header: "Duplicates",
      render: (f) =>
        f.settings?.duplicates?.enabled ? (
          <Badge variant={f.settings.duplicates.action === "block" ? "danger" : "warning"}>
            {f.settings.duplicates.action === "block" ? "Block" : "Flag"} · {f.settings.duplicates.windowDays}d
          </Badge>
        ) : (
          <OnOff on={false} />
        ),
    },
    { key: "spam", header: "Spam", align: "right", render: (f) => <span className="tabular-nums">{spamByForm.get(f.id) || 0}</span> },
    {
      key: "configure",
      header: "",
      align: "right",
      render: (f) => (
        <Button variant="outline" size="sm" onClick={() => openForm(f.id, ACCESS_SECTION)}>
          Configure
        </Button>
      ),
    },
  ];

  const header = (
    <ScreenHeader
      title="Spam & Abuse"
      description="Bot traps, captcha, rate limits, and duplicate detection across every form."
      actions={
        <Button variant="outline" onClick={() => setView("Responses")}>
          Review responses
        </Button>
      }
    />
  );

  if (formsLoading || responsesLoading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading protections" />
      </MainScreenWrapper>
    );
  }
  if (error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Forms couldn't be loaded." onRetry={refresh} />
      </MainScreenWrapper>
    );
  }

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search forms…" />
      </Toolbar>
      <div className="space-y-5">
        <DataTable
          columns={columns}
          data={pager.pageItems}
          getRowKey={(f) => f.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              {forms.length ? (
                <EmptyState
                  icon={FileText}
                  title="No forms match your search"
                  description="Try a different form name."
                  action={
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <EmptyState icon={FileText} title="No forms yet" description="Spam protections are configured per form." />
              )}
            </div>
          }
        />
        <ListPagination {...pager} itemLabel="forms" />
      </div>
      <SectionCard title="How each layer works">
        <ul className="space-y-4">
          <ChecklistItem done title="Honeypot">
            A hidden field bots fill in and people never see. Submissions that fill it are silently dropped. On by default.
          </ChecklistItem>
          <ChecklistItem done={CAPTCHA_READY} title="Captcha (Cloudflare Turnstile)">
            {CAPTCHA_READY
              ? "Turnstile is configured; enable it per form to challenge suspicious traffic."
              : "Needs NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in the environment before the per-form toggle has any effect."}
          </ChecklistItem>
          <ChecklistItem done title="Rate limiting">
            Caps submissions per hashed IP within a short window, enforced server-side. Over-limit requests get a friendly retry message.
          </ChecklistItem>
          <ChecklistItem done title="Duplicate detection">
            Matches chosen fields (for example email) within a window and either flags the new response or blocks it.
          </ChecklistItem>
          <ChecklistItem done title="Spam status">
            Anything you mark as Spam in the inbox is excluded from analytics and conversion.
          </ChecklistItem>
        </ul>
      </SectionCard>
    </MainScreenWrapper>
  );
}

export default SpamScreen;
