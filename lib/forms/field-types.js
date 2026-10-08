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
  Hash,
  Heading,
  Link2,
  ListChecks,
  ListOrdered,
  MapPin,
  Package,
  Paperclip,
  PenLine,
  Phone,
  Receipt,
  Repeat,
  SlidersHorizontal,
  SplitSquareVertical,
  Star,
  Type,
  User,
} from "lucide-react";

// Field-type registry. `input` picks the renderer branch; `group` drives the builder
// palette; `answer` documents the stored value shape; `layout` types collect nothing.
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
  multiselect: { label: "Multiple choice", Icon: ListChecks, input: "multiselect", group: "Choice", hasOptions: true, answer: "string[]" },
  checkbox: { label: "Checkbox (yes/no)", Icon: CheckSquare, input: "checkbox", group: "Choice", answer: "boolean" },
  ranking: { label: "Ranking", Icon: ListOrdered, input: "ranking", group: "Choice", hasOptions: true, answer: "string[]" },

  date: { label: "Date", Icon: Calendar, input: "date", group: "Date & time", answer: "YYYY-MM-DD" },
  time: { label: "Time", Icon: Clock, input: "time", group: "Date & time", answer: "HH:MM" },
  datetime: { label: "Date & time", Icon: CalendarClock, input: "datetime-local", group: "Date & time", answer: "YYYY-MM-DDTHH:MM" },
  booking: { label: "Booking slot", Icon: CalendarDays, input: "booking", group: "Date & time", answer: "ISO slot start" },

  rating: { label: "Star rating", Icon: Star, input: "rating", group: "Survey", answer: "number" },
  scale: { label: "Linear scale", Icon: SlidersHorizontal, input: "scale", group: "Survey", answer: "number" },
  nps: { label: "NPS (0–10)", Icon: Gauge, input: "nps", group: "Survey", answer: "number" },
  matrix: { label: "Matrix / Likert", Icon: Grid3x3, input: "matrix", group: "Survey", hasOptions: true, answer: "{ [row]: column }" },

  name: { label: "Full name", Icon: User, input: "name", group: "Contact", answer: "{ first, last }" },
  address: { label: "Address", Icon: MapPin, input: "address", group: "Contact", answer: "{ line1, line2, city, state, zip, country }" },

  file: { label: "File upload", Icon: Paperclip, input: "file", group: "Advanced", answer: "[{ name, path, size, type }]" },
  signature: { label: "Signature", Icon: PenLine, input: "signature", group: "Advanced", answer: "{ path, signedAt } | data URL" },
  repeater: { label: "Repeating group", Icon: Repeat, input: "repeater", group: "Advanced", answer: "[{ [subFieldId]: value }]" },
  hidden: { label: "Hidden field", Icon: EyeOff, input: "hidden", group: "Advanced", answer: "string" },
  calculated: { label: "Calculated", Icon: FunctionSquare, input: "calculated", group: "Advanced", answer: "number" },

  product: { label: "Product", Icon: Package, input: "product", group: "Payments", answer: "number (quantity)" },
  total: { label: "Order total", Icon: Receipt, input: "total", group: "Payments", answer: "computed" },

  heading: { label: "Section heading", Icon: Heading, input: "heading", group: "Layout", layout: true },
  content: { label: "Text block", Icon: FileText, input: "content", group: "Layout", layout: true },
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

// Layout blocks and computed fields never take respondent input.
export function isInputField(type) {
  const meta = getFieldType(type);
  return !meta.layout && type !== "calculated" && type !== "total";
}
