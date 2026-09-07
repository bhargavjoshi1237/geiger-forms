// Deployment mount point for absolute navigations.
//
// In production this app is served under the /forms prefix behind the suite
// hub (dev: no prefix). Unlike geiger-events this app has no Next basePath,
// so Next does NOT re-attach the prefix on router.push/replace or <a href> —
// every absolute app path must carry it explicitly, or the browser lands on
// the hub root and 404s. NEXT_PUBLIC_ASSET_PREFIX is "" locally and "/forms"
// in production (see next.config.mjs).
export const APP_PREFIX = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

export function withPrefix(path) {
  if (!path || !APP_PREFIX || !path.startsWith("/")) return path;
  if (path === APP_PREFIX || path.startsWith(`${APP_PREFIX}/`)) return path;
  return `${APP_PREFIX}${path}`;
}
