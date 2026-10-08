"use client";

import { memo, useMemo } from "react";
import { ArrowDown, ArrowUp, Calendar, Link2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { Input } from "@geiger/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Textarea } from "@geiger/ui/textarea";
import { hasOptions } from "@/lib/forms/field-types";
import { RESPONSE_PRIORITIES, RESPONSE_STATUSES, makeFieldId } from "@/lib/forms/schema";
import { ConditionsEditor } from "./conditions-editor";
import { CoverPicker } from "./cover-picker";
import { ControlLabel, FieldRow, NumberInput, SubtleNote, ToggleRow } from "./builder-controls";

const dateInput = "h-8 bg-background pl-8 pr-2 text-xs text-muted-foreground dark:[color-scheme:dark]";

function Segmented({ value, options, onChange }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v)} spacing={1} className="w-full rounded-md border border-border bg-background p-1">
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-auto min-w-0 flex-1 rounded py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-transparent hover:text-foreground data-[state=on]:bg-surface-hover data-[state=on]:text-foreground"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export const StyleSection = memo(function StyleSection({ settings, onChange }) {
  return (
    <div className="space-y-3">
      <CoverPicker settings={settings} onChange={(patch) => onChange(patch, "style:cover")} />
      <div className="space-y-1 border-t border-border pt-3">
        <ToggleRow label="Show logo" hint="Displayed above the form title." checked={settings.showIcon} onCheckedChange={(showIcon) => onChange({ showIcon })} />
        {settings.showIcon ? (
          <FieldRow label="Logo URL">
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
              <Input type="url" value={settings.logoUrl || ""} onChange={(e) => onChange({ logoUrl: e.target.value.trim() }, "style:logo")} placeholder="https://…/logo.png" className="h-8 bg-background pl-8 text-xs" />
            </div>
          </FieldRow>
        ) : null}
        <ToggleRow label="Geiger branding" hint="“Made with Geiger Forms” footer." checked={settings.branding} onCheckedChange={(branding) => onChange({ branding })} />
      </div>
      <SubtleNote>Themes, fonts and layout live in the form&apos;s settings in the workspace.</SubtleNote>
    </div>
  );
});

export const ScheduleSection = memo(function ScheduleSection({ settings, onChange }) {
  const invalidRange = settings.openDate && settings.closeDate && settings.closeDate < settings.openDate;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "openDate", label: "Opens" },
          { key: "closeDate", label: "Closes" },
        ].map(({ key, label }) => (
          <label key={key} className="block space-y-1.5">
            <ControlLabel>{label}</ControlLabel>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
              <Input type="date" value={settings[key] || ""} onChange={(e) => onChange({ [key]: e.target.value })} className={dateInput} />
            </div>
          </label>
        ))}
      </div>
      {invalidRange ? <p className="text-[11px] text-red-400">The close date is before the open date.</p> : null}
      {settings.openDate || settings.closeDate ? (
        <Button type="button" variant="ghost" size="xs" onClick={() => onChange({ openDate: "", closeDate: "" })} className="h-auto gap-1 px-0 font-normal hover:bg-transparent has-[>svg]:px-0 text-[11px] text-text-tertiary hover:text-foreground">Clear dates</Button>
      ) : null}
      <FieldRow label="Closed message" hint="Shown when the form is closed, scheduled or full.">
        <Textarea value={settings.closedMessage || ""} onChange={(e) => onChange({ closedMessage: e.target.value }, "schedule:closed")} rows={2} placeholder="This form is no longer accepting responses." className="min-h-14 resize-none bg-background text-xs" />
      </FieldRow>
      <div className="space-y-1 border-t border-border pt-3">
        <FieldRow label="Response limit">
          <NumberInput min={1} value={settings.responseLimit === "" ? undefined : settings.responseLimit} onChange={(v) => onChange({ responseLimit: v ?? "" }, "schedule:limit")} placeholder="No limit" className="text-xs" />
        </FieldRow>
        <ToggleRow label="Show remaining spots" hint="e.g. “12 spots left”." checked={settings.showResponseLimit} disabled={!settings.responseLimit} onCheckedChange={(showResponseLimit) => onChange({ showResponseLimit })} />
      </div>
    </div>
  );
});

export const SubmissionSection = memo(function SubmissionSection({ settings, onChange }) {
  return (
    <div className="space-y-3">
      <Segmented
        value={settings.thankYouType === "redirect" ? "redirect" : "message"}
        options={[
          { value: "message", label: "Thank-you screen" },
          { value: "redirect", label: "Redirect" },
        ]}
        onChange={(thankYouType) => onChange({ thankYouType })}
      />
      {settings.thankYouType === "redirect" ? (
        <FieldRow label="Redirect URL" hint="Merge tags work in the URL too, e.g. ?score={score}.">
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
            <Input type="url" value={settings.thankYouUrl || ""} onChange={(e) => onChange({ thankYouUrl: e.target.value }, "submit:url")} placeholder="https://…" className="h-8 bg-background pl-8 text-xs" />
          </div>
        </FieldRow>
      ) : (
        <>
          <FieldRow label="Title">
            <Input value={settings.thankYouTitle || ""} onChange={(e) => onChange({ thankYouTitle: e.target.value }, "submit:title")} placeholder="Response submitted" className="h-8 bg-background text-xs" />
          </FieldRow>
          <FieldRow label="Message">
            <Textarea value={settings.thankYouText || ""} onChange={(e) => onChange({ thankYouText: e.target.value }, "submit:text")} rows={3} placeholder="Thanks, {Name}!" className="min-h-20 resize-none bg-background text-xs" />
          </FieldRow>
          <SubtleNote>
            Merge tags: <code className="font-mono">{"{Field Title}"}</code>, <code className="font-mono">{"{score}"}</code>, <code className="font-mono">{"{outcome}"}</code>, <code className="font-mono">{"{total}"}</code>.
          </SubtleNote>
        </>
      )}
      <div className="border-t border-border pt-2">
        <ToggleRow label="“Submit another” button" checked={settings.submitAnother} onCheckedChange={(submitAnother) => onChange({ submitAnother })} />
        <ToggleRow label="Show score" hint="Shows the score (and quiz result) after submitting." checked={settings.showScore} onCheckedChange={(showScore) => onChange({ showScore })} />
      </div>
    </div>
  );
});

function ThresholdRow({ label, tone, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={tone} className="w-16 justify-center rounded-full">{label}</Badge>
      <span className="text-xs text-text-tertiary">≥</span>
      <NumberInput min={0} value={value} onChange={onChange} className="h-7 w-20 text-xs" />
      <span className="text-xs text-text-tertiary">points</span>
    </div>
  );
}

export const TriageSection = memo(function TriageSection({ settings, fields, onChange, onSelectField }) {
  const quiz = settings.quiz || {};
  const sources = useMemo(() => {
    const included = fields.filter((f) => f.included !== false);
    return {
      points: included.filter((f) => hasOptions(f.type) && f.optionPoints && Object.keys(f.optionPoints).length),
      calculated: included.filter((f) => f.type === "calculated" && f.config?.countInScore !== false),
      graded: included.filter((f) => f.correctAnswer != null && f.correctAnswer !== "" && !(Array.isArray(f.correctAnswer) && !f.correctAnswer.length)),
    };
  }, [fields]);

  const sourceList = (list, empty) =>
    list.length === 0 ? (
      <p className="text-[11px] text-text-tertiary">{empty}</p>
    ) : (
      <div className="flex flex-wrap gap-1">
        {list.map((f) => (
          <Button key={f.id} type="button" variant="outline" size="xs" onClick={() => onSelectField(f.id)} className="block h-auto max-w-full truncate rounded border-border bg-surface-card px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground shadow-none hover:bg-surface-card hover:text-foreground">
            {f.title}
          </Button>
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      <ToggleRow label="Score responses" hint="Total points set the response priority on submit." checked={settings.scoringEnabled} onCheckedChange={(scoringEnabled) => onChange({ scoringEnabled })} />
      {settings.scoringEnabled ? (
        <div className="space-y-3 rounded-md border border-border bg-background p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Priority thresholds</p>
          <ThresholdRow label="High" tone="danger" value={settings.highThreshold} onChange={(highThreshold) => onChange({ highThreshold: highThreshold ?? "" }, "triage:high")} />
          <ThresholdRow label="Medium" tone="warning" value={settings.mediumThreshold} onChange={(mediumThreshold) => onChange({ mediumThreshold: mediumThreshold ?? "" }, "triage:medium")} />
          <div className="flex items-center gap-2">
            <Badge variant="neutral" className="w-16 justify-center rounded-full">Low</Badge>
            <span className="text-xs text-text-tertiary">below {settings.mediumThreshold || "—"} points</span>
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-[11px] leading-4 text-text-secondary">Score = option points on choice fields + calculated fields marked “count in score”{quiz.enabled ? " + quiz points" : ""}. A matching branch can override the priority.</p>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Option points</p>
              {sourceList(sources.points, "Set points per choice in a choice field's Question tab.")}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Calculated fields</p>
              {sourceList(sources.calculated, "No calculated fields count toward the score.")}
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-border pt-3">
        <ToggleRow label="Quiz mode" hint="Grade answers against the correct answers you mark per field." checked={quiz.enabled} onCheckedChange={(enabled) => onChange({ quiz: { ...quiz, enabled } })} />
        {quiz.enabled ? (
          <div className="space-y-2 rounded-md border border-violet-500/20 bg-violet-500/5 p-3">
            <FieldRow label="Pass mark (%)">
              <NumberInput min={0} max={100} value={quiz.passMark ?? 70} onChange={(passMark) => onChange({ quiz: { ...quiz, passMark: passMark ?? 0 } }, "quiz:pass")} className="h-7 w-24 text-xs" />
            </FieldRow>
            <ToggleRow label="Show correct answers" hint="Reveal answers on the thank-you screen." checked={quiz.showAnswers} onCheckedChange={(showAnswers) => onChange({ quiz: { ...quiz, showAnswers } })} />
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Graded questions</p>
              {sourceList(sources.graded, "Mark correct answers on choice fields (Question tab) or text/number fields (Validation tab).")}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});

const NONE = "__none";

export const BranchesSection = memo(function BranchesSection({ settings, sources, onChange }) {
  const branches = Array.isArray(settings.branches) ? settings.branches : [];
  const setBranches = (next, key) => onChange({ branches: next }, key);
  const update = (id, patch, key) => setBranches(branches.map((b) => (b.id === id ? { ...b, ...patch } : b)), key);
  const add = () =>
    setBranches([...branches, { id: makeFieldId("branch"), name: `Path ${branches.length + 1}`, outcome: "", conditionLogic: "all", conditions: [] }]);
  const move = (i, dir) => {
    const next = [...branches];
    const [item] = next.splice(i, 1);
    next.splice(i + dir, 0, item);
    setBranches(next);
  };

  return (
    <div className="space-y-3">
      <ToggleRow label="Named outcomes" hint="Tag each response with the first branch whose conditions match." checked={settings.branchingEnabled} onCheckedChange={(branchingEnabled) => onChange({ branchingEnabled })} />
      {settings.branchingEnabled ? (
        <>
          {branches.map((b, i) => (
            <div key={b.id} className="space-y-2.5 rounded-md border border-border bg-background p-3">
              <div className="flex items-center gap-1.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-hover text-[10px] font-semibold text-text-secondary">{i + 1}</span>
                <Input value={b.name || ""} onChange={(e) => update(b.id, { name: e.target.value }, `branch:${b.id}:name`)} placeholder="Branch name" aria-label="Branch name" className="h-7 min-w-0 flex-1 border-transparent bg-transparent px-1 text-xs font-medium shadow-none hover:border-border" />
                <Button type="button" variant="ghost" size="icon-xs" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon-xs" aria-label="Move down" disabled={i === branches.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="icon-xs" aria-label="Delete branch" className="hover:text-red-400" onClick={() => setBranches(branches.filter((x) => x.id !== b.id))}><Trash2 /></Button>
              </div>
              <ConditionsEditor
                compact
                conditions={b.conditions || []}
                logic={b.conditionLogic}
                sources={sources}
                onChange={(patch) => update(b.id, patch, patch.conditions ? `branch:${b.id}:cond` : undefined)}
                title="Matches when"
                emptyText="Add a condition — branches without one never match."
              />
              <FieldRow label="Outcome name" hint="Tracked in analytics; defaults to the branch name.">
                <Input value={b.outcome || ""} onChange={(e) => update(b.id, { outcome: e.target.value }, `branch:${b.id}:outcome`)} placeholder={b.name || "e.g. Qualified lead"} className="h-7 bg-surface-subtle text-xs" />
              </FieldRow>
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="Priority">
                  <Select value={b.priority || NONE} onValueChange={(v) => update(b.id, { priority: v === NONE ? undefined : v })}>
                    <SelectTrigger className="h-7 w-full bg-surface-subtle text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>From score</SelectItem>
                      {RESPONSE_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Set status">
                  <Select value={b.status || NONE} onValueChange={(v) => update(b.id, { status: v === NONE ? undefined : v })}>
                    <SelectTrigger className="h-7 w-full bg-surface-subtle text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unchanged</SelectItem>
                      {RESPONSE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="h-8 w-full text-xs" onClick={add}><Plus className="h-3.5 w-3.5" />Add branch</Button>
          <SubtleNote>Branches are checked top to bottom; the first match sets the response&apos;s outcome (and optional priority / status). Outcomes appear in the inbox and analytics.</SubtleNote>
        </>
      ) : null}
    </div>
  );
});
