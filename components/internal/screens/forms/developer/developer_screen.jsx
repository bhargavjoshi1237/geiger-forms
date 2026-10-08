"use client";

import { useState } from "react";
import { Braces, Code, KeyRound, ListChecks, Webhook } from "lucide-react";
import { LoadingArea, ScreenHeader } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { ApiKeysTab } from "./api_keys_tab";
import { DeliveriesTab } from "./deliveries_tab";
import { EmbedTab, RestTab, WebhooksTab } from "./reference_tabs";

const TABS = [
  { value: "keys", label: "API keys", icon: KeyRound },
  { value: "rest", label: "REST API", icon: Braces },
  { value: "webhooks", label: "Webhooks", icon: Webhook },
  { value: "deliveries", label: "Deliveries", icon: ListChecks },
  { value: "embed", label: "Embed", icon: Code },
];

// Catalog view id → title, description, and the tab it opens on.
const VIEWS = {
  "dev.hooks": { title: "Hooks & Events", tab: "webhooks", description: "Subscribe your systems to form events with signed webhooks." },
  "dev.headless": { title: "Headless / API-first", tab: "rest", description: "Drive forms entirely from code: read schemas, submit headlessly, and pull responses." },
  "dev.frontend": { title: "Data Front-end", tab: "rest", description: "Render forms and response data in your own front-end with the public and REST APIs.", frontend: true },
  "integ.api": { title: "REST / API", tab: "keys", description: "Project API keys and the REST v1 reference." },
  "integ.webhooks": { title: "Webhooks", tab: "webhooks", description: "Event catalog, payloads, signature verification, and the delivery log." },
};

// Developer hub: API keys, REST reference, webhooks, deliveries, and embeds.
export function DeveloperScreen({ view = "integ.api" }) {
  const meta = VIEWS[view] || VIEWS["integ.api"];
  const [tab, setTab] = useState(meta.tab);
  const { forms, loading } = useForms();
  const { projectId, openForm } = useWorkspaceUrl();

  return (
    <MainScreenWrapper>
      <ScreenHeader title={meta.title} description={meta.description} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.icon ? <t.icon /> : null}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tab === "keys" ? <ApiKeysTab projectId={projectId} /> : null}
      {tab === "rest" ? <RestTab frontend={meta.frontend} /> : null}
      {tab !== "keys" && tab !== "rest" && loading ? <LoadingArea panel size={40} label="Loading forms" /> : null}
      {tab === "webhooks" && !loading ? <WebhooksTab forms={forms} onConfigure={openForm} /> : null}
      {tab === "deliveries" && !loading ? <DeliveriesTab forms={forms} /> : null}
      {tab === "embed" && !loading ? <EmbedTab forms={forms} onConfigure={openForm} /> : null}
    </MainScreenWrapper>
  );
}

export default DeveloperScreen;
