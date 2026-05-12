"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function FormRenderer({ form, answers, onAnswer, readOnly = false }) {
  return (
    <div className="space-y-4">
      {form.questions.map((question) => {
        const value = answers[question.id] || (question.type === "checkbox" ? [] : "");
        const optionTypes = ["multiple", "checkbox", "dropdown"];

        return (
          <section key={question.id} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <div className="flex items-start gap-1.5">
              <h3 className="text-sm font-semibold text-[#ededed]">{question.title}</h3>
              {question.required ? <span className="text-red-300">*</span> : null}
            </div>
            {question.help ? <p className="mt-1 text-xs leading-5 text-[#737373]">{question.help}</p> : null}

            {question.type === "paragraph" ? (
              <Textarea
                value={value}
                readOnly={readOnly}
                onChange={(event) => onAnswer(question.id, event.target.value)}
                className="mt-3"
                placeholder="Your answer"
              />
            ) : question.type === "date" ? (
              <Input
                type="date"
                value={value}
                readOnly={readOnly}
                onChange={(event) => onAnswer(question.id, event.target.value)}
                className="mt-3"
              />
            ) : optionTypes.includes(question.type) ? (
              <div className="mt-3 space-y-2">
                {question.options.map((option) => {
                  const selected = Array.isArray(value) ? value.includes(option) : value === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        if (question.type === "checkbox") {
                          const next = selected ? value.filter((item) => item !== option) : [...value, option];
                          onAnswer(question.id, next);
                        } else {
                          onAnswer(question.id, option);
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "border-teal-500/40 bg-teal-500/10 text-teal-100"
                          : "border-[#2a2a2a] bg-[#181818] text-[#a3a3a3] hover:border-[#3a3a3a]",
                      )}
                    >
                      <span
                        className={cn(
                          "h-3 w-3 shrink-0 border border-[#474747]",
                          question.type === "checkbox" ? "rounded" : "rounded-full",
                          selected && "border-teal-300 bg-teal-300",
                        )}
                      />
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Input
                value={value}
                readOnly={readOnly}
                onChange={(event) => onAnswer(question.id, event.target.value)}
                className="mt-3"
                placeholder="Your answer"
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
