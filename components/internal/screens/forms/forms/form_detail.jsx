"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, ExternalLink } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { StatusPill } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";

import { FORM_STATUS_MAP } from "./constants";
import { NAV_GROUPS, SECTIONS } from "./form_sections";

// Per-form editor: content on the left, a grouped topic nav on the right —
// the same shape as the events area's event_detail.jsx. The active section
// lives in local state; edits patch a working copy and Save lifts them to the
// list. Mirrors that file so the two areas feel like one product.
export function FormDetailScreen({ form: initialForm, onBack, onUpdate, onPublish, categories = [] }) {
  const router = useRouter();
  const [active, setActive] = useState("overview");
  // Flips true after a save and back to false on the next edit — a quiet inline
  // confirmation, since this project has no toast surface.
  const [saved, setSaved] = useState(false);

  // Editable working copy. Sections read from and patch this; the header
  // reflects edits live, and Save persists them through the list.
  const [form, setForm] = useState(initialForm);
  // Re-seed when a different form is opened (render-phase reset).
  const [seedId, setSeedId] = useState(initialForm?.id);
  if (initialForm && initialForm.id !== seedId) {
    setSeedId(initialForm.id);
    setForm(initialForm);
    setActive("overview");
    setSaved(false);
  }

  const activeItem = useMemo(
    () =>
      NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === active) ||
      NAV_GROUPS[0].items[0],
    [active],
  );

  if (!form) return null;

  const patch = (partial) => {
    setForm((f) => ({ ...f, ...partial }));
    setSaved(false);
  };

  const save = () => {
    onUpdate?.(form.id, {
      title: form.title ?? form.name,
      description: form.description || "",
      category: form.category ?? null,
      tags: form.tags || [],
    });
    setSaved(true);
  };

  const openBuilder = () => router.push(`/forms/${form.slug}`);

  const preview = () => {
    if (typeof window !== "undefined") {
      window.open(`/form/${form.slug}`, "_blank", "noopener,noreferrer");
    }
  };

  const ActiveSection = SECTIONS[active] || SECTIONS.overview;

  return (
    <MainScreenWrapper className="lg:flex lg:h-full lg:flex-col lg:gap-6 lg:space-y-0 lg:overflow-hidden lg:py-0">
      {/* Editor header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between lg:shrink-0">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All forms
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {form.name}
            </h1>
            <StatusPill status={form.status} map={FORM_STATUS_MAP} />
          </div>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {form.fields} fields · {form.responses} responses
            {form.lastEdited ? ` · edited ${form.lastEdited}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
            onClick={preview}
          >
            <ExternalLink className="h-4 w-4" /> Preview
          </Button>
          <Button
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
            onClick={openBuilder}
          >
            <Eye className="h-4 w-4" /> Open builder
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={save}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" /> Saved
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>

      {/* Content (left) + section nav (right). */}
      <div className="grid grid-cols-1 gap-8 lg:min-h-0 lg:flex-1 lg:grid-rows-1 lg:grid-cols-[1fr_260px]">
        <div className="scrollbar-subtle order-2 min-w-0 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
          {activeItem.ownHeader ? null : (
            <div className="mb-5 min-w-0">
              <h2 className="text-lg font-semibold capitalize text-foreground">
                {activeItem.label}
              </h2>
              <p className="mt-0.5 text-sm text-text-secondary">{activeItem.desc}</p>
            </div>
          )}
          <ActiveSection
            form={form}
            headerItem={activeItem}
            categories={categories}
            onPatch={patch}
            onNavigate={setActive}
            onOpenBuilder={openBuilder}
            onPreview={preview}
            onPublish={() => onPublish?.(form)}
          />
        </div>

        <aside className="order-1 lg:order-2 lg:min-h-0">
          <nav className="space-y-5 lg:h-full lg:overflow-y-auto lg:pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.group || `g${gi}`}>
                {group.group ? (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                    {group.group}
                  </p>
                ) : null}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActive(item.key)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-surface-card font-medium text-foreground"
                            : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-foreground" : "text-text-secondary",
                          )}
                        />
                        <span className="truncate capitalize">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </MainScreenWrapper>
  );
}

export default FormDetailScreen;
