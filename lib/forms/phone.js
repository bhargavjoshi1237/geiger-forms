// Country dial codes for the phone field's picker. Answers stay one plain string ("+91 98765 43210"), so validation, exports and integrations don't change.

export const DIAL_CODES = [
  { code: "US", name: "United States", dial: "+1" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
  { code: "IE", name: "Ireland", dial: "+353" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "BE", name: "Belgium", dial: "+32" },
  { code: "CH", name: "Switzerland", dial: "+41" },
  { code: "AT", name: "Austria", dial: "+43" },
  { code: "SE", name: "Sweden", dial: "+46" },
  { code: "NO", name: "Norway", dial: "+47" },
  { code: "DK", name: "Denmark", dial: "+45" },
  { code: "FI", name: "Finland", dial: "+358" },
  { code: "PL", name: "Poland", dial: "+48" },
  { code: "CZ", name: "Czechia", dial: "+420" },
  { code: "GR", name: "Greece", dial: "+30" },
  { code: "TR", name: "Türkiye", dial: "+90" },
  { code: "RU", name: "Russia", dial: "+7" },
  { code: "UA", name: "Ukraine", dial: "+380" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "IL", name: "Israel", dial: "+972" },
  { code: "EG", name: "Egypt", dial: "+20" },
  { code: "NG", name: "Nigeria", dial: "+234" },
  { code: "KE", name: "Kenya", dial: "+254" },
  { code: "ZA", name: "South Africa", dial: "+27" },
  { code: "PK", name: "Pakistan", dial: "+92" },
  { code: "BD", name: "Bangladesh", dial: "+880" },
  { code: "LK", name: "Sri Lanka", dial: "+94" },
  { code: "NP", name: "Nepal", dial: "+977" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "HK", name: "Hong Kong", dial: "+852" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "ID", name: "Indonesia", dial: "+62" },
  { code: "PH", name: "Philippines", dial: "+63" },
  { code: "TH", name: "Thailand", dial: "+66" },
  { code: "VN", name: "Vietnam", dial: "+84" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "MX", name: "Mexico", dial: "+52" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "CL", name: "Chile", dial: "+56" },
  { code: "CO", name: "Colombia", dial: "+57" },
];

const byCode = new Map(DIAL_CODES.map((c) => [c.code, c]));
const LONGEST_FIRST = [...DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);

// { country, national } for a stored answer; countries sharing a dial code keep the current pick, and an unknown prefix falls back to the default.
export function splitPhone(value, fallback = "US", current = "") {
  const text = String(value ?? "").trim();
  const defaultCountry = byCode.has(fallback) ? fallback : "US";
  if (!text.startsWith("+")) return { country: current || defaultCountry, national: text };
  const match = LONGEST_FIRST.find((c) => text === c.dial || text.startsWith(`${c.dial} `) || text.startsWith(c.dial));
  if (!match) return { country: current || defaultCountry, national: text };
  const country = byCode.get(current)?.dial === match.dial ? current : byCode.get(defaultCountry).dial === match.dial ? defaultCountry : match.code;
  return { country, national: text.slice(match.dial.length).trim() };
}

// The stored answer; no number means no answer, so a lone dial code can't satisfy a required field.
export function joinPhone(country, national) {
  const number = String(national ?? "").trim();
  return number ? `${byCode.get(country)?.dial || ""} ${number}`.trim() : "";
}
