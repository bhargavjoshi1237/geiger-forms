"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
  BookTemplate,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Globe,
  Link2,
  Lock,
  MailCheck,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Users,
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

const TEMPLATE_CATEGORIES = ["Sales", "Product", "Operations", "HR", "Events", "Support", "Other"];

export function SettingsScreen() {
  const [workspaceName, setWorkspaceName] = useState("Geiger Forms");
  const [defaultCategory, setDefaultCategory] = useState("Operations");
  const [defaultOwnerRole, setDefaultOwnerRole] = useState("Editors");
  const [showBranding, setShowBranding] = useState(true);
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [defaultPublished, setDefaultPublished] = useState(false);
  const [responseLimit, setResponseLimit] = useState("500");

  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [activeDays, setActiveDays] = useState(["mon", "tue", "wed", "thu", "fri"]);

  const [confirmationEmail, setConfirmationEmail] = useState(true);
  const [confirmationSubject, setConfirmationSubject] = useState("Thank you for your submission");
  const [thankYouType, setThankYouType] = useState("message");
  const [thankYouMessage, setThankYouMessage] = useState("Thanks for submitting. We'll review and follow up soon.");
  const [redirectUrl, setRedirectUrl] = useState("");

  const [prefillEnabled, setPrefillEnabled] = useState(true);
  const [editWindow, setEditWindow] = useState("48h");
  const [domainRestricted, setDomainRestricted] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState("acme.com");
  const [projectRestricted, setProjectRestricted] = useState(false);
  const [linkedProject, setLinkedProject] = useState("HR & Onboarding");

  const [sheetSync, setSheetSync] = useState(false);
  const [sheetTarget, setSheetTarget] = useState("Geiger Office Sheet");
  const [autoArchive, setAutoArchive] = useState(true);
  const [archiveAfter, setArchiveAfter] = useState("90");
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
      description="Set the defaults every new form starts with: publishing, response handling, access, routing, and retention."
      stats={[
        { label: "Defaults", value: "6", detail: "Applied to new forms", Icon: SlidersHorizontal },
        { label: "Access", value: domainRestricted || projectRestricted ? "Gated" : "Open", detail: "Respondent entry", Icon: Lock },
        { label: "Receipts", value: confirmationEmail ? "On" : "Off", detail: "Email confirmation", Icon: MailCheck },
        { label: "Storage", value: autoArchive ? `${archiveAfter}d` : "Manual", detail: "Archive policy", Icon: Database },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="w-full space-y-5">
          <SettingsPanel
            icon={BookTemplate}
            title="Form creation defaults"
            description="These values are used when someone creates a new form or saves a reusable template."
          >
            <div className="divide-y divide-[#242424]">
              <SettingField icon={BookTemplate} label="Workspace name" hint="Shown in the Forms workspace and respondent footer.">
                <Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="h-8 max-w-sm" />
              </SettingField>
              <SettingField icon={ClipboardCheck} label="Default template category" hint="The category preselected when a form is saved as a template.">
                <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                  <SelectTrigger className="h-8 w-full max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingField>
              <SettingField icon={Users} label="Default collaborator role" hint="Access level for teammates added from the form editor.">
                <Select value={defaultOwnerRole} onValueChange={setDefaultOwnerRole}>
                  <SelectTrigger className="h-8 w-full max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Editors", "Reviewers", "Viewers"].map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingField>
              <SettingToggle
                icon={Globe}
                label="Show Geiger branding by default"
                hint="Adds the Geiger Forms footer to new public forms."
                checked={showBranding}
                onCheckedChange={setShowBranding}
              />
              <SettingToggle
                icon={Link2}
                label="Start new forms unpublished"
                hint="Editors must explicitly publish before a public link accepts responses."
                checked={!defaultPublished}
                onCheckedChange={(checked) => setDefaultPublished(!checked)}
              />
            </div>
          </SettingsPanel>

          <SettingsPanel
            icon={Timer}
            title="Collection rules"
            description="Control when forms can be submitted and how many responses a form accepts."
          >
            <div className="divide-y divide-[#242424]">
              <SettingToggle
                icon={Timer}
                label="Use an availability window"
                hint="Apply active hours and days to newly published forms."
                checked={availabilityEnabled}
                onCheckedChange={setAvailabilityEnabled}
              />
              <SettingField icon={Timer} label="Active hours" hint={`Default window: ${openTime} to ${closeTime}`}>
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
              <SettingField icon={ClipboardCheck} label="Default response limit" hint="Leave empty in individual forms for unlimited responses.">
                <Input value={responseLimit} onChange={(event) => setResponseLimit(event.target.value)} inputMode="numeric" className="h-8 max-w-[180px]" />
              </SettingField>
              <SettingToggle
                icon={CheckCircle2}
                label="Allow respondents to submit another response"
                hint="Controls the default success screen action for new forms."
                checked={allowResubmission}
                onCheckedChange={setAllowResubmission}
              />
            </div>
          </SettingsPanel>

          <SettingsPanel
            icon={MailCheck}
            title="Submitter experience"
            description="Defaults for receipts, thank-you screens, prefill, and response editing."
          >
            <div className="divide-y divide-[#242424]">
              <SettingToggle
                icon={MailCheck}
                label="Send confirmation email"
                hint="Respondents receive a receipt after a successful submission."
                checked={confirmationEmail}
                onCheckedChange={setConfirmationEmail}
              />
              <SettingField icon={AtSign} label="Confirmation subject" hint="Used when confirmation email is enabled.">
                <Input value={confirmationSubject} onChange={(event) => setConfirmationSubject(event.target.value)} disabled={!confirmationEmail} className="h-8 max-w-sm disabled:opacity-40" />
              </SettingField>
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
                icon={Sparkles}
                label="Enable Geiger account prefill"
                hint="Known users can start forms with profile fields already filled."
                checked={prefillEnabled}
                onCheckedChange={setPrefillEnabled}
              />
              <SettingField icon={Timer} label="Response edit window" hint="How long respondents can revise a submitted response.">
                <Select value={editWindow} onValueChange={setEditWindow}>
                  <SelectTrigger className="h-8 w-full max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="48h">48 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </SettingField>
            </div>
          </SettingsPanel>

          <SettingsPanel
            icon={Lock}
            title="Access and respondent identity"
            description="Default access gates for public forms and internal project forms."
          >
            <div className="divide-y divide-[#242424]">
              <SettingToggle
                icon={ShieldCheck}
                label="Require organization email domain"
                hint="Respondents must sign in with an allowed domain before opening gated forms."
                checked={domainRestricted}
                onCheckedChange={setDomainRestricted}
              />
              <SettingField icon={AtSign} label="Allowed domain" hint="Do not include the @ symbol.">
                <Input value={allowedDomain} onChange={(event) => setAllowedDomain(event.target.value)} disabled={!domainRestricted} className="h-8 max-w-sm disabled:opacity-40" />
              </SettingField>
              <SettingToggle
                icon={Users}
                label="Require linked project membership"
                hint="Gate forms to members of a selected Geiger project."
                checked={projectRestricted}
                onCheckedChange={setProjectRestricted}
              />
              <SettingField icon={Users} label="Default linked project" hint="Used for project-gated forms and response routing.">
                <Select value={linkedProject} onValueChange={setLinkedProject} disabled={!projectRestricted}>
                  <SelectTrigger className="h-8 w-full max-w-sm disabled:opacity-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Customer Operations", "Marketing", "HR & Onboarding", "Engineering", "Events"].map((project) => (
                      <SelectItem key={project} value={project}>{project}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingField>
            </div>
          </SettingsPanel>
        </div>

        <aside className="space-y-5">
          <SettingsPanel
            icon={FileSpreadsheet}
            title="Response data"
            description="Where response data goes after submission."
          >
            <div className="divide-y divide-[#242424]">
              <SettingToggle
                icon={FileSpreadsheet}
                label="Auto-link response sheet"
                hint="Create a sheet target for every new form."
                checked={sheetSync}
                onCheckedChange={setSheetSync}
              />
              <SettingField icon={FileSpreadsheet} label="Sheet target" hint="Default destination for new forms.">
                <Select value={sheetTarget} onValueChange={setSheetTarget} disabled={!sheetSync}>
                  <SelectTrigger className="h-8 w-full disabled:opacity-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Geiger Office Sheet">Geiger Office Sheet</SelectItem>
                    <SelectItem value="Google Sheet">Google Sheet</SelectItem>
                    <SelectItem value="CSV export only">CSV export only</SelectItem>
                  </SelectContent>
                </Select>
              </SettingField>
              <SettingToggle
                icon={Database}
                label="Auto-archive stale responses"
                hint="Keep active response tables focused on recent submissions."
                checked={autoArchive}
                onCheckedChange={setAutoArchive}
              />
              <SettingField icon={Database} label="Archive after" hint="Days after submission.">
                <div className="flex items-center gap-2">
                  <Input value={archiveAfter} onChange={(event) => setArchiveAfter(event.target.value)} disabled={!autoArchive} inputMode="numeric" className="h-8 w-24 disabled:opacity-40" />
                  <span className="text-xs text-[#737373]">days</span>
                </div>
              </SettingField>
            </div>
          </SettingsPanel>

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
      <div className="p-4">{children}</div>
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
    <div className="grid w-full gap-3 py-3.5 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-center xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
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

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[#737373]">{label}</dt>
      <dd className="max-w-[190px] text-right font-medium text-[#d4d4d4]">{value}</dd>
    </div>
  );
}
