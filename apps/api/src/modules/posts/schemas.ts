import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  locationId: z.uuid(),
  mediaIds: z.array(z.uuid()).max(5).refine((ids) => new Set(ids).size === ids.length).optional(),
});

export const postIdSchema = z.object({
  postId: z.uuid(),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
  locality: z.uuid().optional(),
});
