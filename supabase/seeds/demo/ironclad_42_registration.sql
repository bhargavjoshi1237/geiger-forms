-- "Ironclad 42 — fight week registration" (/form/ironclad-42): the Fight Night theme on a real form, in the Geiger Notes project (ebcc7910-1a0e-4e91-8c3b-752f3c4292d3).
-- Fictional event; payments stay off, so the order total is informational and nothing is charged. Idempotent by stable id; never ledgered.

do $guard$ begin
  if not exists (select 1 from public.projects where id = 'ebcc7910-1a0e-4e91-8c3b-752f3c4292d3') then
    raise exception 'Project ebcc7910-1a0e-4e91-8c3b-752f3c4292d3 does not exist';
  end if;
end $guard$;

insert into forms.forms (id, project_id, slug, title, description, status, category, tags, schema, settings, is_template, deleted_at, published_at)
values (
  '69d088ec-8a71-44ba-8e6c-17955d98353f',
  'ebcc7910-1a0e-4e91-8c3b-752f3c4292d3',
  'ironclad-42',
  'Ironclad 42 — fight week registration',
  'Lock in your seats for the March 6 card in Las Vegas, add fight-week extras and tell us how you like to watch. It takes about three minutes.',
  'Published',
  'Event',
  array['demo', 'events', 'registration'],
  $json${
    "fields": [
      { "id": "seat", "type": "picture", "title": "Where do you want to sit?", "label": "Where do you want to sit?", "hint": "Tickets are priced per seat.", "required": true, "options": ["Cageside", "Floor", "Fight Week pass"], "config": { "columns": 3, "images": {
        "Cageside": { "url": "https://images.pexels.com/photos/11356420/pexels-photo-11356420.jpeg?auto=compress&cs=tinysrgb&w=900", "alt": "A referee standing over a fighter on the canvas, seen from ringside" },
        "Floor": { "url": "https://images.pexels.com/photos/6296002/pexels-photo-6296002.jpeg?auto=compress&cs=tinysrgb&w=900", "alt": "Two fighters trading strikes under bright lights" },
        "Fight Week pass": { "url": "https://images.pexels.com/photos/29015505/pexels-photo-29015505.jpeg?auto=compress&cs=tinysrgb&w=900", "alt": "A fighter preparing inside the cage" }
      } } },
      { "id": "tickets-cageside", "type": "product", "title": "Cageside seats", "label": "Cageside seats", "required": true, "config": { "price": 1450, "quantityMode": "stepper", "maxQuantity": 4, "description": "Rows A–C, inside the first five metres." }, "conditions": [{ "id": "c-cageside", "fieldId": "seat", "operator": "equals", "value": "Cageside" }] },
      { "id": "tickets-floor", "type": "product", "title": "Floor seats", "label": "Floor seats", "required": true, "config": { "price": 690, "quantityMode": "stepper", "maxQuantity": 6, "description": "Rows D–M, with a cage-level view." }, "conditions": [{ "id": "c-floor", "fieldId": "seat", "operator": "equals", "value": "Floor" }] },
      { "id": "tickets-pass", "type": "product", "title": "Fight Week passes", "label": "Fight Week passes", "required": true, "config": { "price": 420, "quantityMode": "stepper", "maxQuantity": 6, "description": "Lower bowl seat, plus the weigh-ins and open workouts." }, "conditions": [{ "id": "c-pass", "fieldId": "seat", "operator": "equals", "value": "Fight Week pass" }] },
      { "id": "party", "type": "select", "title": "Who's coming with you?", "label": "Who's coming with you?", "required": true, "options": ["Just me", "Bringing a guest", "A group of four or more"] },

      { "id": "page-about", "type": "page", "title": "About you" },
      { "id": "first-name", "type": "text", "title": "First name", "label": "First name", "placeholder": "Alex", "required": true, "width": "half", "validation": { "maxLength": 80 } },
      { "id": "last-name", "type": "text", "title": "Last name", "label": "Last name", "placeholder": "Rivera", "required": true, "width": "half", "validation": { "maxLength": 80 } },
      { "id": "email", "type": "email", "title": "Email", "label": "Email", "placeholder": "you@email.com", "required": true, "width": "half", "info": "We send your ticket details here." },
      { "id": "mobile", "type": "phone", "title": "Mobile", "label": "Mobile", "placeholder": "+1 702 555 0142", "width": "half" },
      { "id": "fan-level", "type": "select", "title": "How deep are you into MMA?", "label": "How deep are you into MMA?", "required": true, "options": ["New fan — a few big fights", "Regular — every numbered event", "Hardcore — prelims and regional cards", "Practitioner — I train or compete"] },
      { "id": "disciplines", "type": "multiselect", "title": "Which disciplines do you love watching?", "label": "Which disciplines do you love watching?", "options": ["Striking", "Wrestling", "Jiu-jitsu", "Muay Thai", "Kickboxing"] },
      { "id": "atmosphere", "type": "scale", "title": "How loud do you like it?", "label": "How loud do you like it?", "config": { "min": 1, "max": 5, "minLabel": "Quiet analyst", "maxLabel": "I lose my voice" } },

      { "id": "page-checkout", "type": "page", "title": "Checkout" },
      { "id": "meet-greet", "type": "product", "title": "Fighter meet & greet", "label": "Fighter meet & greet", "config": { "price": 260, "quantityMode": "fixed", "description": "A photo and a signed glove." } },
      { "id": "vip-lounge", "type": "product", "title": "VIP lounge access", "label": "VIP lounge access", "config": { "price": 180, "quantityMode": "fixed", "description": "Open bar and a fighter Q&A after the main event." } },
      { "id": "merch-pack", "type": "product", "title": "Fight-night merch pack", "label": "Fight-night merch pack", "config": { "price": 85, "quantityMode": "fixed", "description": "Walkout tee, cap and signed poster." } },
      { "id": "shuttle", "type": "product", "title": "Hotel shuttle", "label": "Hotel shuttle", "config": { "price": 40, "quantityMode": "fixed", "description": "Strip hotels to the arena and back." } },
      { "id": "dietary", "type": "dropdown", "title": "Dietary needs", "label": "Dietary needs", "width": "half", "options": ["No restrictions", "Vegetarian", "Vegan", "Gluten-free", "Halal"] },
      { "id": "arrival", "type": "time", "title": "Arrival at the arena", "label": "Arrival at the arena", "width": "half" },
      { "id": "notes", "type": "textarea", "title": "Anything we should know?", "label": "Anything we should know?", "placeholder": "Celebrating something? Accessibility needs? Tell us.", "validation": { "maxLength": 1000 } },
      { "id": "order-total", "type": "total", "title": "Your tickets", "label": "Your tickets" },
      { "id": "terms", "type": "consent", "title": "I agree to the ticket terms: tickets are personal and non-transferable.", "label": "I agree to the ticket terms: tickets are personal and non-transferable.", "required": true },
      { "id": "source", "type": "hidden", "title": "Source", "prefillKey": "utm_source", "defaultValue": "direct" }
    ]
  }$json$::jsonb,
  $json${
    "theme": {
      "mode": "dark",
      "palette": "fight",
      "accent": "#f2b705",
      "accent2": "#ff4d2e",
      "radius": "sm",
      "font": "manrope",
      "headingFont": "anton",
      "background": "glow",
      "elements": { "titleSize": "lg", "titleCase": "upper", "labelStyle": "display", "numbering": "on", "buttonStyle": "gradient", "cardStyle": "glass", "progressStyle": "steps" }
    },
    "layout": "classic",
    "progressBar": true,
    "pageLayout": "split",
    "sidePosition": "left",
    "sideImageUrl": "https://images.pexels.com/photos/29015508/pexels-photo-29015508.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "sideImageAlt": "A fighter in gloves waiting in the cage before the bout",
    "sideEyebrow": "Las Vegas · Saturday, March 6, 2027",
    "sideHeadline": "Fight night. Front row. No filter.",
    "sideTags": "12-fight card, Title fight main event, Doors 5:00 PM",
    "sideCredit": "Photo: Fabrizio Velez / Pexels",
    "coverStyle": "cover",
    "coverUrl": "https://images.pexels.com/photos/598682/pexels-photo-598682.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "branding": true,
    "locale": "en",
    "submitAnother": true,
    "thankYouType": "message",
    "thankYouTitle": "You're in, {First name}!",
    "thankYouText": "We've got your Ironclad 42 registration for March 6 in Las Vegas. Your ticket details are on their way to your inbox.",
    "saveResume": true,
    "offline": true,
    "payments": { "enabled": false, "currency": "usd", "mode": "payment", "interval": "month", "coupons": [] },
    "access": { "mode": "public", "orgDomain": "", "passwordHash": "", "passwordSalt": "", "onePerUser": false },
    "spam": { "honeypot": true, "captcha": false, "rateLimit": 20 },
    "prefill": { "url": true, "user": true }
  }$json$::jsonb,
  false,
  null,
  now()
)
on conflict (id) do update set
  project_id = excluded.project_id,
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  tags = excluded.tags,
  schema = excluded.schema,
  settings = excluded.settings,
  status = 'Published',
  is_template = false,
  deleted_at = null,
  published_at = coalesce(forms.forms.published_at, now());
