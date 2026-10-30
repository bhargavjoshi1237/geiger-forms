// Pure helpers behind the respondent filler's accessibility behaviour (no document access, so they stay testable).

// Scroll behaviour that honours prefers-reduced-motion (an explicit "smooth" would otherwise ignore the CSS override).
export function scrollMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

// Next index for a roving-tabindex group; null when the key doesn't move. Left and right swap in RTL.
export function nextRovingIndex(key, index, count, rtl = false) {
  if (count <= 0) return null;
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const backward = rtl ? "ArrowRight" : "ArrowLeft";
  if (key === forward || key === "ArrowDown") return (index + 1) % count;
  if (key === backward || key === "ArrowUp") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

// The option a single-letter shortcut selects (A = first), or undefined when the key isn't one or is out of range.
export function optionForLetter(key, options) {
  if (!/^[a-z]$/i.test(String(key))) return undefined;
  return (options || [])[key.toUpperCase().charCodeAt(0) - 65];
}

// Built-in validation messages are English-only; an owner's pattern message is in the form's own language.
export function errorLanguage(field, error, locale) {
  if (!error || !locale || locale === "en" || error === field?.validation?.patternMessage) return undefined;
  return "en";
}

// Rows of the error summary in form order: one per invalid field, then the submit extras.
export function errorSummaryItems({ fields = [], errors = {}, extras = [], label = (f) => f.label || f.title || "", locale }) {
  const items = [];
  for (const field of fields) {
    const message = errors[field.id];
    if (message) items.push({ key: field.id, fieldId: field.id, label: label(field), message, lang: errorLanguage(field, message, locale) });
  }
  for (const extra of extras) {
    if (extra.message) items.push({ key: extra.key, targetId: extra.targetId, label: extra.label, message: extra.message });
  }
  return items;
}
