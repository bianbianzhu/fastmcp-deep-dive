# FastMCP

A comprehensive implementation and example collection for the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), built with TypeScript and the FastMCP library.

## Overview

This is a TypeScript project that demonstrates how to build MCP servers and clients using the `@modelcontextprotocol/sdk` and `fastmcp` libraries. It includes various examples of MCP tools, different transport mechanisms, and integration patterns with AI models.

## Features

- **Multiple Transport Types**: Support for both STDIO and HTTP Stream transports
- **Rich Tool Examples**: Comprehensive collection of MCP tools demonstrating different capabilities
- **Authentication**: Built-in authentication mechanisms
- **Progress Reporting**: Real-time progress updates for long-running operations
- **Multi-content Support**: Handle text, image, and audio content types
- **Session Management**: User session handling and context management
- **Error Handling**: Robust error handling with custom error types
- **Logging**: Comprehensive logging system
- **Client/Server Examples**: Both client and server implementations

## Project Structure

```
fastmcp/
├── src/
│   ├── index.ts                    # Main MCP server with example tools
│   ├── httpServer.ts              # HTTP server implementation
│   ├── jsonrpc/                   # JSON-RPC implementation
│   ├── mcp-client/                # MCP client implementations
│   ├── mcp-host/                  # Function calling host examples
│   ├── mcp-servers/               # Various MCP server examples
│   ├── stdio/                     # STDIO chat implementations
│   └── samples/                   # Additional example code
├── diagrams/                      # Architecture diagrams
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

## Prerequisites

- Node.js (v20 or higher)
- pnpm package manager

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd fastmcp
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables (optional):

```bash
cp .env.example .env
# Edit .env with your API keys if needed
```

## Usage

### Running the Main MCP Server

The main server (`src/index.ts`) includes a comprehensive set of example tools:

```bash
# Run with auto-reload
pnpm mcp:dev

# Or run the HTTP stream server
pnpm mcp:raw-http-stream
```

### Available Scripts

- `pnpm mcp:dev` - Run the main MCP server with auto-reload
- `pnpm mcp:raw-stdio` - Run the STDIO server example
- `pnpm mcp:raw-http-stream` - Run the HTTP stream server example
- `pnpm mcp:client` - Run the MCP client example
- `pnpm mcp:fc-host` - Run the function calling host
- `pnpm stdio:chat` - Run the STDIO chat application
- `pnpm build` - Build the TypeScript project
- `pnpm test` - Run tests

### Example Tools

The main server includes several example tools:

1. **Basic Math**: `add` - Add two numbers
2. **Health Calculator**: `calculate_bmi` - Calculate BMI
3. **Weather**: `get_weather` - Get weather information (requires API key)
4. **File Operations**: `readFile`, `delete_file` - File system operations
5. **Media Generation**: `generate_image`, `generate_audio` - Media content examples
6. **Progress Tracking**: `download_file` - Demonstrates progress reporting
7. **Database**: `load_data_from_db` - Database operation simulation
8. **System Info**: `get_process_info` - Process and session information

### Authentication

The server includes a simple authentication mechanism:

```typescript
const server = new FastMCP({
  name: "test-server",
  version: "0.0.1",
  authenticate: async (request) => {
    const authHeader = request.headers["x-api-key"];
    // Validate API key
    if (token !== "1234567890" && token !== "abc") {
      throw new Response(null, { status: 401 });
    }
    return { id: token === "1234567890" ? crypto.randomUUID() : "abc" };
  },
});
```

### Creating Custom Tools

Tools are defined using Zod schemas for type safety:

```typescript
server.addTool({
  name: "example_tool",
  description: "Description of what the tool does",
  parameters: z.object({
    input: z.string().describe("Description of the input parameter"),
  }),
  execute: async (args, context) => {
    const { input } = args;
    const { log, session, reportProgress } = context;

    // Your tool logic here

    return {
      content: [
        {
          type: "text",
          text: "Tool result",
        },
      ],
      isError: false,
    };
  },
});
```

## Transport Types

### STDIO Transport

```typescript
server.start({
  transportType: "stdio",
});
```

### HTTP Stream Transport

```typescript
server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
    endpoint: "/api/mcp", // optional
  },
});
```

## Content Types

The server supports multiple content types:

- **Text**: Standard text responses
- **Images**: Base64-encoded images with MIME types
- **Audio**: Base64-encoded audio with MIME types

Use helper functions for media content:

```typescript
import { imageContent, audioContent } from "fastmcp";

// From URL
const img = await imageContent({ url: "https://example.com/image.jpg" });

// From file path
const img = await imageContent({ path: "./image.jpg" });

// From buffer
const img = await imageContent({ buffer: imageBuffer });
```

## Error Handling

The project includes comprehensive error handling:

```typescript
import { UserError } from "fastmcp";

// For user-facing errors
throw new UserError("File not found");

// For internal errors with logging
try {
  // risky operation
} catch (error) {
  log.error("Internal error", { error });
  throw new UserError("An error occurred");
}
```

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Linting and Formatting

```bash
pnpm format
pnpm format:check
```

## Architecture

The project demonstrates several MCP architectural patterns:

- **Server-Client Communication**: JSON-RPC over STDIO/HTTP
- **Tool Registration**: Dynamic tool registration with schema validation
- **Session Management**: User session handling across requests
- **Progress Reporting**: Real-time progress updates
- **Content Handling**: Multi-modal content support
- **Error Propagation**: Structured error handling

## Examples

### Basic Client Usage

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const transport = new StdioClientTransport({
  command: "tsx",
  args: ["src/index.ts"],
});

await client.connect(transport);
```

### Function Calling Host

```typescript
import { FastMCPSession } from "fastmcp";

const session = new FastMCPSession({
  name: "function-calling-host",
  version: "1.0.0",
  mcpServers: [
    {
      name: "test-server",
      command: "tsx",
      args: ["src/index.ts"],
    },
  ],
});

const result = await session.runTool("add", { a: 1, b: 2 });
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [FastMCP Library](https://github.com/jlowin/fastmcp)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)

## Support

For questions and support, please refer to the [Model Context Protocol documentation](https://modelcontextprotocol.io/docs/) or open an issue in this repository.
