// Built-in template library (config, not row data). Each template carries canonical fields + settings overrides.
import {
  BadgeCheck,
  Bug,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileSignature,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  HeartPulse,
  Landmark,
  LifeBuoy,
  Lightbulb,
  Mail,
  MessageSquareQuote,
  Package,
  PartyPopper,
  PenLine,
  Plane,
  Presentation,
  Receipt,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  Vote,
  Wrench,
} from "lucide-react";
import { defaultSettings, slugify, toCanonicalField } from "./schema";

export const TEMPLATE_CATEGORIES = [
  "Lead generation",
  "Payments",
  "Registration",
  "Surveys",
  "Assessment",
  "HR",
  "Support",
  "Healthcare & legal",
  "Education",
  "Finance",
  "Operations",
  "Community",
];

// Field shorthand: `key` (or the slugified title) becomes the id `f-<key>`; `when` = [[key, operator, value], …].
const f = (type, title, opts = {}) => ({ type, title, ...opts });

// Assigns unique ids within a template and resolves `when` shorthand into canonical conditions.
function buildFields(list) {
  const used = new Set();
  const withIds = list.map((item) => {
    const base = `f-${item.key || slugify(item.title).slice(0, 28) || item.type}`;
    let id = base;
    for (let i = 2; used.has(id); i += 1) id = `${base}-${i}`;
    used.add(id);
    return { ...item, id };
  });
  return withIds.map((item, i) => {
    const field = { ...item };
    delete field.key;
    delete field.when;
    delete field.any;
    return toCanonicalField({
      ...field,
      conditions: (item.when || []).map(([ref, operator, value], j) => ({ id: `c-${i}-${j}`, fieldId: `f-${ref}`, operator, value })),
      conditionLogic: item.any ? "any" : "all",
    });
  });
}

// defaultSettings() ⊕ overrides, merging nested groups one level deep.
function buildSettings(overrides = {}) {
  const base = defaultSettings();
  const out = { ...base, ...overrides };
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      out[key] = { ...base[key], ...value };
    }
  }
  return out;
}

const consent = (label = "I agree to be contacted about my request.") => f("checkbox", "Consent", { key: "consent", label, required: true });
const contact = () => [
  f("name", "Full name", { key: "name", required: true }),
  f("email", "Email address", { key: "email", required: true, placeholder: "you@example.com" }),
];

const RAW_TEMPLATES = [
  // --- Lead generation ---
  {
    id: "contact-us",
    title: "Contact us",
    category: "Lead generation",
    icon: Mail,
    description: "A clean contact form with a message box and consent checkbox.",
    fields: [...contact(), f("phone", "Phone number", { key: "phone" }), f("text", "Company", { key: "company" }), f("textarea", "How can we help?", { key: "message", required: true }), consent()],
    settings: { thankYouTitle: "Thanks for reaching out", thankYouText: "We'll get back to you within one business day." },
  },
  {
    id: "quote-request",
    title: "Quote request",
    category: "Lead generation",
    icon: HandCoins,
    description: "Qualify inbound leads with budget-based scoring and a project brief.",
    fields: [
      ...contact(),
      f("text", "Company", { key: "company", required: true }),
      f("dropdown", "Service needed", { key: "service", required: true, options: ["Design", "Development", "Consulting", "Support retainer"] }),
      f("select", "Budget", { key: "budget", required: true, options: ["Under $5k", "$5k–$20k", "$20k–$50k", "$50k+"], optionPoints: { "Under $5k": 10, "$5k–$20k": 40, "$20k–$50k": 70, "$50k+": 100 } }),
      f("select", "Timeline", { key: "timeline", options: ["ASAP", "This quarter", "Next quarter", "Just exploring"] }),
      f("textarea", "Project details", { key: "details", required: true }),
    ],
    settings: { scoringEnabled: true, highThreshold: 70, mediumThreshold: 40, notifyFlow: false },
  },
  {
    id: "demo-booking",
    title: "Demo booking",
    category: "Lead generation",
    icon: Presentation,
    description: "Let prospects pick a demo slot from your availability.",
    fields: [
      ...contact(),
      f("text", "Company", { key: "company", required: true }),
      f("dropdown", "Team size", { key: "team-size", options: ["1–10", "11–50", "51–200", "201–1000", "1000+"] }),
      f("booking", "Pick a time", { key: "slot", required: true, config: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00", slotMinutes: 30, capacity: 1, horizonDays: 21, leadHours: 12, timezone: "UTC" } }),
      f("textarea", "Anything we should prepare?", { key: "notes" }),
    ],
    settings: { confirmEmail: true, confirmSubject: "Your demo is booked", confirmBody: "Thanks {Full name} — see you at {Pick a time}." },
  },
  {
    id: "gated-content",
    title: "Gated content download",
    category: "Lead generation",
    icon: Sparkles,
    description: "Collect a few details before visitors download a guide or whitepaper.",
    fields: [...contact(), f("text", "Company", { key: "company" }), f("dropdown", "Role", { key: "role", options: ["Founder / exec", "Manager", "Individual contributor", "Student", "Other"] }), consent("Send me occasional product updates.")],
    settings: { thankYouType: "message", thankYouTitle: "Your download is ready", thankYouText: "Check your inbox — we've sent you the link." },
  },

  // --- Payments ---
  {
    id: "order-form",
    title: "Product order form",
    category: "Payments",
    icon: ShoppingCart,
    description: "Sell a few products with quantities, a live total and Stripe checkout.",
    fields: [
      ...contact(),
      f("heading", "Your order", { key: "order-heading", label: "Your order" }),
      f("product", "Starter kit", { key: "starter", label: "Starter kit", config: { price: 29, quantityMode: "input", maxQuantity: 10, description: "Everything you need to begin." } }),
      f("product", "Refill pack", { key: "refill", label: "Refill pack", config: { price: 12, quantityMode: "input", maxQuantity: 20, description: "Monthly refills." } }),
      f("product", "Gift wrap", { key: "gift", label: "Add gift wrap", config: { price: 4, quantityMode: "fixed" } }),
      f("total", "Order total", { key: "total" }),
      f("address", "Shipping address", { key: "address", required: true }),
    ],
    settings: { payments: { enabled: true, currency: "usd", mode: "payment" } },
  },
  {
    id: "donation",
    title: "Donation",
    category: "Payments",
    icon: HeartHandshake,
    description: "Fixed gift levels with an optional dedication and a receipt email.",
    fields: [
      ...contact(),
      f("product", "Supporter gift", { key: "gift-25", label: "Supporter — $25", config: { price: 25, quantityMode: "fixed" } }),
      f("product", "Champion gift", { key: "gift-50", label: "Champion — $50", config: { price: 50, quantityMode: "fixed" } }),
      f("product", "Hero gift", { key: "gift-100", label: "Hero — $100", config: { price: 100, quantityMode: "fixed" } }),
      f("total", "Your gift", { key: "total" }),
      f("text", "Dedicate this gift (optional)", { key: "dedication" }),
    ],
    settings: { payments: { enabled: true, currency: "usd", mode: "payment" }, confirmEmail: true, confirmSubject: "Thank you for your gift", confirmBody: "Thank you {Full name} — your gift of {total} makes a difference." },
  },
  {
    id: "event-tickets",
    title: "Event tickets",
    category: "Payments",
    icon: Ticket,
    description: "Sell general and VIP tickets with a response limit for capacity.",
    fields: [
      ...contact(),
      f("product", "General admission", { key: "ga", label: "General admission", config: { price: 25, quantityMode: "input", maxQuantity: 6 } }),
      f("product", "VIP", { key: "vip", label: "VIP (front rows + reception)", config: { price: 75, quantityMode: "input", maxQuantity: 4 } }),
      f("total", "Total", { key: "total" }),
      f("dropdown", "Dietary requirements", { key: "diet", options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"] }),
    ],
    settings: { payments: { enabled: true, currency: "usd", mode: "payment", coupons: [{ code: "EARLYBIRD", type: "percent", value: 15, active: true }] }, responseLimit: 200, showResponseLimit: true },
  },
  {
    id: "membership-subscription",
    title: "Membership subscription",
    category: "Payments",
    icon: CreditCard,
    description: "Recurring monthly membership billed through Stripe subscriptions.",
    fields: [
      ...contact(),
      f("product", "Monthly membership", { key: "membership", label: "Monthly membership", config: { price: 15, quantityMode: "fixed", description: "Cancel anytime." } }),
      f("total", "Billed monthly", { key: "total" }),
      f("checkbox", "Terms", { key: "terms", label: "I agree to the membership terms.", required: true }),
    ],
    settings: { payments: { enabled: true, currency: "usd", mode: "subscription", interval: "month" } },
  },

  // --- Registration ---
  {
    id: "event-rsvp",
    title: "Event RSVP",
    category: "Registration",
    icon: PartyPopper,
    description: "RSVP with conditional guest count and dietary needs.",
    fields: [
      ...contact(),
      f("select", "Will you attend?", { key: "attending", required: true, options: ["Yes", "No", "Maybe"] }),
      f("number", "Number of guests", { key: "guests", when: [["attending", "equals", "Yes"]], validation: { min: 0, max: 5 } }),
      f("dropdown", "Dietary requirements", { key: "diet", when: [["attending", "equals", "Yes"]], options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"] }),
      f("textarea", "Notes for the host", { key: "notes" }),
    ],
    settings: { confirmEmail: true, confirmSubject: "Your RSVP is in", closedMessage: "RSVPs are closed for this event." },
  },
  {
    id: "course-signup",
    title: "Course signup",
    category: "Registration",
    icon: GraduationCap,
    description: "Enrol students in a course cohort with their experience level.",
    fields: [
      ...contact(),
      f("phone", "Phone number", { key: "phone" }),
      f("dropdown", "Course", { key: "course", required: true, options: ["Intro to design", "Advanced React", "Data analysis", "Public speaking"] }),
      f("select", "Experience level", { key: "level", options: ["Beginner", "Intermediate", "Advanced"] }),
      f("date", "Preferred start date", { key: "start" }),
    ],
    settings: { responseLimit: 30, showResponseLimit: true },
  },
  {
    id: "membership-signup",
    title: "Membership application",
    category: "Registration",
    icon: UserPlus,
    description: "Multi-step membership application with an approval step.",
    fields: [
      ...contact(),
      f("phone", "Phone number", { key: "phone" }),
      f("address", "Address", { key: "address" }),
      f("page", "About you", { key: "page-about" }),
      f("dropdown", "Membership type", { key: "type", required: true, options: ["Individual", "Student", "Family", "Corporate"] }),
      f("textarea", "Why do you want to join?", { key: "why" }),
      f("checkbox", "Code of conduct", { key: "coc", label: "I agree to follow the code of conduct.", required: true }),
    ],
    settings: { approval: { enabled: true, steps: [{ id: "s-review", name: "Membership committee", approvers: [] }] } },
  },

  // --- Surveys ---
  {
    id: "nps-survey",
    title: "NPS survey",
    category: "Surveys",
    icon: Target,
    description: "Net Promoter Score with a follow-up question for detractors.",
    fields: [
      f("nps", "How likely are you to recommend us to a friend or colleague?", { key: "nps", required: true }),
      f("textarea", "What's the main reason for your score?", { key: "reason" }),
      f("textarea", "What would make you more likely to recommend us?", { key: "improve", when: [["nps", "lte", "6"]] }),
      f("email", "Email (optional, if we may follow up)", { key: "email" }),
    ],
    settings: { thankYouTitle: "Thanks for the feedback", anonymous: false },
  },
  {
    id: "csat-survey",
    title: "Customer satisfaction (CSAT)",
    category: "Surveys",
    icon: Smile,
    description: "Star rating plus what went well and what didn't.",
    fields: [
      f("rating", "How satisfied were you with your experience?", { key: "csat", required: true, config: { max: 5 } }),
      f("multiselect", "What went well?", { key: "went-well", options: ["Speed", "Friendliness", "Knowledge", "Resolution", "Follow-up"] }),
      f("textarea", "What could we have done better?", { key: "better", when: [["csat", "lte", "3"]] }),
      f("textarea", "Any other comments?", { key: "comments" }),
    ],
    settings: { layout: "conversational" },
  },
  {
    id: "market-research",
    title: "Market research survey",
    category: "Surveys",
    icon: ClipboardList,
    description: "Demographics, a Likert matrix and feature ranking.",
    fields: [
      f("dropdown", "Age range", { key: "age", options: ["18–24", "25–34", "35–44", "45–54", "55+"] }),
      f("dropdown", "Industry", { key: "industry", options: ["Technology", "Healthcare", "Finance", "Education", "Retail", "Other"] }),
      f("matrix", "How much do you agree?", { key: "agree", options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"], config: { rows: ["The product is easy to use", "It saves me time", "It's good value"] } }),
      f("ranking", "Rank these features by importance", { key: "rank", options: ["Price", "Ease of use", "Integrations", "Support", "Security"] }),
      f("scale", "How likely are you to switch in the next year?", { key: "switch", config: { min: 1, max: 10, minLabel: "Not likely", maxLabel: "Very likely" } }),
    ],
    settings: { anonymous: true, progressBar: true },
  },
  {
    id: "quick-poll",
    title: "Quick poll",
    category: "Surveys",
    icon: Vote,
    description: "One question with live results shown after voting.",
    fields: [f("select", "Which day works best for the team offsite?", { key: "vote", required: true, options: ["Thursday", "Friday", "Saturday"] })],
    settings: { showPollResults: true, anonymous: true, spam: { honeypot: true, captcha: false, rateLimit: 5 } },
  },
  {
    id: "product-review",
    title: "Product review",
    category: "Surveys",
    icon: Star,
    description: "Collect star ratings and written reviews for a product.",
    fields: [
      f("text", "Your name", { key: "name", required: true }),
      f("rating", "Overall rating", { key: "rating", required: true, config: { max: 5 } }),
      f("text", "Review title", { key: "title" }),
      f("textarea", "Your review", { key: "review", required: true, validation: { minLength: 20 } }),
      f("select", "Would you recommend it?", { key: "recommend", options: ["Yes", "No"] }),
    ],
    settings: {},
  },

  // --- Assessment ---
  {
    id: "knowledge-quiz",
    title: "Knowledge quiz",
    category: "Assessment",
    icon: BadgeCheck,
    description: "Auto-graded quiz with a pass mark and score on the thank-you screen.",
    fields: [
      ...contact(),
      f("page", "Questions", { key: "page-questions" }),
      f("select", "What does HTML stand for?", { key: "q1", required: true, options: ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language"], correctAnswer: "HyperText Markup Language" }),
      f("select", "Which of these is a CSS layout system?", { key: "q2", required: true, options: ["Flexbox", "Hexbox", "Boxify"], correctAnswer: "Flexbox" }),
      f("multiselect", "Which are JavaScript frameworks?", { key: "q3", required: true, options: ["React", "Vue", "Django", "Laravel"], correctAnswer: ["React", "Vue"] }),
      f("select", "HTTP status 404 means…", { key: "q4", required: true, options: ["Not found", "Server error", "Unauthorized"], correctAnswer: "Not found" }),
    ],
    settings: { quiz: { enabled: true, passMark: 75, showAnswers: true }, showScore: true, thankYouText: "You scored {score}. Results have been emailed to you." },
  },
  {
    id: "readiness-calculator",
    title: "Self-scoring readiness check",
    category: "Assessment",
    icon: Target,
    description: "Scale questions roll up into a calculated readiness score.",
    fields: [
      f("scale", "How documented are your processes?", { key: "docs", required: true, config: { min: 1, max: 10 } }),
      f("scale", "How automated is your reporting?", { key: "auto", required: true, config: { min: 1, max: 10 } }),
      f("scale", "How aligned is leadership?", { key: "align", required: true, config: { min: 1, max: 10 } }),
      f("calculated", "Readiness score", { key: "score", formula: "ROUND(({f-docs} + {f-auto} + {f-align}) / 30 * 100)", config: { format: "percent", countInScore: true } }),
      f("email", "Email me my results", { key: "email" }),
    ],
    settings: { scoringEnabled: true, highThreshold: 70, mediumThreshold: 40, showScore: true },
  },

  // --- HR ---
  {
    id: "job-application",
    title: "Job application",
    category: "HR",
    icon: Users,
    description: "Applications with résumé upload, links and salary expectations.",
    fields: [
      ...contact(),
      f("phone", "Phone number", { key: "phone", required: true }),
      f("dropdown", "Position", { key: "position", required: true, options: ["Product designer", "Frontend engineer", "Backend engineer", "Customer success"] }),
      f("url", "LinkedIn or portfolio", { key: "portfolio" }),
      f("file", "Résumé / CV", { key: "resume", required: true, config: { maxFiles: 1, maxSizeMb: 10, accept: ".pdf,.doc,.docx" } }),
      f("textarea", "Why do you want to join us?", { key: "why", required: true }),
      f("currency", "Salary expectation", { key: "salary", sensitive: true }),
      f("date", "Earliest start date", { key: "start" }),
      consent("I consent to my data being processed for recruitment purposes."),
    ],
    settings: { duplicates: { enabled: true, fieldIds: ["f-email"], windowDays: 90, action: "flag" }, retentionDays: 365 },
  },
  {
    id: "employee-onboarding",
    title: "Employee onboarding",
    category: "HR",
    icon: ClipboardCheck,
    description: "New-hire details, emergency contact, equipment and handbook sign-off.",
    fields: [
      ...contact(),
      f("date", "Start date", { key: "start", required: true }),
      f("address", "Home address", { key: "address", required: true, sensitive: true }),
      f("heading", "Emergency contact", { key: "ec-heading", label: "Emergency contact" }),
      f("text", "Contact name", { key: "ec-name", required: true, width: "half" }),
      f("phone", "Contact phone", { key: "ec-phone", required: true, width: "half" }),
      f("multiselect", "Equipment needed", { key: "equipment", options: ["Laptop", "Monitor", "Headset", "Keyboard & mouse", "Phone"] }),
      f("dropdown", "T-shirt size", { key: "tshirt", options: ["XS", "S", "M", "L", "XL", "XXL"] }),
      f("checkbox", "Handbook", { key: "handbook", label: "I have read the employee handbook.", required: true }),
      f("signature", "Signature", { key: "signature", required: true }),
    ],
    settings: { access: { mode: "login" }, saveResume: true },
  },
  {
    id: "time-off-request",
    title: "Time-off request",
    category: "HR",
    icon: Plane,
    description: "Leave requests routed to a manager for approval.",
    fields: [
      ...contact(),
      f("dropdown", "Leave type", { key: "type", required: true, options: ["Vacation", "Sick leave", "Parental leave", "Unpaid", "Other"] }),
      f("date", "First day off", { key: "from", required: true, width: "half" }),
      f("date", "Last day off", { key: "to", required: true, width: "half" }),
      f("calculated", "Days requested", { key: "days", formula: "DAYS({f-to}, {f-from}) + 1", config: { format: "number", countInScore: false } }),
      f("textarea", "Notes", { key: "notes" }),
    ],
    settings: { access: { mode: "login", onePerUser: false }, approval: { enabled: true, steps: [{ id: "s-manager", name: "Manager", approvers: [] }, { id: "s-hr", name: "HR", approvers: [] }] } },
  },
  {
    id: "performance-feedback",
    title: "Performance feedback",
    category: "HR",
    icon: MessageSquareQuote,
    description: "360° feedback with a competency matrix and open comments.",
    fields: [
      f("text", "Who is this feedback for?", { key: "subject", required: true }),
      f("matrix", "Rate their competencies", { key: "competencies", required: true, options: ["Needs work", "Meets", "Exceeds"], config: { rows: ["Communication", "Ownership", "Collaboration", "Craft"] } }),
      f("textarea", "What should they keep doing?", { key: "keep" }),
      f("textarea", "What could they improve?", { key: "improve" }),
    ],
    settings: { anonymous: true, access: { mode: "login" } },
  },
  {
    id: "policy-acknowledgement",
    title: "Policy acknowledgement",
    category: "HR",
    icon: ScrollText,
    description: "Employees scroll through a policy and confirm with their typed name.",
    fields: [...contact(), f("dropdown", "Department", { key: "dept", options: ["Engineering", "Sales", "Operations", "Finance", "People"] })],
    settings: {
      access: { mode: "login", onePerUser: true },
      policy: { enabled: true, title: "Acceptable use policy", body: "Company systems are provided for business use. Keep credentials private, report suspected incidents immediately, and never store customer data on personal devices.", url: "", requireScroll: true, requireName: true },
    },
  },

  // --- Support ---
  {
    id: "support-ticket",
    title: "Support ticket",
    category: "Support",
    icon: LifeBuoy,
    description: "Categorised support requests with priority and attachments.",
    fields: [
      ...contact(),
      f("dropdown", "Category", { key: "category", required: true, options: ["Billing", "Technical issue", "Account", "Feature question", "Other"] }),
      f("select", "Priority", { key: "priority", options: ["Low", "Normal", "Urgent"], optionPoints: { Low: 10, Normal: 50, Urgent: 100 } }),
      f("text", "Subject", { key: "subject", required: true }),
      f("textarea", "Describe the issue", { key: "description", required: true }),
      f("file", "Attachments", { key: "files", config: { maxFiles: 3, maxSizeMb: 10, accept: "" } }),
    ],
    settings: { scoringEnabled: true, highThreshold: 80, mediumThreshold: 40, flow: { escalate: true, when: "high", labels: ["support"] }, confirmEmail: true, confirmSubject: "We've received your ticket" },
  },
  {
    id: "bug-report",
    title: "Bug report",
    category: "Support",
    icon: Bug,
    description: "Structured bug reports that escalate critical issues to Geiger Flow.",
    fields: [
      f("email", "Your email", { key: "email", required: true }),
      f("dropdown", "Product area", { key: "area", required: true, options: ["Dashboard", "Editor", "Billing", "API", "Mobile app"] }),
      f("select", "Severity", { key: "severity", required: true, options: ["Minor", "Major", "Critical"], optionPoints: { Minor: 10, Major: 50, Critical: 100 } }),
      f("textarea", "Steps to reproduce", { key: "steps", required: true, placeholder: "1. Go to…\n2. Click…" }),
      f("textarea", "Expected vs actual behaviour", { key: "expected" }),
      f("text", "Browser / device", { key: "browser" }),
      f("file", "Screenshot", { key: "screenshot", config: { maxFiles: 2, maxSizeMb: 10, accept: "image/*" } }),
    ],
    settings: { scoringEnabled: true, highThreshold: 100, mediumThreshold: 50, flow: { escalate: true, when: "high", labels: ["bug"] } },
  },
  {
    id: "return-request",
    title: "Return / RMA request",
    category: "Support",
    icon: RotateCcw,
    description: "Product returns with order number, reason and photos.",
    fields: [
      ...contact(),
      f("text", "Order number", { key: "order", required: true, validation: { pattern: "^[A-Za-z0-9-]{4,}$", patternMessage: "Enter a valid order number." } }),
      f("text", "Product", { key: "product", required: true }),
      f("dropdown", "Reason for return", { key: "reason", required: true, options: ["Damaged", "Wrong item", "Doesn't fit", "Changed my mind", "Other"] }),
      f("select", "Item condition", { key: "condition", options: ["Unopened", "Opened", "Damaged"] }),
      f("file", "Photos", { key: "photos", when: [["reason", "equals", "Damaged"]], config: { maxFiles: 4, maxSizeMb: 10, accept: "image/*" } }),
    ],
    settings: { approval: { enabled: true, steps: [{ id: "s-support", name: "Support lead", approvers: [] }] } },
  },
  {
    id: "feature-request",
    title: "Feature request",
    category: "Support",
    icon: Lightbulb,
    description: "Capture product ideas with an importance scale.",
    fields: [
      f("email", "Your email", { key: "email" }),
      f("text", "Feature title", { key: "title", required: true }),
      f("textarea", "What problem would it solve?", { key: "problem", required: true }),
      f("scale", "How important is this to you?", { key: "importance", config: { min: 1, max: 5, minLabel: "Nice to have", maxLabel: "Critical" } }),
    ],
    settings: {},
  },

  // --- Healthcare & legal ---
  {
    id: "patient-intake",
    title: "Patient intake",
    category: "Healthcare & legal",
    icon: HeartPulse,
    description: "HIPAA-minded intake: sensitive fields are encrypted and masked.",
    fields: [
      ...contact(),
      f("date", "Date of birth", { key: "dob", required: true, sensitive: true }),
      f("phone", "Phone number", { key: "phone", required: true }),
      f("address", "Home address", { key: "address", sensitive: true }),
      f("page", "Medical history", { key: "page-history" }),
      f("text", "Insurance provider", { key: "insurer", width: "half" }),
      f("text", "Member ID", { key: "member-id", width: "half", sensitive: true }),
      f("textarea", "Current medications", { key: "meds", sensitive: true }),
      f("textarea", "Allergies", { key: "allergies", sensitive: true }),
      f("multiselect", "Do you have any of these conditions?", { key: "conditions", sensitive: true, options: ["Diabetes", "Heart disease", "Asthma", "High blood pressure", "None of these"] }),
      f("checkbox", "Consent to treatment", { key: "consent", label: "I consent to evaluation and treatment.", required: true }),
      f("signature", "Signature", { key: "signature", required: true }),
    ],
    settings: { saveResume: true, retentionDays: 2555, attestation: { enabled: true }, spam: { honeypot: true, captcha: true, rateLimit: 10 } },
  },
  {
    id: "consent-form",
    title: "Consent form",
    category: "Healthcare & legal",
    icon: ShieldCheck,
    description: "Granular consent statements with a dated signature.",
    fields: [
      f("name", "Full name", { key: "name", required: true }),
      f("date", "Date", { key: "date", required: true }),
      f("content", "Consent", { key: "intro", label: "Please read carefully", hint: "Tick each statement you agree to, then sign below." }),
      f("checkbox", "Photos", { key: "photos", label: "I consent to photographs being taken for my records." }),
      f("checkbox", "Data sharing", { key: "share", label: "I consent to my information being shared with my care team.", required: true }),
      f("checkbox", "Contact", { key: "contact", label: "I consent to being contacted by phone or email." }),
      f("signature", "Signature", { key: "signature", required: true }),
    ],
    settings: { attestation: { enabled: true } },
  },
  {
    id: "esign-agreement",
    title: "E-sign agreement",
    category: "Healthcare & legal",
    icon: FileSignature,
    description: "Agreement text, signature capture and a signed PDF document template.",
    fields: [
      ...contact(),
      f("text", "Company", { key: "company" }),
      f("content", "Agreement", { key: "agreement", label: "Services agreement", hint: "By signing, you agree to the scope, fees and terms described in the attached proposal. Either party may terminate with 30 days' written notice." }),
      f("checkbox", "Agree", { key: "agree", label: "I have read and agree to the terms above.", required: true }),
      f("signature", "Signature", { key: "signature", required: true }),
    ],
    settings: {
      attestation: { enabled: true, statement: "I confirm I am authorised to sign on behalf of the company named above." },
      documentTemplate: { enabled: true, title: "Services agreement — {Company}", body: "This agreement is entered into by {Full name} ({Email address}) on behalf of {Company}.\n\nThe signatory agrees to the terms presented in this form." },
    },
  },

  // --- Education ---
  {
    id: "permission-slip",
    title: "Permission slip",
    category: "Education",
    icon: PenLine,
    description: "Parent/guardian permission for a school trip with medical notes.",
    fields: [
      f("text", "Student name", { key: "student", required: true }),
      f("text", "Class / grade", { key: "grade", width: "half" }),
      f("name", "Parent or guardian", { key: "guardian", required: true }),
      f("phone", "Emergency phone", { key: "phone", required: true, width: "half" }),
      f("email", "Email", { key: "email", required: true, width: "half" }),
      f("textarea", "Medical or dietary notes", { key: "medical", sensitive: true }),
      f("checkbox", "Permission", { key: "permission", label: "I give permission for my child to attend the trip.", required: true }),
      f("signature", "Signature", { key: "signature", required: true }),
    ],
    settings: {},
  },
  {
    id: "admissions",
    title: "Admissions application",
    category: "Education",
    icon: GraduationCap,
    description: "Multi-page application with transcripts and a statement.",
    fields: [
      ...contact(),
      f("date", "Date of birth", { key: "dob", required: true }),
      f("page", "Academics", { key: "page-academics" }),
      f("dropdown", "Programme", { key: "programme", required: true, options: ["Computer science", "Business", "Design", "Engineering"] }),
      f("text", "Previous school", { key: "school" }),
      f("file", "Transcript", { key: "transcript", required: true, config: { maxFiles: 1, maxSizeMb: 15, accept: ".pdf" } }),
      f("textarea", "Personal statement", { key: "statement", required: true, validation: { minLength: 200 } }),
    ],
    settings: { saveResume: true, approval: { enabled: true, steps: [{ id: "s-admissions", name: "Admissions office", approvers: [] }] } },
  },

  // --- Finance ---
  {
    id: "loan-application",
    title: "Loan application",
    category: "Finance",
    icon: Landmark,
    description: "Applicant, employment and income details with a calculated ratio.",
    fields: [
      ...contact(),
      f("date", "Date of birth", { key: "dob", required: true, sensitive: true }),
      f("address", "Address", { key: "address", required: true }),
      f("page", "Employment & income", { key: "page-income" }),
      f("dropdown", "Employment status", { key: "employment", required: true, options: ["Employed", "Self-employed", "Retired", "Other"] }),
      f("currency", "Annual income", { key: "income", required: true, sensitive: true }),
      f("currency", "Loan amount", { key: "amount", required: true }),
      f("dropdown", "Purpose", { key: "purpose", options: ["Home", "Car", "Education", "Business", "Other"] }),
      f("calculated", "Loan-to-income", { key: "lti", formula: "ROUND({f-amount} / MAX({f-income}, 1) * 100)", config: { format: "percent", countInScore: false } }),
    ],
    settings: { access: { mode: "login" }, saveResume: true, retentionDays: 2555 },
  },
  {
    id: "quote-calculator",
    title: "Quote calculator",
    category: "Finance",
    icon: Receipt,
    description: "Instant estimate from quantities and options using formulas.",
    fields: [
      f("number", "Number of rooms", { key: "rooms", required: true, validation: { min: 1, max: 20 } }),
      f("select", "Finish", { key: "finish", required: true, options: ["Standard", "Premium"], optionPoints: { Standard: 0, Premium: 1 } }),
      f("calculated", "Estimated price", { key: "estimate", formula: "{f-rooms} * (300 + 150 * {f-finish})", config: { format: "currency", countInScore: false } }),
      ...contact(),
    ],
    settings: { thankYouText: "Your estimate is {Estimated price}. We'll confirm within 24 hours." },
  },

  // --- Operations ---
  {
    id: "approval-request",
    title: "Approval request",
    category: "Operations",
    icon: ClipboardCheck,
    description: "Spend or policy exceptions routed through a two-step approval.",
    fields: [
      ...contact(),
      f("dropdown", "Department", { key: "dept", required: true, options: ["Engineering", "Sales", "Marketing", "Operations", "Finance"] }),
      f("dropdown", "Request type", { key: "type", required: true, options: ["Purchase", "Travel", "Software", "Exception"] }),
      f("currency", "Amount", { key: "amount" }),
      f("textarea", "Justification", { key: "why", required: true }),
      f("file", "Supporting documents", { key: "docs", config: { maxFiles: 3, maxSizeMb: 10, accept: "" } }),
    ],
    settings: { access: { mode: "login" }, approval: { enabled: true, steps: [{ id: "s-manager", name: "Manager", approvers: [] }, { id: "s-finance", name: "Finance", approvers: [] }] } },
  },
  {
    id: "purchase-order",
    title: "Purchase order",
    category: "Operations",
    icon: Package,
    description: "Line items in a repeating group with finance approval.",
    fields: [
      f("name", "Requester", { key: "requester", required: true }),
      f("text", "Vendor", { key: "vendor", required: true }),
      f("repeater", "Line items", {
        key: "items",
        required: true,
        config: { subFields: [{ id: "item", type: "text", label: "Item", required: true }, { id: "qty", type: "number", label: "Qty", required: true }, { id: "price", type: "number", label: "Unit price" }], minRows: 1, maxRows: 20, addLabel: "Add line item" },
      }),
      f("currency", "Order total", { key: "total", required: true }),
      f("date", "Needed by", { key: "needed" }),
    ],
    settings: { access: { mode: "login" }, approval: { enabled: true, steps: [{ id: "s-finance", name: "Finance", approvers: [] }] } },
  },
  {
    id: "it-request",
    title: "IT request",
    category: "Operations",
    icon: Wrench,
    description: "Hardware, software and access requests for the IT desk.",
    fields: [
      ...contact(),
      f("dropdown", "Request type", { key: "type", required: true, options: ["New hardware", "Software licence", "Access request", "Something's broken"] }),
      f("select", "Urgency", { key: "urgency", options: ["Low", "Medium", "High"], optionPoints: { Low: 10, Medium: 50, High: 100 } }),
      f("text", "Asset tag", { key: "asset", when: [["type", "equals", "Something's broken"]] }),
      f("textarea", "Details", { key: "details", required: true }),
    ],
    settings: { scoringEnabled: true, flow: { escalate: true, when: "high", labels: ["it"] }, assets: { sync: true } },
  },
  {
    id: "inspection-checklist",
    title: "Inspection checklist",
    category: "Operations",
    icon: ClipboardList,
    description: "Pass/fail site inspection with photos and inspector sign-off.",
    fields: [
      f("name", "Inspector", { key: "inspector", required: true }),
      f("text", "Site / location", { key: "site", required: true, width: "half" }),
      f("date", "Inspection date", { key: "date", required: true, width: "half" }),
      f("matrix", "Checklist", { key: "checklist", required: true, options: ["Pass", "Fail", "N/A"], config: { rows: ["Fire exits clear", "Extinguishers serviced", "First-aid kit stocked", "Signage visible", "Electrical panels secure"] } }),
      f("file", "Photos", { key: "photos", config: { maxFiles: 6, maxSizeMb: 10, accept: "image/*" } }),
      f("textarea", "Notes & corrective actions", { key: "notes" }),
      f("signature", "Inspector signature", { key: "signature", required: true }),
    ],
    settings: { offline: true, saveResume: true },
  },
  {
    id: "appointment-booking",
    title: "Appointment booking",
    category: "Operations",
    icon: CalendarDays,
    description: "Clients choose a service and an available time slot.",
    fields: [
      ...contact(),
      f("phone", "Phone number", { key: "phone" }),
      f("dropdown", "Service", { key: "service", required: true, options: ["Consultation", "Follow-up", "Assessment"] }),
      f("booking", "Appointment time", { key: "slot", required: true, config: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00", slotMinutes: 45, capacity: 1, horizonDays: 30, leadHours: 24, timezone: "UTC" } }),
      f("textarea", "Anything we should know?", { key: "notes" }),
    ],
    settings: { confirmEmail: true, confirmSubject: "Appointment confirmed", confirmBody: "See you at {Appointment time}." },
  },
  {
    id: "event-feedback",
    title: "Post-event feedback",
    category: "Operations",
    icon: CalendarCheck,
    description: "Session ratings and suggestions after an event.",
    fields: [
      f("rating", "Overall, how was the event?", { key: "overall", required: true }),
      f("multiselect", "Which sessions did you attend?", { key: "sessions", options: ["Keynote", "Workshops", "Panel", "Networking"] }),
      f("nps", "How likely are you to attend again?", { key: "again" }),
      f("textarea", "What should we change next time?", { key: "change" }),
    ],
    settings: { anonymous: true },
  },

  // --- Community ---
  {
    id: "contest-entry",
    title: "Contest entry",
    category: "Community",
    icon: Trophy,
    description: "One entry per person with a file upload and rules acceptance.",
    fields: [
      ...contact(),
      f("text", "Entry title", { key: "title", required: true }),
      f("textarea", "Tell us about your entry", { key: "about", required: true }),
      f("file", "Upload your entry", { key: "entry", required: true, config: { maxFiles: 1, maxSizeMb: 25, accept: "image/*,.pdf" } }),
      f("checkbox", "Rules", { key: "rules", label: "I accept the contest rules.", required: true }),
    ],
    settings: { duplicates: { enabled: true, fieldIds: ["f-email"], windowDays: 365, action: "block" }, spam: { honeypot: true, captcha: true, rateLimit: 10 } },
  },
  {
    id: "community-submission",
    title: "Community post submission",
    category: "Community",
    icon: MessageSquareQuote,
    description: "User-submitted stories or posts held for moderation.",
    fields: [
      f("text", "Your name", { key: "name", required: true }),
      f("email", "Email", { key: "email", required: true }),
      f("text", "Headline", { key: "headline", required: true, validation: { maxLength: 90 } }),
      f("textarea", "Your story", { key: "story", required: true, validation: { minLength: 100 } }),
      f("file", "Cover image", { key: "cover", config: { maxFiles: 1, maxSizeMb: 10, accept: "image/*" } }),
    ],
    settings: { approval: { enabled: true, steps: [{ id: "s-mod", name: "Moderator", approvers: [] }] } },
  },
];

export const TEMPLATES = RAW_TEMPLATES.map((t) => ({
  ...t,
  fields: buildFields(t.fields),
  settings: buildSettings(t.settings),
}));

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}

// createForm() input for a built-in template.
export function templateToFormInput(template, overrides = {}) {
  return {
    title: template.title,
    description: template.description,
    category: null,
    tags: [],
    schema: { fields: template.fields.map((field) => ({ ...field })) },
    settings: { ...template.settings, template: template.id },
    ...overrides,
  };
}
