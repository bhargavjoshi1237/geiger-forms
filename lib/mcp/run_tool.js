// Every MCP tool call passes through here: rate limit, connection, read/write, project, role, then the tool, then the audit log.

export class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.expose = true;
  }
}

const NOT_CONNECTED =
  "This app has no active connection to Geiger. Reconnect it, then choose which projects it can reach.";
const NOT_REACHABLE = "Not found, or this app wasn't given access to it.";

// Every listed permission must hold; a first refusal issues the user's saved role and checks once more.
async function requirePermissions(tool, projectId, formId, ctx, deps) {
  const allowed = async () => {
    for (const permission of tool.permissions) {
      if (!(await deps.can(ctx.db, permission, projectId, formId))) return false;
    }
    return true;
  };
  if (await allowed()) return;
  // Someone who has never opened Forms has no saved role yet.
  await deps.ensureMembership(ctx.db, projectId);
  if (!(await allowed())) throw new ToolError("forbidden", "Your role in this project doesn't allow this.");
}

async function authorize(tool, args, ctx, deps) {
  const { connection } = ctx;

  if (tool.scope === "connection") return { projectId: null };

  if (tool.scope === "project") {
    const { projectId } = args;
    if (!connection.projectIds.includes(projectId)) {
      throw new ToolError("not_found", "Project not found, or this app wasn't given access to it.");
    }
    await requirePermissions(tool, projectId, null, ctx, deps);
    return { projectId, targetId: projectId };
  }

  const target = tool.scope === "response" ? await deps.loadResponseTarget(args.responseId) : await deps.loadFormTarget(args.formId);
  // A refusal outside the connection reads as not found, so it can't reveal that a form exists.
  if (!target?.projectId || !connection.projectIds.includes(target.projectId)) throw new ToolError("not_found", NOT_REACHABLE);
  await requirePermissions(tool, target.projectId, target.formId, ctx, deps);
  return { projectId: target.projectId, targetId: tool.scope === "response" ? args.responseId : target.formId };
}

function outcomeFor(error) {
  if (error?.code === "rate_limited") return "rate_limited";
  if (["forbidden", "not_found", "not_connected", "read_only", "unauthenticated"].includes(error?.code)) return "denied";
  return "error";
}

function messageFor(error) {
  if (error?.expose) {
    const warnings = error.extra?.warnings?.map((warning) => warning.message) ?? [];
    return [error.message, ...warnings].join("\n");
  }
  return "Something went wrong running this tool. Please try again.";
}

export async function runTool(tool, args, authInfo, deps) {
  const startedAt = Date.now();
  const userId = authInfo?.extra?.userId;
  const clientId = authInfo?.clientId;
  let connection = null;
  let scope = {};
  let failure = null;
  let result = null;

  try {
    if (!userId || !clientId) throw new ToolError("unauthenticated", "Sign in to continue.");
    if (await deps.isRateLimited(userId, clientId)) {
      throw new ToolError("rate_limited", "Too many requests. Wait a minute and try again.");
    }

    connection = await deps.loadConnection(authInfo.token, userId, clientId);
    if (!connection) throw new ToolError("not_connected", NOT_CONNECTED);
    if (tool.access === "write" && connection.access !== "write") {
      throw new ToolError(
        "read_only",
        "This app has read-only access. Reconnect it with changes allowed to use this tool.",
      );
    }

    const ctx = {
      userId,
      actor: { id: userId, name: authInfo.extra.name || "AI app" },
      connection,
      db: deps.userClient(authInfo.token),
      publicDb: deps.userClient(authInfo.token, "public"),
    };
    scope = await authorize(tool, args, ctx, deps);
    result = await tool.run({ ...ctx, projectId: scope.projectId }, args);
  } catch (error) {
    failure = error;
    if (!error?.expose) console.error(`[mcp.${tool.name}]`, error);
  }

  try {
    if (userId && clientId) {
      await deps.writeAudit({
        user_id: userId,
        client_id: clientId,
        connection_id: connection?.id ?? null,
        product: "forms",
        tool: tool.name,
        project_id: scope.projectId ?? null,
        target_id: scope.targetId ?? null,
        outcome: failure ? outcomeFor(failure) : "ok",
        error_code: failure?.code ?? null,
        duration_ms: Date.now() - startedAt,
        metadata: { argument_keys: Object.keys(args || {}) },
      });
    }
  } catch (error) {
    console.error("[mcp.audit]", error);
    // A change that can't be audited is reported, so nobody assumes the trail is complete.
    if (!failure && tool.access === "write") {
      result = { ...result, auditWarning: "This change succeeded but could not be written to the audit log." };
    }
  }

  if (failure) {
    return { isError: true, content: [{ type: "text", text: messageFor(failure) }] };
  }
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
}
