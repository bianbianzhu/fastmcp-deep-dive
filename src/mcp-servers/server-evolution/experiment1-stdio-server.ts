import { z } from "zod";

const jsonrpcSchemaBase = z.object({
  jsonrpc: z.literal("2.0"),
});

const jsonrpcSchemaResponse = jsonrpcSchemaBase.extend({
  result: z.unknown(),
  id: z.union([z.number(), z.string().min(1)]),
});

type SuccessResponse<T extends z.ZodTypeAny = z.ZodUnknown> = z.infer<
  typeof jsonrpcSchemaResponse
> & {
  result: z.infer<T>;
};

process.stdin.on("data", (buf) => {
  const message1: SuccessResponse = {
    jsonrpc: "2.0",
    id: 0,
    result: {
      message: "server is receiving data from client",
    },
  };
  process.stdout.write(JSON.stringify(message1) + "\n");

  const input = buf.toString();

  const message2: SuccessResponse = {
    jsonrpc: "2.0",
    id: 1,
    result: {
      message: `💡 server received: ${input}`,
    },
  };

  process.stdout.write(JSON.stringify(message2) + "\n");
});
