import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Reference:
https://github.com/GoogleCloudPlatform/cloud-run-mcp/blob/main/tools.js
*/

export function registerTool(server: McpServer, options: {} = {}) {
  server.tool(
    "add",
    "add two numbers together",
    {
      a: z.number().describe("The first number to add"),
      b: z.number().describe("The second number to add"),
    },
    {
      title: "Addition Tool",
      readOnlyHint: true,
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }],
      isError: false,
    })
  );
}
