// Folder names: saved workspace folders plus any category already used by a form.
export function folderNames(settings, forms = []) {
  const set = new Set((settings?.folders || []).map((f) => (typeof f === "string" ? f : f?.name)).filter(Boolean));
  for (const f of forms) if (f.category) set.add(f.category);
  return [...set].sort((a, b) => a.localeCompare(b));
}

// Layers workspace defaults (privacy, spam, branding, locale) onto a new form's settings.
export function applyWorkspaceDefaults(settings, ws) {
  if (!ws) return settings;
  const s = { ...settings };
  if (ws.defaultRetentionDays && !s.retentionDays) s.retentionDays = ws.defaultRetentionDays;
  if (ws.requireCaptcha) s.spam = { ...(s.spam || {}), captcha: true };
  if (ws.anonymiseByDefault) s.anonymous = true;
  if (ws.hideBranding) s.branding = false;
  if (ws.brandAccent && !s.theme?.accent) s.theme = { ...(s.theme || {}), accent: ws.brandAccent };
  if (ws.brandLogoUrl && !s.logoUrl) s.logoUrl = ws.brandLogoUrl;
  if (ws.locale && (!s.locale || s.locale === "en")) s.locale = ws.locale;
  return s;
}
