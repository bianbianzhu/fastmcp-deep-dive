import {
  Client,
  ClientOptions,
} from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  Implementation,
  Tool,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Advanced example with event emitter pattern
import { EventEmitter } from "events";

class AdvancedStreamableMCPClient extends EventEmitter {
  #client: Client;
  #transport: StreamableHTTPClientTransport;
  #availableTools: Tool[] = [];
  #serverUrl: string;

  constructor({
    _clientInfo,
    serverUrl,
    clientOptions,
  }: {
    _clientInfo: Implementation;
    serverUrl: string;
    clientOptions?: ClientOptions;
  }) {
    super();
    this.#client = new Client(
      {
        ..._clientInfo,
      },
      {
        ...clientOptions,
      }
    );
    this.#serverUrl = serverUrl;
  }

  async connect(): Promise<void> {
    this.#transport = new StreamableHTTPClientTransport(
      new URL(this.#serverUrl)
    );

    // Set up notification handlers
    this.#client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      async () => {
        await this.#refreshToolList();
        this.emit("toolsChanged", this.#availableTools);
      }
    );

    await this.#client.connect(this.#transport);
    await this.#refreshToolList();
  }

  async #refreshToolList(): Promise<void> {
    const response = await this.#client.listTools();
    this.#availableTools = response.tools || [];
  }

  async callTool(
    name: string,
    arguments_: Record<string, any>
  ): Promise<unknown> {
    const result = await this.#client.callTool({ name, arguments: arguments_ });

    const parsedResult = CallToolResultSchema.safeParse(result);
    if (!parsedResult.success) {
      throw new Error(`Invalid tool result: ${parsedResult.error.message}`);
    }

    return parsedResult.data;
  }

  getAvailableTools(): Tool[] {
    return this.#availableTools;
  }

  async disconnect(): Promise<void> {
    await this.#client.close();
  }
}

// Usage with event emitter
async function advancedExample() {
  const client = new AdvancedStreamableMCPClient({
    _clientInfo: {
      name: "mcp-client",
      version: "1.0.0",
    },
    serverUrl: "http://localhost:8181/mcp",
  });

  // Listen for tool changes
  client.on("toolsChanged", (tools: Tool[]) => {
    console.log(
      "Tools changed:",
      tools.map((t) => t.name)
    );
  });

  await client.connect();
}

advancedExample();
