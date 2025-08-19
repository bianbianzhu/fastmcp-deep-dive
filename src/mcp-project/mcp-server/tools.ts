import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  FlexibleUpdateBlockBodySchema,
  GetBlockParamsSchema,
  GetPageParamsSchema,
  PatchBlockParamsSchema,
  PatchPageBodySchema,
  PatchPageParamsSchema,
  SearchRequestSchema,
} from "./schema.js";

/** Reference:
https://github.com/GoogleCloudPlatform/cloud-run-mcp/blob/main/tools.js
*/

const BASE_URL = "https://api.notion.com";

export function registerTool(
  server: McpServer,
  options: { authToken?: string } = {}
) {
  const { authToken } = options;

  // 🔦 search tool 🔦
  server.tool(
    "post-search",
    "Search by title",
    SearchRequestSchema,
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
          "content-type": "application/json",
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

  // 📕 page tools 📕
  server.tool(
    "get-a-page",
    "Get a page",
    GetPageParamsSchema,
    async ({ page_id }) => {
      const endpoint = `/v1/pages/${page_id}`;

      const url = new URL(endpoint, BASE_URL);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          authorization: `Bearer ${authToken}`,
          "notion-version": "2022-06-28",
          "content-type": "application/json",
        },
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

  server.tool(
    "patch-a-page",
    "Patch a page",
    {
      params: PatchPageParamsSchema,
      body: PatchPageBodySchema,
    },
    async ({ params, body }) => {
      const { page_id } = params;
      const { properties, in_trash, archived, icon, cover } = body;
      const endpoint = `/v1/pages/${page_id}`;

      const url = new URL(endpoint, BASE_URL);

      const response = await fetch(url.toString(), {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${authToken}`,
          "notion-version": "2022-06-28",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          properties,
          in_trash,
          archived,
          icon,
          cover,
        }),
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

  // 📝 block children tools 📝

  server.tool(
    "get-block-children",
    "Get the children of a block. Block can be a page, another block, or a child block.",
    GetBlockParamsSchema,
    async ({ block_id }) => {
      const endpoint = `/v1/blocks/${block_id}/children`;

      const url = new URL(endpoint, BASE_URL);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          authorization: `Bearer ${authToken}`,
          "notion-version": "2022-06-28",
          "content-type": "application/json",
        },
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

  // 🧱 block tools 🧱

  server.tool(
    "retrieve-a-block",
    "Retrieve a block",
    GetBlockParamsSchema,
    async ({ block_id }) => {
      const endpoint = `/v1/blocks/${block_id}`;

      const url = new URL(endpoint, BASE_URL);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          authorization: `Bearer ${authToken}`,
          "notion-version": "2022-06-28",
          "content-type": "application/json",
        },
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

  server.tool(
    "patch-a-block",
    "Patch a block",
    {
      params: PatchBlockParamsSchema,
      body: FlexibleUpdateBlockBodySchema,
    },
    async ({ params, body }) => {
      const { block_id } = params;
      const { args } = body;

      const endpoint = `/v1/blocks/${block_id}`;

      const url = new URL(endpoint, BASE_URL);

      const response = await fetch(url.toString(), {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${authToken}`,
          "notion-version": "2022-06-28",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...args,
        }),
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

// valid request body
// {
//   "heading_1": {
//           "rich_text": [
//               {
//                   "type": "text",
//                   "text": {
//                       "content": "where are you",
//                       "link": null
//                   },
//                   "annotations": {
//                       "bold": false,
//                       "italic": false,
//                       "strikethrough": false,
//                       "underline": false,
//                       "code": false,
//                       "color": "default"
//                   },
//                   "plain_text": "Where is mcp",
//                   "href": null
//               }
//           ],
//           "is_toggleable": false,
//           "color": "default"
//       }
//   }
