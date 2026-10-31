"use client";

import React from "react";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@geiger/ui/screen-kit";

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
        <div className="max-w-sm rounded-2xl border border-dashed border-border">
          <EmptyState
            icon={TriangleAlert}
            className="p-8"
            title={`${title} couldn't load in the playground`}
            description="Pick another screen from the sidebar, or open the workspace to see this one with your own data."
          />
        </div>
      </div>
    );
  }
}

export default ScreenErrorBoundary;
