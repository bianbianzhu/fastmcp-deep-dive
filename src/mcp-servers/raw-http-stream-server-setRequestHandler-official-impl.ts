import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  RegisteredTool,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ZodRawShape } from "zod";

/**
 * This implementation is in @modelcontextprotocol/sdk/server/mcp.js
 */

const server = new Server(
  {
    name: "mcp-http-stream-low-level",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  }
);

const _registeredTools: { [name: string]: RegisteredTool } = {};

server.setRequestHandler(
  CallToolRequestSchema,
  async (request, extra): Promise<CallToolResult> => {
    const tool = _registeredTools[request.params.name];
    if (!tool) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Tool ${request.params.name} not found`
      );
    }

    if (!tool.enabled) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Tool ${request.params.name} disabled`
      );
    }

    let result: CallToolResult;

    if (tool.inputSchema) {
      const parseResult = await tool.inputSchema.safeParseAsync(
        request.params.arguments
      );
      if (!parseResult.success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid arguments for tool ${request.params.name}: ${parseResult.error.message}`
        );
      }

      const args = parseResult.data;
      const cb = tool.callback as ToolCallback<ZodRawShape>;
      try {
        result = await Promise.resolve(cb(args, extra));
      } catch (error) {
        result = {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    } else {
      const cb = tool.callback as ToolCallback<undefined>;
      try {
        result = await Promise.resolve(cb(extra));
      } catch (error) {
        result = {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    }

    if (tool.outputSchema) {
      if (!result.structuredContent) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Tool ${request.params.name} has an output schema but no structured content was provided`
        );
      }

      // if the tool has an output schema, validate structured content
      const parseResult = await tool.outputSchema.safeParseAsync(
        result.structuredContent
      );
      if (!parseResult.success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid structured content for tool ${request.params.name}: ${parseResult.error.message}`
        );
      }
    }

    return result;
  }
);
