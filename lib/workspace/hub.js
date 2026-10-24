// Suite hub (geiger-dash) origin, as in proxy.js; unset means the hub serves this app on its own origin.
const DASH_ORIGIN = (process.env.NEXT_PUBLIC_DASH_ORIGIN || "").replace(/\/$/, "");

// The hub's organizations page, where projects are created and joined.
export const HUB_PROJECTS_URL = `${DASH_ORIGIN}/org`;
