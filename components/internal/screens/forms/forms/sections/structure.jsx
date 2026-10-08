"use client";

import { createElement, useMemo } from "react";
import { AlertTriangle, ExternalLink, GitFork, Lock } from "lucide-react";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import {
  Field,
  SectionCard,
  SettingRow,
  SettingsList,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { getFieldIcon, isInputField } from "@/lib/forms/field-types";
import { checkFormula } from "@/lib/forms/formula";
import { fieldTypeLabel, splitPages } from "@/lib/forms/logic";
import { BuilderLink, CopyField, NumberInput, OUTLINE_BTN, Stack, publicFormUrl, useOrigin } from "./kit";

// Read-only structure summaries; the builder is where structure is edited.

function useStructure(form) {
  return useMemo(() => {
    const defs = (form.fieldDefs || []).filter((f) => f.included !== false);
    const inputs = defs.filter((f) => isInputField(f.type));
    const byType = {};
    for (const f of defs) byType[f.type] = (byType[f.type] || 0) + 1;
    const pages = splitPages(defs, form.title);
    const conditional = defs.filter((f) => f.conditions?.length);
    const calculated = defs.filter((f) => f.type === "calculated");
    return {
      defs,
      inputs,
      byType: Object.entries(byType).sort((a, b) => b[1] - a[1]),
      pages,
      conditional,
      calculated,
      required: inputs.filter((f) => f.required).length,
      sensitive: inputs.filter((f) => f.sensitive).length,
      graded: inputs.filter((f) => f.correctAnswer != null && f.correctAnswer !== "").length,
      excluded: (form.fieldDefs || []).length - defs.length,
    };
  }, [form.fieldDefs, form.title]);
}

const TypeIcon = ({ type, className }) => createElement(getFieldIcon(type), { className, "aria-hidden": true });

function FieldRow({ field, meta }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-card text-text-secondary">
        <TypeIcon type={field.type} className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{field.label || field.title}</p>
        <p className="text-[11px] text-text-tertiary">{fieldTypeLabel(field.type)}</p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">{meta}</div>
    </div>
  );
}

function EmptyStructure({ openBuilder }) {
  return <BuilderLink onOpenBuilder={openBuilder}>This form has no fields yet. Add them in the builder.</BuilderLink>;
}

export function CanvasSection({ form, openBuilder }) {
  const s = useStructure(form);
  return (
    <Stack>
      <StatsBar
        stats={[
          { label: "Blocks", value: String(s.defs.length), footer: "On the canvas" },
          { label: "Inputs", value: String(s.inputs.length), footer: `${s.required} required` },
          { label: "Pages", value: String(s.pages.length), footer: "Split by page breaks" },
          { label: "Hidden from form", value: String(s.excluded), footer: "Excluded blocks" },
        ]}
      />
      <BuilderLink onOpenBuilder={openBuilder}>Drag fields onto the canvas, reorder them and edit their settings in the full builder.</BuilderLink>
      <SectionCard title="Canvas order">
        {s.defs.length ? (
          <div className="divide-y divide-border">
            {s.defs.map((f) => (
              <FieldRow key={f.id} field={f} meta={f.required ? <Badge variant="neutral">Required</Badge> : null} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Nothing on the canvas yet.</p>
        )}
      </SectionCard>
    </Stack>
  );
}

export function LayoutSection({ form, openBuilder }) {
  const s = useStructure(form);
  const widths = { full: 0, half: 0, third: 0 };
  for (const f of s.inputs) widths[f.width || "full"] += 1;
  return (
    <Stack>
      <StatsBar
        columns={3}
        stats={[
          { label: "Full width", value: String(widths.full), footer: "Fields" },
          { label: "Half width", value: String(widths.half), footer: "Two per row" },
          { label: "Third width", value: String(widths.third), footer: "Three per row" },
        ]}
      />
      <BuilderLink onOpenBuilder={openBuilder}>Set each field&apos;s width in the builder to place fields side by side. Rows wrap automatically on phones.</BuilderLink>
      {s.defs.length ? (
        <SectionCard title="Row preview">
          <div className="flex flex-wrap gap-2">
            {s.defs.map((f) => {
              const w = f.type === "page" || f.type === "heading" || f.type === "content" ? "full" : f.width || "full";
              const basis = w === "half" ? "calc(50% - 0.25rem)" : w === "third" ? "calc(33.333% - 0.34rem)" : "100%";
              return (
                <div key={f.id} style={{ flexBasis: basis }} className="min-w-0 truncate rounded-md border border-border bg-surface-card px-2.5 py-1.5 text-xs text-text-secondary">
                  {f.type === "page" ? `— ${f.title} —` : f.label || f.title}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </Stack>
  );
}

export function FieldsSection({ form, openBuilder }) {
  const s = useStructure(form);
  if (!s.defs.length) return <EmptyStructure openBuilder={openBuilder} />;
  return (
    <Stack>
      <BuilderLink onOpenBuilder={openBuilder}>Add, configure and validate fields in the builder.</BuilderLink>
      <SectionCard title="Field types">
        <div className="flex flex-wrap gap-2">
          {s.byType.map(([type, n]) => (
            <span key={type} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-card px-2 py-1 text-xs text-muted-foreground">
              <TypeIcon type={type} className="h-3.5 w-3.5 text-text-secondary" /> {fieldTypeLabel(type)} <span className="tabular-nums text-foreground">{n}</span>
            </span>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Inputs" description={`${s.inputs.length} fields collect answers · ${s.required} required · ${s.sensitive} sensitive`}>
        <div className="divide-y divide-border">
          {s.inputs.map((f) => (
            <FieldRow
              key={f.id}
              field={f}
              meta={
                <>
                  {f.required ? <Badge variant="neutral">Required</Badge> : null}
                  {f.sensitive ? (
                    <Badge variant="warning">
                      <Lock /> Sensitive
                    </Badge>
                  ) : null}
                  {f.prefillKey ? <Badge variant="info">?{f.prefillKey}=</Badge> : null}
                </>
              }
            />
          ))}
        </div>
      </SectionCard>
    </Stack>
  );
}

export function LogicSection({ form, settings, set, setGroup, openBuilder }) {
  const s = useStructure(form);
  const byId = new Map(s.defs.map((f) => [f.id, f]));
  const branches = settings.branches || [];
  return (
    <Stack>
      <StatsBar
        stats={[
          { label: "Conditional fields", value: String(s.conditional.length), footer: "Show / hide rules" },
          { label: "Calculated", value: String(s.calculated.length), footer: "Formula fields" },
          { label: "Outcome branches", value: String(branches.length), footer: settings.branchingEnabled ? "Branching on" : "Branching off" },
          { label: "Graded questions", value: String(s.graded), footer: settings.quiz?.enabled ? "Quiz on" : "Quiz off" },
        ]}
      />
      <BuilderLink onOpenBuilder={openBuilder}>Write visibility rules, formulas and outcome branches in the builder.</BuilderLink>

      {s.conditional.length || s.calculated.length ? (
        <SectionCard title="Rules">
          <div className="divide-y divide-border">
            {s.conditional.map((f) => (
              <FieldRow
                key={f.id}
                field={f}
                meta={
                  <Badge variant="info">
                    <GitFork /> {f.conditions.length} {f.conditionLogic === "all" ? "ALL" : "ANY"} · {f.conditions.map((c) => byId.get(c.fieldId)?.title || "?").join(", ")}
                  </Badge>
                }
              />
            ))}
            {s.calculated.map((f) => {
              const error = f.formula ? checkFormula(f.formula) : "No formula";
              return (
                <FieldRow
                  key={`calc-${f.id}`}
                  field={f}
                  meta={
                    error ? (
                      <Badge variant="danger">
                        <AlertTriangle /> {error}
                      </Badge>
                    ) : (
                      <code className="max-w-[260px] truncate rounded bg-surface-card px-1.5 py-0.5 text-[11px] text-text-secondary">{f.formula}</code>
                    )
                  }
                />
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Scoring & quiz" description="How responses are scored and prioritised.">
        <SettingsList>
          <SettingRow title="Score responses" description="Option points + calculated fields add up to a score that sets priority." checked={Boolean(settings.scoringEnabled)} onCheckedChange={(v) => set("scoringEnabled", v)} />
          {settings.scoringEnabled ? (
            <div className="grid gap-4 py-3.5 sm:grid-cols-2">
              <Field label="High priority at or above">
                <NumberInput value={settings.highThreshold} onChange={(v) => set("highThreshold", v)} />
              </Field>
              <Field label="Medium priority at or above">
                <NumberInput value={settings.mediumThreshold} onChange={(v) => set("mediumThreshold", v)} />
              </Field>
            </div>
          ) : null}
          <SettingRow title="Grade as a quiz" description="Fields with a correct answer are graded; respondents pass at the pass mark." checked={Boolean(settings.quiz?.enabled)} onCheckedChange={(v) => setGroup("quiz", { enabled: v })} />
          {settings.quiz?.enabled ? (
            <div className="grid gap-4 py-3.5 sm:grid-cols-2">
              <Field label="Pass mark (%)">
                <NumberInput value={settings.quiz.passMark} min={0} max={100} onChange={(v) => setGroup("quiz", { passMark: v })} />
              </Field>
              <SettingRow title="Show correct answers" checked={Boolean(settings.quiz.showAnswers)} onCheckedChange={(v) => setGroup("quiz", { showAnswers: v })} />
            </div>
          ) : null}
          <SettingRow title="Outcome branching" description="Route respondents to named outcomes (edit branches in the builder)." checked={Boolean(settings.branchingEnabled)} onCheckedChange={(v) => set("branchingEnabled", v)} />
          <SettingRow title="Show poll results" description="Respondents see live answer counts after submitting." checked={Boolean(settings.showPollResults)} onCheckedChange={(v) => set("showPollResults", v)} />
        </SettingsList>
      </SectionCard>
    </Stack>
  );
}

export function PreviewSection({ form, preview }) {
  const origin = useOrigin();
  const url = publicFormUrl(origin, form.slug);
  const prefill = (form.fieldDefs || []).filter((f) => f.prefillKey);
  const prefillUrl = prefill.length ? `${url}?${prefill.map((f) => `${encodeURIComponent(f.prefillKey)}=…`).join("&")}` : null;
  return (
    <Stack>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={preview} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <ExternalLink className="h-4 w-4" /> Open in new tab
        </Button>
        {form.status !== "Published" ? <span className="text-xs text-text-tertiary">Not published yet — respondents would see a closed notice.</span> : null}
      </div>
      {prefillUrl ? (
        <SectionCard title="Test with prefilled values" description="Hidden and prefillable fields read these URL parameters.">
          <CopyField value={prefillUrl} />
        </SectionCard>
      ) : null}
      <SectionCard title="Live preview" bodyPadding={false}>
        {origin ? <iframe title={`Preview of ${form.title}`} src={url} className="h-[640px] w-full border-0 bg-background" /> : null}
      </SectionCard>
    </Stack>
  );
}

export function PagesSection({ form, settings, set, openBuilder }) {
  const s = useStructure(form);
  return (
    <Stack>
      <SectionCard title="Layout mode" description="Classic shows each page at once; conversational asks one question at a time.">
        <SettingsList>
          <SettingRow
            title="Conversational mode"
            description="One question per screen with keyboard navigation."
            checked={settings.layout === "conversational"}
            onCheckedChange={(v) => set("layout", v ? "conversational" : "classic")}
          />
          <SettingRow title="Progress bar" description="Shows how far along respondents are." checked={Boolean(settings.progressBar)} onCheckedChange={(v) => set("progressBar", v)} />
        </SettingsList>
      </SectionCard>
      <SectionCard title="Pages" description={`${s.pages.length} page${s.pages.length === 1 ? "" : "s"} — add page breaks in the builder to split the form.`} action={<Button type="button" size="sm" variant="outline" onClick={openBuilder} className={OUTLINE_BTN}>Open builder</Button>}>
        <ol className="space-y-2">
          {s.pages.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-card px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                  <span className="mr-2 tabular-nums text-text-tertiary">{i + 1}.</span>
                  {p.title || (i === 0 ? form.title : `Page ${i + 1}`)}
                </p>
                <p className="text-[11px] text-text-tertiary">{p.fields.length} blocks</p>
              </div>
              {p.break?.conditions?.length ? <Badge variant="info">Conditional</Badge> : null}
            </li>
          ))}
        </ol>
      </SectionCard>
    </Stack>
  );
}
