"use client";

import React from "react";
import { TriangleAlert } from "lucide-react";

// The playground runs the real workspace screens on the public landing page, so
// one screen tripping over unexpected data must not take the page down with it.
// Give it a `key` (the tab) so switching tabs resets it.
//
// ADAPT PER APP: if the app has screen-kit primitives (EmptyState, ScreenHeader,
// MainScreenWrapper), render the fallback with them as geiger-assets does; this
// plain-markup fallback works anywhere.
export class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[playground] screen failed to render", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    const title = this.props.title || "This screen";
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
          <TriangleAlert className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">{title} couldn&apos;t load in the playground</p>
          <p className="text-sm text-muted-foreground">
            Pick another screen from the sidebar, or open the workspace to see this one with your own data.
          </p>
        </div>
      </div>
    );
  }
}

export default ScreenErrorBoundary;
