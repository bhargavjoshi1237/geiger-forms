"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Copy,
  Eye,
  FileQuestion,
  GripVertical,
  Inbox,
  LockKeyhole,
  Plus,
  Radio,
  Rows3,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  TextCursorInput,
  Trash2,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { FormRenderer } from "@/components/forms/form-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { questionTypes } from "@/data/seed-forms";
import { useFormStore } from "@/lib/form-store";
import { cn } from "@/lib/utils";

const statusClass = {
  Published: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  Draft: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  Closed: "border-zinc-500/30 bg-zinc-500/15 text-zinc-300",
  "Needs review": "border-amber-500/30 bg-amber-500/15 text-amber-300",
  Approved: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  Flagged: "border-red-500/30 bg-red-500/15 text-red-300",
};

const typeIcons = {
  short: TextCursorInput,
  paragraph: Rows3,
  multiple: Radio,
  checkbox: CheckCircle2,
  dropdown: Radio,
  date: FileQuestion,
};

function Metric({ label, value, detail, Icon }) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#a3a3a3]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#e7e7e7]">{value}</p>
          <p className="mt-1 text-xs text-[#737373]">{detail}</p>
        </div>
        <Icon className="h-4 w-4 text-[#737373]" />
      </div>
    </div>
  );
}

function FormList({ forms, activeId, onSelect, onCreate }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#202020]">
      <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#ededed]">Forms</p>
          <p className="text-xs text-[#737373]">Project collection spaces</p>
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>
      <div className="divide-y divide-[#2a2a2a]">
        {forms.map((form) => (
          <button
            key={form.id}
            type="button"
            onClick={() => onSelect(form.id)}
            className={cn(
              "w-full px-4 py-3 text-left transition-colors hover:bg-[#242424]",
              form.id === activeId && "bg-[#242424]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#ededed]">{form.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#737373]">{form.description}</p>
              </div>
              <Badge className={cn("shrink-0", statusClass[form.status])}>{form.status}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-[#737373]">
              <span>{form.responses.length} responses</span>
              <span>{form.questions.length} questions</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkspaceTabs({ activeView, onViewChange }) {
  const tabs = ["Builder", "Preview", "Responses", "Analytics", "Access", "Settings"];
  return (
    <div className="flex flex-wrap items-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-0.5">
      {tabs.map((tab) => (
        <Button
          key={tab}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onViewChange(tab)}
          className={cn(activeView === tab && "bg-[#2a2a2a] text-white")}
        >
          {tab}
        </Button>
      ))}
    </div>
  );
}

function QuestionEditor({ question, index, onChange, onDuplicate, onDelete }) {
  const usesOptions = ["multiple", "checkbox", "dropdown"].includes(question.type);
  const TypeIcon = typeIcons[question.type] || TextCursorInput;

  return (
    <article className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
      <div className="flex items-start gap-3 p-4">
        <GripVertical className="mt-2 h-4 w-4 shrink-0 text-[#525252]" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px]">
            <Input
              value={question.title}
              onChange={(event) => onChange({ ...question, title: event.target.value })}
              className="h-10 font-medium"
            />
            <select
              value={question.type}
              onChange={(event) => {
                const type = event.target.value;
                onChange({
                  ...question,
                  type,
                  options: ["multiple", "checkbox", "dropdown"].includes(type)
                    ? question.options.length > 0
                      ? question.options
                      : ["Option 1"]
                    : [],
                });
              }}
              className="h-10 rounded-md border border-[#2a2a2a] bg-[#181818] px-3 text-sm text-[#ededed] outline-none"
            >
              {Object.entries(questionTypes).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Input
            value={question.help}
            onChange={(event) => onChange({ ...question, help: event.target.value })}
            placeholder="Help text or project clause note"
            className="text-xs"
          />
          {usesOptions ? (
            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-[#3a3a3a] text-[10px] text-[#737373]">
                    {optionIndex + 1}
                  </span>
                  <Input
                    value={option}
                    onChange={(event) => {
                      const options = [...question.options];
                      options[optionIndex] = event.target.value;
                      onChange({ ...question, options });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...question, options: [...question.options, `Option ${question.options.length + 1}`] })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#2a2a2a] bg-[#181818] px-3 py-2 text-xs text-[#737373]">
              <TypeIcon className="mr-2 inline h-3.5 w-3.5" />
              Respondent input
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2a2a2a] px-4 py-2">
        <span className="text-xs text-[#525252]">Question {index + 1}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2 border-l border-[#2a2a2a] pl-3">
            <span className="text-xs text-[#737373]">Required</span>
            <Switch checked={question.required} onCheckedChange={(required) => onChange({ ...question, required })} />
          </div>
        </div>
      </div>
    </article>
  );
}

function BuilderView({ form, updateQuestions }) {
  const addQuestion = () => {
    updateQuestions([
      ...form.questions,
      {
        id: `q-${Date.now()}`,
        type: "short",
        title: "Untitled question",
        help: "",
        required: false,
        options: [],
      },
    ]);
  };

  return (
    <div className="space-y-3 p-4">
      {form.questions.map((question, index) => (
        <QuestionEditor
          key={question.id}
          question={question}
          index={index}
          onChange={(nextQuestion) =>
            updateQuestions(form.questions.map((item) => (item.id === question.id ? nextQuestion : item)))
          }
          onDuplicate={() => {
            const duplicate = { ...question, id: `q-${Date.now()}`, title: `${question.title} copy` };
            updateQuestions([
              ...form.questions.slice(0, index + 1),
              duplicate,
              ...form.questions.slice(index + 1),
            ]);
          }}
          onDelete={() => updateQuestions(form.questions.filter((item) => item.id !== question.id))}
        />
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={addQuestion}>
        <Plus className="h-4 w-4" />
        Add question
      </Button>
    </div>
  );
}

function ResponsesView({ form, updateResponseStatus }) {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Submitted" value={form.responses.length} detail="Total responses" Icon={Inbox} />
        <Metric
          label="Needs review"
          value={form.responses.filter((response) => response.status === "Needs review").length}
          detail="Pending owner action"
          Icon={AlertTriangle}
        />
        <Metric label="Approved" value={form.responses.filter((response) => response.status === "Approved").length} detail="Ready for use" Icon={CheckCircle2} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#202020]">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Respondent</TableHead>
              <TableHead className="hidden md:table-cell">Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px]">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {form.responses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-[#737373]">
                  No submissions yet.
                </TableCell>
              </TableRow>
            ) : (
              form.responses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell>
                    <p className="truncate font-medium text-[#ededed]">{response.respondent}</p>
                    <p className="mt-1 truncate text-xs text-[#737373]">{response.email}</p>
                  </TableCell>
                  <TableCell className="hidden text-[#a3a3a3] md:table-cell">
                    {new Date(response.submittedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusClass[response.status]}>{response.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <select
                      value={response.status}
                      onChange={(event) => updateResponseStatus(response.id, event.target.value)}
                      className="h-8 w-full rounded-md border border-[#2a2a2a] bg-[#181818] px-2 text-xs text-[#ededed]"
                    >
                      <option>Needs review</option>
                      <option>Approved</option>
                      <option>Flagged</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AccessView({ form, updateForm }) {
  const rows = [
    ["membersOnly", "Project members and approved guests", "Reject people outside the project clause.", UserCheck],
    ["verifiedIdentity", "Require verified identity", "Keep every response attributable for review.", ShieldCheck],
    ["collectEmail", "Collect respondent email", "Attach identity details to each submission.", Inbox],
    ["allowEdits", "Allow edits after submit", "Respondents may amend answers until close.", Save],
    ["notifyOwners", "Notify owners", "Surface new responses to project reviewers.", Send],
  ];

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-teal-500/25 bg-teal-500/10">
            <LockKeyhole className="h-4 w-4 text-teal-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#ededed]">Confidentiality controls</p>
            <p className="mt-1 text-xs leading-5 text-[#737373]">Control who may submit and how responses are reviewed.</p>
          </div>
        </div>
        <div className="mt-4 divide-y divide-[#2a2a2a]">
          {rows.map(([key, label, detail, Icon]) => (
            <div key={key} className="flex items-center gap-3 py-3">
              <Icon className="h-4 w-4 shrink-0 text-[#737373]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#ededed]">{label}</p>
                <p className="text-xs text-[#737373]">{detail}</p>
              </div>
              <Switch
                checked={form.settings[key]}
                onCheckedChange={(checked) => updateForm({ settings: { ...form.settings, [key]: checked } })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ form }) {
  const completion = form.questions.length > 0 ? Math.min(100, Math.round((form.responses.length / 20) * 100)) : 0;

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Completion" value={`${completion}%`} detail="Target response volume" Icon={BarChart3} />
        <Metric label="Questions" value={form.questions.length} detail="Active fields" Icon={FileQuestion} />
        <Metric label="Sensitive" value="On" detail="Identity and clause guard" Icon={LockKeyhole} />
      </div>
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <p className="text-sm font-semibold text-[#ededed]">Question coverage</p>
        <div className="mt-4 space-y-3">
          {form.questions.map((question, index) => (
            <div key={question.id}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a3a3a3]">{question.title}</span>
                <span className="text-[#737373]">{Math.max(24, 96 - index * 12)}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#2a2a2a]">
                <div className="h-full rounded-full bg-[#ededed]" style={{ width: `${Math.max(24, 96 - index * 12)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FormsWorkspace() {
  const { forms, stats, addForm, updateForm, updateQuestions, updateResponseStatus } = useFormStore();
  const [activeView, setActiveView] = useState("Forms");
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id);
  const [previewAnswers, setPreviewAnswers] = useState({});

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId) || forms[0],
    [forms, selectedFormId],
  );

  const createForm = () => {
    const id = addForm();
    setSelectedFormId(id);
    setActiveView("Builder");
  };

  if (!selectedForm) {
    return null;
  }

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-col gap-4 border-b border-[#2a2a2a] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#e7e7e7] md:text-3xl">Forms</h1>
            <p className="mt-1 text-[#a3a3a3]">Create confidential forms and review project-bound submissions.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href={`/form/${selectedForm.id}`}>
                <Eye className="h-4 w-4" />
                Open submit page
              </Link>
            </Button>
            <Button onClick={() => updateForm(selectedForm.id, { status: "Published" })}>
              <Send className="h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Forms" value={forms.length} detail="Workspace total" Icon={FileQuestion} />
          <Metric label="Published" value={stats.published} detail="Accepting responses" Icon={Send} />
          <Metric label="Responses" value={stats.responses} detail="All submissions" Icon={Inbox} />
          <Metric label="Review queue" value={stats.review} detail="Needs action" Icon={AlertTriangle} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
          <FormList forms={forms} activeId={selectedForm.id} onSelect={setSelectedFormId} onCreate={createForm} />

          <section className="min-w-0 overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#202020]">
            <div className="space-y-4 border-b border-[#2a2a2a] p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <Input
                    value={selectedForm.title}
                    onChange={(event) => updateForm(selectedForm.id, { title: event.target.value })}
                    className="h-11 text-lg font-semibold"
                  />
                  <Textarea
                    value={selectedForm.description}
                    onChange={(event) => updateForm(selectedForm.id, { description: event.target.value })}
                    className="min-h-20 leading-6 text-[#a3a3a3]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusClass[selectedForm.status]}>{selectedForm.status}</Badge>
                  <Badge className="border-teal-500/25 bg-teal-500/10 text-teal-200">
                    <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />
                    Protected
                  </Badge>
                </div>
              </div>
              <WorkspaceTabs activeView={activeView === "Forms" ? "Builder" : activeView} onViewChange={setActiveView} />
            </div>

            {(activeView === "Forms" || activeView === "Builder") && (
              <BuilderView form={selectedForm} updateQuestions={(questions) => updateQuestions(selectedForm.id, questions)} />
            )}
            {activeView === "Preview" && (
              <div className="p-4">
                <FormRenderer form={selectedForm} answers={previewAnswers} onAnswer={(id, value) => setPreviewAnswers({ ...previewAnswers, [id]: value })} />
              </div>
            )}
            {activeView === "Responses" && (
              <ResponsesView
                form={selectedForm}
                updateResponseStatus={(responseId, status) => updateResponseStatus(selectedForm.id, responseId, status)}
              />
            )}
            {activeView === "Analytics" && <AnalyticsView form={selectedForm} />}
            {activeView === "Access" && <AccessView form={selectedForm} updateForm={(patch) => updateForm(selectedForm.id, patch)} />}
            {activeView === "Settings" && (
              <div className="space-y-4 p-4">
                <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                  <div className="flex items-center gap-3">
                    <Settings2 className="h-4 w-4 text-[#737373]" />
                    <div>
                      <p className="text-sm font-semibold text-[#ededed]">Confirmation message</p>
                      <p className="text-xs text-[#737373]">Shown after a respondent submits.</p>
                    </div>
                  </div>
                  <Textarea
                    value={selectedForm.settings.confirmation}
                    onChange={(event) =>
                      updateForm(selectedForm.id, {
                        settings: { ...selectedForm.settings, confirmation: event.target.value },
                      })
                    }
                    className="mt-4"
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
