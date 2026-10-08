-- Demo form behind the landing page's "Preview Filler" link (/form/demo).
-- Idempotent: re-running refreshes the schema/settings and keeps it Published. Stable UUID; never ledgered.

insert into forms.forms (id, slug, title, description, status, category, tags, schema, settings, is_template, deleted_at, published_at)
values (
  'b6f0c7a2-4d1e-4f3a-9c55-0d3e6a1f2b10',
  'demo',
  'Geiger Summit feedback',
  'Tell us how the summit went. It takes about two minutes — your answers shape next year''s event.',
  'Published',
  'Feedback',
  array['demo', 'events'],
  $json${
    "fields": [
      { "id": "intro", "type": "heading", "title": "About you", "label": "About you", "hint": "A couple of quick details so we can follow up." },
      { "id": "full-name", "type": "name", "title": "Your name", "label": "Your name", "required": true },
      { "id": "email", "type": "email", "title": "Email", "label": "Email", "placeholder": "you@company.com", "required": true, "width": "half", "info": "We only use this to send you the session recordings." },
      { "id": "role", "type": "dropdown", "title": "Role", "label": "Role", "width": "half", "options": ["Engineering", "Design", "Product", "Leadership", "Other"] },
      { "id": "attendance", "type": "select", "title": "How did you attend?", "label": "How did you attend?", "required": true, "options": ["In person", "Online"] },
      { "id": "city", "type": "text", "title": "Which venue were you at?", "label": "Which venue were you at?", "placeholder": "e.g. Berlin", "conditions": [{ "id": "c1", "fieldId": "attendance", "operator": "equals", "value": "In person" }] },
      { "id": "page-experience", "type": "page", "title": "Your experience" },
      { "id": "overall", "type": "rating", "title": "Overall experience", "label": "How would you rate the summit overall?", "required": true, "config": { "max": 5 } },
      { "id": "satisfaction", "type": "calculated", "title": "Satisfaction index", "label": "Your satisfaction index", "formula": "ROUND({Overall experience} * 20)", "config": { "format": "percent", "countInScore": false } },
      { "id": "nps", "type": "nps", "title": "Recommend", "label": "How likely are you to recommend the summit to a colleague?", "required": true },
      { "id": "enjoyed", "type": "multiselect", "title": "Highlights", "label": "What did you enjoy most?", "hint": "Pick up to three.", "options": ["Keynotes", "Workshops", "Networking", "Demos", "Food & venue"], "validation": { "maxSelect": 3 } },
      { "id": "sessions", "type": "matrix", "title": "Sessions", "label": "Rate each track", "options": ["Poor", "Okay", "Good", "Great"], "config": { "rows": ["Design systems", "AI tooling", "Platform"] } },
      { "id": "page-next", "type": "page", "title": "Next year" },
      { "id": "topics", "type": "ranking", "title": "Topics", "label": "Rank the topics you'd like more of next year", "options": ["Hands-on workshops", "Case studies", "Product roadmap", "Community meetups"] },
      { "id": "pace", "type": "scale", "title": "Pace", "label": "How was the pace of the agenda?", "config": { "min": 1, "max": 7, "minLabel": "Too slow", "maxLabel": "Too packed" } },
      { "id": "improve", "type": "textarea", "title": "Improvements", "label": "Anything we should change?", "placeholder": "Be as candid as you like.", "validation": { "maxLength": 1000 } },
      { "id": "follow-up", "type": "checkbox", "title": "Follow-up", "label": "You can contact me about next year's summit.", "conditions": [{ "id": "c2", "fieldId": "nps", "operator": "gte", "value": "7" }] },
      { "id": "source", "type": "hidden", "title": "Source", "prefillKey": "utm_source", "defaultValue": "direct" }
    ]
  }$json$::jsonb,
  $json${
    "theme": { "mode": "dark", "accent": "#7c83ff", "radius": "md", "font": "sans", "background": "gradient" },
    "coverStyle": "none",
    "branding": true,
    "layout": "classic",
    "progressBar": true,
    "locale": "en",
    "welcome": { "enabled": true, "title": "Geiger Summit feedback", "body": "Thanks for joining us! Three short sections — about you, your experience, and what you'd like next year.", "buttonLabel": "Start" },
    "submitAnother": true,
    "thankYouType": "message",
    "thankYouTitle": "Thanks, {Your name}!",
    "thankYouText": "Your feedback is in. We read every response and will share what we change.",
    "saveResume": true,
    "offline": true,
    "showPollResults": false,
    "access": { "mode": "public", "orgDomain": "", "passwordHash": "", "passwordSalt": "", "onePerUser": false },
    "spam": { "honeypot": true, "captcha": false, "rateLimit": 20 },
    "prefill": { "url": true, "user": true }
  }$json$::jsonb,
  false,
  null,
  now()
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  schema = excluded.schema,
  settings = excluded.settings,
  status = 'Published',
  is_template = false,
  deleted_at = null,
  published_at = coalesce(forms.forms.published_at, now());
