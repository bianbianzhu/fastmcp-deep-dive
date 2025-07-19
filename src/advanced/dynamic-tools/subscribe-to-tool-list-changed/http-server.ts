import {
  McpServer,
  RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const PORT = 8181;

const app = express();
app.use(express.json());

const sessions = new Map<
  string,
  {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
  }
>();

let dynamicTool: {
  tool: RegisteredTool;
  isEnabled: boolean;
} | null = null;

function createServer() {
  const server = new McpServer(
    {
      name: "dynamic-tools-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
      // This would stop the tool list changed event from being sent to the client - why ???? TODO: find out why
      // debouncedNotificationMethods: ["notifications/tools/list_changed"],
    }
  );

  server.registerTool(
    "add",
    {
      title: "Addition Tool",
      description: "Add two numbers",
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => ({
      content: [
        { type: "text", text: String(a + b) },
        {
          type: "text",
          text: "this is high level server addition tool",
        },
      ],
      isError: false,
    })
  );

  const subtractTool = server.registerTool(
    "subtract",
    {
      title: "Subtraction Tool",
      description: "Subtract two numbers",
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => ({
      content: [
        { type: "text", text: String(a - b) },
        {
          type: "text",
          text: "this is high level server subtraction tool",
        },
      ],
      isError: false,
    })
  );

  subtractTool.disable(); // disable the tool in the initial state

  dynamicTool = {
    tool: subtractTool,
    isEnabled: false,
  };

  return server;
}

// ============ Express server route ============
app.post("/mcp", async (req, res) => {
  const sid = req.headers["mcp-session-id"];

  let transport: StreamableHTTPServerTransport;
  let server: McpServer;

  if (sid && typeof sid === "string") {
    const session = sessions.get(sid);

    if (!session) {
      res.status(404).json({
        jsonrpc: "2.0",
        id: req.body.id ?? null,
        error: {
          code: -32000,
          message: "Bad Request: Session not found",
        },
      });
      return;
    }

    console.log("existing session: ", session.transport.sessionId);

    server = session.server;
    transport = session.transport;
  } else if (!sid && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: randomUUID,
      onsessioninitialized: (_sessionId) => {
        sessions.set(_sessionId, {
          server,
          transport,
        });
        console.log(`New session initialized: ${_sessionId}`);
      },
    });

    server = createServer();

    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      id: req.body.id ?? null,
      error: {
        code: -32000,
        message: "Bad Request: Invalid request",
      },
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

app.post("/toggle-subtract-tool", async (req, res) => {
  const sid = req.headers["mcp-session-id"];

  if (!sid || typeof sid !== "string") {
    res.status(400).json({
      jsonrpc: "2.0",
      id: req.body.id ?? null,
      error: {
        code: -32000,
        message: "Bad Request: Invalid session id",
      },
    });
    return;
  }

  const session = sessions.get(sid);
  if (!session) {
    res.status(404).json({
      jsonrpc: "2.0",
      id: req.body.id ?? null,
      error: {
        code: -32000,
        message: "Bad Request: Session not found",
      },
    });
    return;
  }

  if (!dynamicTool) {
    res.status(404).json({
      jsonrpc: "2.0",
      id: req.body.id ?? null,
      error: {
        code: -32000,
        message: "Bad Request: Dynamic tool not found",
      },
    });
    return;
  }

  dynamicTool.isEnabled = !dynamicTool.isEnabled;
  dynamicTool.tool[dynamicTool.isEnabled ? "enable" : "disable"]();

  console.log(`Dynamic tool ${dynamicTool.isEnabled ? "enabled" : "disabled"}`);

  res.status(200).json({
    jsonrpc: "2.0",
    id: req.body.id ?? null,
    result: {
      message: `Dynamic tool ${dynamicTool.isEnabled ? "enabled" : "disabled"}`,
    },
  });
});

app
  .listen(PORT, () => {
    console.log(`Server is running on port ${PORT} - raw http-stream server`);
  })
  .on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
