"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Send,
  X,
  Zap,
  Globe,
  Monitor,
  MapPin,
  Smartphone,
  FileSpreadsheet,
  BarChart2,
  Link2 as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRIORITY_STYLE = {
  High: { bg: "bg-[#2a0808]", text: "text-[#f87171]", border: "border-[#7f1d1d]" },
  Medium: { bg: "bg-[#2a1a08]", text: "text-[#fb923c]", border: "border-[#7c2d12]" },
  Low: { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const MOCK_FIELDS = {
  1: [
    { label: "Name", value: "Maya Patel" },
    { label: "Email", value: "maya@example.com" },
    { label: "Position", value: "Senior Engineer" },
    { label: "Priority", value: "Standard" },
    { label: "Cover letter", value: "Looking forward to the opportunity. Attached CV covers my last 5 years of work in distributed systems." },
    { label: "CV", value: "maya-patel-cv.pdf" },
  ],
  2: [
    { label: "Name", value: "Jon Bell" },
    { label: "Email", value: "jon@example.com" },
    { label: "Event", value: "Product Summit 2026" },
    { label: "Seats", value: "2" },
    { label: "Dietary requirement", value: "Vegetarian" },
  ],
  3: [
    { label: "Name", value: "Priya Shah" },
    { label: "Email", value: "priya@example.com" },
    { label: "Position", value: "Design Lead" },
    { label: "Priority", value: "Urgent" },
    { label: "Message", value: "Available to start immediately. Portfolio linked in CV." },
  ],
  4: [
    { label: "Name", value: "Sam Chen" },
    { label: "Email", value: "sam@example.com" },
    { label: "NPS score", value: "9 / 10" },
    { label: "Feedback", value: "The product has improved significantly since last quarter. Onboarding could still be clearer." },
  ],
  5: [
    { label: "Name", value: "Anna Torres" },
    { label: "Email", value: "anna@example.com" },
    { label: "Event", value: "Product Summit 2026" },
    { label: "Seats", value: "1" },
  ],
  6: [
    { label: "Name", value: "Raj Kumar" },
    { label: "Email", value: "raj@example.com" },
    { label: "Position", value: "Staff Engineer" },
    { label: "Priority", value: "Soon" },
    { label: "Message", value: "Open to remote or hybrid. Happy to discuss details." },
  ],
};

const INITIAL_COMMENTS = {
  1: [{ id: 1, author: "Jack", initials: "JA", text: "Strong candidate — forwarding to hiring team.", time: "45 min ago", color: "bg-[#0e1e2e]" }],
  3: [
    { id: 1, author: "Jack", initials: "JA", text: "Flagged for manual review — priority mismatch with current openings.", time: "2 hours ago", color: "bg-[#0e1e2e]" },
    { id: 2, author: "Mei", initials: "ME", text: "Agreed. Assigning to Sarah for follow-up.", time: "1 hour ago", color: "bg-[#1a3c2e]" },
  ],
};

const STATUS_STYLE = {
  Complete: { bg: "bg-[#0d2218]", text: "text-[#4ade80]", border: "border-[#166534]" },
  "Needs review": { bg: "bg-[#2a1a08]", text: "text-[#fb923c]", border: "border-[#7c2d12]" },
  Pending: { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const AVATAR_COLORS = ["bg-[#0e1e2e]", "bg-[#0d2218]", "bg-[#2a1a08]", "bg-[#1a0d2e]", "bg-[#1a1a1a]", "bg-[#0d1e1a]"];

const MOCK_ANALYTICS = {
  1: { ip: "103.21.xx.xx", location: "Mumbai, India", device: "Desktop", browser: "Chrome 124", os: "macOS 14.4", completionTime: "4m 12s", submittedAt: "May 24, 2026 at 14:32", formVersion: "v3.0", fieldsAnswered: 6, fieldsTotal: 6, scoreBreakdown: [{ field: "Position", points: 40 }, { field: "Experience", points: 52 }] },
  2: { ip: "89.46.xx.xx", location: "London, UK", device: "Mobile", browser: "Safari 17", os: "iOS 17.4", completionTime: "2m 48s", submittedAt: "May 24, 2026 at 14:16", formVersion: "v3.0", fieldsAnswered: 5, fieldsTotal: 5, scoreBreakdown: [] },
  3: { ip: "49.36.xx.xx", location: "Bangalore, India", device: "Desktop", browser: "Firefox 125", os: "Windows 11", completionTime: "6m 33s", submittedAt: "May 24, 2026 at 13:15", formVersion: "v3.0", fieldsAnswered: 5, fieldsTotal: 5, scoreBreakdown: [{ field: "Position", points: 35 }, { field: "Experience", points: 50 }] },
  4: { ip: "72.14.xx.xx", location: "San Francisco, US", device: "Desktop", browser: "Chrome 124", os: "macOS 14.2", completionTime: "3m 05s", submittedAt: "May 24, 2026 at 11:10", formVersion: "v2.1", fieldsAnswered: 4, fieldsTotal: 4, scoreBreakdown: [] },
  5: { ip: "185.12.xx.xx", location: "Madrid, Spain", device: "Mobile", browser: "Chrome 122", os: "Android 14", completionTime: "1m 52s", submittedAt: "May 23, 2026 at 17:44", formVersion: "v3.0", fieldsAnswered: 4, fieldsTotal: 4, scoreBreakdown: [] },
  6: { ip: "103.55.xx.xx", location: "Delhi, India", device: "Desktop", browser: "Edge 124", os: "Windows 10", completionTime: "5m 40s", submittedAt: "May 22, 2026 at 10:05", formVersion: "v2.1", fieldsAnswered: 5, fieldsTotal: 5, scoreBreakdown: [{ field: "Position", points: 28 }, { field: "Experience", points: 50 }] },
};

// ─── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsRow({ label, value }) {
  return (
    <>
      <dt className="text-[11px] text-[#525252]">{label}</dt>
      <dd className="text-[11px] text-[#d4d4d4] text-right">{value}</dd>
    </>
  );
}

function AnalyticsSection({ title, children }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
      <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wide text-[#525252]">{title}</p>
      {children}
    </div>
  );
}

function AnalyticsTab({ responseId }) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [showSheetInput, setShowSheetInput] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");

  const data = MOCK_ANALYTICS[responseId];

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-xs text-[#525252]">No analytics available for this response.</p>
      </div>
    );
  }

  const totalScore = data.scoreBreakdown.reduce((sum, s) => sum + s.points, 0);
  const maxPoints = data.scoreBreakdown.length > 0 ? Math.max(...data.scoreBreakdown.map((s) => s.points)) : 1;

  const confirmSheet = () => {
    const trimmed = pendingUrl.trim();
    if (!trimmed) return;
    setSheetUrl(trimmed);
    setPendingUrl("");
    setShowSheetInput(false);
  };

  return (
    <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">
      <div className="space-y-3">

        {/* Submitter profile */}
        <AnalyticsSection title="Submitter">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <AnalyticsRow label="Device" value={data.device} />
            <AnalyticsRow label="Browser" value={data.browser} />
            <AnalyticsRow label="OS" value={data.os} />
            <AnalyticsRow label="Location" value={data.location} />
            <AnalyticsRow label="IP address" value={data.ip} />
          </dl>
        </AnalyticsSection>

        {/* Submission metadata */}
        <AnalyticsSection title="Submission">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <AnalyticsRow label="Submitted at" value={data.submittedAt} />
            <AnalyticsRow label="Completion time" value={data.completionTime} />
            <AnalyticsRow label="Form version" value={data.formVersion} />
            <AnalyticsRow label="Fields answered" value={`${data.fieldsAnswered} / ${data.fieldsTotal}`} />
          </dl>
        </AnalyticsSection>

        {/* Score breakdown — only when present */}
        {data.scoreBreakdown.length > 0 && (
          <AnalyticsSection title="Score breakdown">
            <div className="space-y-2.5">
              {data.scoreBreakdown.map(({ field, points }) => (
                <div key={field}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] text-[#a3a3a3]">{field}</span>
                    <span className="text-[11px] tabular-nums text-[#d4d4d4]">{points} pts</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
                    <div
                      className="h-full rounded-full bg-[#3b82f6] transition-all"
                      style={{ width: `${Math.round((points / maxPoints) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-[#2a2a2a] pt-2">
                <span className="text-[11px] font-medium text-[#737373]">Total</span>
                <span className="text-[11px] font-semibold tabular-nums text-white">{totalScore} pts</span>
              </div>
            </div>
          </AnalyticsSection>
        )}

        {/* Connected sheet */}
        <AnalyticsSection title="Connected sheet">
          {sheetUrl ? (
            <div className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ade80]" />
              <span className="min-w-0 flex-1 truncate text-[11px] text-[#a3a3a3]" title={sheetUrl}>
                {sheetUrl}
              </span>
              <button
                type="button"
                onClick={() => { setSheetUrl(""); setShowSheetInput(false); setPendingUrl(""); }}
                className="shrink-0 text-[#525252] transition-colors hover:text-[#a3a3a3]"
                aria-label="Unlink sheet"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSheetInput(false); }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-[11px] text-[#737373] transition-colors hover:border-[#474747] hover:text-[#d4d4d4]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Geiger-Office Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setShowSheetInput((v) => !v)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[11px] transition-colors",
                    showSheetInput
                      ? "border-[#474747] bg-[#202020] text-[#d4d4d4]"
                      : "border-[#2a2a2a] bg-[#1a1a1a] text-[#737373] hover:border-[#474747] hover:text-[#d4d4d4]",
                  )}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Google Sheet
                </button>
              </div>

              {showSheetInput && (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={pendingUrl}
                    onChange={(e) => setPendingUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmSheet(); if (e.key === "Escape") setShowSheetInput(false); }}
                    placeholder="Paste Google Sheet URL..."
                    className="h-8 flex-1 text-[11px] text-[#d4d4d4]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={confirmSheet}
                    className="h-8 shrink-0 px-3 text-[11px]"
                  >
                    Link
                  </Button>
                </div>
              )}
            </div>
          )}
        </AnalyticsSection>

      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ResponseDetailPanel({ response, index, onClose, score, priority }) {
  const [status, setStatus] = useState(response.status);
  const [comments, setComments] = useState(INITIAL_COMMENTS[response.id] ?? []);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("response");

  const fields = response.fields
    ? Object.entries(response.fields).map(([label, value]) => ({ label, value }))
    : (MOCK_FIELDS[response.id] ?? [
        { label: "Name", value: response.name },
        { label: "Email", value: response.email },
        { label: "Form", value: response.form },
      ]);

  const currentStyle = STATUS_STYLE[status] ?? STATUS_STYLE.Pending;
  const priorityStyle = priority ? PRIORITY_STYLE[priority] : null;

  const addComment = () => {
    const text = input.trim();
    if (!text) return;
    setComments((prev) => [
      ...prev,
      { id: Date.now(), author: "You", initials: "YO", text, time: "Just now", color: "bg-[#1a3c2e]" },
    ]);
    setInput("");
  };

  const TABS = [
    { id: "response", label: "Response" },
    { id: "analytics", label: "Analytics" },
    { id: "thread", label: "Thread" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        type="button"
        className="flex-1 bg-black/50"
        onClick={onClose}
        aria-label="Close panel"
      />

      <aside className="flex h-full w-full max-w-[460px] flex-col border-l border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 border-b border-[#2a2a2a] px-4 py-3">
          {/* Avatar */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#d4d4d4]",
              AVATAR_COLORS[index % AVATAR_COLORS.length],
            )}
          >
            {response.initials}
          </div>

          {/* Identity stack */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-white">{response.name}</p>
            <p className="text-xs text-[#525252]">{response.email}</p>
            <p className="mt-0.5 text-[10px] text-[#525252]">
              {response.form}&nbsp;·&nbsp;{response.received}
            </p>
          </div>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-1.5">
            {priorityStyle && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  priorityStyle.bg,
                  priorityStyle.text,
                  priorityStyle.border,
                )}
              >
                <Zap className="h-2.5 w-2.5" />
                {priority}
              </span>
            )}

            {score != null && (
              <span
                className="rounded bg-[#202020] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#a3a3a3]"
                title="Triage score"
              >
                {score}
              </span>
            )}

            {/* Status select — styled as colored pill */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                className={cn(
                  "h-6 w-auto gap-1 rounded-full border px-2 text-[10px] font-medium [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60",
                  currentStyle.bg,
                  currentStyle.text,
                  currentStyle.border,
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STATUS_STYLE).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#242424] hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-[#2a2a2a]">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium transition-colors",
                activeTab === id
                  ? "border-b-2 border-white text-white"
                  : "text-[#737373] hover:text-[#a3a3a3]",
              )}
            >
              {label}
              {id === "thread" && comments.length > 0 && (
                <span className="ml-1.5 rounded-full bg-[#2a2a2a] px-1.5 text-[10px] text-[#a3a3a3]">
                  {comments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Response tab ── */}
        {activeTab === "response" && (
          <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">
            <div className="space-y-0.5">
              {fields.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-md px-3 py-2.5 transition-colors hover:bg-[#202020]"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#525252]">
                    {label}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#d4d4d4]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-[#242424] pt-4">
              <p className="text-[10px] text-[#525252]">
                Submitted {response.received}&nbsp;·&nbsp;Internal ID #{String(response.id).padStart(4, "0")}
              </p>
              <button
                type="button"
                className="mt-2 flex items-center gap-1.5 text-xs text-[#737373] transition-colors hover:text-white"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Request edit from respondent
              </button>
            </div>
          </div>
        )}

        {/* ── Analytics tab ── */}
        {activeTab === "analytics" && (
          <AnalyticsTab responseId={response.id} />
        )}

        {/* ── Thread tab ── */}
        {activeTab === "thread" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">
              {comments.length === 0 ? (
                <div className="flex min-h-24 items-center justify-center text-center">
                  <p className="text-xs text-[#525252]">No comments yet. Start the review thread below.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-[#d4d4d4]",
                          c.color,
                        )}
                      >
                        {c.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#e7e7e7]">{c.author}</span>
                          <span className="text-[10px] text-[#525252]">{c.time}</span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-[#a3a3a3]">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#2a2a2a] p-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="h-8 flex-1 text-xs text-[#d4d4d4]"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addComment}
                  className="h-9 w-9 shrink-0 p-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] text-[#525252]">
                Enter to send&nbsp;·&nbsp;Visible to workspace members only
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
