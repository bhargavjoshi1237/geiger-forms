# Geiger Forms — Suite Integration Features

Features that connect Forms with other products in the Geiger Studio suite.
Each feature is grounded in the shared infrastructure that already exists across the suite:
Supabase auth, `flow_projects`, `flow_profiles`, `flow_workspace_roles`, `flow_notifications`, and Geiger Assets storage.

---

## 1. Flow Project Association

**Bind forms to Flow projects so form work lives inside the same project context as tasks, canvases, and notes.**

A form can be assigned to a Flow project at creation or from the form settings panel. Once associated, the form appears in the relevant Flow project view alongside other project artifacts. Collaborator access is inherited from the project membership, eliminating the need to manage form sharing separately. Forms not assigned to a project remain in the personal workspace.

**Why it matters:** Every other product in the suite (Canvas, Grey, Notes) already links to `flow_projects`. Forms being the exception creates a gap in the project record — intake forms, registration forms, and approval requests belong in the same place as the work they feed into.

**Data:** Add `project_id uuid references flow_projects(id)` to the `forms` table.

---

## 2. Response-to-Task Escalation

**Turn form submissions into actionable Flow tasks without manual copy-paste.**

In the form settings, a workspace member can configure an escalation rule: when a response is received (or when it meets a condition such as a specific field value), a new task is created in a designated Flow project with the response summary pre-filled. The task is assigned to a chosen team member or role. This works for approval requests, support intake, hiring pipelines, and any other form that produces work to be done.

**Why it matters:** The missing step in most form tools is what happens after submission. Flow already manages tasks, priorities, and assignees — connecting the two removes the most common manual handoff in the suite.

**Data:** A `form_escalation_rules` table storing `form_id`, `trigger_condition`, `target_project_id`, `assignee_role`, and `task_template`. On submission, a server action inserts a row into Flow's task table and dispatches a notification.

---

## 3. Flow Notification Dispatch

**New responses appear as notifications in the Flow notification feed, visible across the suite.**

When a form receives a submission, a row is inserted into `flow_notifications` with the form name, respondent identifier (if available), and a deep link back to the response in Forms. Team members who follow the form or are subscribed to the project receive the notification in the Flow sidebar. Notification frequency is controlled by the existing notification preferences in Flow — no new settings surface.

**Why it matters:** Grey and Canvas already write to `flow_notifications`. Plugging Forms into the same pipe means the activity feed in Flow reflects the full picture of project work, not just task updates.

**Data:** On response insert, write to `flow_notifications` using the existing schema: `user_id`, `type = 'form_response'`, `title`, `body`, `resource_id`, `resource_type = 'form'`.

---

## 4. Asset-Backed File Fields

**File upload fields in forms route directly into Geiger Assets, not a throwaway bucket.**

When a form includes a file upload question, submitted files are stored in Geiger Assets under a configurable collection (e.g., "Customer Intake Uploads — May 2026"). Each file lands with metadata: the form name, question label, respondent identifier, and submission timestamp. From Assets, files can be reviewed, tagged, versioned, and shared using Assets' existing review workflow. The response record in Forms stores the Asset ID rather than a raw file URL.

**Why it matters:** File uploads are currently the weakest point of form tools — files go into a generic bucket and are never seen again. Routing them into Assets gives the team a real review workflow and keeps media organized alongside other brand and project assets.

**Data:** Forms calls the Assets upload API on submission. The `form_responses` table stores `asset_id` references alongside raw field values in the JSONB payload.

---

## 5. Workspace Role Enforcement (Flow RBAC)

**Form editing and response visibility are gated by the workspace roles defined in Flow, not a separate per-form collaborator model.**

The `flow_workspace_roles` table defines roles with explicit permission lists (e.g., `forms:edit`, `forms:view_responses`, `forms:publish`). Rather than maintaining a standalone `form_collaborators` table with its own invite flow, Forms reads the authenticated user's role from `flow_profiles` and applies the matching permissions. Owners and editors can build and publish forms; viewers can read responses but not edit; restricted roles see only forms explicitly shared with them.

**Why it matters:** Managing access in two places (Flow roles and form collaborators) creates drift — the same person ends up with conflicting permissions. A single RBAC source of truth, already in place in Flow, is the correct foundation for a multi-product suite.

**Data:** Add `forms:edit`, `forms:publish`, `forms:view_responses`, and `forms:manage_templates` to the `flow_workspace_roles` permissions array. RLS policies on forms tables check the user's role record in `flow_profiles`.

---

## 6. Grey Entity Population from Responses

**Structured responses from contact or intake forms create nodes in the Grey knowledge graph automatically.**

In the form schema, the workspace owner can mark certain fields as "entity fields" — name, company, role, email. When a response is submitted, a server action checks whether a Grey node with that entity already exists. If not, it creates one. If a node exists, it logs the interaction as an edge or attribute update. This turns an intake form into a lightweight CRM feed, with each respondent appearing as a node whose connections and history accumulate over time.

**Why it matters:** Grey is a relationship and knowledge tool. Form responses are often the first moment a person or company enters the workspace's record — routing that event into Grey means the knowledge graph stays current without manual data entry.

**Data:** `form_schema` gains an optional `entity_mapping` field specifying which question maps to which node property (`name`, `type`, `domain`). On submission, call Grey's node upsert logic referencing `grey_knowledge_nodes`.
