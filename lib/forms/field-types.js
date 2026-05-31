import {
  AlignLeft,
  AtSign,
  Calendar,
  CheckSquare,
  ChevronDownSquare,
  FileText,
  FunctionSquare,
  Hash,
  Paperclip,
  Phone,
  Type,
} from "lucide-react";

export const FIELD_TYPES = {
  text: { label: "Short text", Icon: AlignLeft, input: "text", hasOptions: false },
  email: { label: "Email", Icon: AtSign, input: "email", hasOptions: false },
  phone: { label: "Phone", Icon: Phone, input: "tel", hasOptions: false },
  textarea: { label: "Long text", Icon: Type, input: "textarea", hasOptions: false },
  number: { label: "Number", Icon: Hash, input: "number", hasOptions: false },
  date: { label: "Date", Icon: Calendar, input: "date", hasOptions: false },
  select: { label: "Choice", Icon: ChevronDownSquare, input: "select", hasOptions: true },
  checkbox: { label: "Checkbox", Icon: CheckSquare, input: "checkbox", hasOptions: false },
  file: { label: "File upload", Icon: Paperclip, input: "file", hasOptions: false },
  calculated: { label: "Calculated", Icon: FunctionSquare, input: "calculated", hasOptions: false },
};

export const FIELD_TYPE_LIST = Object.entries(FIELD_TYPES).map(([type, meta]) => ({
  type,
  ...meta,
}));

export function getFieldType(type) {
  return FIELD_TYPES[type] ?? FIELD_TYPES.text;
}

export function getFieldIcon(type) {
  return getFieldType(type).Icon ?? FileText;
}

export function isFileField(type) {
  return getFieldType(type).input === "file";
}
