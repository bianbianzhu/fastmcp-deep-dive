import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "Dynamic Example",
  version: "1.0.0",
});

server.tool("listMessages", { channel: z.string() }, async ({ channel }) => ({
  content: [{ type: "text", text: await listMessages(channel) }],
}));

const putMessageTool = server.tool(
  "putMessage",
  { channel: z.string(), message: z.string() },
  async ({ channel, message }) => ({
    content: [{ type: "text", text: await putMessage(channel, message) }],
  })
);
// Until we upgrade auth, `putMessage` is disabled (won't show up in listTools)
putMessageTool.disable();

const upgradeAuthTool = server.registerTool(
  "upgradeAuth",
  {
    title: "Upgrade Auth",
    description: "Upgrade auth to write or admin",
    inputSchema: { permission: z.enum(["write", "admin"]) },
  },
  // Any mutations here will automatically emit `listChanged` notifications
  async ({ permission }) => {
    const { ok, err, previous } = await upgradeAuthAndStoreToken(permission);
    if (!ok) return { content: [{ type: "text", text: `Error: ${err}` }] };

    // If we previously had read-only access, 'putMessage' is now available
    if (previous === "read") {
      putMessageTool.enable();
    }

    if (permission === "write") {
      // If we've just upgraded to 'write' permissions, we can still call 'upgradeAuth'
      // but can only upgrade to 'admin'.
      upgradeAuthTool.update({
        paramsSchema: { permission: z.enum(["admin"]) }, // change validation rules
      });

      return {
        content: [
          { type: "text", text: `Successfully upgraded to ${permission}` },
        ],
      };
    } else {
      // If we're now an admin, we no longer have anywhere to upgrade to, so fully remove that tool
      upgradeAuthTool.remove();

      return {
        content: [
          { type: "text", text: `Successfully upgraded to ${permission}` },
        ],
      };
    }
  }
);

// Connect as normal
const transport = new StdioServerTransport();
await server.connect(transport);

// mock functions
async function listMessages(_channel: string) {
  return "List of messages";
}

async function putMessage(_channel: string, _message: string) {
  return "Message put";
}

let currentAuthState: "read" | "write" | "admin" = "read";

async function upgradeAuthAndStoreToken(permission: "write" | "admin") {
  const previousState = currentAuthState;

  // Simple validation: only allow upgrades
  const canUpgrade =
    (currentAuthState === "read" &&
      (permission === "write" || permission === "admin")) ||
    (currentAuthState === "write" && permission === "admin");

  if (!canUpgrade) {
    return {
      ok: false,
      err: `Cannot upgrade from ${currentAuthState} to ${permission}`,
      previous: previousState,
    };
  }

  // Update the state
  currentAuthState = permission;

  return {
    ok: true,
    err: null,
    previous: previousState,
  };
}
