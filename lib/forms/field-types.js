import {
  AlignLeft,
  AtSign,
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ChevronDownSquare,
  CircleDot,
  Clock,
  DollarSign,
  EyeOff,
  FileText,
  FunctionSquare,
  Gauge,
  Grid3x3,
  Grid2x2Check,
  Hash,
  Heading,
  ImageIcon,
  Images,
  Link2,
  ListChecks,
  ListOrdered,
  MapPin,
  Package,
  Paperclip,
  PenLine,
  Phone,
  Quote,
  Receipt,
  Repeat,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  SplitSquareVertical,
  SquarePlay,
  Star,
  Type,
  User,
} from "lucide-react";

// Field-type registry. `input` picks the renderer branch; `group` drives the builder
// palette; `answer` documents the stored value shape; `layout` types collect nothing; `multi` choices store string[].
export const FIELD_TYPES = {
  text: { label: "Short text", Icon: AlignLeft, input: "text", group: "Basic", answer: "string" },
  textarea: { label: "Long text", Icon: Type, input: "textarea", group: "Basic", answer: "string" },
  email: { label: "Email", Icon: AtSign, input: "email", group: "Basic", answer: "string" },
  phone: { label: "Phone", Icon: Phone, input: "tel", group: "Basic", answer: "string" },
  url: { label: "Website URL", Icon: Link2, input: "url", group: "Basic", answer: "string" },
  number: { label: "Number", Icon: Hash, input: "number", group: "Basic", answer: "number" },
  currency: { label: "Currency", Icon: DollarSign, input: "currency", group: "Basic", answer: "number" },

  select: { label: "Single choice", Icon: CircleDot, input: "select", group: "Choice", hasOptions: true, answer: "string" },
  dropdown: { label: "Dropdown", Icon: ChevronDownSquare, input: "dropdown", group: "Choice", hasOptions: true, answer: "string" },
  multiselect: { label: "Multiple choice", Icon: ListChecks, input: "multiselect", group: "Choice", hasOptions: true, multi: true, answer: "string[]" },
  picture: { label: "Picture choice", Icon: Images, input: "picture", group: "Choice", hasOptions: true, answer: "string" },
  multipicture: { label: "Multiple picture choice", Icon: Grid2x2Check, input: "picture", group: "Choice", hasOptions: true, multi: true, answer: "string[]" },
  checkbox: { label: "Checkbox (yes/no)", Icon: CheckSquare, input: "checkbox", group: "Choice", answer: "boolean" },
  ranking: { label: "Ranking", Icon: ListOrdered, input: "ranking", group: "Choice", hasOptions: true, answer: "string[]" },

  date: { label: "Date", Icon: Calendar, input: "date", group: "Date & time", answer: "YYYY-MM-DD" },
  time: { label: "Time", Icon: Clock, input: "time", group: "Date & time", answer: "HH:MM" },
  datetime: { label: "Date & time", Icon: CalendarClock, input: "datetime-local", group: "Date & time", answer: "YYYY-MM-DDTHH:MM" },
  booking: { label: "Booking slot", Icon: CalendarDays, input: "booking", group: "Date & time", answer: "ISO slot start" },

  rating: { label: "Star rating", Icon: Star, input: "rating", group: "Survey", answer: "number" },
  scale: { label: "Linear scale", Icon: SlidersHorizontal, input: "scale", group: "Survey", answer: "number" },
  nps: { label: "NPS (0–10)", Icon: Gauge, input: "nps", group: "Survey", answer: "number" },
  opinion: { label: "Opinion scale", Icon: Smile, input: "opinion", group: "Survey", answer: "number (1..steps)" },
  matrix: { label: "Matrix / Likert", Icon: Grid3x3, input: "matrix", group: "Survey", hasOptions: true, answer: "{ [row]: column }" },

  name: { label: "Full name", Icon: User, input: "name", group: "Contact", answer: "{ first, last }" },
  address: { label: "Address", Icon: MapPin, input: "address", group: "Contact", answer: "{ line1, line2, city, state, zip, country }" },

  file: { label: "File upload", Icon: Paperclip, input: "file", group: "Advanced", answer: "[{ name, path, size, type }]" },
  signature: { label: "Signature", Icon: PenLine, input: "signature", group: "Advanced", answer: "{ path, signedAt } | data URL" },
  consent: { label: "Consent", Icon: ShieldCheck, input: "consent", group: "Advanced", answer: "boolean (+ metadata.consents[id] = { acceptedAt, textHash })" },
  repeater: { label: "Repeating group", Icon: Repeat, input: "repeater", group: "Advanced", answer: "[{ [subFieldId]: value }]" },
  hidden: { label: "Hidden field", Icon: EyeOff, input: "hidden", group: "Advanced", answer: "string" },
  calculated: { label: "Calculated", Icon: FunctionSquare, input: "calculated", group: "Advanced", answer: "number" },

  product: { label: "Product", Icon: Package, input: "product", group: "Payments", answer: "number (quantity)" },
  total: { label: "Order total", Icon: Receipt, input: "total", group: "Payments", answer: "computed" },

  heading: { label: "Section heading", Icon: Heading, input: "heading", group: "Layout", layout: true },
  content: { label: "Text block", Icon: FileText, input: "content", group: "Layout", layout: true },
  statement: { label: "Statement", Icon: Quote, input: "statement", group: "Layout", layout: true },
  image: { label: "Image", Icon: ImageIcon, input: "image", group: "Layout", layout: true },
  video: { label: "Video", Icon: SquarePlay, input: "video", group: "Layout", layout: true },
  page: { label: "Page break", Icon: SplitSquareVertical, input: "page", group: "Layout", layout: true },
};

export const FIELD_GROUPS = ["Basic", "Choice", "Date & time", "Survey", "Contact", "Advanced", "Payments", "Layout"];

export const FIELD_TYPE_LIST = Object.entries(FIELD_TYPES).map(([type, meta]) => ({ type, ...meta }));

// Sub-field types a repeating group row may contain.
export const REPEATER_SUBTYPES = ["text", "textarea", "email", "phone", "number", "date", "dropdown"];

export function getFieldType(type) {
  return FIELD_TYPES[type] ?? FIELD_TYPES.text;
}

export function getFieldIcon(type) {
  return getFieldType(type).Icon ?? FileText;
}

export function isFileField(type) {
  return getFieldType(type).input === "file";
}

export function hasOptions(type) {
  return Boolean(getFieldType(type).hasOptions);
}

// Choice types whose answer is a list of selected options.
export function isMultiChoice(type) {
  return Boolean(getFieldType(type).multi);
}

// Content-only blocks (headings, text, statements, media, page breaks).
export function isLayoutField(type) {
  return Boolean(getFieldType(type).layout);
}

// Layout blocks and computed fields never take respondent input.
export function isInputField(type) {
  const meta = getFieldType(type);
  return !meta.layout && type !== "calculated" && type !== "total";
}

// Opinion scale: 3–7 steps (default 5), each optionally labelled by config.labels.
export function opinionSteps(field) {
  const n = Math.round(Number(field?.config?.steps));
  return n >= 3 && n <= 7 ? n : 5;
}

export function opinionLabel(field, value) {
  return field?.config?.labels?.[Number(value) - 1] || "";
}

// HTML autocomplete tokens a short-text field can opt into (config.autocomplete); unset means inferred from the title.
export const AUTOFILL_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "name", label: "Full name" },
  { value: "given-name", label: "First name" },
  { value: "family-name", label: "Last name" },
  { value: "organization", label: "Company" },
  { value: "organization-title", label: "Job title" },
  { value: "address-line1", label: "Street address" },
  { value: "address-line2", label: "Address line 2" },
  { value: "address-level2", label: "City" },
  { value: "address-level1", label: "State / province" },
  { value: "postal-code", label: "Postal code" },
  { value: "country-name", label: "Country" },
  { value: "username", label: "Username" },
  { value: "one-time-code", label: "One-time code" },
];

const TYPE_AUTOFILL = { email: "email", phone: "tel", url: "url" };
const TITLE_AUTOFILL = [
  [/\b(first|given)\s*name\b/i, "given-name"],
  [/\b(last|family|sur)\s*name\b|\bsurname\b/i, "family-name"],
  [/\b(company|organi[sz]ation|employer)\b/i, "organization"],
  [/\bjob title\b/i, "organization-title"],
  [/\b(zip|postal|post)\s*code\b|\bpostcode\b/i, "postal-code"],
  [/\b(city|town)\b/i, "address-level2"],
  [/\bcountry\b/i, "country-name"],
  [/\bname\b/i, "name"],
];

// The autocomplete token for a field's input: explicit setting, then the type's token, then the short-text title.
export function autofillToken(field) {
  if (field?.config?.autocomplete) return field.config.autocomplete;
  if (TYPE_AUTOFILL[field?.type]) return TYPE_AUTOFILL[field.type];
  if (field?.type !== "text") return undefined;
  return TITLE_AUTOFILL.find(([re]) => re.test(field.title || ""))?.[1];
}
