"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Globe,
  Link2,
  Save,
  Timer,
  Wand2,
} from "lucide-react";
import { FormsScreenShell } from "../screen-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export function SettingsScreen() {
  const [responseLimit, setResponseLimit] = useState("");
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [showBranding, setShowBranding] = useState(true);

  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [activeDays, setActiveDays] = useState(["mon", "tue", "wed", "thu", "fri"]);

  const [thankYouType, setThankYouType] = useState("message");
  const [thankYouMessage, setThankYouMessage] = useState("Thanks for submitting. We'll review and follow up soon.");
  const [redirectUrl, setRedirectUrl] = useState("");

  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [highThreshold, setHighThreshold] = useState("80");
  const [mediumThreshold, setMediumThreshold] = useState("40");

  const activeDayLabel = useMemo(() => {
    if (activeDays.length === 7) return "Every day";
    if (!activeDays.length) return "No days selected";
    return DAYS.filter((day) => activeDays.includes(day.key)).map((day) => day.label).join(", ");
  }, [activeDays]);

  const toggleDay = (key) => {
    setActiveDays((current) => (
      current.includes(key) ? current.filter((day) => day !== key) : [...current, key]
    ));
  };

  return (
    <FormsScreenShell
      eyebrow="Workspace configuration"
      title="Settings"
      description="Defaults that map to real form behavior: availability, response limits, the success screen, and scoring."
      stats={[
        { label: "Availability", value: availabilityEnabled ? "Windowed" : "Always open", detail: "Submission window", Icon: Timer },
        { label: "Response limit", value: responseLimit ? responseLimit : "Unlimited", detail: "Per form default", Icon: ClipboardCheck },
        { label: "After submit", value: thankYouType === "redirect" ? "Redirect" : "Message", detail: "Success screen", Icon: CheckCircle2 },
        { label: "Scoring", value: scoringEnabled ? "On" : "Off", detail: "Triage banding", Icon: Wand2 },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="w-full space-y-5">
          <SettingsPanel
            icon={Timer}
            title="Collection rules"
            description="Control when forms can be submitted and how many responses a form accepts."
          >
            <div className="divide-y divide-[#242424]">
              <SettingToggle
                icon={Timer}
                label="Use an availability window"
                hint="Only accept responses during the active hours and days below."
                checked={availabilityEnabled}
                onCheckedChange={setAvailabilityEnabled}
              />
              <SettingField icon={Timer} label="Active hours" hint={`Window: ${openTime} to ${closeTime}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="time" value={openTime} disabled={!availabilityEnabled} onChange={(event) => setOpenTime(event.target.value)} className="h-8 w-auto px-2.5 [color-scheme:dark] disabled:opacity-40" />
                  <span className="text-xs text-[#525252]">to</span>
                  <Input type="time" value={closeTime} disabled={!availabilityEnabled} onChange={(event) => setCloseTime(event.target.value)} className="h-8 w-auto px-2.5 [color-scheme:dark] disabled:opacity-40" />
                </div>
              </SettingField>
              <SettingField icon={Timer} label="Active days" hint={activeDayLabel}>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      disabled={!availabilityEnabled}
                      onClick={() => toggleDay(day.key)}
                      className={cn(
                        "h-7 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        activeDays.includes(day.key)
                          ? "border-[#474747] bg-[#242424] text-white"
                          : "border-[#2a2a2a] bg-[#161616] text-[#737373] hover:border-[#3a3a3a] hover:text-[#a3a3a3]",
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </SettingField>
              <SettingField icon={ClipboardCheck} label="Default response limit" hint="Leave empty for unlimited responses.">
                <Input value={responseLimit} onChange={(event) => setResponseLimit(event.target.value)} inputMode="numeric" placeholder="Unlimited" className="h-8 max-w-[180px]" />
              </SettingField>
              <SettingToggle
                icon={CheckCircle2}
                label="Allow respondents to submit another response"
                hint="Shows a 'submit another' action on the success screen."
                checked={allowResubmission}
                onCheckedChange={setAllowResubmission}
              />
            </div>
          </SettingsPanel>

          <SettingsPanel
            icon={CheckCircle2}
            title="After submission"
            description="What respondents see once they submit, and whether the Geiger footer is shown."
          >
            <div className="divide-y divide-[#242424]">
              <SettingField icon={CheckCircle2} label="After submission" hint="Choose what respondents see after submitting.">
                <Select value={thankYouType} onValueChange={setThankYouType}>
                  <SelectTrigger className="h-8 w-full max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">Show thank-you message</SelectItem>
                    <SelectItem value="redirect">Redirect to URL</SelectItem>
                  </SelectContent>
                </Select>
              </SettingField>
              <SettingField icon={thankYouType === "message" ? CheckCircle2 : Link2} label={thankYouType === "message" ? "Thank-you message" : "Redirect URL"} hint={thankYouType === "message" ? "Displayed on the success screen." : "Respondents are sent here after submission."}>
                {thankYouType === "message" ? (
                  <Textarea value={thankYouMessage} onChange={(event) => setThankYouMessage(event.target.value)} rows={3} className="max-w-sm resize-none text-sm text-[#d4d4d4]" />
                ) : (
                  <Input value={redirectUrl} onChange={(event) => setRedirectUrl(event.target.value)} placeholder="https://example.com/next-step" className="h-8 max-w-sm" />
                )}
              </SettingField>
              <SettingToggle
                icon={Globe}
                label="Show Geiger branding"
                hint="Adds the Geiger Forms footer to public forms."
                checked={showBranding}
                onCheckedChange={setShowBranding}
              />
            </div>
          </SettingsPanel>
        </div>

        <aside className="space-y-5">
          <SettingsPanel
            icon={Wand2}
            title="Scoring defaults"
            description="Default score bands for calculated-field triage."
          >
            <div className="divide-y divide-[#242424]">
              <SettingToggle
                icon={Wand2}
                label="Enable response scoring"
                hint="Use calculated fields to tag high-priority responses."
                checked={scoringEnabled}
                onCheckedChange={setScoringEnabled}
              />
              <SettingField icon={CheckCircle2} label="High score threshold" hint="Responses at or above this value are high priority.">
                <Input value={highThreshold} onChange={(event) => setHighThreshold(event.target.value)} disabled={!scoringEnabled} inputMode="numeric" className="h-8 w-24 disabled:opacity-40" />
              </SettingField>
              <SettingField icon={ClipboardCheck} label="Medium score threshold" hint="Responses at or above this value need review.">
                <Input value={mediumThreshold} onChange={(event) => setMediumThreshold(event.target.value)} disabled={!scoringEnabled} inputMode="numeric" className="h-8 w-24 disabled:opacity-40" />
              </SettingField>
            </div>
          </SettingsPanel>

          <Button className="w-full gap-2">
            <Save className="h-4 w-4" />
            Save settings
          </Button>
        </aside>
      </div>
    </FormsScreenShell>
  );
}

function SettingsPanel({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
      <div className="flex items-start gap-3 border-b border-[#2a2a2a] p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#202020]">
          <Icon className="h-4 w-4 text-[#a3a3a3]" />
        </span>
        <div className="w-full">
          <h2 className="text-sm font-medium text-white">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[#737373]">{description}</p>
        </div>
      </div>
      <div className="@container p-4">{children}</div>
    </section>
  );
}

function SettingToggle({ icon: Icon, label, hint, checked, onCheckedChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <SettingLabel icon={Icon} label={label} hint={hint} />
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

function SettingField({ icon: Icon, label, hint, children }) {
  return (
    <div className="grid w-full gap-3 py-3.5 first:pt-0 last:pb-0 @lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] @lg:items-center">
      <SettingLabel icon={Icon} label={label} hint={hint} />
      <div className="w-full">{children}</div>
    </div>
  );
}

function SettingLabel({ icon: Icon, label, hint }) {
  return (
    <div className="flex w-full gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#202020]">
        <Icon className="h-3.5 w-3.5 text-[#737373]" />
      </span>
      <div className="w-full">
        <p className="text-sm font-medium text-[#d4d4d4]">{label}</p>
        {hint ? <p className="mt-0.5 text-xs leading-5 text-[#737373]">{hint}</p> : null}
      </div>
    </div>
  );
}
