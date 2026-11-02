import { Suspense } from "react";
import { RbacProvider } from "@/context/rbac-context";

// Permissions read the URL, so they stay on signed-in routes; at the root they forced public pages to render only in the browser.
export default function FormsLayout({ children }) {
  return (
    <Suspense>
      <RbacProvider>{children}</RbacProvider>
    </Suspense>
  );
}
