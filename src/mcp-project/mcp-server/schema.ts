import { z } from "zod";

export const transportSchema = z.enum(["stdio", "httpstream"] as const);

export const portSchema = z.number().int().positive();

export const authTokenSchema = z.string().uuid();
