"use client";

import { Check, ImagePlus } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { Toggle } from "@geiger/ui/toggle";
import { getFieldType, isMultiChoice } from "@/lib/forms/field-types";
import { imageSource } from "@/lib/forms/media";
import { ImageInput } from "@/components/forms/image-input";
import { ControlLabel, FieldRow, StringListEditor, SubtleNote, TextInput } from "./builder-controls";

const QUIZ_TYPES = new Set(["select", "dropdown", "multiselect", "picture", "multipicture"]);

function prunePoints(points, options) {
  if (!points) return undefined;
  const out = {};
  for (const o of options) if (points[o] !== undefined && points[o] !== "") out[o] = points[o];
  return Object.keys(out).length ? out : undefined;
}

function pruneImages(config, options) {
  if (!config?.images) return config;
  return { ...config, images: Object.fromEntries(Object.entries(config.images).filter(([o]) => options.includes(o))) };
}

// Thumbnail button for a picture-choice option; its popover sets the image (upload or link) and alt text.
function OptionImage({ option, image, formId, onChange }) {
  const src = imageSource(image?.url);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon-sm" aria-label={`Image for ${option}`} className="size-8 shrink-0 overflow-hidden bg-surface-card p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" className="size-full object-cover" /> : <ImagePlus className="size-3.5 text-text-tertiary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1.5">
          <ControlLabel>Image</ControlLabel>
          <ImageInput compact formId={formId} value={image?.url || ""} onChange={(url) => onChange({ ...image, url })} label={`image for ${option}`} />
        </div>
        <FieldRow label="Alt text" hint="Describes the picture for screen readers; leave empty when the label already says it.">
          <TextInput value={image?.alt} onChange={(alt) => onChange({ ...image, alt })} placeholder="e.g. Red trainers, side view" />
        </FieldRow>
      </PopoverContent>
    </Popover>
  );
}

function pruneCorrect(correct, options) {
  if (Array.isArray(correct)) {
    const kept = correct.filter((c) => options.includes(c));
    return kept.length ? kept : undefined;
  }
  return correct && options.includes(correct) ? correct : undefined;
}

// Choices editor with per-option points (scoring), correct-answer marks (quiz) and images (picture choice).
export function OptionsEditor({ field, onChange, scoring, quiz, formId, label = "Choices" }) {
  const options = field.options || [];
  const multi = isMultiChoice(field.type);
  const pictures = getFieldType(field.type).input === "picture";
  const showQuiz = quiz && QUIZ_TYPES.has(field.type);
  const showPoints = scoring && field.type !== "ranking" && field.type !== "matrix";
  const images = field.config?.images || {};

  const setOptions = (next) => {
    onChange({ options: next, optionPoints: prunePoints(field.optionPoints, next), correctAnswer: pruneCorrect(field.correctAnswer, next), config: pruneImages(field.config, next) });
  };

  const setImage = (opt, image) => {
    const next = { ...images };
    if (image.url || image.alt) next[opt] = image;
    else delete next[opt];
    onChange({ config: { ...field.config, images: next } });
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
    let config = field.config;
    if (!nextOptions.includes(prev)) {
      if (Array.isArray(correct)) correct = correct.map((c) => (c === prev ? nextName : c));
      else if (correct === prev) correct = nextName;
      if (images[prev]) {
        const { [prev]: moved, ...rest } = images;
        config = { ...config, images: { ...rest, [nextName]: moved } };
      }
    }
    onChange({ options: nextOptions, optionPoints: points, correctAnswer: correct, config });
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
          showPoints || showQuiz || pictures
            ? (opt) => (
                <>
                  {pictures ? <OptionImage option={opt} image={images[opt]} formId={formId} onChange={(image) => setImage(opt, image)} /> : null}
                  {showPoints ? (
                    <Input
                      type="number"
                      value={field.optionPoints?.[opt] ?? ""}
                      onChange={(e) => setPoints(opt, e.target.value)}
                      placeholder="0"
                      aria-label={`Points for ${opt}`}
                      className="h-8 w-16 shrink-0 bg-surface-card text-sm"
                    />
                  ) : null}
                  {showQuiz ? (
                    <Toggle
                      pressed={isCorrect(opt)}
                      onPressedChange={() => toggleCorrect(opt)}
                      aria-label={`Mark ${opt} as correct`}
                      className="h-8 w-8 min-w-8 shrink-0 rounded-md border border-border bg-surface-card px-0 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-foreground data-[state=on]:border-emerald-500/30 data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-400"
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
