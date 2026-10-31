"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle2, CircleSlash, CloudOff, FileQuestion, RotateCcw } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { LoadingArea } from "@geiger/ui/screen-kit";
import { callApi } from "@/lib/forms/api";
import { normalizeSettings, toCanonicalField } from "@/lib/forms/schema";
import { buildTheme } from "@/lib/forms/theme";
import { isRtl, resolveLocale, translator } from "@/lib/forms/i18n";
import { availableLocales, localizeFormText, matchLocale } from "@/lib/forms/translate";
import { withPrefix } from "@/lib/workspace/base-path";
import { FillerFooter, FillerHeader, FillerShell, LanguageSwitcher, StatusScreen } from "@/components/forms/filler/filler-shell";
import { GateScreen } from "@/components/forms/filler/gates";
import { FormRunner } from "@/components/forms/filler/form-runner";
import { parseFillerParams, publicApi, restartPath } from "@/components/forms/filler/session";
import { useEmbedBridge } from "@/components/forms/filler/use-embed-bridge";

// Canonicalises the public payload's form (fields + settings) once.
function prepareForm(form) {
  if (!form) return null;
  const fieldDefs = (Array.isArray(form.fieldDefs) ? form.fieldDefs : []).map((f) => toCanonicalField(f));
  return { ...form, title: form.title || "Untitled form", description: form.description || "", fieldDefs, settings: normalizeSettings(form.settings) };
}

const noSubscribe = () => () => {};
const browserLanguages = () => navigator.languages?.join(",") || navigator.language || "";
const noLanguages = () => "";

function payloadUrl(slug, params) {
  const qs = new URLSearchParams();
  if (params.signedToken) qs.set("t", params.signedToken);
  if (params.variant) qs.set("variant", params.variant);
  if (params.record) qs.set("record", params.record);
  const query = qs.toString();
  return publicApi(slug, query ? `?${query}` : "");
}

// Public form filler: loads the payload (server-provided or fetched), applies theme/locale and routes to gates or the runner.
export function FormFillerContent({ formId, slug: slugProp, initialPayload = null, initialStatus, searchParams = {} }) {
  const slug = slugProp || formId;
  const params = useMemo(() => parseFillerParams(searchParams), [searchParams]);
  const [payload, setPayload] = useState(initialPayload);
  const [status, setStatus] = useState(() => (initialPayload ? "ready" : initialStatus || "loading"));
  const [password, setPassword] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [gateFromSubmit, setGateFromSubmit] = useState(false);

  const fetchPayload = useCallback(async () => {
    const res = await callApi(payloadUrl(slug, params));
    if (res.ok && res.data?.form) return { status: "ready", payload: res.data };
    if (res.status === 404) return { status: "missing", payload: null };
    return { status: res.status === 0 ? "offline" : "error", payload: null };
  }, [slug, params]);

  useEffect(() => {
    if ((initialPayload || initialStatus === "missing") && attempt === 0) return undefined;
    let active = true;
    fetchPayload().then((next) => {
      if (!active) return;
      setPayload(next.payload);
      setStatus(next.status);
    });
    return () => {
      active = false;
    };
  }, [fetchPayload, initialPayload, initialStatus, attempt]);

  const sourceForm = useMemo(() => prepareForm(payload?.form), [payload]);
  const settings = sourceForm?.settings;
  // The respondent's pick, else ?lang=, else the browser's languages, else the form's own; the server render always starts at ?lang= or the form's own.
  const [pickedLocale, setPickedLocale] = useState(null);
  const browser = useSyncExternalStore(noSubscribe, browserLanguages, noLanguages);
  const locale = useMemo(() => {
    if (!settings) return resolveLocale(null);
    const wanted = [pickedLocale, params.lang, ...browser.split(",")];
    return wanted.map((code) => matchLocale(settings, code)).find(Boolean) || resolveLocale(settings.locale);
  }, [settings, pickedLocale, params.lang, browser]);
  const form = useMemo(() => localizeFormText(sourceForm, locale), [sourceForm, locale]);
  // Built from the translated settings so the side panel's text follows the language.
  const theme = useMemo(() => buildTheme(form?.settings, { embed: params.embed && !params.solid }), [form?.settings, params.embed, params.solid]);
  const tr = useMemo(() => translator(locale), [locale]);
  const languageSwitcher = settings ? <LanguageSwitcher locales={availableLocales(settings)} value={locale} onChange={setPickedLocale} tr={tr} /> : null;
  const title = payload?.variant?.title || form?.title || "";
  const notifySubmitted = useEmbedBridge(params.embed, slug, title);

  // Server rendering sets the title from metadata; this covers forms the client had to fetch itself.
  useEffect(() => {
    if (title && !initialPayload) document.title = `${title} - Geiger Forms`;
  }, [title, initialPayload]);

  const unlock = useCallback(
    async (value) => {
      const res = await callApi(publicApi(slug, "/password"), { method: "POST", body: { password: value } });
      if (!res.ok) return false;
      setPassword(value);
      const next = await fetchPayload();
      // The unlock cookie makes the reload return the full form; the verified password also rides along on submit.
      if (!next.payload || (next.payload.gate === "password" && !next.payload.form?.fieldDefs?.length)) return false;
      setPayload({ ...next.payload, gate: next.payload.gate === "password" ? null : next.payload.gate });
      return true;
    },
    [slug, fetchPayload],
  );

  const header = form ? <FillerHeader title={title} theme={theme} user={payload?.user} languageSwitcher={languageSwitcher} /> : null;

  let body;
  if (status === "loading") {
    body = (
      <LoadingArea size={params.embed ? 48 : 80} label={tr("loading")} className="min-h-[60dvh] py-0" />
    );
  } else if (status === "missing" || (status === "ready" && !form)) {
    body = (
      <StatusScreen icon={FileQuestion} title={tr("notFoundTitle")} description={tr("notFoundBody")}>
        {!params.embed && (
          <Button asChild variant="outline">
            <a href={withPrefix("/")}>Geiger Forms</a>
          </Button>
        )}
      </StatusScreen>
    );
  } else if (status === "error" || status === "offline") {
    body = (
      <StatusScreen icon={status === "offline" ? CloudOff : CircleSlash} tone="warning" title={tr("loadErrorTitle")} description={status === "offline" ? tr("errorNetwork") : tr("loadErrorBody")}>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStatus("loading");
            setAttempt((n) => n + 1);
          }}
        >
          <RotateCcw />
          {tr("retry")}
        </Button>
      </StatusScreen>
    );
  } else if (params.paid === "1") {
    body = <StatusScreen icon={CheckCircle2} tone="success" title={tr("paidTitle")} description={tr("paidBody")} />;
  } else if (params.paid === "0") {
    body = (
      <StatusScreen icon={CircleSlash} tone="warning" title={tr("paidCancelTitle")} description={tr("paidCancelBody")}>
        <Button asChild variant="outline">
          <a href={withPrefix(restartPath(slug, params))}>
            <RotateCcw />
            {tr("startOver")}
          </a>
        </Button>
      </StatusScreen>
    );
  } else if (payload?.gate) {
    body = <GateScreen gate={payload.gate} gateMessage={payload.gateMessage} form={form} tr={tr} onPassword={unlock} focusOnMount={gateFromSubmit} />;
  } else {
    body = (
      <FormRunner
        key={`${form.id}-${payload?.variant?.id || ""}`}
        slug={slug}
        form={form}
        user={payload?.user || null}
        variant={payload?.variant || null}
        recordPrefill={payload?.recordPrefill}
        params={params}
        password={password}
        tr={tr}
        locale={locale}
        embed={params.embed}
        onSubmitted={notifySubmitted}
        onGate={(gate, message) => {
          setGateFromSubmit(true);
          setPayload((cur) => ({ ...cur, gate, gateMessage: message || cur?.gateMessage || "" }));
        }}
      />
    );
  }

  return (
    <FillerShell theme={theme} embed={params.embed} transparent={params.embed && !params.solid} dir={isRtl(locale) ? "rtl" : "ltr"} lang={locale} header={header} footer={<FillerFooter tr={tr} branding={Boolean(form && theme.branding && status === "ready")} />}>
      {params.embed && languageSwitcher ? <div className="mx-auto mb-3 flex w-full max-w-2xl justify-end empty:hidden">{languageSwitcher}</div> : null}
      {body}
    </FillerShell>
  );
}

export default FormFillerContent;
