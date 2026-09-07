import { formNav, navItemById } from "@/components/internal/sidebar/sidebar_nav";

// Canonical view for the workspace root (/project/<id> with no tab segment).
export const DEFAULT_VIEW = "Overview";

// Every sidebar id flattened, so slugs round-trip without a second registry.
const VIEW_IDS = (() => {
  const ids = [];
  for (const node of formNav) {
    if (node.children) for (const child of node.children) ids.push(child.id);
    else ids.push(node.id);
  }
  return ids;
})();

export function viewToSlug(id) {
  return (
    String(id || DEFAULT_VIEW)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "overview"
  );
}

// Unknown slugs fall back to the default — a bad tab never blanks the screen.
export function slugToView(slug) {
  const clean = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
  if (!clean) return DEFAULT_VIEW;
  return VIEW_IDS.find((id) => viewToSlug(id) === clean) || DEFAULT_VIEW;
}

export function isKnownView(id) {
  return !!navItemById(id);
}
