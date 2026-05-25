import { Copy, Link2, Link2Off, Share2, ShieldCheck, Users } from "lucide-react";
import { DataPanel, FormsScreenShell } from "../screen-shell";

const sharedItems = [
  {
    form: "Customer Intake",
    role: "Editors",
    members: 6,
    linkEnabled: true,
    avatars: ["MP", "JB", "PS", "SC"],
  },
  {
    form: "Event Registration",
    role: "Viewers",
    members: 12,
    linkEnabled: false,
    avatars: ["AT", "RK", "MP"],
  },
  {
    form: "Feedback Survey",
    role: "Reviewers",
    members: 3,
    linkEnabled: true,
    avatars: ["JB", "SC"],
  },
  {
    form: "Support Request",
    role: "Viewers",
    members: 4,
    linkEnabled: false,
    avatars: ["MP", "AT", "RK"],
  },
];

const roleStyle = {
  Editors: { bg: "bg-[#0e1e2e]", text: "text-[#93c5fd]", border: "border-[#1e3a5f]" },
  Viewers: { bg: "bg-[#202020]", text: "text-[#737373]", border: "border-[#2a2a2a]" },
  Reviewers: { bg: "bg-[#1a1025]", text: "text-[#c4b5fd]", border: "border-[#3b1f6b]" },
};

const avatarColors = ["bg-[#0e1e2e]", "bg-[#0d2218]", "bg-[#2a1a08]", "bg-[#1a1025]"];

export function SharedScreen() {
  return (
    <FormsScreenShell
      eyebrow="Collaboration"
      title="Shared"
      description="See forms shared with teammates, guests, and public links."
      stats={[
        { label: "Shared forms", value: "8", detail: "With collaborators", Icon: Share2 },
        { label: "Members", value: "21", detail: "Have access", Icon: Users },
        { label: "Public links", value: "5", detail: "Currently enabled", Icon: Link2 },
        { label: "Protected", value: "3", detail: "Restricted access", Icon: ShieldCheck },
      ]}
    >
      <DataPanel title="Access overview" description="Sharing modes and active collaborators by form.">
        <div className="divide-y divide-[#242424]">
          {sharedItems.map((item, idx) => {
            const role = roleStyle[item.role] ?? roleStyle.Viewers;
            return (
              <div key={item.form} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#e7e7e7]">{item.form}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0 text-[10px] font-medium ${role.bg} ${role.text} ${role.border}`}>
                      {item.role}
                    </span>
                    <span className="text-xs text-[#525252]">
                      {item.members} {item.members === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex -space-x-2">
                    {item.avatars.slice(0, 3).map((init, i) => (
                      <div
                        key={`${init}-${i}`}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border border-[#1a1a1a] text-[9px] font-semibold text-[#d4d4d4] ${avatarColors[(idx + i) % avatarColors.length]}`}
                      >
                        {init}
                      </div>
                    ))}
                    {item.avatars.length > 3 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#242424] text-[9px] font-semibold text-[#737373]">
                        +{item.avatars.length - 3}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.linkEnabled ? (
                      <Link2 className="h-3.5 w-3.5 text-[#4ade80]" />
                    ) : (
                      <Link2Off className="h-3.5 w-3.5 text-[#525252]" />
                    )}
                    <span className={`text-xs ${item.linkEnabled ? "text-[#737373]" : "text-[#525252]"}`}>
                      {item.linkEnabled ? "Link on" : "Link off"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="flex h-7 items-center gap-1.5 rounded-md border border-[#2a2a2a] bg-[#202020] px-2.5 text-xs text-[#737373] transition-colors hover:border-[#474747] hover:text-white"
                  >
                    <Copy className="h-3 w-3" />
                    Copy link
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </DataPanel>
    </FormsScreenShell>
  );
}
