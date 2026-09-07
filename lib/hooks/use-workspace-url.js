"use client";

import { createContext, useCallback, useContext } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { DEFAULT_VIEW, slugToView, viewToSlug } from "@/lib/workspace/views";

// URL model for the project workspace, mirroring geiger-events:
//   /project/<id>            → Overview
//   /project/<id>/<view>     → workspace view (slugified sidebar id)
// The legacy /forms?view=<id> entry point keeps working unscoped.
export const WorkspaceUrlContext = createContext(null);

export function useWorkspaceUrl() {
  const override = useContext(WorkspaceUrlContext);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const projectId = params?.projectId || null;
  const rest = params?.rest;
  const viewSlug = Array.isArray(rest) ? rest[0] : rest || null;
  const view = (viewSlug && slugToView(viewSlug)) || DEFAULT_VIEW;
  const category = searchParams.get("category") || null;

  const buildUrl = useCallback(
    (next = {}) => {
      const pid = next.project !== undefined ? next.project : projectId;
      const qp = new URLSearchParams(searchParams.toString());
      qp.delete("view");
      for (const k of ["category", "form"]) {
        if (next[k] !== undefined) {
          if (next[k]) qp.set(k, next[k]);
          else qp.delete(k);
        }
      }
      if (!pid) {
        const v = next.view !== undefined ? next.view : view;
        qp.set("view", v);
        return `/forms?${qp.toString()}`;
      }
      const nextView = next.view !== undefined ? next.view : view;
      const slug = nextView && nextView !== DEFAULT_VIEW ? viewToSlug(nextView) : "";
      let path = `/project/${pid}`;
      if (slug) path += `/${slug}`;
      const qs = qp.toString();
      return qs ? `${path}?${qs}` : path;
    },
    [projectId, view, searchParams],
  );

  const apply = useCallback(
    (next) => {
      router.push(buildUrl(next), { scroll: false });
    },
    [router, buildUrl],
  );

  const setProject = useCallback(
    (id) => apply({ project: id, category: null, form: null }),
    [apply],
  );
  const setView = useCallback(
    (next) => apply({ view: next, category: null, form: null }),
    [apply],
  );

  if (override) return override;

  return {
    projectId,
    view,
    category,
    buildUrl,
    setProject,
    setView,
  };
}
