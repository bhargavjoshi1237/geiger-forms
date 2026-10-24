// Submissions (forms.responses) and booked slots (forms.bookings), generated per form from compact answer pools
// so ~590 responses read like real traffic: relative dates, statuses, tags, approvals, payments and attribution.
import { CLIENTS, PEOPLE, person } from "../cast.js";
import { FORM_ID, SUMMIT_PHOTO_CONSENT_HASH, TEAM_ROLES } from "./forms.js";
import { between, dateOnly, minutesAgo, noise, pick, range, sid, weighted } from "./helpers.js";

const FIRST = ["Theo", "Leah", "Sana", "Zara", "Freya", "Omar", "Mira", "Nina", "Chloe", "Diego", "Elena", "Felix", "Ines", "Isla", "Kai", "Liam", "Mateo", "Noah", "Oliver", "Aisha", "Clara", "Arjun", "Lena", "Marta", "João", "Emil", "Yara", "Rosa", "Ben", "Ada", "Nico", "June", "Hugo", "Iris", "Malik", "Vera"];
const LAST = ["Okafor", "Sato", "Murphy", "Wagner", "Sharma", "Tanaka", "Novak", "Ramos", "Costa", "Berg", "Dubois", "Kaur", "Bennett", "Petrov", "Hughes", "Malik", "Ahmed", "Nguyen", "Fraser", "Bello", "Lindqvist", "García", "Larsen", "Mensah", "Almeida", "Ferreira", "Jensen", "Oliveira", "Schmidt", "Byrne", "Varga", "Kowalski"];
const PERSONAL_DOMAINS = ["gmail.com", "outlook.com", "proton.me", "hey.com", "icloud.com"];

const ascii = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const domainOf = (c) => c.email.split("@")[1];

// Deterministic respondent; `domain` defaults to a personal mailbox.
export function respondent(n, domain) {
  const first = FIRST[Math.floor(noise(n * 3 + 1) * FIRST.length)];
  const last = LAST[Math.floor(noise(n * 5 + 2) * LAST.length)];
  const host = domain || PERSONAL_DOMAINS[Math.floor(noise(n * 7 + 3) * PERSONAL_DOMAINS.length)];
  return { first, last, name: `${first} ${last}`, email: `${ascii(first)}.${ascii(last)}@${host}` };
}

const clientContact = (n, client = pick(CLIENTS, n * 11 + 4)) => ({ ...respondent(n, domainOf(client)), client });

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
];

// Where respondents came from (feeds Source & Attribution).
export const ATTRIBUTION = [
  [{ referrer: "https://www.google.com/" }, 6],
  [{}, 5],
  [{ referrer: "https://www.linkedin.com/", utm: { source: "linkedin", medium: "social", campaign: "q4-client-update" } }, 4],
  [{ utm: { source: "newsletter", medium: "email", campaign: "halcyon-dispatch" } }, 4],
  [{ referrer: "https://halcyon.studio/work" }, 3],
  [{ referrer: "https://www.instagram.com/", utm: { source: "instagram", medium: "social", campaign: "studio-stories" } }, 2],
  [{ utm: { source: "slack", medium: "chat", campaign: "client-channel" } }, 2],
];

// Minutes ago for the i-th of `count` submissions spread over `span` minutes, denser towards today.
function spread(i, count, span, start = 45, seed = 0) {
  const t = Math.min(1, (i + noise(seed + i * 13)) / count);
  return Math.round(start + span * Math.pow(t, 1.35));
}

let counter = 0;

function row(key, n, agoMin, values) {
  counter += 1;
  const completion = values.completion_ms ?? between(n * 17, 35000, 260000);
  return {
    id: sid("response", counter),
    form_id: FORM_ID[key],
    answers: {},
    respondent_name: null,
    respondent_email: null,
    respondent_user_id: null,
    status: "Complete",
    priority: "Low",
    score: null,
    tags: [],
    assignee: null,
    outcome: null,
    approval: {},
    metadata: JSON.parse(JSON.stringify(weighted(n * 19 + 7, ATTRIBUTION))),
    payment_status: null,
    payment_amount: null,
    payment_currency: null,
    payment_ref: null,
    user_agent: pick(USER_AGENTS, n * 23 + 5),
    completion_ms: completion,
    edited_at: null,
    submitted_at: minutesAgo(agoMin),
    updated_at: minutesAgo(Math.max(1, agoMin - 30)),
    deleted_at: null,
    ...values,
  };
}

const NPS_REASONS = {
  promoter: [
    "The Kestrel launch film landed exactly the tone we wanted.",
    "Fast turnarounds and honest pushback on our brief.",
    "Maya keeps every project on rails.",
    "The Atlas packaging system has been a hit in-store.",
    "We felt like part of the team from day one.",
    "The Lisbon team's design craft is second to none.",
    "Every deliverable arrived on time, even the rush ones.",
  ],
  passive: [
    "Strong creative, but timelines slipped twice.",
    "Great ideas; the invoicing process is clunky.",
    "Solid work, but we needed more strategic input.",
    "Good partner, though pricing is steep for smaller retainers.",
  ],
  detractor: [
    "Too many review rounds before we saw a first concept.",
    "Communication dropped off after the launch.",
    "We were handed between three producers in two months.",
    "The final files arrived a week after the campaign went live.",
  ],
};
const NPS_IMPROVE = [
  "Share a clearer timeline up front.",
  "Fewer review rounds before first concepts.",
  "One point of contact across Lisbon and Brooklyn.",
  "More flexible retainer pricing.",
  "Weekly status updates during production.",
];

function npsResponses() {
  const count = 150;
  return range(count, (i) => {
    const n = 1000 + i;
    const score = weighted(n, [[0, 2], [1, 3], [2, 1], [3, 4], [4, 6], [5, 20], [6, 13], [7, 15], [8, 25], [9, 40], [10, 21]]);
    const band = score >= 9 ? "promoter" : score >= 7 ? "passive" : "detractor";
    const who = clientContact(n);
    const named = noise(n + 0.5) < 0.63;
    const answers = { "f-nps": score, "f-reason": pick(NPS_REASONS[band], n + 2) };
    if (score <= 6 && noise(n + 0.7) < 0.75) answers["f-improve"] = pick(NPS_IMPROVE, n + 3);
    if (named) answers["f-email"] = who.email;
    const spam = i === 77;
    const review = !spam && score <= 4 && noise(n + 0.9) < 0.7;
    return row("nps", n, spread(i - 1, count, 128000, 60, 3), {
      answers,
      respondent_name: named ? who.name : null,
      respondent_email: named ? who.email : null,
      status: spam ? "Spam" : review ? "Needs review" : "Complete",
      priority: score <= 4 ? "High" : score <= 6 ? "Medium" : "Low",
      score,
      tags: spam ? ["spam"] : noise(n + 1.1) < 0.85 ? [band] : [],
      assignee: review ? person(noise(n + 1.3) < 0.6 ? 2 : 1).name : null,
    });
  });
}

const REQUESTS = [
  ["Instagram carousel for the Aero pre-order", "kestrel", "social"],
  ["Cut-downs of the launch film for TikTok and Reels", "kestrel", "video"],
  ["Pop-up stand graphics for the Amsterdam bike expo", "kestrel", "event"],
  ["Menu board refresh for the Alfama café", "atlas", "print"],
  ["Press kit for the new roastery opening", "atlas", "print"],
  ["Landing page for the end-of-season sale", "northwind", "web"],
  ["Retouching for the autumn lookbook", "northwind", "photo"],
  ["Wayfinding signage for the Boston clinic", "lumen", "print"],
  ["Out-of-home posters for the Berlin campaign", "orbit", "campaign"],
  ["Animated logo sting for YouTube", "orbit", "video"],
  ["Email header for the loyalty programme", "fernway", "email"],
  ["Investor deck polish before the board meeting", "meridian", "brand"],
];
const REQUEST_BRIEFS = [
  "We need it live before the campaign launches on the 15th.",
  "Our in-house team is stretched; can you take the whole brief?",
  "Brand guidelines are in the shared drive — keep it on-system.",
  "Budget is approved; we'd love first concepts by Friday.",
  "The current version tested badly with customers, so we're starting over.",
  "Legal needs to review all copy before anything goes out.",
];

function requestResponses() {
  const count = 72;
  return range(count, (i) => {
    const n = 2000 + i;
    const [title, clientKey, tag] = pick(REQUESTS, n);
    const who = clientContact(n, CLIENTS.find((c) => c.key === clientKey));
    const urgency = between(n + 4, 1, 5);
    const status = weighted(n + 5, [["In progress", 20], ["Rejected", 14], ["Complete", 23], ["Needs review", 15]]);
    const assigned = status !== "Needs review" && noise(n + 6) < 0.8;
    return row("requests", n, spread(i - 1, count, 155000, 90, 5), {
      answers: { "f-email": who.email, "f-title": title, "f-problem": pick(REQUEST_BRIEFS, n + 7), "f-importance": urgency },
      respondent_name: who.name,
      respondent_email: who.email,
      status,
      priority: urgency >= 4 ? "High" : urgency >= 2 ? "Medium" : "Low",
      tags: [tag, clientKey],
      assignee: assigned ? person(pick([5, 6, 7, 10, 4], n + 8)).name : null,
    });
  });
}

const ISSUE_SITES = {
  "Northwind store": "northwind",
  "Atlas Coffee site": "atlas",
  "Solace booking flow": "solace",
  "Kestrel pre-order page": "kestrel",
  "Orbit Audio microsite": "orbit",
};
const ISSUE_STEPS = [
  ["1. Add two items to the basket\n2. Apply a discount code\n3. The total resets to full price.", "The discount should stay applied through checkout."],
  ["1. Open the booking calendar on an iPhone\n2. Pick a date in August\n3. The calendar jumps back to today.", "The selected month should stay open."],
  ["1. Search the menu for 'oat'\n2. No results, even though oat lattes are listed.", "Search should match menu items and their descriptions."],
  ["1. Start a pre-order\n2. Choose the Aero in Sage\n3. The swatch preview shows Graphite.", "The preview should match the selected colour."],
  ["1. Open the microsite in Firefox\n2. The hero video never starts.", "The hero video should autoplay muted, like it does in Chrome."],
  ["1. Switch the site to Portuguese\n2. Footer links still point to English pages.", "Links should follow the selected language."],
];
const SCREENSHOTS = [
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-00a586c62c8782e65c0a.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-0ec1f3ba625f482c9dc3.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-85923e7fafe00c9c0d1f.jpg",
];

function issueResponses() {
  const count = 58;
  return range(count, (i) => {
    const n = 3000 + i;
    const site = pick(Object.keys(ISSUE_SITES), n);
    const who = clientContact(n, CLIENTS.find((c) => c.key === ISSUE_SITES[site]));
    const severity = weighted(n + 1, [["Minor", 29], ["Major", 21], ["Critical", 8]]);
    const [steps, expected] = pick(ISSUE_STEPS, n + 2);
    const answers = {
      "f-email": who.email,
      "f-area": site,
      "f-severity": severity,
      "f-steps": steps,
      "f-expected": expected,
      "f-browser": pick(["Safari 17 (iPhone)", "Chrome 129", "Firefox 131", "Edge 129", "Samsung Internet 25"], n + 3),
    };
    if (noise(n + 4) < 0.3) {
      answers["f-screenshot"] = [{ name: `screenshot-${i}.jpg`, path: pick(SCREENSHOTS, n + 5), size: between(n + 6, 180000, 900000), type: "image/jpeg" }];
    }
    const status = weighted(n + 7, [["Complete", 31], ["Rejected", 6], ["In progress", 14], ["Needs review", 7]]);
    return row("issues", n, spread(i - 1, count, 168000, 40, 7), {
      answers,
      respondent_name: who.name,
      respondent_email: who.email,
      status,
      priority: severity === "Critical" ? "High" : severity === "Major" ? "Medium" : "Low",
      score: { Minor: 10, Major: 50, Critical: 100 }[severity],
      tags: [severity.toLowerCase(), ISSUE_SITES[site]],
      assignee: status === "Needs review" || noise(n + 8) < 0.2 ? null : person(pick([9, 9, 5, 7], n + 9)).name,
    });
  });
}

const CITIES = [
  { line1: "Rua da Rosa 112", city: "Lisbon", state: "", zip: "1200-389", country: "Portugal" },
  { line1: "Rua de Cedofeita 54", city: "Porto", state: "", zip: "4050-178", country: "Portugal" },
  { line1: "Weserstraße 21", city: "Berlin", state: "", zip: "12047", country: "Germany" },
  { line1: "Carrer de Verdi 33", city: "Barcelona", state: "", zip: "08012", country: "Spain" },
  { line1: "214 Kent Ave", city: "Brooklyn", state: "NY", zip: "11249", country: "USA" },
  { line1: "18 Hackney Rd", city: "London", state: "", zip: "E2 7NX", country: "United Kingdom" },
  { line1: "Westerstraat 87", city: "Amsterdam", state: "", zip: "1015 MA", country: "Netherlands" },
];
const FREELANCE_PITCHES = [
  "I directed the motion system for a Lisbon fintech rebrand — 40 animated assets in six weeks.",
  "I illustrate packaging for independent coffee roasters and would love to work with Atlas.",
  "I write long-form brand stories and campaign copy, most recently for a Nordic outdoor label.",
  "I shoot product and lifestyle photography for bike and outdoor brands across Europe.",
  "I build 3D product renders for consumer electronics launches.",
  "I'm a front-end developer who loves animated, accessible marketing sites.",
];

function freelancerResponses() {
  const count = 44;
  const reviewer = person(3);
  return range(count, (i) => {
    const n = 4000 + i;
    const who = respondent(n);
    const discipline = pick(["Motion design", "Illustration", "Copywriting", "Photography", "3D & CGI", "Web development"], n + 1);
    const status = weighted(n + 2, [["Approved", 20], ["Pending", 14], ["Rejected", 10]]);
    const ago = spread(i - 1, count, 98000, 120, 11);
    const answers = { "f-name": { first: who.first, last: who.last }, "f-email": who.email, "f-type": discipline, "f-why": pick(FREELANCE_PITCHES, n + 3), "f-coc": true };
    if (noise(n + 4) < 0.6) answers["f-phone"] = `+351 91${between(n + 5, 0, 9)} ${between(n + 6, 100, 999)} ${between(n + 7, 100, 999)}`;
    if (noise(n + 8) < 0.5) answers["f-address"] = { ...pick(CITIES, n + 9), line2: "" };
    const decided = status !== "Pending";
    const approval = decided
      ? {
          stepIndex: 0,
          state: status === "Approved" ? "approved" : "rejected",
          history: [{
            stepIndex: 0,
            stepName: "Portfolio review",
            decision: status === "Approved" ? "approve" : "reject",
            by: reviewer.name,
            byEmail: reviewer.email,
            note: status === "Rejected" && noise(n + 10) < 0.5 ? "Strong work, but not the style our clients book right now." : "",
            at: minutesAgo(Math.max(5, ago - between(n + 11, 600, 4000))),
          }],
        }
      : { stepIndex: 0, state: "pending", history: [] };
    return row("freelancers", n, ago, {
      answers,
      respondent_name: who.name,
      respondent_email: who.email,
      status,
      priority: noise(n + 12) < 0.32 ? "High" : "Low",
      tags: ["freelance", discipline.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
      assignee: status === "Pending" ? reviewer.name : null,
      approval,
    });
  });
}

const payRef = (n) => `cs_test_${Math.floor(noise(n) * 1e12).toString(16)}${Math.floor(noise(n + 1) * 1e12).toString(16)}`.slice(0, 32);

function ticketResponses() {
  const count = 56;
  return range(count, (i) => {
    const n = 5000 + i;
    const who = noise(n) < 0.4 ? clientContact(n, CLIENTS.find((c) => c.key === "kestrel")) : respondent(n);
    const vip = noise(n + 1) < 0.29 ? 1 : 0;
    let ga = weighted(n + 2, [[0, 2], [1, 6], [2, 4], [3, 1]]);
    if (!vip && !ga) ga = 1;
    const total = ga * 25 + vip * 75;
    const pending = noise(n + 3) < 0.125;
    return row("tickets", n, spread(i - 1, count, 84000, 30, 13), {
      answers: { "f-name": { first: who.first, last: who.last }, "f-email": who.email, "f-ga": ga, "f-vip": vip, "f-total": total, "f-diet": weighted(n + 4, [["None", 8], ["Vegetarian", 3], ["Vegan", 2], ["Gluten-free", 1]]) },
      respondent_name: who.name,
      respondent_email: who.email,
      status: pending ? "Awaiting payment" : "Complete",
      tags: vip ? ["vip"] : [],
      payment_status: pending ? "pending" : "paid",
      payment_amount: total,
      payment_currency: "usd",
      payment_ref: payRef(n + 5),
      completion_ms: between(n + 6, 40000, 140000),
    });
  });
}

function csatResponses() {
  const count = 64;
  const better = ["Took two days to get a first round of feedback.", "We had to explain the brief twice.", "The handover files were missing the source artwork."];
  const comments = ["Thanks, Sofia's production team was great!", "Really appreciated the weekly check-ins.", "The launch went off without a hitch.", "Quick and friendly, as always.", "Can't wait for the next campaign."];
  const went = ["Creative quality", "Communication", "Timeliness", "Strategy", "Production"];
  return range(count, (i) => {
    const n = 6000 + i;
    const rating = weighted(n, [[1, 1], [2, 3], [3, 7], [4, 22], [5, 31]]);
    const answers = { "f-csat": rating, "f-went-well": went.filter((_, k) => noise(n + k + 1) < (rating >= 4 ? 0.55 : 0.2)) };
    if (!answers["f-went-well"].length) answers["f-went-well"] = [pick(went, n + 7)];
    if (rating <= 3 || noise(n + 8) < 0.05) answers["f-better"] = pick(better, n + 9);
    if (noise(n + 10) < 0.4) answers["f-comments"] = pick(comments, n + 11);
    const review = rating <= 2;
    return row("csat", n, spread(i - 1, count, 140000, 300, 17), {
      answers,
      metadata: {},
      status: review ? "Needs review" : "Complete",
      priority: review ? "Medium" : "Low",
      assignee: review ? person(2).name : null,
    });
  });
}

function designerResponses() {
  const count = 26;
  const pitches = [
    "I've spent six years on brand systems for hospitality groups and want to work on bigger campaigns.",
    "Your Atlas Coffee packaging is the reason I started following the studio.",
    "I design identities that hold up in motion — the Kestrel launch film is exactly the work I want to do.",
    "I'm moving to Lisbon next year and Halcyon is top of my list.",
  ];
  return range(count, (i) => {
    const n = 7000 + i;
    const who = respondent(n);
    const status = weighted(n + 1, [["In progress", 8], ["Needs review", 8], ["Rejected", 8], ["Approved", 2]]);
    return row("designer", n, spread(i - 1, count, 55000, 600, 19), {
      answers: {
        "f-name": { first: who.first, last: who.last },
        "f-email": who.email,
        "f-phone": `+351 93${between(n + 2, 0, 9)} ${between(n + 3, 100, 999)} ${between(n + 4, 100, 999)}`,
        "f-position": weighted(n + 5, [["Senior designer", 6], ["Design lead", 2], ["Brand designer", 3]]),
        "f-portfolio": noise(n + 6) < 0.5 ? `https://www.behance.net/${ascii(who.first)}${ascii(who.last)}` : `https://${ascii(who.first)}${ascii(who.last)}.design`,
        "f-why": pick(pitches, n + 7),
        "f-salary": between(n + 8, 9, 17) * 5000,
        "f-start": dateOnly(minutesAgo(-between(n + 9, 20, 90) * 1440)),
        "f-consent": true,
      },
      respondent_name: who.name,
      respondent_email: who.email,
      status,
      priority: noise(n + 10) < 0.27 ? "High" : "Medium",
      tags: ["design"],
      assignee: noise(n + 11) < 0.77 ? person(3).name : null,
      completion_ms: between(n + 12, 180000, 600000),
    });
  });
}

function webinarResponses() {
  const count = 34;
  const notes = ["", "Joining from the Porto team.", "Will there be a recording?", "Looking forward to it!", "Can we share the deck with franchise owners?"];
  return range(count, (i) => {
    const n = 8000 + i;
    const who = clientContact(n, CLIENTS.find((c) => c.key === "solace"));
    const attending = weighted(n + 1, [["Yes", 22], ["Maybe", 7], ["No", 5]]);
    const answers = { "f-name": { first: who.first, last: who.last }, "f-email": who.email, "f-attending": attending, "f-notes": pick(notes, n + 2) };
    if (attending !== "No") {
      answers["f-guests"] = weighted(n + 3, [[0, 5], [1, 3], [2, 1]]);
      answers["f-diet"] = pick(["Solace Barcelona", "Solace Lisbon", "Solace Mallorca", "Solace Porto"], n + 4);
    }
    return row("webinar", n, 158400 + spread(i - 1, count, 54000, 600, 23), {
      answers,
      respondent_name: who.name,
      respondent_email: who.email,
      tags: ["solace"],
    });
  });
}

const SUMMIT_COMPANIES = [
  ...CLIENTS.map((c) => ({ name: c.name, domain: domainOf(c) })),
  { name: "Cobalt Retail", domain: "cobalt-retail.example" },
  { name: "Brightpath", domain: "brightpath.example" },
  { name: "Tandem Bank", domain: "tandem-bank.example" },
  { name: "Juniper Labs", domain: "juniper-labs.example" },
];
const MEETING_TOPICS = [
  "A rebrand across our 40 stores",
  "A launch film for our spring range",
  "Production for our first customer conference",
  "A packaging system for a new product line",
  "Bringing more campaign work in-house",
  "Brand guidelines after a merger",
];
const ACCESS_NEEDS = ["Step-free access to the main hall", "Live captions for the keynotes", "A quiet room during breaks"];
const SIGNATURE = (n) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><path d="M10 ${50 + (n % 7)} C 40 ${10 + (n % 11)}, 60 70, 90 40 S 140 ${15 + (n % 9)}, 160 45 S 210 60, 230 ${30 + (n % 13)}" fill="none" stroke="black" stroke-width="3" stroke-linecap="round"/></svg>`,
  )}`;

// Booking slot for a submission: two days later, inside working hours (UTC).
function bookingSlot(agoMin, n) {
  const submitted = new Date(Date.now() - agoMin * 60000);
  const slot = new Date(Date.UTC(submitted.getUTCFullYear(), submitted.getUTCMonth(), submitted.getUTCDate() + 2, between(n, 9, 16), noise(n + 1) < 0.5 ? 0 : 30));
  if (slot.getUTCDay() === 0) slot.setUTCDate(slot.getUTCDate() + 1);
  if (slot.getUTCDay() === 6) slot.setUTCDate(slot.getUTCDate() + 2);
  return slot.toISOString();
}

function summitResponses() {
  const count = 84;
  const ops = person(11);
  const finance = person(12);
  const bookings = [];
  const statement = "I confirm the information I've provided is accurate and that I'm authorised to register on behalf of my company.";
  const responses = range(count, (i) => {
    const n = 9000 + i;
    const ago = spread(i - 1, count, 62000, 110, 29);
    const spam = i === 31 || i === 66;
    const company = pick(SUMMIT_COMPANIES, n);
    const who = spam ? { first: "Promo", last: "Team", name: "Promo Team", email: `deals${i}@bulk-mailer.example` } : respondent(n, company.domain);
    const attendance = noise(n + 1) < 0.63 ? "In person" : "Online";
    const budget = weighted(n + 2, [["Under €10k", 3], ["€10k–€50k", 4], ["€50k–€100k", 3], ["€100k+", 3]]);
    const teamSize = pick([3, 8, 12, 25, 40, 60, 120, 250, 800], n + 3);
    const source = weighted(n + 4, [["linkedin", 4], ["google", 3], ["direct", 3], ["partner", 1], ["newsletter", 2]]);
    const attendedBefore = noise(n + 5) < 0.36 ? "Yes" : "No";
    const interests = ["Brand identity", "Campaigns", "Film & motion", "Events", "Packaging", "Digital products"].filter((_, k) => noise(n + 6 + k) < 0.3).slice(0, 3);
    if (!interests.length) interests.push(pick(["Brand identity", "Campaigns", "Film & motion"], n + 12));
    const vip = attendance === "In person" && noise(n + 13) < 0.38;
    const ga = attendance === "In person" ? (vip && noise(n + 14) < 0.6 ? 0 : weighted(n + 15, [[1, 6], [2, 3], [3, 1]])) : noise(n + 16) < 0.25 ? 1 : 0;
    const workshop = attendance === "In person" && noise(n + 17) < 0.35 ? between(n + 18, 1, 2) : 0;
    const donation = noise(n + 19) < 0.12 ? pick([10, 25, 50, 100], n + 20) : 0;
    const excitement = between(n + 21, 2, 5);
    const quiz1 = weighted(n + 22, [["NPS", 6], ["Star rating", 2], ["Linear scale", 2]]);
    const quiz2Right = noise(n + 23) < 0.7;
    const quiz3 = weighted(n + 24, [["42", 8], ["48", 1], ["36", 1]]);
    const answers = {
      "full-name": { first: who.first, last: who.last },
      email: who.email,
      company: spam ? "Best Deals Ltd" : company.name,
      role: pick(TEAM_ROLES, n + 25),
      "team-size": teamSize,
      budget,
      "attended-before": attendedBefore,
      "utm-source": source,
      attendance,
      excitement,
      engagement: excitement * 20,
      interests,
      "quiz-1": quiz1,
      "quiz-2": quiz2Right ? ["Text answers", "Choice answers", "Number answers"] : ["Text answers", "Choice answers"],
      "quiz-3": quiz3,
      consent: true,
      newsletter: noise(n + 26) < 0.6,
    };
    if (source !== "direct") answers["utm-campaign"] = "summit-2026";
    if (noise(n + 27) < 0.7) answers.phone = `+351 96${between(n + 28, 0, 9)} ${between(n + 29, 100, 999)} ${between(n + 30, 100, 999)}`;
    if (noise(n + 31) < 0.7) answers.website = `https://${company.domain}`;
    if (noise(n + 32) < 0.4) answers["member-id"] = `HS-${1000 + i}`;
    if (ga) answers["ticket-ga"] = ga;
    if (vip) {
      answers["ticket-vip"] = true;
      answers["vip-dinner"] = noise(n + 33) < 0.7 ? "Yes, count me in" : "No, thanks";
    }
    if (workshop) answers["workshop-pass"] = workshop;
    if (donation) answers.donation = donation;
    if (attendance === "In person") {
      answers["arrival-date"] = noise(n + 34) < 0.6 ? "2026-11-18" : "2026-11-17";
      answers["arrival-time"] = pick(["08:30", "09:00", "17:45", "19:30", "21:00"], n + 35);
      answers.address = { ...pick(CITIES, n + 36), line2: noise(n + 37) < 0.3 ? "3rd floor" : "" };
      const diet = ["Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher"].filter((_, k) => noise(n + 38 + k) < 0.15);
      answers.dietary = diet.length ? diet : ["No restrictions"];
      if (noise(n + 43) < 0.12) answers.accessibility = pick(ACCESS_NEEDS, n + 44);
    } else {
      answers["stream-test"] = `2026-11-${pick(["10", "12", "16"], n + 45)}T${pick(["10", "14", "16"], n + 46)}:00`;
    }
    const booked = !spam && noise(n + 47) < 0.33;
    if (booked) {
      const slot = bookingSlot(ago, n + 48);
      answers.booking = slot;
      answers["meeting-topic"] = pick(MEETING_TOPICS, n + 49);
    }
    if (!spam && noise(n + 50) < 0.25) {
      answers.team = range(between(n + 51, 1, 2), (k) => {
        const mate = respondent(n * 10 + k, company.domain);
        return { "tm-name": mate.name, "tm-email": mate.email, "tm-role": pick(TEAM_ROLES, n + 52 + k) };
      });
    }
    const speaker = !spam && noise(n + 53) < 0.08;
    if (speaker) answers.materials = [{ name: `${ascii(who.last)}-press-photo.jpg`, path: pick(SCREENSHOTS, n + 54), size: between(n + 55, 400000, 2400000), type: "image/jpeg" }];
    answers.tracks = Object.fromEntries(["Brand identity", "Campaign craft", "Motion & film", "Event production"].map((r, k) => [r, pick(["Not for me", "Curious", "Must attend"], n + 56 + k)]));
    answers.topics = ["Hands-on workshops", "Client case studies", "Studio tours", "Community meetups"].sort((a, b) => noise(n + a.length) - noise(n + b.length));
    if (noise(n + 61) < 0.85) answers.pace = between(n + 62, 3, 7);
    if (noise(n + 75) < 0.8) answers["venue-mood"] = weighted(n + 76, [[5, 5], [4, 4], [3, 2], [2, 1]]);
    const photoConsent = !spam && noise(n + 77) < 0.7;
    if (photoConsent) answers["photo-consent"] = true;
    if (attendedBefore === "Yes") answers.nps = pick([6, 7, 8, 9, 9, 10, 10], n + 63);
    if (noise(n + 64) < 0.5) answers.signature = SIGNATURE(n);

    const enterprise = budget === "€100k+" || teamSize >= 200;
    const outcome = enterprise ? "Enterprise lead" : vip ? "VIP guest" : attendance === "Online" ? "Online attendee" : "General registration";
    const tags = spam ? ["spam"] : [...(vip ? ["vip"] : []), ...(enterprise ? ["enterprise", "new-business"] : []), ...(attendance === "Online" ? ["online"] : []), ...(speaker ? ["speaker"] : [])];

    const coupon = noise(n + 65) < 0.18 ? 0.85 : 1;
    const amount = Math.round((ga * 299 + (vip ? 799 : 0) + workshop * 149) * coupon * 100) / 100 + donation;
    const payment = amount > 0 ? weighted(n + 66, [["paid", 49], ["failed", 9], ["pending", 5], ["refunded", 5]]) : null;

    const quizEarned = (quiz1 === "NPS" ? 1 : 0) + (quiz2Right ? 2 : 0) + (quiz3 === "42" ? 1 : 0);
    let status;
    let approval = { stepIndex: 0, state: "pending", history: [] };
    const step = (stepIndex, decision, by, after) => ({
      stepIndex,
      stepName: stepIndex ? "Finance" : "Event operations",
      decision,
      by: by.name,
      byEmail: by.email,
      note: decision === "reject" ? "Duplicate of an earlier registration." : "",
      at: minutesAgo(Math.max(2, ago - after)),
    });
    if (spam) status = "Spam";
    else if (payment === "failed" || payment === "pending") status = "Awaiting payment";
    else {
      status = weighted(n + 67, [["Approved", 38], ["Pending", 9], ["Rejected", 6], ["In progress", 6], ["Needs review", enterprise ? 8 : 0]]);
      if (payment === "refunded") status = "Rejected";
      if (status === "Approved") approval = { stepIndex: 1, state: "approved", history: [step(0, "approve", ops, 180), step(1, "approve", finance, 420)] };
      if (status === "Rejected") approval = { stepIndex: 0, state: "rejected", history: [step(0, "reject", ops, 240)] };
      if (status === "Pending" && noise(n + 68) < 0.5) approval = { stepIndex: 1, state: "pending", history: [step(0, "approve", ops, 200)] };
    }
    const variant = i % 2 ? "v-original" : "v-urgency";
    const sourceMeta = {
      linkedin: { referrer: "https://www.linkedin.com/", utm: { source: "linkedin", medium: "social", campaign: "summit-2026" } },
      google: { referrer: "https://www.google.com/", utm: { source: "google", medium: "cpc", campaign: "summit-2026" } },
      partner: { referrer: "https://www.itsnicethat.com/", utm: { source: "partner", medium: "referral", campaign: "summit-2026" } },
      newsletter: { utm: { source: "newsletter", medium: "email", campaign: "summit-2026" } },
      direct: {},
    }[source];
    const acceptedAt = minutesAgo(ago);
    const out = row("summit", n, ago, {
        answers,
        respondent_name: who.name,
        respondent_email: who.email,
        status,
        priority: spam ? "Low" : enterprise || vip ? "High" : noise(n + 69) < 0.4 ? "Medium" : "Low",
        score: spam ? 0 : ({ "Under €10k": 0, "€10k–€50k": 15, "€50k–€100k": 30, "€100k+": 50 }[budget] + interests.length * 5),
        tags,
        assignee: spam ? null : vip ? ops.name : enterprise ? person(8).name : noise(n + 70) < 0.5 ? person(4).name : null,
        outcome: spam ? null : outcome,
        approval,
        metadata: {
          ...sourceMeta,
          variant,
          sessionId: `sess-${i}`,
          quiz: { earned: quizEarned, possible: 4, percent: quizEarned * 25, passed: quizEarned >= 3 },
          attestation: { statement, acceptedAt },
          policy: { acknowledgedAt: acceptedAt, typedName: who.name, scrolled: true },
          ...(photoConsent ? { consents: { "photo-consent": { acceptedAt, textHash: SUMMIT_PHOTO_CONSENT_HASH } } } : {}),
          ...(enterprise && noise(n + 71) < 0.3 ? { flowIssue: { id: sid("response", 500 + i), number: 200 + i } } : {}),
        },
        payment_status: payment,
        payment_amount: payment ? amount : null,
        payment_currency: payment ? "eur" : null,
        payment_ref: payment ? payRef(n + 72) : null,
        completion_ms: between(n + 73, 250000, 900000),
        edited_at: noise(n + 74) < 0.08 ? minutesAgo(Math.max(5, ago - 1440)) : null,
    });
    if (booked) bookings.push({ slot: answers.booking, email: who.email, ago, responseId: out.id });
    return out;
  });

  const bookingRows = bookings.map((b, k) => ({
    id: sid("booking", k + 1),
    form_id: FORM_ID.summit,
    response_id: b.responseId,
    field_id: "booking",
    slot_start: b.slot,
    slot_end: new Date(Date.parse(b.slot) + 30 * 60000).toISOString(),
    email: b.email,
    reminded_at: null,
    metadata: {},
    created_at: minutesAgo(b.ago),
    deleted_at: null,
  }));
  return { responses, bookings: bookingRows };
}

export function responsesSeed() {
  counter = 0;
  const summit = summitResponses();
  const responses = [
    ...npsResponses(),
    ...requestResponses(),
    ...issueResponses(),
    ...freelancerResponses(),
    ...ticketResponses(),
    ...csatResponses(),
    ...designerResponses(),
    ...webinarResponses(),
    ...summit.responses,
  ];
  // Assignees are studio members, linked by user id like a real assignment.
  for (const r of responses) r.assignee_id = PEOPLE.find((p) => p.name === r.assignee)?.id ?? null;
  return { responses, bookings: summit.bookings };
}
