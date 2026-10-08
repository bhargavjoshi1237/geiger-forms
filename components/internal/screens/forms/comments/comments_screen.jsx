"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessagesSquare, SearchX } from "lucide-react";
import { Button } from "@geiger/ui/button";
import {
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { ResponseDetailPanel } from "@/components/forms/response-detail-panel";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { listRecentComments } from "@/lib/supabase/comment_feed";
import { getResponse } from "@/lib/supabase/responses";
import { FormPicker } from "@/components/internal/screens/forms/analytics/analytics_ui";

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : String(name || "?").slice(0, 2)).toUpperCase();
}

// Recent internal comments across responses, with a jump into the response panel.
export function CommentsScreen() {
  const { forms, loading: formsLoading } = useForms();
  const { projectId } = useWorkspaceUrl();
  const [formId, setFormId] = useState("all");
  const [author, setAuthor] = useState("all");
  const [search, setSearch] = useState("");
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState({ key: null, rows: [], error: null });
  const [opening, setOpening] = useState(null);
  const [open, setOpen] = useState(null);
  const [now] = useState(() => Date.now());
  const loadKey = `${projectId || ""}|${reloads}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        return { rows: await listRecentComments({ projectId: projectId || undefined }), error: null };
      } catch (err) {
        console.error("[comments.feed]", err);
        return { rows: [], error: err };
      }
    })().then((next) => alive && setResult({ key: loadKey, ...next }));
    return () => {
      alive = false;
    };
  }, [projectId, loadKey]);

  const loading = formsLoading || result.key !== loadKey;
  const rows = result.rows;

  const authorOptions = useMemo(
    () => [{ value: "all", label: "All authors" }, ...[...new Set(rows.map((r) => r.author))].sort().map((a) => ({ value: a, label: a }))],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (formId !== "all" && r.formId !== formId) return false;
      if (author !== "all" && r.author !== author) return false;
      if (q && !`${r.body} ${r.respondent} ${r.formTitle}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, formId, author, search]);

  const pager = usePagination(filtered, { resetKey: `${search}|${formId}|${author}` });

  const stats = useMemo(() => {
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    return [
      { label: "Comments", value: rows.length.toLocaleString(), footer: "Most recent 300" },
      { label: "This week", value: String(rows.filter((r) => r.createdAt >= weekAgo).length) },
      { label: "Discussed responses", value: String(new Set(rows.map((r) => r.responseId)).size) },
      { label: "Contributors", value: String(new Set(rows.map((r) => r.author)).size) },
    ];
  }, [rows, now]);

  const openResponse = async (comment) => {
    setOpening(comment.id);
    try {
      const response = await getResponse(comment.responseId);
      if (!response) throw new Error("not found");
      setOpen(response);
    } catch (err) {
      console.error("[comments.open]", err);
      toast.error("That response is no longer available.");
    } finally {
      setOpening(null);
    }
  };

  const header = (
    <ScreenHeader
      title="Response Comments"
      description="Internal notes your team leaves on responses. Respondents never see them."
      actions={
        <Button variant="outline" onClick={() => setReloads((n) => n + 1)}>
          Refresh
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading comments" />
      </MainScreenWrapper>
    );
  }
  if (result.error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Comments couldn't be loaded." onRetry={() => setReloads((n) => n + 1)} />
      </MainScreenWrapper>
    );
  }

  const hasFilters = formId !== "all" || author !== "all" || search;

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FormPicker forms={forms} value={formId} onChange={setFormId} allowAll />
          <FilterDropdown value={author} onValueChange={setAuthor} options={authorOptions} height="h-9" />
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search comments…" />
      </Toolbar>

      {filtered.length ? (
        <div className="space-y-5">
          <SectionCard bodyPadding={false}>
            <ul className="divide-y divide-border">
              {pager.pageItems.map((c) => (
                <li key={c.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => openResponse(c)}
                    className="h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-none px-5 py-4 text-left font-normal hover:bg-surface-hover focus-visible:bg-surface-hover"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-card text-[11px] font-semibold text-muted-foreground">
                      {initials(c.author)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 text-xs">
                        <span className="font-medium text-foreground">{c.author}</span>
                        <span className="text-text-tertiary">on {c.respondent}&apos;s response to</span>
                        <span className="truncate text-text-secondary">{c.formTitle}</span>
                        <span className="ml-auto text-text-tertiary">{c.when}</span>
                      </span>
                      <span className="mt-1 block whitespace-pre-wrap text-sm text-foreground">{c.body}</span>
                    </span>
                    {opening === c.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-tertiary" /> : null}
                  </Button>
                </li>
              ))}
            </ul>
          </SectionCard>
          <ListPagination {...pager} itemLabel="comments" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-subtle">
          {hasFilters && rows.length ? (
            <EmptyState
              icon={SearchX}
              title="No comments match"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormId("all");
                    setAuthor("all");
                    setSearch("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={MessagesSquare} title="No comments yet" description="Open any response in the inbox to leave a note for your team." />
          )}
        </div>
      )}

      {open ? <ResponseDetailPanel response={open} onClose={() => setOpen(null)} /> : null}
    </MainScreenWrapper>
  );
}

export default CommentsScreen;
