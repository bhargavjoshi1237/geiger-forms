"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Webhook } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { DataTable, EmptyState, LoadingArea, SearchInput, Toolbar } from "@geiger/ui/screen-kit";
import { ErrorState } from "../screen-shell";
import { callApi } from "@/lib/forms/api";
import { FormPicker } from "@/components/internal/screens/forms/analytics/analytics_ui";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";

// Tolerates both raw rows (snake_case) and camelCase delivery payloads.
function normalizeDelivery(d) {
  return {
    id: d.id,
    event: d.event,
    url: d.url,
    statusCode: d.status_code ?? d.statusCode ?? null,
    ok: Boolean(d.ok),
    error: d.error || "",
    responseId: d.response_id ?? d.responseId ?? null,
    createdAt: d.created_at ?? d.createdAt,
  };
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
        rows: ok ? (data?.deliveries || []).map(normalizeDelivery) : [],
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
    return result.rows.filter((d) => [d.event, d.url, d.statusCode, d.error].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [result.rows, search]);
  const pager = usePagination(filtered, { resetKey: `${formId}|${search}` });

  if (!formId) {
    return (
      <div className="rounded-xl border border-border bg-surface-subtle">
        <EmptyState icon={Webhook} title="No forms yet" description="Webhook deliveries are logged per form." />
      </div>
    );
  }

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
      render: (d) => <Badge variant={d.ok ? "success" : "danger"}>{d.statusCode ? `${d.statusCode}` : d.ok ? "OK" : "Failed"}</Badge>,
    },
    { key: "error", header: "Error", render: (d) => <span className="block max-w-64 truncate text-xs text-red-400">{d.error}</span> },
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
                    description="Try a different event, endpoint, status code, or error."
                    action={
                      <Button variant="outline" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState icon={Webhook} title="No deliveries yet" description="Attempts appear here once this form has a webhook and receives a response." />
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
