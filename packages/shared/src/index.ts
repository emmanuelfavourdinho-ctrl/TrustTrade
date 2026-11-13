import { z } from "zod";

export const accountRoleSchema = z.enum(["customer", "artisan"]);
export type AccountRole = z.infer<typeof accountRoleSchema>;

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Enter your password."),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.email(),
  password: z.string().min(8, "Use at least 8 characters."),
  role: accountRoleSchema,
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: z.email(),
});
export type ForgotPasswordRequest = z.infer<
  typeof forgotPasswordRequestSchema
>;

export const verificationStatusSchema = z.enum([
  "not_submitted",
  "pending",
  "approved",
  "rejected",
  "resubmission_required",
]);

export const artisanSearchParamsSchema = z.object({
  query: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(100).optional(),
});
export type ArtisanSearchParams = z.infer<typeof artisanSearchParamsSchema>;

export const artisanSearchResultSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  headline: z.string(),
  category: z.string(),
  locality: z.string(),
  verificationStatus: verificationStatusSchema,
  avatarUrl: z.url().nullable().optional(),
});
export type ArtisanSearchResult = z.infer<typeof artisanSearchResultSchema>;

export const artisanSearchResponseSchema = z.array(artisanSearchResultSchema);
