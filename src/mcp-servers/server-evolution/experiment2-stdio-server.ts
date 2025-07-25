import {
  JSONRPCMessage,
  JSONRPCMessageSchema,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";

// ⚠️⚠️⚠️⚠️⚠️ 搭配 client-evolution/experiment2-raw-stdio-client.ts 使用 ⚠️⚠️⚠️⚠️⚠️

process.stdin.on("data", (buf) => {
  process.stdout.write(`❇️ Data received from client\n`);
  const input = buf.toString();

  const response: JSONRPCResponse = {
    jsonrpc: "2.0",
    id: 0,
    result: {
      message: `🌼 server received: ${input}`,
    },
  };

  process.stdout.write(JSON.stringify(response) + "\n");
});

class ReadBuffer {
  #buffer?: Buffer;

  append(data: Buffer): void {
    this.#buffer = this.#buffer ? Buffer.concat([this.#buffer, data]) : data;
  }

  readMessage(): JSONRPCMessage | null {
    if (!this.#buffer) {
      return null;
    }

    const index = this.#buffer.indexOf("\n");
    if (index === -1) {
      return null;
    }

    const line = this.#buffer.toString("utf-8", 0, index).replace(/\r$/, "");
    this.#buffer = this.#buffer.subarray(index + 1);

    const message = JSON.parse(line);

    const parsed = JSONRPCMessageSchema.safeParse(message);
    if (!parsed.success) {
      return null;
    }

    return parsed.data;
  }

  clear(): void {
    this.#buffer = undefined;
  }
}
