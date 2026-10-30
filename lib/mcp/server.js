import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { MCP_METADATA_PATH, MCP_PUBLIC_ORIGIN } from "./config";
import { verifyMcpToken } from "./auth";
import { runTool } from "./run_tool";
import { TOOLS } from "./tools";

export function buildMcpHandler({ deps, verify = verifyMcpToken, tools = TOOLS }) {
  const handler = createMcpHandler(
    (server) => {
      for (const tool of tools) {
        server.registerTool(
          tool.name,
          {
            title: tool.title,
            description: tool.description,
            inputSchema: z.object(tool.input),
            annotations: { title: tool.title, ...tool.annotations },
          },
          (args, ctx) => runTool(tool, args, ctx.http?.authInfo, deps),
        );
      }
    },
    { serverInfo: { name: "geiger-forms", version: "1.0.0" } },
  );

  return withMcpAuth(handler, verify, {
    required: true,
    resourceUrl: MCP_PUBLIC_ORIGIN,
    resourceMetadataPath: MCP_METADATA_PATH,
  });
}
