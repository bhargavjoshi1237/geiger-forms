"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2Off, RotateCcw } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { callApi } from "@/lib/forms/api";
import { withPrefix } from "@/lib/workspace/base-path";
import { detectRespondent, validateAnswers, visiblePages } from "@/lib/forms/logic";
import { isInputField } from "@/lib/forms/field-types";
import { clearDraft, clearQueued, loadDraft, loadPartialToken, loadQueued, markOnce, queueSubmission, saveDraft, savePartialToken, sessionIdFor } from "@/lib/forms/draft";
import { FormFieldRenderer } from "@/components/forms/form-field-renderer";
import { fieldIds } from "@/components/forms/fields/field-shell";
import { buildInitialAnswers, partialAnswers, postEvent, publicApi } from "./session";
import { AttestationBlock, DelegateBlock, Honeypot, PolicyBlock, TurnstileWidget } from "./submit-extras";
import { Banner } from "./banners";
import { StatusScreen } from "./filler-shell";
import { ThankYou } from "./thank-you";
import { SaveResumeDialog } from "./save-resume-dialog";
import { ClassicView } from "./classic-view";
import { ConversationalView } from "./conversational-view";
import { WelcomeScreen } from "./welcome-screen";

const has = (obj) => Object.keys(obj || {}).length > 0;
const LAYOUT_TYPES = new Set(["heading", "content"]);

function isAnswered(value) {
  if (value == null || value === "" || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.values(value).some((v) => v != null && v !== "");
  return true;
}

// Navigates the top window (embeds escape the iframe for Stripe / redirects).
function navigateTop(url, embed) {
  try {
    if (embed && window.top && window.top !== window) {
      window.top.location.href = url;
      return;
    }
  } catch {
    window.open(url, "_blank", "noopener");
    return;
  }
  window.location.assign(url);
}

function focusField(field) {
  if (!field || typeof document === "undefined") return;
  const ids = fieldIds(field);
  setTimeout(() => {
    const el = document.getElementById(ids.control) || document.getElementById(ids.label);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el && typeof el.focus === "function") el.focus({ preventScroll: true });
  }, 60);
}

// Drives one respondent session: prefill, pages/steps, validation, partials, drafts, extras and submission.
export function FormRunner({ slug, form, user, variant, params, password, tr, locale, embed, onSubmitted, onGate }) {
  const settings = form.settings;
  const fields = form.fieldDefs;
  const conversational = settings.layout === "conversational";
  const offlineEnabled = settings.offline !== false;
  const welcome = settings.welcome || {};
  const title = variant?.title || form.title;
  const description = variant?.description ?? form.description;

  const showDelegate = Boolean(user && settings.allowDelegate);
  const showAttestation = Boolean(settings.attestation?.enabled);
  const showPolicy = Boolean(settings.policy?.enabled);
  const captchaKey = settings.spam?.captcha ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "" : "";
  const hasExtras = showDelegate || showAttestation || showPolicy || Boolean(captchaKey);
  const reviewSeconds = Math.max(0, Number(settings.minReviewSeconds) || 0);

  const initialAnswers = useCallback(() => buildInitialAnswers(fields, settings, params, user), [fields, settings, params, user]);
  const [answers, setAnswers] = useState(initialAnswers);
  const [errors, setErrors] = useState({});
  const [extraErrors, setExtraErrors] = useState({});
  const [stage, setStage] = useState(() => (welcome.enabled && !params.edit && !params.resume ? "welcome" : "form"));
  const [pageId, setPageId] = useState(null);
  const [stepId, setStepId] = useState(null);
  const [startIndex, setStartIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
  const [result, setResult] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [editState, setEditState] = useState(() => (params.edit ? { status: "loading" } : null));
  const [draftOffer, setDraftOffer] = useState(null);
  const [delegate, setDelegate] = useState({ enabled: false, forName: "", forEmail: "" });
  const [attested, setAttested] = useState(false);
  const [policy, setPolicy] = useState({ scrolled: false, agreed: false, typedName: "" });
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKeyN, setCaptchaKeyN] = useState(0);
  const [hp, setHp] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [reviewLeft, setReviewLeft] = useState(reviewSeconds);

  const sessionRef = useRef("");
  const startedRef = useRef(false);
  const startAtRef = useRef(0);
  const partialTokenRef = useRef(params.resume || null);
  const partialInFlight = useRef(null);
  const lastFieldRef = useRef(null);
  const answersRef = useRef(answers);
  const indexRef = useRef(0);
  const progressRef = useRef(0);
  const advanceTimer = useRef(null);
  const nextRef = useRef(() => {});

  // --- Derived pages / steps ---------------------------------------------------

  const pages = useMemo(() => {
    const all = visiblePages(fields, answers, "");
    const shown = all.filter((p) => p.fields.some((f) => f.type !== "hidden"));
    return shown.length ? shown : [all[0]];
  }, [fields, answers]);

  const steps = useMemo(() => {
    if (!conversational) return [];
    const out = [];
    let preface = [];
    for (const page of pages) {
      for (const field of page.fields) {
        if (field.type === "hidden") continue;
        if (LAYOUT_TYPES.has(field.type)) {
          preface.push(field);
          continue;
        }
        out.push({ id: field.id, field, preface, pageTitle: page.title });
        preface = [];
      }
    }
    if (preface.length) out.push({ id: "__outro", field: null, preface });
    if (hasExtras || out.length === 0) out.push({ id: "__submit", field: null, preface: [], submit: true });
    return out;
  }, [conversational, pages, hasExtras]);

  const pageFound = pages.findIndex((p) => p.id === pageId);
  const pageIndex = pageFound >= 0 ? pageFound : Math.min(startIndex, pages.length - 1);
  const page = pages[pageIndex];
  const stepFound = steps.findIndex((s) => s.id === stepId);
  const stepIndex = stepFound >= 0 ? stepFound : Math.min(startIndex, Math.max(0, steps.length - 1));
  const step = steps[stepIndex];
  const currentIndex = conversational ? stepIndex : pageIndex;

  const inputFields = useMemo(() => pages.flatMap((p) => p.fields).filter((f) => isInputField(f.type) && f.type !== "hidden"), [pages]);
  const progress = inputFields.length ? inputFields.filter((f) => isAnswered(answers[f.id])).length / inputFields.length : 0;

  useEffect(() => {
    answersRef.current = answers;
    indexRef.current = currentIndex;
    progressRef.current = progress;
  }, [answers, currentIndex, progress]);

  // --- Session, events, edit / resume / draft restore -------------------------

  useEffect(() => {
    sessionRef.current = sessionIdFor(slug);
    if (!partialTokenRef.current && !params.edit) partialTokenRef.current = loadPartialToken(slug);
    if (markOnce(slug, "view")) {
      postEvent(slug, "view", { sessionId: sessionRef.current, variant: variant?.id || null, utm: params.utm, referrer: document.referrer || params.ref || "" });
    }
  }, [slug, params, variant]);

  useEffect(() => {
    if (!params.edit) return undefined;
    let active = true;
    callApi(publicApi(slug, `/edit?token=${encodeURIComponent(params.edit)}`)).then((res) => {
      if (!active) return;
      if (res.ok && res.data?.answers) {
        setAnswers((cur) => ({ ...cur, ...res.data.answers }));
        setEditState({ status: "ready", expiresAt: res.data.expiresAt || null });
      } else {
        setEditState({ status: "invalid", message: res.data?.error || "" });
      }
    });
    return () => {
      active = false;
    };
  }, [slug, params.edit]);

  useEffect(() => {
    if (!params.resume) return undefined;
    let active = true;
    callApi(publicApi(slug, `/partial?token=${encodeURIComponent(params.resume)}`)).then((res) => {
      if (!active) return;
      if (res.ok && res.data?.answers) {
        startedRef.current = true;
        setAnswers((cur) => ({ ...cur, ...res.data.answers }));
        setStartIndex(Number(res.data.pageIndex) || 0);
        setNotice({ tone: "success", text: tr("resumeRestored") });
      }
    });
    return () => {
      active = false;
    };
  }, [slug, params.resume, tr]);

  useEffect(() => {
    if (!offlineEnabled || params.edit || params.resume) return;
    const queued = loadQueued(slug);
    if (queued) return;
    const draft = loadDraft(slug);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft && Object.values(draft.answers || {}).some(isAnswered)) setDraftOffer(draft);
  }, [slug, offlineEnabled, params.edit, params.resume]);

  useEffect(() => {
    if (stage === "form" && !startAtRef.current) startAtRef.current = Date.now();
  }, [stage]);

  // Minimum review time before submit unlocks.
  useEffect(() => {
    if (stage !== "form" || reviewLeft <= 0) return undefined;
    const timer = setTimeout(() => setReviewLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [stage, reviewLeft]);

  // --- Answers ------------------------------------------------------------------

  const markStarted = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (markOnce(slug, "start")) {
      postEvent(slug, "start", { sessionId: sessionRef.current, variant: variant?.id || null, utm: params.utm, referrer: document.referrer || params.ref || "" });
    }
  }, [slug, variant, params]);

  const setAnswer = useCallback(
    (id, value) => {
      lastFieldRef.current = id;
      setAnswers((cur) => {
        const next = { ...cur };
        if (value === undefined) delete next[id];
        else next[id] = value;
        return next;
      });
      setErrors((cur) => {
        if (!cur[id]) return cur;
        const next = { ...cur };
        delete next[id];
        return next;
      });
      markStarted();
    },
    [markStarted],
  );

  // --- Partials (drop-off analytics + save & resume) ---------------------------

  const sendPartial = useCallback(async () => {
    if (partialInFlight.current) await partialInFlight.current;
    const current = answersRef.current;
    const run = callApi(publicApi(slug, "/partial"), {
      method: "POST",
      body: {
        token: partialTokenRef.current || undefined,
        answers: partialAnswers(current),
        lastFieldId: lastFieldRef.current,
        pageIndex: indexRef.current,
        progress: Math.round(progressRef.current * 100),
        email: detectRespondent(fields, current).email || undefined,
      },
    }).then((res) => {
      if (res.ok && res.data?.token) {
        partialTokenRef.current = res.data.token;
        savePartialToken(slug, res.data.token);
      }
      return res.ok ? res.data?.token || partialTokenRef.current : null;
    });
    partialInFlight.current = run;
    const token = await run;
    partialInFlight.current = null;
    return token;
  }, [slug, fields]);

  useEffect(() => {
    if (!startedRef.current || params.edit || stage !== "form") return undefined;
    const timer = setTimeout(() => {
      sendPartial();
    }, 2000);
    return () => clearTimeout(timer);
  }, [answers, currentIndex, stage, params.edit, sendPartial]);

  // Local draft for offline-capable forms.
  useEffect(() => {
    if (!offlineEnabled || !startedRef.current || stage !== "form") return undefined;
    const timer = setTimeout(() => saveDraft(slug, { answers, pageIndex: currentIndex }), 600);
    return () => clearTimeout(timer);
  }, [answers, currentIndex, stage, slug, offlineEnabled]);

  // --- Submission ---------------------------------------------------------------

  const errorMessage = useCallback(
    (res) => {
      const data = res.data || {};
      if (res.status === 0) return tr("errorNetwork");
      switch (data.code) {
        case "validation":
          return tr("errorValidation");
        case "rate_limited":
          return tr("errorRateLimited");
        case "duplicate":
          return data.error || tr("errorDuplicate");
        case "captcha":
          return tr("errorCaptcha");
        case "closed":
        case "gate":
          return data.error || tr("closedDefault");
        default:
          return data.error || tr("errorGeneric");
      }
    },
    [tr],
  );

  const handleSuccess = useCallback(
    (data) => {
      clearDraft(slug);
      clearQueued(slug);
      savePartialToken(slug, null);
      partialTokenRef.current = null;
      setResult(data || {});
      setStage("done");
      setSubmitState({ status: "idle", message: "" });
      onSubmitted?.(data || {});
      if (typeof window !== "undefined" && !embed) window.scrollTo({ top: 0, behavior: "smooth" });
      if (data?.checkoutUrl) {
        setRedirecting(true);
        navigateTop(data.checkoutUrl, embed);
        return;
      }
      const redirect = data?.thankYou?.redirectUrl || (settings.thankYouType === "redirect" ? settings.thankYouUrl : "");
      if (redirect) {
        setRedirecting(true);
        setTimeout(() => navigateTop(redirect, embed), 1200);
      }
    },
    [slug, embed, onSubmitted, settings.thankYouType, settings.thankYouUrl],
  );

  const flushQueue = useCallback(async () => {
    const item = loadQueued(slug);
    if (!item) return;
    setSubmitState({ status: "retrying", message: "" });
    const res = await callApi(publicApi(slug, "/submit"), { method: "POST", body: item.body });
    if (res.ok) handleSuccess(res.data);
    else if (res.status === 0) setSubmitState({ status: "queued", message: "" });
    else {
      clearQueued(slug);
      setSubmitState({ status: "error", message: errorMessage(res) });
    }
  }, [slug, handleSuccess, errorMessage]);

  // Online/offline tracking; a queued submission retries when the connection returns (or on the next load).
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine !== false);
    const onOnline = () => {
      update();
      if (offlineEnabled) flushQueue();
    };
    update();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", update);
    const queued = offlineEnabled ? loadQueued(slug) : null;
    if (queued) {
      // Restores the queued submission's answers from local storage on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers((cur) => ({ ...cur, ...(queued.body?.answers || {}) }));
      setStage("form");
      if (navigator.onLine !== false) flushQueue();
      else setSubmitState({ status: "queued", message: "" });
    }
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", update);
    };
  }, [slug, offlineEnabled, flushQueue]);

  const goToFirstError = useCallback(
    (errs) => {
      const firstField = fields.find((f) => errs[f.id]);
      if (!firstField) return;
      if (conversational) {
        const target = steps.find((s) => s.field?.id === firstField.id);
        if (target) {
          setDirection(-1);
          setStepId(target.id);
        }
      } else {
        const target = pages.find((p) => p.fields.some((f) => f.id === firstField.id));
        if (target) setPageId(target.id);
      }
      focusField(firstField);
    },
    [fields, conversational, steps, pages],
  );

  const extrasCheck = () => {
    const ex = {};
    if (showDelegate && delegate.enabled && !delegate.forName.trim()) ex.delegate = tr("required");
    if (showAttestation && !attested) ex.attestation = tr("required");
    if (showPolicy) {
      const p = settings.policy || {};
      const needsScroll = p.requireScroll !== false && Boolean(p.body);
      if (needsScroll && !policy.scrolled) ex.policy = tr("policyScroll");
      else if (p.requireName !== false && policy.typedName.trim().length < 2) ex.policy = tr("policyNameMismatch");
      else if (!policy.agreed) ex.policy = tr("required");
    }
    if (captchaKey && !captchaToken) ex.captcha = tr("errorCaptcha");
    return ex;
  };

  const submit = async () => {
    if (submitState.status === "submitting" || stage !== "form") return;
    const errs = validateAnswers(fields, answers);
    if (has(errs)) {
      setErrors(errs);
      goToFirstError(errs);
      setSubmitState({ status: "error", message: tr("errorValidation") });
      return;
    }
    const ex = extrasCheck();
    setExtraErrors(ex);
    if (has(ex)) {
      setSubmitState({ status: "error", message: tr("errorValidation") });
      return;
    }
    if (reviewLeft > 0) return;

    const body = {
      answers,
      sessionId: sessionRef.current || sessionIdFor(slug),
      partialToken: partialTokenRef.current || null,
      editToken: params.edit || null,
      hp: settings.spam?.honeypot ? hp : undefined,
      captchaToken: captchaToken || undefined,
      password: password || undefined,
      signedToken: params.signedToken || undefined,
      completionMs: startAtRef.current ? Date.now() - startAtRef.current : null,
      variant: variant?.id || null,
      utm: params.utm,
      referrer: (typeof document !== "undefined" && document.referrer) || params.ref || "",
      delegate: showDelegate && delegate.enabled ? { forName: delegate.forName.trim(), forEmail: delegate.forEmail.trim() } : null,
      attestation: showAttestation ? attested : undefined,
      policy: showPolicy ? { typedName: policy.typedName.trim(), scrolled: policy.scrolled } : undefined,
    };

    setSubmitState({ status: "submitting", message: "" });
    const res = await callApi(publicApi(slug, "/submit"), { method: "POST", body });
    if (res.ok) {
      handleSuccess(res.data);
      return;
    }
    if (res.status === 0 && offlineEnabled) {
      queueSubmission(slug, body);
      setSubmitState({ status: "queued", message: "" });
      return;
    }
    const data = res.data || {};
    if (data.gate && onGate && !params.edit) {
      onGate(data.gate, data.error);
      return;
    }
    if (data.fieldErrors && has(data.fieldErrors)) {
      const { __attestation, __policy, ...fieldErrors } = data.fieldErrors;
      if (__attestation || __policy) setExtraErrors({ attestation: __attestation, policy: __policy });
      if (has(fieldErrors)) {
        setErrors(fieldErrors);
        goToFirstError(fieldErrors);
      }
    }
    if (captchaKey) {
      setCaptchaToken("");
      setCaptchaKeyN((n) => n + 1);
    }
    setSubmitState({ status: "error", message: errorMessage(res) });
  };

  // --- Navigation -----------------------------------------------------------------

  const scrollTop = () => {
    if (typeof window !== "undefined" && !embed) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNextPage = () => {
    const ids = new Set(page.fields.map((f) => f.id));
    const errs = validateAnswers(fields, answers, ids);
    if (has(errs)) {
      setErrors((cur) => ({ ...cur, ...errs }));
      focusField(page.fields.find((f) => errs[f.id]));
      return;
    }
    setSubmitState({ status: "idle", message: "" });
    setDirection(1);
    setPageId(pages[pageIndex + 1].id);
    scrollTop();
  };

  const goPrevPage = () => {
    if (pageIndex === 0) return;
    setDirection(-1);
    setPageId(pages[pageIndex - 1].id);
    scrollTop();
  };

  const isLastStep = stepIndex >= steps.length - 1;

  const goNextStep = () => {
    clearTimeout(advanceTimer.current);
    if (step?.field) {
      const errs = validateAnswers(fields, answers, new Set([step.field.id]));
      if (has(errs)) {
        setErrors((cur) => ({ ...cur, ...errs }));
        focusField(step.field);
        return;
      }
    }
    if (isLastStep) {
      submit();
      return;
    }
    setDirection(1);
    setStepId(steps[stepIndex + 1].id);
  };

  const goPrevStep = () => {
    clearTimeout(advanceTimer.current);
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepId(steps[stepIndex - 1].id);
  };

  useEffect(() => {
    nextRef.current = goNextStep;
  });

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Choice clicks in conversational mode auto-advance after a beat (reads fresh state via nextRef).
  const scheduleAdvance = useCallback(() => {
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => nextRef.current(), 320);
  }, []);

  const submitAnother = () => {
    startedRef.current = false;
    startAtRef.current = 0;
    setAnswers(initialAnswers());
    setErrors({});
    setExtraErrors({});
    setResult(null);
    setRedirecting(false);
    setPageId(null);
    setStepId(null);
    setStartIndex(0);
    setAttested(false);
    setPolicy({ scrolled: false, agreed: false, typedName: "" });
    setDelegate({ enabled: false, forName: "", forEmail: "" });
    setCaptchaToken("");
    setCaptchaKeyN((n) => n + 1);
    setReviewLeft(reviewSeconds);
    setNotice(null);
    setStage(welcome.enabled ? "welcome" : "form");
  };

  // --- Render helpers ---------------------------------------------------------------

  const renderField = (field, { large = false, autoFocus = false } = {}) => (
    <FormFieldRenderer
      key={field.id}
      field={field}
      value={answers[field.id]}
      onChange={(v) => setAnswer(field.id, v)}
      onSetAnswer={setAnswer}
      error={errors[field.id]}
      allFields={fields}
      answers={answers}
      form={form}
      slug={slug}
      locale={locale}
      large={large}
      autoFocus={autoFocus}
      disabled={submitState.status === "submitting"}
      onAdvance={large && field.type === "select" ? scheduleAdvance : undefined}
      onEnter={large ? () => nextRef.current() : undefined}
    />
  );

  const extras = hasExtras || settings.spam?.honeypot ? (
    <div className="grid gap-3">
      {settings.spam?.honeypot && <Honeypot value={hp} onChange={setHp} />}
      {showDelegate && <DelegateBlock value={delegate} onChange={setDelegate} tr={tr} error={extraErrors.delegate} />}
      {showPolicy && <PolicyBlock policy={settings.policy} value={policy} onChange={setPolicy} tr={tr} error={extraErrors.policy} />}
      {showAttestation && (
        <AttestationBlock statement={settings.attestation.statement || tr("attestationTitle")} checked={attested} onChange={setAttested} tr={tr} error={extraErrors.attestation} />
      )}
      {captchaKey && <TurnstileWidget key={captchaKeyN} siteKey={captchaKey} onToken={setCaptchaToken} theme={settings.theme?.mode === "light" ? "light" : settings.theme?.mode === "dark" ? "dark" : "auto"} error={extraErrors.captcha} />}
    </div>
  ) : null;

  const banners = (
    <div className="grid gap-2.5 empty:hidden">
      {editState?.status === "ready" && (
        <Banner tone="edit">
          {editState.expiresAt ? tr("editingBanner", { date: new Date(editState.expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) }) : tr("editingBannerOpen")}
        </Banner>
      )}
      {draftOffer && (
        <Banner
          tone="info"
          title={tr("restoreDraftTitle")}
          actions={
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearDraft(slug);
                  setDraftOffer(null);
                }}
              >
                {tr("discard")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  startedRef.current = true;
                  setAnswers((cur) => ({ ...cur, ...draftOffer.answers }));
                  setStartIndex(Number(draftOffer.pageIndex) || 0);
                  setPageId(null);
                  setStepId(null);
                  setDraftOffer(null);
                  setStage("form");
                }}
              >
                {tr("restore")}
              </Button>
            </>
          }
        >
          {tr("restoreDraftBody", { when: draftOffer.savedAt ? new Date(draftOffer.savedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "" })}
        </Banner>
      )}
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      {offlineEnabled && !isOnline && submitState.status !== "queued" && <Banner tone="offline">{tr("offlineBanner")}</Banner>}
      {submitState.status === "queued" && <Banner tone="offline">{tr("offlineQueued")}</Banner>}
      {submitState.status === "retrying" && <Banner tone="info">{tr("offlineRetrying")}</Banner>}
    </div>
  );

  // --- Stages -------------------------------------------------------------------------

  if (stage === "done") {
    return (
      <ThankYou
        result={result}
        form={form}
        answers={answers}
        slug={slug}
        tr={tr}
        redirecting={redirecting}
        onSubmitAnother={params.edit ? undefined : submitAnother}
      />
    );
  }

  if (editState?.status === "invalid") {
    return (
      <StatusScreen icon={Link2Off} tone="danger" title={tr("editExpired")} description={editState.message || ""}>
        <Button asChild variant="outline">
          <a href={withPrefix(`/form/${encodeURIComponent(slug)}${embed ? "?embed=1" : ""}`)}>
            <RotateCcw />
            {tr("startOver")}
          </a>
        </Button>
      </StatusScreen>
    );
  }

  if (stage === "welcome") {
    return (
      <WelcomeScreen
        form={form}
        title={welcome.title || title}
        body={welcome.body || description}
        buttonLabel={welcome.buttonLabel || tr("start")}
        questionCount={inputFields.length}
        banners={banners}
        tr={tr}
        onStart={() => {
          setStage("form");
          scrollTop();
        }}
      />
    );
  }

  const shared = {
    form,
    title,
    description,
    tr,
    banners,
    extras,
    submitState,
    reviewLeft,
    saveResume: Boolean(settings.saveResume),
    onSaveLater: () => setResumeOpen(true),
    renderField,
    direction,
    editing: editState?.status === "ready",
    embed,
  };

  return (
    <>
      {conversational ? (
        <ConversationalView
          {...shared}
          step={step}
          steps={steps}
          stepIndex={stepIndex}
          isLastStep={isLastStep}
          progress={steps.length > 1 ? stepIndex / (steps.length - 1) : 1}
          answers={answers}
          setAnswer={setAnswer}
          scheduleAdvance={scheduleAdvance}
          onNext={goNextStep}
          onBack={goPrevStep}
        />
      ) : (
        <ClassicView
          {...shared}
          pages={pages}
          page={page}
          pageIndex={pageIndex}
          onNext={goNextPage}
          onBack={goPrevPage}
          onSubmit={submit}
        />
      )}
      {settings.saveResume && (
        <SaveResumeDialog
          open={resumeOpen}
          onOpenChange={setResumeOpen}
          slug={slug}
          flushPartial={sendPartial}
          defaultEmail={detectRespondent(fields, answers).email || user?.email || ""}
          tr={tr}
        />
      )}
    </>
  );
}
