import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Reference:
https://github.com/GoogleCloudPlatform/cloud-run-mcp/blob/main/tools.js
*/

const BASE_URL = "https://api.notion.com";

export function registerTool(
  server: McpServer,
  options: { authToken?: string } = {}
) {
  const { authToken } = options;

  server.tool(
    "post-search",
    "Search by title",
    {
      query: z
        .string()
        .optional()
        .describe(
          "The text that the API compares page and database titles against."
        ),
      sort: z
        .object({
          direction: z
            .enum(["ascending", "descending"])
            .optional()
            .describe(
              "The direction to sort. Possible values include `ascending` and `descending`."
            ),
          timestamp: z
            .enum(["created_time", "last_edited_time"])
            .optional()
            .describe(
              "The name of the timestamp to sort against. Possible values include `last_edited_time`."
            ),
        })
        .optional()
        .describe(
          'A set of criteria, `direction` and `timestamp` keys, that orders the results. The **only** supported timestamp value is `"last_edited_time"`. Supported `direction` values are `"ascending"` and `"descending"`. If `sort` is not provided, then the most recently edited results are returned first.'
        ),
      filter: z
        .object({
          property: z
            .string()
            .optional()
            .describe(
              "The name of the property to filter by. Currently the only property you can filter by is the object type.  Possible values include `object`.   Limitation: Currently the only filter allowed is `object` which will filter by type of object (either `page` or `database`)"
            ),
          value: z
            .string()
            .optional()
            .describe(
              "The value of the property to filter the results by.  Possible values for object type include `page` or `database`.  **Limitation**: Currently the only filter allowed is `object` which will filter by type of object (either `page` or `database`)"
            ),
        })
        .optional()
        .describe(
          'A set of criteria, `value` and `property` keys, that limits the results to either only pages or only databases. Possible `value` values are `"page"` or `"database"`. The only supported `property` value is `"object"`.'
        ),
      page_size: z
        .number()
        .int()
        .positive()
        .default(100)
        .describe(
          "The number of items from the full list to include in the response. Maximum: `100`."
        ),
    },
    async ({ query, sort, filter, page_size }) => {
      const endpoint = "/v1/search";

      const url = new URL(endpoint, BASE_URL);

      const body = {
        query: query ?? "",
        sort: sort ?? {},
        filter: filter ?? {},
        page_size: page_size,
      };

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          authorization: `Bearer ${authToken}`,
          "notion-version": "2022-06-28",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return {
          content: [{ type: "text", text: String(response.statusText) }],
          isError: true,
        };
      }

      const data = await response.json();

      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
        isError: false,
      };
    }
  );
}
