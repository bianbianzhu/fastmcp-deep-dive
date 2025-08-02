import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTool } from "./tools.js";

export function initServer(): McpServer {
  const server = new McpServer({
    name: "notion-mcp-server",
    version: "0.0.1",
  });

  registerTool(server);

  return server;
}
