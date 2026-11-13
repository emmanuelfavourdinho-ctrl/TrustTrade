import { z } from "zod";
import { apiRequest } from "./client";

const feedPostSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
  author: z.object({
    id: z.string().uuid().optional(),
    fullName: z.string().optional(),
    displayName: z.string().optional(),
    username: z.string().optional(),
    avatarUrl: z.url().nullable().optional(),
    profilePhoto: z.url().nullable().optional(),
  }).passthrough(),
  artisan: z.object({
    verificationStatus: z.string().optional(),
  }).nullable().optional(),
  location: z.object({
    name: z.string(),
    city: z.string(),
  }),
  media: z.array(z.object({
    id: z.string().uuid(),
    mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
    resourceType: z.string().optional(),
    url: z.url().nullable(),
  })).default([]),
  likeCount: z.number().int().nonnegative().optional(),
  commentCount: z.number().int().nonnegative().optional(),
  likedByMe: z.boolean().optional(),
}).passthrough();

export type FeedPost = z.infer<typeof feedPostSchema>;

const feedPageSchema = z.object({
  items: z.array(feedPostSchema),
  nextCursor: z.string().nullable(),
});

export function getFeed(input: { cursor?: string; locality?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  search.set("limit", String(input.limit ?? 20));
  if (input.cursor) search.set("cursor", input.cursor);
  if (input.locality) search.set("locality", input.locality);
  return apiRequest(`/api/v1/posts?${search.toString()}`, feedPageSchema);
}

export function setPostLiked(postId: string, liked: boolean) {
  return apiRequest(
    `/api/v1/posts/${encodeURIComponent(postId)}/like`,
    z.object({}).passthrough(),
    { method: liked ? "POST" : "DELETE" },
  );
}

const createdPostSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  status: z.string(),
  postType: z.string(),
  createdAt: z.string().datetime(),
  location: z.object({ name: z.string(), city: z.string() }),
  media: z.array(z.object({
    id: z.string().uuid(),
    mediaType: z.enum(["IMAGE", "VIDEO"]),
    displayOrder: z.number().int(),
    url: z.url(),
  })),
});

export function createProfessionalPost(input: {
  content: string;
  locationId: string;
  mediaIds?: string[];
}) {
  return apiRequest(
    "/api/v1/posts",
    createdPostSchema,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function removePostMedia(postId: string, mediaId: string) {
  return apiRequest(
    `/api/v1/posts/${encodeURIComponent(postId)}/media/${encodeURIComponent(mediaId)}`,
    z.object({ removed: z.literal(true) }),
    { method: "DELETE" },
  );
}
