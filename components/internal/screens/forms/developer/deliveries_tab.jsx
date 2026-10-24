"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Loader2, RefreshCw, RotateCcw, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { DataTable, EmptyState, LoadingArea, SearchInput, StatusPill, Toolbar } from "@geiger/ui/screen-kit";
import { ErrorState } from "../screen-shell";
import { callApi } from "@/lib/forms/api";
import { FormPicker } from "@/components/internal/screens/forms/analytics/analytics_ui";
import { DELIVERY_STATE_MAP } from "@/components/internal/screens/forms/forms/constants";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";

const formatMs = (ms) => (ms == null ? "" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

// Re-sends a delivery's original payload with a fresh signature and hands the updated delivery to `onReplayed`.
export function ReplayButton({ formId, delivery, onReplayed, compact = false }) {
  const [busy, setBusy] = useState(false);
  if (delivery.event === "test") return null;
  const replay = async () => {
    setBusy(true);
    const res = await callApi(`/api/forms/${formId}/deliveries/${delivery.id}/replay`, { method: "POST" });
    setBusy(false);
    if (!res.ok) return toast.error(res.data?.error || "Couldn't replay the delivery.");
    const next = res.data.delivery;
    onReplayed(next);
    if (next.ok) toast.success(`Delivered${next.statusCode ? ` (HTTP ${next.statusCode})` : ""}`);
    else toast.error(`Replay failed: ${next.error || "no response"}`);
  };
  const hint = delivery.replayable ? "Re-send this delivery's original payload" : "The payload is no longer stored (kept for 30 days)";
  const icon = busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />;
  return (
    <span title={hint} className="inline-flex">
      {compact ? (
        <Button type="button" size="icon" variant="ghost" aria-label="Replay delivery" onClick={replay} disabled={busy || !delivery.replayable} className="h-7 w-7 text-muted-foreground hover:bg-surface-active hover:text-foreground">
          {icon}
        </Button>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={replay} disabled={busy || !delivery.replayable}>
          {icon} Replay
        </Button>
      )}
    </span>
  );
}

// Attempt count with a popover of each attempt's outcome and duration.
function AttemptsCell({ delivery: d }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="xs" aria-label={`Show ${d.attemptCount} attempts`} className="gap-1.5 px-2 text-xs text-text-secondary hover:bg-surface-active hover:text-foreground">
          <History className="h-3.5 w-3.5" /> {d.attemptCount}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 border-border bg-surface-subtle p-0">
        {d.attempts.length ? (
          <div className="max-h-72 divide-y divide-border overflow-y-auto">
            {[...d.attempts].reverse().map((a) => (
              <div key={`${a.n}-${a.at}`} className="flex items-start gap-3 px-3 py-2.5 text-xs">
                <span className="w-6 shrink-0 font-mono text-text-tertiary">#{a.n}</span>
                <div className="min-w-0 flex-1">
                  <p className={a.status >= 200 && a.status < 300 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                    {a.error || `HTTP ${a.status}`}
                    {a.replay ? <span className="text-text-tertiary"> · replay</span> : null}
                  </p>
                  <p className="text-text-tertiary">{new Date(a.at).toLocaleString()}</p>
                </div>
                <span className="shrink-0 tabular-nums text-text-tertiary">{formatMs(a.ms)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-2.5 text-xs text-text-secondary">The first attempt is in progress.</p>
        )}
        {d.state === "retrying" && d.nextRetryAt ? (
          <p className="border-t border-border px-3 py-2.5 text-xs text-text-secondary">
            Retries after {new Date(d.nextRetryAt).toLocaleString()}, at the next background sweep (within minutes while webhooks are flowing, otherwise daily), or as soon as the endpoint accepts a new delivery.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

// Per-form webhook delivery log from GET /api/forms/:id/deliveries.
export function DeliveriesTab({ forms }) {
  const [picked, setPicked] = useState(null);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState({ key: null, rows: [], error: null });
  const [search, setSearch] = useState("");
  const formId = picked && forms.some((f) => f.id === picked) ? picked : forms.find((f) => (f.settings?.webhooks || []).length)?.id || forms[0]?.id || null;
  const loadKey = `${formId}|${reloads}`;

  useEffect(() => {
    if (!formId) return undefined;
    let alive = true;
    callApi(`/api/forms/${formId}/deliveries`).then(({ ok, data }) => {
      if (!alive) return;
      setResult({
        key: loadKey,
        rows: ok ? data?.deliveries || [] : [],
        error: ok ? null : data?.error || "Couldn't load deliveries.",
      });
    });
    return () => {
      alive = false;
    };
  }, [formId, loadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return result.rows;
    return result.rows.filter((d) => [d.event, d.url, d.statusCode, d.state, d.error].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [result.rows, search]);
  const pager = usePagination(filtered, { resetKey: `${formId}|${search}` });

  if (!formId) {
    return (
      <div className="rounded-xl border border-border bg-surface-subtle">
        <EmptyState icon={Webhook} title="No forms yet" description="Webhook deliveries are logged per form." />
      </div>
    );
  }

  const replaced = (next) => setResult((r) => ({ ...r, rows: r.rows.map((d) => (d.id === next.id ? next : d)) }));
  const columns = [
    {
      key: "when",
      header: "When",
      render: (d) => <span className="whitespace-nowrap text-xs text-text-tertiary">{d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}</span>,
    },
    { key: "event", header: "Event", render: (d) => <code className="font-mono text-xs text-foreground">{d.event}</code> },
    { key: "url", header: "Endpoint", render: (d) => <span className="block max-w-72 truncate text-xs text-text-secondary">{d.url}</span> },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <div className="flex items-center gap-2">
          <StatusPill status={d.state} map={DELIVERY_STATE_MAP} />
          {d.statusCode ? <span className="font-mono text-xs text-text-tertiary">{d.statusCode}</span> : null}
        </div>
      ),
    },
    { key: "attempts", header: "Attempts", render: (d) => <AttemptsCell delivery={d} /> },
    { key: "error", header: "Error", render: (d) => <span className="block max-w-64 truncate text-xs text-red-600 dark:text-red-400">{d.error}</span> },
    { key: "actions", header: "", align: "right", render: (d) => <ReplayButton formId={formId} delivery={d} onReplayed={replaced} /> },
  ];

  return (
    <div className="space-y-4">
      <Toolbar>
        <FormPicker forms={forms} value={formId} onChange={setPicked} />
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search events, endpoints, errors…" />
          <Button variant="outline" size="sm" onClick={() => setReloads((n) => n + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </Toolbar>
      {result.key !== loadKey ? (
        <LoadingArea panel size={40} label="Loading deliveries" />
      ) : result.error ? (
        <ErrorState description={result.error} onRetry={() => setReloads((n) => n + 1)} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(d) => d.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                {result.rows.length ? (
                  <EmptyState
                    icon={Webhook}
                    title="No deliveries match your search"
                    description="Try a different event, endpoint, status, or error."
                    action={
                      <Button variant="outline" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState icon={Webhook} title="No deliveries yet" description="Deliveries appear here once this form has a webhook and receives a response." />
                )}
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="deliveries" />
        </div>
      )}
    </div>
  );
}
