"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Checkbox } from "@geiger/ui/checkbox";
import { Input } from "@geiger/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import { DataTable, EmptyState, Field, LoadingArea, SearchInput } from "@geiger/ui/screen-kit";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { useCan } from "@/context/rbac-context";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/supabase/api_keys";
import { CodeBlock } from "./code_block";

const SCOPES = [
  { value: "read", label: "Read", hint: "List forms and fetch responses" },
  { value: "write", label: "Write", hint: "Submit responses headlessly (includes read)" },
];

function CreateKeyDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(["read"]);
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState(null);

  const close = (next) => {
    if (saving) return;
    if (!next) {
      setName("");
      setScopes(["read"]);
      setSecret(null);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name the key so you can recognise it later.");
      return;
    }
    if (!scopes.length) {
      toast.error("Pick at least one scope.");
      return;
    }
    setSaving(true);
    const created = await onCreate({ name: name.trim(), scopes });
    setSaving(false);
    if (created) setSecret(created);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{secret ? "Copy your API key" : "New API key"}</DialogTitle>
          <DialogDescription>
            {secret ? "This is the only time the full key is shown. Store it somewhere safe." : "Keys authenticate the REST v1 API for this project."}
          </DialogDescription>
        </DialogHeader>
        {secret ? (
          <CodeBlock code={secret} />
        ) : (
          <div className="grid gap-4">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zapier sync" className="border-border bg-surface-card text-foreground" />
            </Field>
            <Field label="Scopes">
              <div className="space-y-2">
                {SCOPES.map((s) => (
                  <label key={s.value} className="flex items-start gap-2.5">
                    <Checkbox
                      className="mt-0.5"
                      checked={scopes.includes(s.value)}
                      onCheckedChange={(v) => setScopes((cur) => (v === true ? [...new Set([...cur, s.value])] : cur.filter((x) => x !== s.value)))}
                    />
                    <span>
                      <span className="block text-sm text-foreground">{s.label}</span>
                      <span className="block text-xs text-text-secondary">{s.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}
        <DialogFooter>
          {secret ? (
            <Button className="bg-primary text-primary-foreground" onClick={() => close(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button className="bg-primary text-primary-foreground" onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create key
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Project-scoped REST API keys: create (secret shown once), list, revoke.
export function ApiKeysTab({ projectId }) {
  const canManage = useCan("forms.settings.manage");
  const [result, setResult] = useState({ key: null, rows: [], error: null });
  const [reloads, setReloads] = useState(0);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [search, setSearch] = useState("");
  const loadKey = `${projectId || ""}|${reloads}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        return { rows: await listApiKeys(projectId || null), error: null };
      } catch (err) {
        console.error("[apiKeys.list]", err);
        return { rows: [], error: err };
      }
    })().then((next) => alive && setResult({ key: loadKey, ...next }));
    return () => {
      alive = false;
    };
  }, [projectId, loadKey]);

  const rows = result.rows;
  const setRows = (fn) => setResult((r) => ({ ...r, rows: fn(r.rows) }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((k) => [k.name, k.prefix, ...(k.scopes || [])].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, search]);
  const pager = usePagination(filtered, { resetKey: search });

  const create = async ({ name, scopes }) => {
    try {
      const { key, secret } = await createApiKey({ projectId: projectId || null, name, scopes });
      setRows((cur) => [key, ...cur]);
      toast.success("API key created");
      return secret;
    } catch (err) {
      console.error("[apiKeys.create]", err);
      toast.error("Couldn't create the key.");
      return null;
    }
  };

  const revoke = async (key) => {
    setRevoking(null);
    setRows((cur) => cur.filter((k) => k.id !== key.id));
    try {
      await revokeApiKey(key.id);
      toast.success(`Revoked ${key.name}`);
    } catch (err) {
      console.error("[apiKeys.revoke]", err);
      setRows((cur) => [key, ...cur]);
      toast.error("Couldn't revoke the key.");
    }
  };

  if (result.key !== loadKey) return <LoadingArea panel size={40} label="Loading API keys" />;
  if (result.error) return <ErrorState description="API keys couldn't be loaded." onRetry={() => setReloads((n) => n + 1)} />;

  const columns = [
    { key: "name", header: "Name", render: (k) => <span className="font-medium text-foreground">{k.name}</span> },
    { key: "prefix", header: "Key", render: (k) => <span className="font-mono text-xs text-text-secondary">{k.prefix}…</span> },
    {
      key: "scopes",
      header: "Scopes",
      render: (k) => (
        <div className="flex gap-1">
          {k.scopes.map((s) => (
            <Badge key={s} variant={s === "write" ? "warning" : "neutral"}>
              {s}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: "created", header: "Created", render: (k) => <span className="text-xs text-text-tertiary">{k.created}</span> },
    { key: "used", header: "Last used", render: (k) => <span className="text-xs text-text-tertiary">{k.lastUsed}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (k) =>
        canManage ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/10" aria-label={`Revoke ${k.name}`} onClick={() => setRevoking(k)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Send keys as <code className="rounded bg-surface-card px-1 text-xs">Authorization: Bearer gf_…</code>. Keys are stored hashed.</p>
        <div className="flex shrink-0 items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search keys…" />
          <Button className="shrink-0 bg-primary text-primary-foreground" disabled={!canManage} onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New key
          </Button>
        </div>
      </div>
      <div className="space-y-5">
        <DataTable
          columns={columns}
          data={pager.pageItems}
          getRowKey={(k) => k.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              {rows.length ? (
                <EmptyState
                  icon={KeyRound}
                  title="No keys match your search"
                  description="Try a different name, key prefix, or scope."
                  action={
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <EmptyState icon={KeyRound} title="No API keys" description="Create a key to read forms and responses from your own code, or submit headlessly." />
              )}
            </div>
          }
        />
        <ListPagination {...pager} itemLabel="keys" />
      </div>
      <CreateKeyDialog open={creating} onOpenChange={setCreating} onCreate={create} />
      <Dialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke {revoking?.name}?</DialogTitle>
            <DialogDescription>Anything using this key stops working immediately. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => revoke(revoking)}>
              Revoke key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
