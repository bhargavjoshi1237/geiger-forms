// How each AI app connects to the MCP server: an install link, a page to open, or a command to copy. Pure.

export const MCP_SERVER_NAME = "geiger-forms";

function cursorInstallLink(url) {
  const config = btoa(JSON.stringify({ url }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${MCP_SERVER_NAME}&config=${encodeURIComponent(config)}`;
}

function vscodeInstallLink(url) {
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: MCP_SERVER_NAME, type: "http", url }))}`;
}

// kind "open" copies the address and opens a page, "install" hands off to the app, "command" copies a terminal command.
export function buildAppCatalog(url) {
  return [
    {
      id: "claude",
      name: "Claude",
      description: "Desktop and web. Choose Add custom connector, then paste the address.",
      kind: "open",
      href: "https://claude.ai/settings/connectors",
      actionLabel: "Open Claude",
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      description: "Needs developer mode. Create a connector, then paste the address.",
      kind: "open",
      href: "https://chatgpt.com/#settings/Connectors",
      actionLabel: "Open ChatGPT",
    },
    {
      id: "cursor",
      name: "Cursor",
      description: "Adds the server to Cursor, which then asks you to sign in.",
      kind: "install",
      href: cursorInstallLink(url),
      actionLabel: "Add to Cursor",
    },
    {
      id: "vscode",
      name: "VS Code",
      description: "Adds the server to Copilot agent mode, which then asks you to sign in.",
      kind: "install",
      href: vscodeInstallLink(url),
      actionLabel: "Add to VS Code",
    },
    {
      id: "claude-code",
      name: "Claude Code",
      description: "Run this in your terminal, then use /mcp to sign in.",
      kind: "command",
      command: `claude mcp add --transport http ${MCP_SERVER_NAME} ${url}`,
      actionLabel: "Copy command",
    },
    {
      id: "codex",
      name: "Codex",
      description: "Run these two commands in your terminal. The second one signs you in.",
      kind: "command",
      command: `codex mcp add ${MCP_SERVER_NAME} --url ${url}\ncodex mcp login ${MCP_SERVER_NAME}`,
      actionLabel: "Copy commands",
    },
  ];
}
