import express, { Router } from "express";
import type { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  createStytchBearerTokenAuthMiddleware,
  AuthenticatedRequest,
} from "./lib/auth.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * Environment configuration type
 */
type StytchEnvironment = {
  STYTCH_DOMAIN: string;
  STYTCH_PROJECT_ID: string;
};

/**
 * Creates and configures the Express application
 */
export function createApp(env: StytchEnvironment): Application {
  const app = express();

  // Middleware setup
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Create auth middleware instance
  const bearerAuth = createStytchBearerTokenAuthMiddleware(env);

  // OAuth protected resource endpoint
  app.get("/.well-known/oauth-protected-resource", (req, res) => {
    const protocol = req.protocol;
    const host = req.get("host");
    const origin = `${protocol}://${host}`;

    res.json({
      resource: origin,
      authorization_servers: [env.STYTCH_DOMAIN],
    });
  });

  app.use("/mcp", bearerAuth);
  app.use("/mcp", createMcpRouter());

  return app;
}

const sessions = new Map<
  string,
  {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
  }
>();

/**
 * Creates MCP router
 */
function createMcpRouter() {
  const router: Router = Router();

  router.post("/*", async (req: AuthenticatedRequest, res) => {
    const { claims: userClaims, accessToken } = req;

    console.log("userClaims: ", userClaims);
    console.log("accessToken: ", accessToken);

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

  return router;
}

/**
 * Default export for easy usage
 */
export default function createStytchApp(env: StytchEnvironment): Application {
  return createApp(env);
}

function createServer() {
  const server = new McpServer({
    name: "mcp-http-stream",
    version: "1.0.0",
  });

  server.registerTool(
    "multiply",
    {
      title: "Multiplication Tool",
      description: "Multiply two numbers",
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a * b) }],
      isError: false,
    })
  );

  server.registerTool(
    "divide",
    {
      title: "Division Tool",
      description: "Divide two numbers",
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a / b) }],
      isError: false,
    })
  );

  return server;
}
