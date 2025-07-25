import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "tsx",
  args: ["src/mcp-servers/raw-stdio-server-quick-start.ts"],
});

const client = new Client({
  name: "example-client",
  version: "1.0.0",
});

await client.connect(transport);

// List tools
const tools = await client.listTools();

console.log(tools);

// Call a tool
const result = await client.callTool({
  name: "add",
  arguments: {
    a: 1,
    b: 2,
  },
});

console.log(result);
