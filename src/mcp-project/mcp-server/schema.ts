import { z } from "zod";

export const transportSchema = z.enum(["stdio", "httpstream"] as const);

export const portSchema = z.number().int().positive();

export const authTokenSchema = z.string().uuid();

// 🔦 search tool 🔦

// Sort criteria schema
const SortSchema = z
  .object({
    direction: z
      .enum(["ascending", "descending"])
      .describe(
        "The direction to sort. Possible values include `ascending` and `descending`."
      ),
    timestamp: z
      .literal("last_edited_time")
      .describe(
        "The name of the timestamp to sort against. Possible values include `last_edited_time`."
      ),
  })
  .describe(
    'A set of criteria, `direction` and `timestamp` keys, that orders the results. The **only** supported timestamp value is `"last_edited_time"`. Supported `direction` values are `"ascending"` and `"descending"`. If `sort` is not provided, then the most recently edited results are returned first.'
  );

// Filter criteria schema
const FilterSchema = z
  .object({
    value: z
      .enum(["page", "database"])
      .describe(
        "The value of the property to filter the results by. Possible values for object type include `page` or `database`. **Limitation**: Currently the only filter allowed is `object` which will filter by type of object (either `page` or `database`)"
      ),
    property: z
      .literal("object")
      .describe(
        "The name of the property to filter by. Currently the only property you can filter by is the object type. Possible values include `object`. Limitation: Currently the only filter allowed is `object` which will filter by type of object (either `page` or `database`)"
      ),
  })
  .describe(
    'A set of criteria, `value` and `property` keys, that limits the results to either only pages or only databases. Possible `value` values are `"page"` or `"database"`. The only supported `property` value is `"object"`.'
  );

// Main search request schema
export const SearchRequestSchema = {
  query: z
    .string()
    .describe(
      "The text that the API compares page and database titles against."
    ),
  sort: SortSchema.optional(),
  filter: FilterSchema.optional(),
  start_cursor: z
    .string()
    .optional()
    .describe(
      "A `cursor` value returned in a previous response that If supplied, limits the response to results starting after the `cursor`. If not supplied, then the first page of results is returned. Refer to [pagination](https://developers.notion.com/reference/intro#pagination) for more details."
    ),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(100)
    .describe(
      "The number of items from the full list to include in the response. Maximum: `100`."
    ),
};

// 📕 page tools 📕

// Shared path parameter schema
const PageIdParamSchema = {
  page_id: z.string().describe("Identifier for a Notion page"),
};

// GET /v1/pages/{page_id} schemas
export const GetPageParamsSchema = PageIdParamSchema;

export const GetPageQuerySchema = z.object({
  filter_properties: z
    .string()
    .optional()
    .describe(
      "A list of page property value IDs associated with the page. Use this param to limit the response to a specific page property value or values. To retrieve multiple properties, specify each page property ID. For example: `?filter_properties=iAk8&filter_properties=b7dh`."
    ),
});

// PATCH /v1/pages/{page_id} schemas
export const PatchPageParamsSchema = z.object({
  page_id: z
    .string()
    .describe("The identifier for the Notion page to be updated."),
});

// Reusable rich text schemas (similar to block children)
const LinkSchema = z
  .object({
    url: z.string(),
  })
  .nullable();

const TextSchema = z
  .object({
    content: z.string(),
    link: LinkSchema,
  })
  .strict();

const RichTextItemSchema = z
  .object({
    text: TextSchema,
    type: z.literal("text"),
  })
  .strict();

// Properties schema - this is more flexible since properties can vary
// but includes the specific title property structure shown in the spec
const PropertiesSchema = z
  .object({
    title: z.array(RichTextItemSchema).max(100),
  })
  .catchall(z.any()) // Allows additional properties with any value
  .describe(
    "The property values to update for the page. The keys are the names or IDs of the property and the values are property values. If a page property ID is not included, then it is not changed."
  );

// Icon schema (emoji object)
const IconSchema = z
  .object({
    emoji: z.string(),
  })
  .strict()
  .describe(
    "A page icon for the page. Supported types are [external file object](https://developers.notion.com/reference/file-object) or [emoji object](https://developers.notion.com/reference/emoji-object)."
  );

// Cover schema (external file object)
const CoverSchema = z
  .object({
    type: z.literal("external"),
    external: z
      .object({
        url: z.string(),
      })
      .strict(),
  })
  .strict()
  .describe(
    "A cover image for the page. Only [external file objects](https://developers.notion.com/reference/file-object) are supported."
  );

// Main PATCH request body schema
export const PatchPageBodySchema = z.object({
  properties: PropertiesSchema.optional(),
  in_trash: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      "Set to true to delete a block. Set to false to restore a block."
    ),
  archived: z.boolean().optional(),
  icon: IconSchema.optional(),
  cover: CoverSchema.optional(),
});

// 🧱 block tools 🧱

// Shared path parameter schema
const BlockIdParamSchema = {
  block_id: z.string().describe("Identifier for a Notion block"),
};

// GET /v1/blocks/{block_id}
export const GetBlockParamsSchema = BlockIdParamSchema;

// DELETE /v1/blocks/{block_id}
export const DeleteBlockParamsSchema = BlockIdParamSchema;

// PATCH /v1/blocks/{block_id}
export const PatchBlockParamsSchema = z.object({
  block_id: z.string().describe("Identifier for a Notion block"),
});

// Color enum for block-level colors
const BlockColorSchema = z.enum([
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
  "gray_background",
  "brown_background",
  "orange_background",
  "yellow_background",
  "green_background",
  "blue_background",
  "purple_background",
  "pink_background",
  "red_background",
]);

// Annotations schema (optional properties for text formatting)
const AnnotationsSchema = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    underline: z.boolean().optional(),
    code: z.boolean().optional(),
    color: BlockColorSchema.optional(),
  })
  .optional();

// Rich text item schema with optional annotations
const RichTextItemSchemaExtended = z
  .object({
    type: z.literal("text"),
    text: TextSchema,
    annotations: AnnotationsSchema,
    plain_text: z.string().optional(),
    href: z.string().nullable().optional(),
  })
  .strict();

// Base rich text block schema (for headings, paragraphs, etc.)
const BaseRichTextBlockSchema = z
  .object({
    rich_text: z.array(RichTextItemSchemaExtended).max(100),
    color: BlockColorSchema.optional(),
    is_toggleable: z.boolean().optional(),
  })
  .strict();

export const FlexibleUpdateBlockBodySchema = {
  args: z
    .record(
      z
        .string()
        .describe(
          "block type (heading_1, paragraph, etc.); MUST NOT CHANGE THE TYPE WHEN UPDATING A BLOCK. Keep the same type as the block you are updating. Updating type is not supported."
        ),
      BaseRichTextBlockSchema
    )
    .refine((data) => Object.keys(data).length === 1, {
      message: "Must contain exactly one block type property",
    }),
};
