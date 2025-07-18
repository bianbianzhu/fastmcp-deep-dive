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

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

class AdvancedStreamableMCPClient extends EventEmitter {
  #client: Client;
  #transport: StreamableHTTPClientTransport;
  #availableTools: Tool[] = [];
  #serverUrl: string;
  #connectionState: ConnectionState = "disconnected";
  #reconnectAttempts = 0;
  #maxReconnectAttempts = 5;
  #reconnectDelay = 1000;

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
    try {
      this.#setConnectionState("connecting");
      console.log("🔄 Connecting to MCP server...");

      this.#transport = new StreamableHTTPClientTransport(
        new URL(this.#serverUrl)
      );

      // Set up notification handlers
      this.#client.setNotificationHandler(
        ToolListChangedNotificationSchema,
        async () => {
          console.log("📢 Tool list changed notification received");
          await this.#refreshToolList();
          this.emit("toolsChanged", this.#availableTools);
        }
      );

      await this.#client.connect(this.#transport);
      await this.#refreshToolList();

      this.#setConnectionState("connected");
      this.#reconnectAttempts = 0;

      console.log("✅ Successfully connected to MCP server");
      console.log(
        `🔧 Initial tools available: ${this.#availableTools.map((t) => t.name).join(", ")}`
      );
    } catch (error) {
      this.#setConnectionState("error");
      console.error("❌ Failed to connect:", error);

      if (this.#reconnectAttempts < this.#maxReconnectAttempts) {
        this.#reconnectAttempts++;
        console.log(
          `🔄 Attempting to reconnect (${this.#reconnectAttempts}/${this.#maxReconnectAttempts}) in ${this.#reconnectDelay}ms...`
        );
        setTimeout(() => this.connect(), this.#reconnectDelay);
        this.#reconnectDelay *= 2; // Exponential backoff
      } else {
        console.error("💥 Max reconnection attempts reached");
        this.emit("error", error);
      }
    }
  }

  #setConnectionState(state: ConnectionState): void {
    this.#connectionState = state;
    this.emit("connectionStateChanged", state);
  }

  async #refreshToolList(): Promise<void> {
    try {
      const response = await this.#client.listTools();
      this.#availableTools = response.tools || [];
      console.log(
        `🔧 Tool list refreshed: ${this.#availableTools.length} tools available`
      );
    } catch (error) {
      console.error("❌ Failed to refresh tool list:", error);
    }
  }

  async callTool(
    name: string,
    arguments_: Record<string, any>
  ): Promise<unknown> {
    if (this.#connectionState !== "connected") {
      throw new Error("Client is not connected");
    }

    console.log(`🔧 Calling tool: ${name} with arguments:`, arguments_);

    const result = await this.#client.callTool({ name, arguments: arguments_ });

    const parsedResult = CallToolResultSchema.safeParse(result);
    if (!parsedResult.success) {
      throw new Error(`Invalid tool result: ${parsedResult.error.message}`);
    }

    console.log(`✅ Tool ${name} executed successfully`);
    return parsedResult.data;
  }

  getAvailableTools(): Tool[] {
    return this.#availableTools;
  }

  getConnectionState(): ConnectionState {
    return this.#connectionState;
  }

  isConnected(): boolean {
    return this.#connectionState === "connected";
  }

  async disconnect(): Promise<void> {
    console.log("🔄 Disconnecting from MCP server...");
    this.#setConnectionState("disconnected");
    await this.#client.close();
    console.log("✅ Disconnected from MCP server");
  }
}

// Enhanced usage with better monitoring
async function advancedExample() {
  const client = new AdvancedStreamableMCPClient({
    _clientInfo: {
      name: "mcp-client",
      version: "1.0.0",
    },
    serverUrl: "http://localhost:8181/mcp",
  });

  // Listen for connection state changes
  client.on("connectionStateChanged", (state: ConnectionState) => {
    console.log(`🔄 Connection state changed: ${state}`);
  });

  // Listen for tool changes
  client.on("toolsChanged", (tools: Tool[]) => {
    console.log("📢 Tools changed:");
    tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name} - ${tool.description}`);
    });
  });

  // Listen for errors
  client.on("error", (error: Error) => {
    console.error("💥 Client error:", error);
  });

  await client.connect();

  // Keep the process alive and monitor connection
  const monitorInterval = setInterval(() => {
    if (client.isConnected()) {
      console.log(
        `💚 Client is connected. Available tools: ${client.getAvailableTools().length}`
      );
    } else {
      console.log(
        `💔 Client is disconnected. State: ${client.getConnectionState()}`
      );
    }
  }, 10000); // Check every 10 seconds

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    clearInterval(monitorInterval);
    await client.disconnect();
    process.exit(0);
  });

  // Example: Test tool calling after a delay
  setTimeout(async () => {
    if (client.isConnected()) {
      try {
        const result = await client.callTool("add", { a: 5, b: 3 });
        console.log("🧮 Tool result:", result);
      } catch (error) {
        console.error("❌ Tool call failed:", error);
      }
    }
  }, 5000);

  console.log("🚀 Client is running. Press Ctrl+C to exit.");
}

advancedExample().catch(console.error);
