import { SuiteHeader } from "@geiger/ui/suite-header";

// Forms has no landing-side profile dropdown — the right-hand slot is a plain
// CTA into the workspace.
export function Header() {
  return <SuiteHeader signInHref="/org" signInLabel="Open Forms" />;
}
