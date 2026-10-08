"use client";

import { Check } from "lucide-react";
import { Input } from "@geiger/ui/input";
import { Toggle } from "@geiger/ui/toggle";
import { ControlLabel, StringListEditor, SubtleNote } from "./builder-controls";

const QUIZ_TYPES = new Set(["select", "dropdown", "multiselect"]);

function prunePoints(points, options) {
  if (!points) return undefined;
  const out = {};
  for (const o of options) if (points[o] !== undefined && points[o] !== "") out[o] = points[o];
  return Object.keys(out).length ? out : undefined;
}

function pruneCorrect(correct, options) {
  if (Array.isArray(correct)) {
    const kept = correct.filter((c) => options.includes(c));
    return kept.length ? kept : undefined;
  }
  return correct && options.includes(correct) ? correct : undefined;
}

// Choices editor with per-option points (scoring) and correct-answer marks (quiz).
export function OptionsEditor({ field, onChange, scoring, quiz, label = "Choices" }) {
  const options = field.options || [];
  const multi = field.type === "multiselect";
  const showQuiz = quiz && QUIZ_TYPES.has(field.type);
  const showPoints = scoring && field.type !== "ranking" && field.type !== "matrix";

  const setOptions = (next) => {
    onChange({ options: next, optionPoints: prunePoints(field.optionPoints, next), correctAnswer: pruneCorrect(field.correctAnswer, next) });
  };

  // Carry points / correctness across a rename so typing doesn't drop them.
  const rename = (index, nextName) => {
    const prev = options[index];
    if (prev === nextName) return;
    const nextOptions = options.map((o, i) => (i === index ? nextName : o));
    const points = field.optionPoints ? { ...field.optionPoints } : undefined;
    if (points && prev in points && !nextOptions.includes(prev)) {
      points[nextName] = points[prev];
      delete points[prev];
    }
    let correct = field.correctAnswer;
    if (!nextOptions.includes(prev)) {
      if (Array.isArray(correct)) correct = correct.map((c) => (c === prev ? nextName : c));
      else if (correct === prev) correct = nextName;
    }
    onChange({ options: nextOptions, optionPoints: points, correctAnswer: correct });
  };

  const isCorrect = (opt) => (Array.isArray(field.correctAnswer) ? field.correctAnswer.includes(opt) : field.correctAnswer === opt);
  const toggleCorrect = (opt) => {
    if (multi) {
      const cur = Array.isArray(field.correctAnswer) ? field.correctAnswer : field.correctAnswer ? [field.correctAnswer] : [];
      const next = cur.includes(opt) ? cur.filter((c) => c !== opt) : [...cur, opt];
      onChange({ correctAnswer: next.length ? next : undefined });
    } else {
      onChange({ correctAnswer: field.correctAnswer === opt ? undefined : opt });
    }
  };

  const setPoints = (opt, raw) => {
    const points = { ...(field.optionPoints || {}) };
    if (raw === "") delete points[opt];
    else points[opt] = Number(raw);
    onChange({ optionPoints: Object.keys(points).length ? points : undefined });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <ControlLabel>{label}</ControlLabel>
        <span className="flex gap-3 text-[10px] uppercase tracking-wide text-text-tertiary">
          {showPoints ? <span>Points</span> : null}
          {showQuiz ? <span>Correct</span> : null}
        </span>
      </div>
      <StringListEditor
        items={options}
        onChange={setOptions}
        onRename={rename}
        placeholder="Option"
        addLabel="Add choice"
        emptyText="No choices yet — add at least one."
        renderExtra={
          showPoints || showQuiz
            ? (opt) => (
                <>
                  {showPoints ? (
                    <Input
                      type="number"
                      value={field.optionPoints?.[opt] ?? ""}
                      onChange={(e) => setPoints(opt, e.target.value)}
                      placeholder="0"
                      aria-label={`Points for ${opt}`}
                      className="h-8 w-16 shrink-0 bg-background text-sm"
                    />
                  ) : null}
                  {showQuiz ? (
                    <Toggle
                      pressed={isCorrect(opt)}
                      onPressedChange={() => toggleCorrect(opt)}
                      aria-label={`Mark ${opt} as correct`}
                      className="h-8 w-8 min-w-8 shrink-0 rounded-md border border-border bg-background px-0 text-text-tertiary transition-colors hover:bg-background hover:text-foreground data-[state=on]:border-emerald-500/30 data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-400"
                    >
                      <Check className="size-3.5" />
                    </Toggle>
                  ) : null}
                </>
              )
            : undefined
        }
      />
      {showQuiz && multi ? <SubtleNote>Respondents must pick exactly the marked choices to earn the points.</SubtleNote> : null}
    </div>
  );
}
