// Funnel events (forms.form_events: view → start → submit) and abandoned sessions (forms.partials), derived from the
// seeded responses so analytics, drop-off, attribution and A/B screens agree with the inbox.
import { FORM_DEF, FORM_ID } from "./forms.js";
import { ATTRIBUTION, respondent } from "./responses.js";
import { between, minutesAgo, noise, pick, sid, weighted } from "./helpers.js";

const LAYOUT_TYPES = new Set(["page", "heading", "content", "statement", "image", "video", "hidden", "calculated", "total"]);
const ago = (iso) => (Date.now() - Date.parse(iso)) / 60000;

export function analyticsSeed({ responses }) {
  const events = [];
  const partials = [];
  let eventN = 0;
  let partialN = 0;

  const event = (formId, type, sessionId, atMin, variant, metadata = {}) => {
    eventN += 1;
    events.push({ id: sid("event", eventN), form_id: formId, type, session_id: sessionId, variant, metadata, created_at: minutesAgo(Math.max(1, atMin)) });
  };

  for (const [k, key] of Object.keys(FORM_ID).entries()) {
    const formId = FORM_ID[key];
    const def = FORM_DEF[key];
    const rows = responses.filter((r) => r.form_id === formId);
    if (!rows.length) continue;
    const abTest = def.settings?.abTest?.enabled ? def.settings.abTest.variants.map((v) => v.id) : null;
    const inputs = def.fields.filter((f) => !LAYOUT_TYPES.has(f.type));

    // Every submission is a full session.
    rows.forEach((r, i) => {
      const at = ago(r.submitted_at);
      const took = (r.completion_ms || 60000) / 60000;
      const session = `${key}-s${i}`;
      const variant = abTest ? r.metadata?.variant || abTest[i % abTest.length] : null;
      const attribution = { ...(r.metadata?.referrer ? { referrer: r.metadata.referrer } : {}), ...(r.metadata?.utm ? { utm: r.metadata.utm } : {}) };
      event(formId, "view", session, at + took + between(i + eventN, 1, 6), variant, attribution);
      event(formId, "start", session, at + took, variant);
      event(formId, "submit", session, at, variant);
    });

    // Visitors who looked and left, and who started but never submitted; timed like the real traffic.
    const lookers = Math.round(rows.length * 1.4);
    const starters = Math.round(rows.length * 0.45);
    for (let j = 0; j < lookers + starters; j += 1) {
      const n = (k + 1) * 10000 + j * 7;
      const base = ago(pick(rows, n).submitted_at);
      const at = Math.max(5, base + between(n + 1, -2880, 2880));
      const session = `${key}-v${j}`;
      const variant = abTest ? abTest[j % abTest.length] : null;
      event(formId, "view", session, at + between(n + 2, 1, 4), variant, JSON.parse(JSON.stringify(weighted(n + 3, ATTRIBUTION))));
      if (j < lookers) continue;
      event(formId, "start", session, at, variant);

      // Roughly half the abandoned starts leave a partial behind.
      if (noise(n + 4) > 0.55 || partialN >= 48) continue;
      const template = pick(rows, n + 5);
      const reached = between(n + 6, 1, Math.max(1, inputs.length - 1));
      const answers = {};
      for (const f of inputs.slice(0, reached)) if (f.id in template.answers) answers[f.id] = template.answers[f.id];
      const who = respondent(n + 7);
      for (const f of inputs.slice(0, reached)) {
        if (f.type === "email") answers[f.id] = who.email;
        if (f.type === "name") answers[f.id] = { first: who.first, last: who.last };
      }
      const nextField = inputs[reached] || inputs[inputs.length - 1];
      const pageIndex = def.fields.slice(0, def.fields.indexOf(nextField)).filter((f) => f.type === "page").length;
      // A few sessions are still live (touched in the last half hour) or were resumed and completed.
      const live = partialN % 9 === 0;
      const updated = live ? between(n + 8, 3, 25) : at - between(n + 9, 2, 20);
      partialN += 1;
      partials.push({
        id: sid("partial", partialN),
        form_id: formId,
        token: `halcyon-${key}-${partialN}`,
        answers,
        last_field_id: nextField.id,
        page_index: pageIndex,
        progress: Math.round((reached / inputs.length) * 100) / 100,
        respondent_email: Object.values(answers).includes(who.email) ? who.email : null,
        metadata: { sessionId: session },
        created_by: null,
        created_at: minutesAgo(live ? updated + between(n + 10, 2, 12) : at),
        updated_at: minutesAgo(Math.max(1, updated)),
        completed_at: !live && partialN % 7 === 0 ? minutesAgo(Math.max(1, updated - 60)) : null,
        deleted_at: null,
      });
    }
  }

  return { form_events: events, partials };
}
