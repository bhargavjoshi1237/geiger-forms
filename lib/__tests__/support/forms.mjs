// Builders for server-shaped forms and requests, going through the real normalisation path.
import { toServerForm } from "@/lib/server/forms";

export const FORM_ID = "11111111-1111-4111-8111-111111111111";
export const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
export const OTHER_PROJECT_ID = "33333333-3333-4333-8333-333333333333";
export const OWNER_ID = "44444444-4444-4444-8444-444444444444";
export const ORIGIN = "https://app.test";

export const field = (id, type = "text", extra = {}) => ({ id, type, title: id, ...extra });

export function formRow({ fields = [field("q")], settings = {}, ...columns } = {}) {
  return {
    id: FORM_ID,
    slug: "demo",
    title: "Demo",
    status: "Published",
    project_id: PROJECT_ID,
    created_by: OWNER_ID,
    is_template: false,
    response_count: 0,
    schema: { fields },
    settings,
    metadata: {},
    ...columns,
  };
}

export const makeForm = (options) => toServerForm(formRow(options));

export const request = (headers = {}, url = `${ORIGIN}/api/public/forms/demo/submit`) => new Request(url, { method: "POST", headers });
