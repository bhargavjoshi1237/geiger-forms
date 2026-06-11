"use client";

import { useMemo } from "react";
import { Copy, Link2, Link2Off, Share2, ShieldCheck, Users } from "lucide-react";
import { FormsScreenShell, LoadingState } from "../screen-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForms } from "@/lib/hooks/use-forms";

const roleStyle = {
  viewer: { label: "Viewer", bg: "bg-surface-card", text: "text-text-secondary", border: "border-border" },
  editor: { label: "Editor", bg: "bg-[#0e1e2e]", text: "text-[#93c5fd]", border: "border-[#1e3a5f]" },
  admin: { label: "Admin", bg: "bg-[#1a1025]", text: "text-[#c4b5fd]", border: "border-[#3b1f6b]" },
};

const avatarColors = ["bg-[#0e1e2e]", "bg-[#0d2218]", "bg-[#2a1a08]", "bg-[#1a1025]"];

function shareInitials(email) {
  const handle = (email.split("@")[0] || email).replace(/[^a-z0-9]/gi, "");
  return (handle.slice(0, 2) || "?").toUpperCase();
}

function buildSharedRows(forms) {
  return forms
    .filter((f) => Array.isArray(f.settings?.sharing) && f.settings.sharing.length > 0)
    .map((f) => {
      const sharing = f.settings.sharing;
      const roles = [];
      for (const entry of sharing) {
        if (entry.role && !roles.includes(entry.role)) roles.push(entry.role);
      }
      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        published: f.status === "Published",
        members: sharing.length,
        roles,
        emails: sharing.map((s) => s.email),
      };
    });
}

function buildStats(rows, forms) {
  const people = new Set();
  for (const f of forms) {
    if (Array.isArray(f.settings?.sharing)) {
      for (const s of f.settings.sharing) {
        if (s.email) people.add(s.email.toLowerCase());
      }
    }
  }
  return {
    sharedForms: rows.length,
    people: people.size,
    publicLinks: rows.filter((r) => r.published).length,
    protected: forms.filter(
      (f) => Array.isArray(f.settings?.sharing) && f.settings.sharing.length > 0 && f.settings?.accessRestricted,
    ).length,
  };
}

export function SharedScreen() {
  const { forms, loading } = useForms();

  const rows = useMemo(() => buildSharedRows(forms), [forms]);
  const stats = useMemo(() => buildStats(rows, forms), [rows, forms]);

  const copyLink = (slug) => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(`${window.location.origin}/form/${slug}`);
  };

  return (
    <FormsScreenShell
      eyebrow="Collaboration"
      title="Shared"
      description="See forms shared with teammates, guests, and public links."
      stats={[
        { label: "Shared forms", value: String(stats.sharedForms), detail: "With collaborators", Icon: Share2 },
        { label: "Members", value: String(stats.people), detail: "Have access", Icon: Users },
        { label: "Public links", value: String(stats.publicLinks), detail: "Currently enabled", Icon: Link2 },
        { label: "Protected", value: String(stats.protected), detail: "Restricted access", Icon: ShieldCheck },
      ]}
    >
      {loading ? (
        <LoadingState label="Loading shared forms…" />
      ) : (
        <section className="overflow-hidden rounded-md border border-border bg-surface-subtle">
          {rows.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
              <Share2 className="mb-3 h-6 w-6 text-text-tertiary" />
              <p className="text-sm font-medium text-foreground">No forms shared yet</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-text-secondary">
                Share a form with teammates by email to start collaborating.
              </p>
            </div>
          ) : (
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Public link</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.roles.map((role) => {
                          const style = roleStyle[role] ?? roleStyle.viewer;
                          return (
                            <span
                              key={role}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text} ${style.border}`}
                            >
                              {style.label}
                            </span>
                          );
                        })}
                        <span className="whitespace-nowrap text-xs text-text-tertiary">
                          {item.members} {item.members === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {item.emails.slice(0, 3).map((email, i) => (
                          <div
                            key={email}
                            className={`flex h-6 w-6 items-center justify-center rounded-full border border-surface-subtle text-[9px] font-semibold text-muted-foreground ${avatarColors[(idx + i) % avatarColors.length]}`}
                          >
                            {shareInitials(email)}
                          </div>
                        ))}
                        {item.emails.length > 3 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-surface-subtle bg-surface-active text-[9px] font-semibold text-text-secondary">
                            +{item.emails.length - 3}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {item.published ? (
                          <Link2 className="h-3.5 w-3.5 text-[#4ade80]" />
                        ) : (
                          <Link2Off className="h-3.5 w-3.5 text-text-tertiary" />
                        )}
                        <span className={`whitespace-nowrap text-xs ${item.published ? "text-[#4ade80]" : "text-text-tertiary"}`}>
                          {item.published ? "Link on" : "Link off"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => copyLink(item.slug)}
                          className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-card px-2.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                          Copy link
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </FormsScreenShell>
  );
}
